# Release gates

Definition of Done, expressed as commands rather than intentions. Every gate below either
runs in CI or is named as a manual step with an owner — there is no third category of "we
generally make sure that".

## Automated — enforced on every push

```bash
npm run verify
```

| #   | Gate                  | Command                | Fails when                                                                   |
| --- | --------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| 1 | Types | `npx tsc --noEmit` | Any type error |
| 2 | Lint | `npm run lint` | ESLint error |
| 3 | Behaviour | `npm test` — 52 tests + smoke | Any failure across engine, API, device-ranking and rendered-HTML suites |
| 4 | Build | `npm run build` (inside `npm test`) | Production build or the rendered-HTML smoke test fails |
| 5 | **Retrieval quality** | `npm run eval` | recall@5 < 0.19, precision@5 < 0.17, absent-topic FP > 0.30, or p95 > 250 ms |

Gate 5 is the one that makes this a release process rather than a test suite. It fails the
build on a **quality regression**, not just a broken build — a change that keeps every test
green while making retrieval worse still stops the pipeline.

## Conditional — enforced when the input exists

| #   | Gate                 | Command                         | Applies                                                                                                                                                     |
| --- | -------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6 | Semantic release bar | `npm run eval -- --hits <file>` | Only when captured on-device hits exist. Promotes the run to `semantic_release`: recall@5 ≥ 0.70, precision@5 ≥ 0.50, absent-topic FP ≤ 0.25, p95 ≤ 1500 ms |
| 7 | Holdout measurement  | `npm run eval:holdout`          | Release candidates only. Refuses without `--confirm`; appends to `eval/holdout-runs.log`                                                                    |

## Manual — named, not assumed

| #   | Gate                                                         | Owner role   | State                                         |
| --- | ------------------------------------------------------------ | ------------ | --------------------------------------------- |
| 8 | On-device UAT on a real browser                              | QA           | **Not run** — ISS-03, blocks default-on       |
| 9 | Cross-browser IndexedDB lifecycle                            | QA           | **Not run**                                   |
| 10 | Faithfulness review of generated answers                     | ML / Product | **Not run** — ISS-04                          |
| 11 | `IDENTITY_GATEWAY` set for any internet-reachable deployment | Backend      | Enforced in code — API returns 503 without it |

Gates 8–10 are unmet. That is why the on-device feature is
[held back from default-on](launch-readiness-review.md) rather than shipped with the gates
waived.

## Rules

**A gate may not be changed to make a build pass.** Changing a threshold requires a dated
entry in the [decision log](decision-log.md) stating the new value, the evidence, and who
agreed it. `eval/thresholds.json` says this in its own `note` field so the rule is visible at
the point of temptation.

**Thresholds are agreed before the thing is measured.** The `semantic_release` bounds were
written before any real model output existed. A threshold set after seeing the result is a
description of the result.

**The holdout split is run once per release candidate.** Every run is logged. A log showing
repeated holdout runs alongside repeated threshold edits invalidates the evidence, visibly.

**A green build is not a quality claim.** The regression gate's own rationale prints in every
report: _"Passing this gate means retrieval has not got worse. It does NOT mean retrieval is
good."_

## What is deliberately not gated

| Not gated                | Why                                                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test coverage percentage | Encourages tests written to raise a number. The gates above test behaviour that matters, including the one control added this release (identity gateway) |
| Bundle size              | No performance budget has been agreed, so a gate would be arbitrary. First-run model download dominates anyway                                           |
| Load and concurrency     | Single-user scope by decision ([DEC-07](decision-log.md)). Gating it would imply a scale claim the product does not make                                 |
