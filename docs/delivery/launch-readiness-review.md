# Launch readiness review

**Release:** ReviewLens 0.1.0 · **Date:** 2026-09-12 · **Decision owner:** Saahil Gupta

## Decision

| Scope                                                                               | Call                                                                                           | Basis                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic analysis — statistics, complaint ranking, scoped evidence, comparison, import | **GO**                                                                                         | 36 automated tests green; retrieval regression gate green; deterministic calculations verified across all three answer modes                                                                    |
| OpenAI RAG — user-funded generated interpretations                                  | **GO, gated**                                                                                  | Quote verification and scope re-check are tested against a simulated provider; requires the user's own key; capped at 100 requests/day. Generation _quality_ is unmeasured and labelled as such |
| On-device semantic search — MiniLM in a browser worker                              | **NO-GO as a default mode. Ships behind an explicit "limited evidence" label, off by default** | The model has never executed in a browser. Every test covering it uses synthetic vectors. Retrieval quality is unmeasured                                                                       |
| Multi-tenant hosted deployment                                                      | **NO-GO**                                                                                      | Tenant isolation depends on a gateway-injected header (RISK-07). The API now refuses to serve without `IDENTITY_GATEWAY`, which makes the failure loud, not solved                              |

## The no-go, in full

The on-device semantic feature is the most interesting thing in this product and the reason
the repository exists. It is also the thing I declined to ship as a default.

**What is true:** the worker, the IndexedDB checkpointing, the pause/resume, the cache
fingerprinting, the scope re-check and the quote verification are all written, typed and
tested. The code path is exercised end-to-end with synthetic 384-dimension vectors.

**What is not true:** that any of it works. The authoring environment could not download the
model or runtime from Hugging Face and jsDelivr, so `Xenova/all-MiniLM-L6-v2` has never
produced a single embedding in this system. Synthetic-vector tests prove the plumbing moves
numbers correctly. They say nothing about whether the numbers mean anything.

**Why that matters more than usual here.** The feature's failure mode is not a crash. It is
returning plausible, well-formatted, quote-verified passages that are not actually relevant —
and doing so with a similarity score that a reader will mistake for confidence. A crash is
self-announcing. This is not. Shipping it on by default would produce a tool that looks like
it is working while giving a product manager wrong evidence for a roadmap decision.

**What would flip this to GO:** completing the [on-device UAT](uat-on-device.md), capturing
the resulting hits, and clearing the `semantic_release` gate in `eval/thresholds.json` —
recall@5 ≥ 0.70, precision@5 ≥ 0.50, absent-topic false-positive rate ≤ 0.25. Those bounds
were agreed before the feature was measured, specifically so they could not be adjusted to
whatever the model happened to produce.

## Evidence reviewed

| Evidence                                              | Status                                                         | Limitation                                                                 |
| ----------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                    | Pass                                                           | Types, not behaviour                                                       |
| `npm test` — 36 tests                                 | Pass                                                           | Simulated provider; synthetic vectors for the device path                  |
| `npm run eval` — retrieval regression gate, dev split | Pass · recall@5 0.200, precision@5 0.180, absent-topic FP 0.00 | 24-review fixture, one annotator. A regression gate, not an accuracy claim |
| Production build and one rendered-HTML smoke test     | Pass                                                           | Compilation is not browser inference                                       |
| Owner walkthrough with supplied fixtures              | Reported correct                                               | Self-reported; not an independent audit                                    |
| Real MiniLM download, inference, cache lifecycle      | **Not run**                                                    | External model download unavailable in the authoring environment           |
| Generated-answer faithfulness against a rubric        | **Not run**                                                    | No funded provider evaluation                                              |
| Cross-browser IndexedDB lifecycle                     | **Not run**                                                    | Requires the device UAT                                                    |
| Load or concurrency testing                           | **Not run**                                                    | Single-user scope; see [DEC-07](decision-log.md)                           |

## Conditions attached to the GO

1. On-device mode ships **off by default**, labelled "limited evidence", with the
   similarity cutoff documented as an uncalibrated heuristic.
2. The README leads with what has _not_ been established, not with the feature list.
3. No accuracy, time-saving, adoption or revenue figure is published anywhere in the
   repository. The metrics tree records targets as _proposed_, with instrumentation status
   marked honestly.
4. `IDENTITY_GATEWAY` must be set for any deployment reachable from the internet. The API
   returns 503 without it.

## What I would do differently

I built the feature before I built the way to measure it. The evaluation harness, the golden
set and the thresholds all came after the code, which is why the release ends with a no-go
instead of a number. Had the golden set existed first, the lexical baseline of recall@5 = 0.20
would have been known in week one — and that number is the strongest justification for the
feature. The correct order is: label the data, measure the baseline, agree the bar, then
build. That is now [DEC-08](decision-log.md) and the first item on the
[program plan](program-plan.md).
