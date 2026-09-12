# Decision log

Dated decisions with their trade-off, reversibility, and the evidence that would overturn
them. Reversibility is recorded because it determines how much analysis a decision deserves:
a one-way door earns a week, a two-way door earns an afternoon.

Status values: **Active** · **Superseded** · **Pending evidence**

---

## DEC-01 — Calculate statistics in code, never from the model

**Date:** 2026-08 · **Status:** Active · **Reversibility:** One-way (the API contract and
every test depend on it)

Counts, percentages, averages, complaint rankings and comparisons are computed
deterministically over the full scoped set, in all three answer modes. A model may select and
quote evidence; it may never produce a number.

**Why.** The failure this prevents is the expensive one. A wrong quotation is visible to the
reader. A wrong denominator is not, and it propagates into a roadmap decision. It also means
the product's core value does not depend on an API key, which is what made the no-key mode
possible at all.

**Trade-off.** Natural-language coverage is bounded — the parser handles a defined grammar and
asks for clarification outside it, rather than guessing. That produces "I need you to rephrase
that" where a general LLM would produce a confident wrong answer.

**What would change my mind.** A faithfulness evaluation showing a model computing scoped
aggregates over 2,000 reviews with zero denominator errors across a labelled set. I have not
seen that, and I would want it measured, not asserted.

---

## DEC-02 — Retrieved examples are never a prevalence denominator

**Date:** 2026-08 · **Status:** Active · **Reversibility:** One-way

Retrieval returns up to 5–8 examples. Ranking and prevalence use the entire scoped set. The
two are separate fields in the API response so a caller cannot conflate them.

**Why.** "Five reviews mention login problems" is the single most common way review tooling
misleads. The five are the retrieval limit, not the population. Enforced by test
_prevalence counts all relevant reviews regardless of retrieved example count_.

---

## DEC-03 — On-device MiniLM rather than a hosted embedding service

**Date:** 2026-08 · **Status:** Active · **Reversibility:** Two-way

Semantic retrieval runs as quantized MiniLM in a browser module worker, single-threaded
WebAssembly, 384 dimensions, with vectors cached in IndexedDB.

**Why.** The forcing constraint was cost: API billing blocked evaluation entirely, so a mode
that works with no key and no per-request charge was the only way to make semantic retrieval
demonstrable. Single-threaded WASM avoids requiring WebGPU.

**Trade-off.** A first-run download over a public CDN, device memory and storage pressure,
cache eviction, and no cross-device sync. Every one of those is a failure mode a hosted
service would not have.

**Cost of being wrong.** Low and recoverable: the Basic mode is a complete fallback, so a
failed download degrades rather than breaks. That is why this got an afternoon of analysis and
not a week.

---

## DEC-04 — Ship the 0.30 similarity cutoff as an uncalibrated heuristic, labelled as one

**Date:** 2026-09 · **Status:** **Answered 2026-09-12 — nothing to calibrate** · **Reversibility:** Two-way

Passages below cosine 0.30 are suppressed. The number was chosen by inspection on development
data and is documented everywhere it appears as a heuristic, not a probability.

**Why.** Some floor is needed or absent-topic questions return noise. Calibrating it properly
requires labelled data across a range of topics, which does not exist yet at sufficient size.

**Trade-off.** An arbitrary constant sits on the user-facing path. Mitigated by labelling
every result "limited evidence" and by making absent-topic false-positive rate a gated metric,
so the consequence of a badly chosen floor is measured even while the floor is unprincipled.

**What would change my mind.** Absent-topic false-positive rate above 0.25, or recall loss on
paraphrase cases, in a run of `npm run eval -- --hits` against real model output. Either
result means the floor moves — and it moves on a dev-split measurement, never on holdout.

---

## DEC-05 — The server re-verifies every quotation and scope claim from the client

**Date:** 2026-08 · **Status:** Active · **Reversibility:** One-way

Ranking happens in the browser. The server re-filters candidates to the owned, scoped set and
accepts only exact substrings of owned review text, capped at 5 and de-duplicated.

**Why.** Moving inference to the client moves it outside the trust boundary. The client
chooses _what to propose_; the server decides _what is true_. This is what makes it safe to
let an untrusted device rank evidence at all.

