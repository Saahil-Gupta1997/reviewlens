# dtype experiment: quantisation was not the problem

**Date:** 2026-09-12 · **Issue:** #8 · **Result: fp32 is no better. The pre-agreed rule says cut.**

The on-device feature [missed its gate](evaluation-semantic-result.md) at q8, and
[no threshold fixes it](../../eval/reports/threshold-sweep.md). Two causes were plausible:
**quantisation damage** from q8, or **model capacity** in MiniLM-L6. This separates them.

## Method

`scripts/device-harness/experiment.html` runs both dtypes through the identical chunking,
cosine and `rank()` from `semantic-core.js`. The only variable is `dtype`. q8 is re-run as a
control rather than assumed from the earlier capture.

## Control check

q8 reproduced **exactly** — D1 returned `VAL-020@0.3369 VAL-004@0.3309 VAL-012@0.3165`, identical
to the original run. The instrument is stable.

## Result

| | lexical | q8 | **fp32** | Bar |
| --- | --- | --- | --- | --- |
| recall@5 | 0.200 | 0.267 | **0.200** | ≥ 0.70 |
| precision@5 | 0.180 | 0.320 | **0.300** | ≥ 0.50 |
| absent-topic FP | **0.00** | 0.50 | **0.50** | ≤ 0.25 |
| Model load | — | 7,834 ms | **34,470 ms** | — |
| Index 24 reviews | — | 706 ms | 672 ms | — |

**fp32 is worse than q8 on recall**, identical on false positives, and takes **4.4× longer to
load**.

On D2 — the one case semantic retrieval got right — fp32 *lost* a correct answer: q8 returned
all three relevant reviews, fp32 dropped `VAL-010` below the floor. On D1, fp32 still returned
only customer-support reviews and still missed all five login-failure reviews.

fp32 recall@5 of **0.200** is exactly the lexical baseline. Removing quantisation bought
nothing.

## Conclusion

**Quantisation was not the cause.** The limitation is the model. MiniLM-L6 does not encode the
relationship between *"locked out of their accounts"* and *"Login is broken. I cannot access my
workspace after the update."* — at any precision. Full-precision weights cannot supply a
relationship the model never learned.

## The decision rule, applied

Agreed in advance in #8, before the test was run:

| fp32 recall@5 | Action |
| --- | --- |
| ≥ 0.70 | Quantisation was the problem. Ship fp32 |
| 0.50–0.70 | Capacity marginal. Try a larger model, then hybrid |
| **< 0.50** | **Cut the on-device mode** |

Measured: **0.200**. The rule says **cut**.

## Why the rule is being honoured rather than reopened

Hybrid retrieval is untested and the complementary failure modes — lexical scores 0.00 on
absent topics where semantic scores 0.50; semantic scores 1.00 on D2 where lexical scores 0.33
— remain the most interesting signal in this data.

That is not a reason to set this result aside. The rule was written before the number existed
precisely so that a disappointing number could not be argued away, and "the result was bad, so
let us test one more thing before accepting it" is how a pre-agreed bar quietly becomes
advisory. The same reasoning would have justified moving the 0.30 threshold.

So: **the on-device mode as designed is cut.** Hybrid retrieval is a *different* feature. If it
is built, it gets its own bar, agreed before it is measured, and its own entry in this log.

## What the feature cost, and what it returned

| Cost | Return |
| --- | --- |
| 1.7 MB runtime + model download | recall@5 0.267 at q8 |
| CDN dependency on jsDelivr and Hugging Face | vs 0.200 for keyword matching |
| Device storage and IndexedDB lifecycle | **+0.067 recall** |
| A similarity floor that cannot be calibrated | **and 0.50 absent-topic false positives, vs 0.00** |

A feature that invents evidence on half the questions about topics the data does not contain is
worse than no feature, for a tool whose purpose is traceable evidence.

## Reproduce

```bash
node scripts/device-harness/serve.mjs 8799   # then open /experiment
npm run eval -- --hits eval/captured-hits-fp32.json
```

Holdout split remains unrun. It should stay that way — there is no candidate to measure.
