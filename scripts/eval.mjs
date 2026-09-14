/**
 * ReviewLens retrieval evaluation harness.
 *
 * Turns the evaluation plan in docs/delivery/ into an executable release gate.
 * Measures recall@5, precision@5, MRR, absent-topic false-positive rate and
 * retrieval latency against a human-labelled golden set, compares the result to
 * agreed thresholds, and exits non-zero when a gate fails.
 *
 *   node scripts/eval.mjs                       dev split, lexical retriever
 *   node scripts/eval.mjs --holdout --confirm   holdout split (release candidates only)
 *   node scripts/eval.mjs --hits <file.json>    score captured on-device semantic hits
 *
 * Holdout protection: the holdout split refuses to run without an explicit
 * --confirm flag, and every holdout run is appended to eval/holdout-runs.log.
 * That log is the audit trail for "we did not tune on the evaluation set".
 */
import { build } from "esbuild";
import { mkdir, writeFile, readFile, appendFile } from "node:fs/promises";
import { capturedTiming, latencySummary, latencyGate } from "./eval-timing.mjs";
import { argv, exit } from "node:process";

const K = 5;
const args = argv.slice(2);
const flag = (name) => args.includes("--" + name);
const value = (name) => {
  const i = args.indexOf("--" + name);
  return i >= 0 ? args[i + 1] : null;
};

const useHoldout = flag("holdout");
const hitsFile = value("hits");
const timingFile = value("timings");
const reportDir = value("output-dir") || "eval/reports";
if (
  (flag("hits") && !hitsFile) ||
  (flag("timings") && (!timingFile || !hitsFile))
) {
  throw Error(
    "--hits requires a file; --timings requires both a file and --hits.",
  );
}

if (useHoldout && !flag("confirm")) {
  console.error(
    "\nRefusing to run the holdout split without --confirm.\n" +
      "The holdout set exists to measure a release candidate once. Running it casually,\n" +
      "or after every tuning change, destroys its value as independent evidence.\n" +
      "If this is a release candidate, re-run with: --holdout --confirm\n",
  );
  exit(2);
}