**Limitation, stated deliberately.** This rejects fabricated and out-of-scope text. It does
not certify that a verified quote is _relevant_ — that is a retrieval-quality question, which
is what the evaluation harness is for.

---

## DEC-06 — Refuse to serve when no trusted identity gateway is declared

**Date:** 2026-09-12 · **Status:** Active · **Reversibility:** Two-way · **Supersedes:** a
README warning

Tenant isolation depends on `oai-authenticated-user-id`, injected by a gateway in front of the
Worker. The header is unauthenticated at the application layer. Previously this was documented
as "must never be exposed as a production server". It is now enforced: without
`IDENTITY_GATEWAY` the API returns 503.

**Why the change.** A documented risk that depends on the deployer reading the README is not a
control. The failure mode — any tenant reading any other tenant's customer reviews — is severe
enough that it should be loud and automatic. See RISK-07.

**Trade-off.** One more binding to configure, and a deployment that fails closed rather than
running insecurely. That is the correct direction for this failure.

**Honest scope.** This makes an insecure deployment refuse to start. It does not authenticate
the header. A real fix is a signed session or mTLS between gateway and Worker, tracked as
[ISS-01](raid-log.md).

---

## DEC-07 — Cap datasets at 2,000 reviews and do not build for scale

**Date:** 2026-09-12 · **Status:** Active · **Reversibility:** Two-way

Every question loads the full dataset into Worker memory and computes similarity in
JavaScript. Embeddings are stored as JSON text in D1. The documented ceiling is 2,000 reviews
per dataset and 20 datasets per user.

**Why.** At the documented ceiling this is correct, simple, and has no index to keep in sync.
Building for a scale the product does not have is the more common and more expensive error.

**Where it breaks, explicitly.** Memory and latency grow linearly with dataset size. At
roughly 20,000+ reviews per dataset, per-question full loads become the bottleneck and this
design should be replaced with vector storage and an approximate-nearest-neighbour index, not
extended.

**Why this is written down.** Choosing not to scale is a decision. Leaving it implicit means
the next person reads the architecture as an oversight rather than a choice, and either
"fixes" it prematurely or is surprised by it at 50,000 rows.

---

## DEC-08 — Label the data and measure the baseline before building the next retrieval change

**Date:** 2026-09-12 · **Status:** Active · **Reversibility:** Two-way

No further retrieval work begins until a labelled golden set exists for it, the current
approach has been measured against it, and a threshold has been agreed and written into
`eval/thresholds.json`.

**Why.** This release got the order wrong. The feature was built first and the measurement
came after, which is why it ends in a no-go rather than a number. The lexical baseline of
**recall@5 = 0.20** is the single strongest justification for the semantic feature, and it was
available from a two-hour labelling exercise that could have happened in week one.

**Enforced by.** `npm run eval` runs in CI on every push. The holdout split refuses to run
without `--confirm` and appends every run to `eval/holdout-runs.log`, so "we did not tune on
the evaluation set" is an auditable claim rather than an assurance.

---

## Technical parameters

Recorded here so a change to any of them is a visible decision rather than a silent edit.

| Parameter               | Value                                                       | Changing it requires                             |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| Model                   | `Xenova/all-MiniLM-L6-v2` revision `751bff3`                | New baseline measurement; cache fingerprint bump |
| Runtime                 | Transformers.js 3.8.1, browser ESM via jsDelivr             | Re-run of the download-failure fallback path     |
| Inference               | Single-threaded WASM, q8, mean pooling, normalized, 384-dim | Re-measurement of latency gate                   |
| Device similarity floor | cosine 0.30                                                 | DEC-04 evidence; dev split only                  |
| OpenAI embeddings       | `text-embedding-3-small`, 256 dimensions                    | Re-index of all stored vectors                   |
| Generation              | `gpt-4.1-mini`, temperature 0, JSON mode, max 5 findings    | Faithfulness re-measurement                      |
| Provider budget         | 100 requests/user/UTC day, failures counted                 | Cost review                                      |
| Cache fingerprint       | model id + preprocessing version + review text SHA-256      | Bump on any preprocessing change                 |

OpenAI's 256-dimension vectors and the device's 384-dimension vectors are kept in separate
indexes and never mixed.
