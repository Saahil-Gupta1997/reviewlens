# Metrics

Two kinds of number appear in this repository and they are never mixed:

- **Measured** — produced by a command anyone can run. Reported with the command.
- **Proposed** — a definition and a target with no instrumentation behind it. Reported as a
  target, never as a result.

Nothing in this repository claims a real-world accuracy, time-saving, adoption or revenue
figure, because none has been measured.

## Measured today

| Metric                                    | Value      | Command            | Caveat                                             |
| ----------------------------------------- | ---------- | ------------------ | -------------------------------------------------- |
| Retrieval recall@5, lexical, dev split    | **0.200**  | `npm run eval`     | 24-review fixture, one annotator                   |
| Retrieval recall@5, **on-device semantic** | **0.267** | `npm run eval -- --hits eval/captured-hits.json --timings eval/captured-hits.meta.json` | Chrome 152. Bar was 0.70 — **FAILED** |
| Retrieval precision@5, on-device semantic | 0.320 | `npm run eval -- --hits eval/captured-hits.json --timings eval/captured-hits.meta.json` | Bar was 0.50 — **FAILED** |
| Absent-topic FP rate, on-device semantic | **0.50 (1/2 questions)** | `npm run eval -- --hits eval/captured-hits.json --timings eval/captured-hits.meta.json` | Bar was 0.25 — **FAILED**. Lexical scores 0.00 here |
| Thresholds clearing the semantic gate | **0 of 66 tested floors** | `node scripts/threshold-sweep.mjs` | None of the tested floors clears the quality bounds on this dev set |
| On-device index build, 24 reviews | **11,242 ms** | `scripts/device-harness/` | q8 WASM single-thread, first run incl. model download |
| On-device query latency | **22–38 ms** | `scripts/device-harness/` | After the index is warm |
| Retrieval precision@5, lexical, dev split | 0.180      | `npm run eval`     | as above                                           |
| MRR, lexical, dev split                   | 0.400      | `npm run eval`     | as above                                           |
| Absent-topic false-positive rate, lexical | 0.000      | `npm run eval`     | 2 dev cases only                                   |
| p95 retrieval latency                     | ~13 ms     | `npm run eval`     | In-process, excludes network and model load        |
| Automated test count                      | See verification output | `npm test`         | Simulated provider; synthetic device vectors       |
| Acceptance cases in-app                   | 24         | Quality tab        | Synthetic; routing, calculations, scope, ingestion |
| Type errors                               | 0          | `npx tsc --noEmit` |                                                    |

## Proposed — not instrumented

Definitions are written now so that if this became a real product the measurement would not be
invented retrospectively to fit whatever the product happened to do.

### Outcome

| Metric                           | Definition                                                                                              | Target                                  | Instrumentation                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Time to verified finding         | Minutes from dataset import to a complaint the user has confirmed by opening at least one source review | Below manual reading of the same corpus | **None.** Needs session timing + a "verified" event                                                |
| Analyst-rated useful-answer rate | Share of answers a domain reader marks useful, on a labelled sample                                     | ≥ 0.70                                  | **Partial.** `feedback` column exists (useful / incorrect / unsupported); no sampling or reporting |
| Decision influence               | Share of investigations cited in a roadmap or prioritisation artefact                                   | —                                       | **None.** Requires a research study, not telemetry                                                 |

### Quality

| Metric                           | Definition                                                                                           | Target                         | Instrumentation                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Retrieval recall@5               | As measured above, on a held-out labelled set                                                        | ≥ 0.70 for semantic default-on | Development captures complete; held-out candidate evaluation deferred                                     |
| Retrieval precision@5            | As above                                                                                             | ≥ 0.50                         | Same                                                                                    |
| Absent-topic false-positive rate | Share of zero-evidence questions returning any result                                                | ≤ 0.25                         | Same                                                                                    |
| Unsupported-claim rate           | Share of generated findings whose claim is not supported by its verified quote, on a labelled rubric | ≤ 0.05                         | **None.** Quote _existence_ is enforced in code; claim _support_ is unmeasured (ISS-04) |
| Clarification correctness        | Share of clarification requests that were genuinely ambiguous, vs. avoidable refusals                | —                              | **None.** Needs labelled question set                                                   |

### Operational

| Metric                         | Definition                                                                        | Target              | Instrumentation                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------- |
| Download-to-first-answer       | First-run model download + index build, to first on-device answer                 | —                   | Partial: harness records indexing including first load; no full app first-answer measurement                                                                          |
| Index abandonment rate         | Share of started indexing runs never completed                                    | —                   | **None**                                                                                                        |
| Steady-state query latency p95 | Retrieval after the index is warm                                                 | ≤ 1500 ms on device | q8: seven paired browser observations, sample p95 38 ms; fp32: NOT_MEASURED                                                                           |
| Cost per investigation         | Provider spend per completed investigation, separating embeddings from generation | —                   | **Partial.** `usage` table records requests and token counts per user per day; no per-investigation attribution |

## Why so much of this says "None"

An instrumentation column that is mostly empty is the accurate picture of a portfolio project
that has never had a user. The alternative — inventing a plausible "40% faster investigation"
— would be the actual failure, and it is the failure this table exists to make impossible.

The useful output is the **definitions**. "Analyst-rated useful-answer rate on a labelled
sample" is a commitment to a specific, falsifiable measurement. "Improves productivity" is
not. Agreeing the definition and the baseline _before_ the feature ships is the part of the
job that is hard to retrofit, and it is the part shown here.

## Baseline discipline

The lexical baseline and subsequent semantic measurements support a bounded scope decision. Any target agreed without a baseline is a guess, and
a guess that later gets quietly adjusted to match the result is worse than no target. That is
why `eval/thresholds.json` records the measured baseline next to the gates, and why changing a
gate requires a dated entry in the [decision log](decision-log.md).

Timing correction: the original sub-millisecond semantic report measured saved-hit lookup and is invalid. Use the paired capture commands in [evaluation](evaluation.md); q8 sample p95 is 38 ms across seven queries, and fp32 latency is NOT_MEASURED. The precision metric divides by returned results (up to five), not a fixed denominator of five.
