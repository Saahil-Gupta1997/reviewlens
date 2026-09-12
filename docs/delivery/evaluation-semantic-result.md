# Semantic evaluation result — the feature missed its gate

**Date:** 2026-09-12 · **Split:** dev (7 cases) · **Gate:** `semantic_release` · **Result: FAIL**

The on-device model ran in a real browser for the first time, its output was scored against
the golden set, and it did not clear the bar agreed before the captured semantic measurements.

This document reports that result because the
[release gates](release-gates.md) require reporting it either way. A missed gate is a result.

## Conditions

| | |
| --- | --- |
| Browser | Chrome 152.0.7977.76, Windows 11 |
| Model | `Xenova/all-MiniLM-L6-v2` revision `751bff3` |
| Inference | q8, WASM, single-threaded, mean pooling, normalized, 384 dimensions |
| Runtime | `@huggingface/transformers@3.8.1` `dist/transformers.min.js` via jsDelivr |
| Harness | `scripts/device-harness/` running the shipped `public/semantic-worker.js` unmodified |
| Index | 24/24 reviews in 11,242 ms; persistence confirmed across a re-read |
| Query latency | 22–38 ms |

Getting this far required fixing a defect that made the feature unable to start at all — see
[the load postmortem](postmortem-device-model-load.md).

## Result

| Retriever | recall@5 | precision@5 | MRR | absent-topic FP | p95 ms |
| --- | --- | --- | --- | --- | --- |
| lexical-baseline | 0.200 | 0.180 | 0.400 | **0.00** | ~13 |
| on-device-semantic | **0.267** | **0.320** | 0.400 | **0.50 (1/2)** | 38 |
| **Gate** | ≥ 0.70 | ≥ 0.50 | — | ≤ 0.25 | ≤ 1500 |
| | FAIL | FAIL | — | FAIL | PASS |

Semantic retrieval beats the lexical baseline on recall (0.267 vs 0.200) and precision (0.320
vs 0.180). It returned an irrelevant existing review for one of two absent-topic questions; lexical returned none for both. This is a retrieval false positive, not fabricated review text.

## Per case

| Case | Question | Result |
| --- | --- | --- |
| D1 | "Which customers are locked out of their accounts?" | **0.00 recall.** Returned three customer-support reviews; all five login-failure reviews missed |
| D2 | "Does anything take a long time to appear on screen?" | **1.00 recall**, 0.60 precision. Semantic retrieval working as intended |
| D3 | "Is anyone struggling to get assistance from the team?" | 0.00 recall — but both correct reviews ranked #1 and #2, suppressed by the 0.30 floor |
| D4 | "Who is happy with signing in?" | 0.33 recall, 1.00 precision. Partial sentiment discrimination |
| D5 | "Can people get their information out of the product?" | 0.00 recall. Correct answers ranked #3 and #8 |
| D6 | Battery life (absent) | Correct — returned nothing |
| D7 | Shipping (absent) | **False positive.** Returned "The price is acceptable. I have no other comments." |

D2 proves the mechanism works. D1 proves it is not reliable.

## Threshold sweep

None of the 66 tested floors from −0.05 to 0.60 clears the quality bounds on this development set. Relevant and irrelevant scores overlap in these cases. A single global floor did not rescue this pipeline on this data; this does not establish failure on every corpus or identify a model-capacity root cause.

The old sub-millisecond latency was saved-hit lookup time and is invalid. The corrected q8 report uses seven recorded browser worker round-trips (22–38 ms; sample p95 38 ms), excluding initial indexing/download. The precision column uses relevant hits divided by returned results, up to five, averaged across relevant-topic questions.

## Why D1 matters most

D1 is the case the whole feature was built for: a question sharing no vocabulary with the
reviews, where lexical retrieval returns nothing. Semantic retrieval was supposed to win here.

It returned three reviews about **customer support** and ranked every login-failure review
below them. "Customer support was unhelpful and ignored my request" scored higher for *"Which
customers are locked out of their accounts?"* than *"Login is broken. I cannot access my
workspace after the update."*

That is not a threshold problem. The ranking is wrong.

## Decision

The on-device semantic mode **stays off by default and is not promoted**. Per
[DEC-03](decision-log.md), recorded as a two-way door precisely so this outcome would be
routine, the options are to change approach or cut the feature.

The thresholds are not being moved. They were agreed before measurement specifically so this
could not happen, and `eval/thresholds.json` says so in its own note.

## Follow-up completed

The fp32 experiment also failed. See [the result](evaluation-dtype-experiment.md). The on-device feature is no longer supported; its harness is retained for inspection. No threshold was relaxed and no further model experiment is scheduled.

## Honest limits of this result

- **n = 5** scored dev cases, 24 reviews, one annotator. This is enough to fail a gate — the
  failure is large and consistent — but not enough to characterise the model.
- The holdout split has **not** been run. It should not be, until a candidate passes on dev.
- A different corpus or domain could produce different results. The finding is about this
  configuration on this data.