await mkdir("work", { recursive: true });
await mkdir(reportDir, { recursive: true });
await build({
  entryPoints: ["lib/reviewlens/intelligence.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "work/intelligence.mjs",
});
const { searchEvidence, classifyAspects } = await import(
  "../work/intelligence.mjs"
);

const golden = JSON.parse(await readFile("eval/golden-set.json", "utf8"));
const thresholds = JSON.parse(await readFile("eval/thresholds.json", "utf8"));
const raw = JSON.parse(await readFile(golden.corpus, "utf8"));

// The golden set labels source review_ids. The shipped import assigns fresh UUIDs and
// discards review_id (tracked as ISS-02 in the RAID log), so the harness builds Review
// objects directly in order to keep labels addressable.
const reviews = raw.map((r) => ({
  id: r.review_id,
  text: r.review_text,
  rating: typeof r.rating === "number" ? r.rating : null,
  date: r.review_date || "",
  product: r.product || "",
  version: r.product_version || "",
  region: r.region || "",
  source: r.source || "",
  aspects: classifyAspects(r.review_text),
}));

const hitBytes = hitsFile ? await readFile(hitsFile) : null;
const capturedHits = hitBytes ? JSON.parse(hitBytes.toString("utf8")) : null;

const split = useHoldout ? "holdout" : "dev";
const cases = golden.cases.filter((c) => c.split === split);
const timing = capturedTiming(
  timingFile ? JSON.parse(await readFile(timingFile, "utf8")) : null,
  hitBytes,
  cases.map((c) => c.id),
);

function score(retrieved, relevant) {
  const top = retrieved.slice(0, K);
  const hit = top.filter((id) => relevant.includes(id));
  const rank = top.findIndex((id) => relevant.includes(id));
  return {
    retrieved: top,
    recall: relevant.length ? hit.length / relevant.length : null,
    precision: top.length
      ? hit.length / top.length
      : relevant.length
        ? 0
        : null,
    rr: rank >= 0 ? 1 / (rank + 1) : 0,
    falsePositive: relevant.length === 0 ? top.length > 0 : null,
    missed: relevant.filter((id) => !top.includes(id)),
    spurious: top.filter((id) => !relevant.includes(id)),
  };
}

function runRetriever(name, retrieve, captured = false) {
  const rows = [];
  for (const c of cases) {
    const started = performance.now();
    let retrieved = [];
    let error = null;
    try {
      retrieved = retrieve(c);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    const latencyMs = captured
      ? (timing.values?.[c.id] ?? null)
      : performance.now() - started;
    rows.push({ ...c, ...score(retrieved, c.relevant_ids), latencyMs, error });
  }
  const scored = rows.filter((r) => r.relevant_ids.length > 0);
  const absent = rows.filter((r) => r.relevant_ids.length === 0);
  const mean = (xs) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const latencies = latencySummary(rows.map((r) => r.latencyMs));
  return {
    retriever: name,
    latency_source: captured
      ? timing.source
      : "Measured in-process lexical search; excludes network and UI.",
    cases: rows,
    summary: {
      scored_cases: scored.length,
      absent_topic_cases: absent.length,
      recall_at_5: mean(scored.map((r) => r.recall)),
      precision_at_5: mean(scored.map((r) => r.precision)),
      mrr: mean(scored.map((r) => r.rr)),
      absent_topic_false_positive_rate: absent.length
        ? absent.filter((r) => r.falsePositive).length / absent.length
        : null,
      ...latencies,
    },
  };
}

const results = [
  runRetriever("lexical-baseline", (c) =>
    searchEvidence(reviews, c.question, K).map((r) => r.id),
  ),
];

if (capturedHits) {
  results.push(
    runRetriever(
      "on-device-semantic",
      (c) => {
        const entry = capturedHits[c.id];
        if (!entry) throw Error("No captured hits for case " + c.id);
        return entry.map((h) => (typeof h === "string" ? h : h.reviewId));
      },
      true,
    ),
  );
}

// Which gate set applies depends on what was measured. Without captured on-device hits
// the only retriever present is the lexical baseline, and the honest question is "has it
// regressed?" - not "is it good enough to ship?". Supplying hits promotes the run to the
// release gate that was agreed before the feature was measured.
const gateSet = capturedHits ? "semantic_release" : "regression";
const gates = thresholds.gates[gateSet];
const primary = results[results.length - 1];
const checks = [
  {
    gate: "recall_at_5",
    actual: primary.summary.recall_at_5,
    bound: gates.recall_at_5.min,
    pass: primary.summary.recall_at_5 >= gates.recall_at_5.min,
    direction: ">=",
  },
  {
    gate: "precision_at_5",
    actual: primary.summary.precision_at_5,
    bound: gates.precision_at_5.min,
    pass: primary.summary.precision_at_5 >= gates.precision_at_5.min,
    direction: ">=",
  },
  {
    gate: "absent_topic_false_positive_rate",
    actual: primary.summary.absent_topic_false_positive_rate,
    bound: gates.absent_topic_false_positive_rate.max,
    pass:
      primary.summary.absent_topic_false_positive_rate <=
      gates.absent_topic_false_positive_rate.max,
    direction: "<=",
  },
  latencyGate(primary.summary.p95_latency_ms, gates.p95_latency_ms.max),
];
const passed =
  checks.every((c) => c.pass) &&
  results.every((r) => r.cases.every((c) => !c.error));

const n = (x, d = 3) =>
  x === null || x === undefined ? "n/a" : Number(x).toFixed(d);
const stamp = new Date().toISOString();
const report = {
  generated_at: stamp,
  golden_set_version: golden.version,
  split,
  corpus_size: reviews.length,
  k: K,
  retrievers: results.map((r) => ({
    retriever: r.retriever,
    latency_source: r.latency_source,
    summary: r.summary,
  })),
  gated_retriever: primary.retriever,
  gate_set: gateSet,
  gate_checks: checks,
  gate_result: passed ? "PASS" : "FAIL",
  baseline_for_comparison: thresholds.baseline_measured,
  semantic_status: capturedHits
    ? "measured from captured on-device hits"
    : "Not evaluated in this run. See semantic-q8.md and semantic-fp32.md for the captured development results.",
  cases: results.map((r) => ({
    retriever: r.retriever,
    detail: r.cases.map((c) => ({
      id: c.id,
      category: c.category,
      question: c.question,
      relevant: c.relevant_ids,
      retrieved: c.retrieved,
      recall: c.recall,
      precision: c.precision,
      rr: c.rr,
      missed: c.missed,
      spurious: c.spurious,
      error: c.error,
      latency_ms: c.latencyMs,
    })),
  })),
};

const md = [
  "# Retrieval evaluation report",
  "",
  "- Generated: " + stamp,
  "- Golden set: `" +
    golden.version +
    "` / corpus " +
    reviews.length +
    " reviews / k=" +
    K,
  "- Split: **" +
    split +
    "**" +
    (split === "holdout" ? " (release-candidate measurement)" : ""),
  "- Gate result: **" + report.gate_result + "**",
  "- Semantic retrieval: " + report.semantic_status,
  "",
  "## Retriever comparison",
  "",
  "| Retriever | recall@5 | precision@5 | MRR | absent-topic FP rate | p50 ms | p95 ms |",
  "| --- | --- | --- | --- | --- | --- | --- |",
  ...results.map(
    (r) =>
      "| " +
      r.retriever +
      " | " +
      n(r.summary.recall_at_5) +
      " | " +
      n(r.summary.precision_at_5) +
      " | " +
      n(r.summary.mrr) +
      " | " +
      n(r.summary.absent_topic_false_positive_rate, 2) +
      " | " +
      n(r.summary.p50_latency_ms, 1) +
      " | " +
      n(r.summary.p95_latency_ms, 1) +
      " |",
  ),
  "",
  ...results.map((r) => "- Timing (" + r.retriever + "): " + r.latency_source),
  "",
  "Precision is measured over returned results (up to 5), averaged over relevant-topic cases; it is not fixed-denominator precision@5.",
  "",
  "## Gate set `" + gateSet + "` applied to `" + primary.retriever + "`",
  "",
  "> " + gates.rationale,
  "",
  "| Gate | Bound | Actual | Result |",
  "| --- | --- | --- | --- |",
  ...checks.map(
    (c) =>
      "| " +
      c.gate +
      " | " +
      c.direction +
      " " +
      c.bound +
      " | " +
      n(c.actual, 3) +
      " | " +
      (c.status || (c.pass ? "PASS" : "FAIL")) +
      " |",
  ),
  "",
  "## Per-case detail - " + primary.retriever,
  "",
  "| Case | Category | Question | Relevant | Retrieved | R@5 | P@5 | Missed | Spurious |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...primary.cases.map(
    (c) =>
      "| " +
      c.id +
      " | " +
      c.category +
      " | " +
      c.question +
      " | " +
      (c.relevant_ids.length || "-") +
      " | " +
      c.retrieved.length +
      " | " +
      n(c.recall, 2) +
      " | " +
      n(c.precision, 2) +
      " | " +
      (c.missed.join(" ") || "-") +
      " | " +
      (c.spurious.join(" ") || "-") +
      " |",
  ),
  "",
  "## How to read this",
  "",
  "Absent-topic cases have no relevant reviews. For those, any retrieved result is a false",
  "positive, and recall/precision are undefined. A high false-positive rate means the retriever",
  "answers questions the corpus cannot support - the failure mode most likely to mislead a",
  "product decision.",
  "",
  "Similarity is not confidence. These numbers describe retrieval over a 24-review fixture",
  "labelled by one annotator. Gate results apply to this sample, not production accuracy.",
  "",
].join("\n");

const file =
  reportDir + "/" + stamp.replace(/[:.]/g, "-") + "-" + split + ".json";
await writeFile(file, JSON.stringify(report, null, 2));
await writeFile(reportDir + "/latest.md", md);

if (useHoldout) {
  await appendFile(
    "eval/holdout-runs.log",
    stamp +
      "\t" +
      golden.version +
      "\t" +
      primary.retriever +
      "\trecall@5=" +
      n(primary.summary.recall_at_5) +
      "\tprecision@5=" +
      n(primary.summary.precision_at_5) +
      "\t" +
      report.gate_result +
      "\n",
  );
}

console.log(md);
console.log("\nReport written to " + file + " and " + reportDir + "/latest.md");
if (!passed) {
  console.error(
    "\nRelease gate FAILED. Do not ship. Either fix retrieval, or re-agree the threshold with a dated entry in docs/delivery/decision-log.md.",
  );
  exit(1);
}
