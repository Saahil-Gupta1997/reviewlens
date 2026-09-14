/**
 * Threshold sweep over the captured on-device scores.
 *
 * The on-device feature missed its release gate. Before calibrating the 0.30 similarity
 * floor (DEC-04), this answers the prior question: is there ANY threshold that clears the
 * gate? If signal and noise overlap, calibration cannot help and the honest options are to
 * change approach or cut the feature.
 *
 * Reads eval/captured-raw-scores.json, so it re-runs in milliseconds without inference.
 *
 *   node scripts/threshold-sweep.mjs
 */
import { readFile } from "node:fs/promises";

const K = 5;
const golden = JSON.parse(await readFile("eval/golden-set.json", "utf8"));
const raw = JSON.parse(await readFile("eval/captured-raw-scores.json", "utf8"));
const thresholds = JSON.parse(await readFile("eval/thresholds.json", "utf8"));
const bar = thresholds.gates.semantic_release;

const cases = golden.cases.filter((c) => c.split === "dev" && raw.scores[c.id]);
const mean = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

function evaluate(t) {
  const scored = [];
  const absent = [];
  for (const c of cases) {
    const top = raw.scores[c.id].filter((h) => h.score >= t).slice(0, K);
    if (c.relevant_ids.length === 0) {
      absent.push(top.length > 0 ? 1 : 0);
      continue;
    }
    const hit = top.filter((h) => c.relevant_ids.includes(h.reviewId));
    scored.push({
      recall: hit.length / c.relevant_ids.length,
      precision: top.length ? hit.length / top.length : 0,
    });
  }
  return {
    t,
    recall: mean(scored.map((s) => s.recall)),
    precision: mean(scored.map((s) => s.precision)),
    fp: mean(absent),
  };
}

const rows = [];
for (let t = -0.05; t <= 0.6001; t += 0.01)
  rows.push(evaluate(Number(t.toFixed(2))));

const passing = rows.filter(
  (r) =>
    r.recall >= bar.recall_at_5.min &&
    r.precision >= bar.precision_at_5.min &&
    r.fp <= bar.absent_topic_false_positive_rate.max,
);

const n = (x, d = 3) => (x === null ? "n/a" : x.toFixed(d));
console.log("# Threshold sweep - on-device semantic, dev split\n");
console.log(
  `Gate: recall@5 >= ${bar.recall_at_5.min}, precision@5 >= ${bar.precision_at_5.min}, absent-topic FP <= ${bar.absent_topic_false_positive_rate.max}\n`,
);
console.log(
  "| threshold | recall@5 | precision@5 | absent-topic FP | clears gate |",
);
console.log("| --- | --- | --- | --- | --- |");
for (const r of rows) {
  if (Math.abs(r.t * 100) % 5 > 0.001) continue; // print every 0.05
  const ok =
    r.recall >= bar.recall_at_5.min &&
    r.precision >= bar.precision_at_5.min &&
    r.fp <= bar.absent_topic_false_positive_rate.max;
  console.log(
    `| ${r.t.toFixed(2)}${r.t === 0.3 ? " (shipped)" : ""} | ${n(r.recall)} | ${n(r.precision)} | ${n(r.fp, 2)} | ${ok ? "YES" : "no"} |`,
  );
}

console.log(
  `\n**Thresholds clearing the gate: ${passing.length} of ${rows.length} tested.**`,
);
const bestRecall = rows.reduce((a, b) => (b.recall > a.recall ? b : a));
console.log(
  `Best achievable recall@5 at any threshold: **${n(bestRecall.recall)}** (at ${bestRecall.t.toFixed(2)}), against a bar of ${bar.recall_at_5.min}.`,
);

// The decisive comparison: does any correct answer outrank the best noise on an
// absent-topic question? If not, no floor can separate them.
console.log("\n## Signal vs noise overlap\n");
console.log("| Case | Type | Top score | What it is |");
console.log("| --- | --- | --- | --- |");
for (const c of cases) {
  const top = raw.scores[c.id][0];
  const isAbsent = c.relevant_ids.length === 0;
  const topRelevant = raw.scores[c.id].find((h) =>
    c.relevant_ids.includes(h.reviewId),
  );
  console.log(
    `| ${c.id} | ${isAbsent ? "absent-topic (noise)" : "has relevant"} | ${top.score.toFixed(4)} | ${isAbsent ? "highest false positive" : "top overall = " + top.reviewId + (topRelevant ? `; best relevant ${topRelevant.reviewId} @ ${topRelevant.score.toFixed(4)}` : "")} |`,
  );
}

const worstNoise = Math.max(
  ...cases
    .filter((c) => !c.relevant_ids.length)
    .map((c) => raw.scores[c.id][0].score),
);
const weakestSignal = Math.min(
  ...cases
    .filter((c) => c.relevant_ids.length)
    .map((c) => {
      const best = raw.scores[c.id].find((h) =>
        c.relevant_ids.includes(h.reviewId),
      );
      return best ? best.score : -1;
    }),
);
console.log(
  `\nHighest absent-topic (noise) score: **${worstNoise.toFixed(4)}**\nWeakest best-relevant (signal) score: **${weakestSignal.toFixed(4)}**`,
);
console.log(
  weakestSignal > worstNoise
    ? "\nSignal sits above noise: a threshold between them is worth calibrating."
    : "\n**Signal and noise overlap.** No similarity floor can admit the weakest correct answer while rejecting the strongest false positive. Calibration cannot fix this; the approach has to change or the feature has to be cut.",
);
