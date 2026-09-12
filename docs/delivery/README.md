# Delivery artifacts

This directory is the part of the repository written for a hiring manager rather than a user.
It shows how the product was scoped, decided, gated, measured and released — including the
decision **not** to ship the headline feature.

## Read in this order

| #   | Document                                                     | What it demonstrates                                                            | Time  |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------- | ----- |
| 0 | [The delivery narrative](narrative.md) | The whole project on one page: problem, constraint, baseline, decision, defect, gate, no-go, next | 3 min |
| 1   | [Launch readiness review](launch-readiness-review.md)        | A go/no-go with one feature held back, and the evidence behind both calls       | 4 min |
| 2   | [Evaluation and the release gate](evaluation.md)             | Turning an eval plan into an executable gate with measured numbers              | 5 min |
| 2b | [**Semantic result — the feature missed its gate**](evaluation-semantic-result.md) | A measured failure, reported with the sweep proving calibration cannot fix it | 5 min |
| 2c | [Postmortem: the model could never have loaded](postmortem-device-model-load.md) | A runtime import defect hidden behind a misleading error message | 4 min |
| 2d | [Expanding the evaluation](evaluation-expansion-plan.md) | What more data would and would not fix, and the one control that needs a second person | 4 min |
| 2e | [dtype experiment: quantisation was not the problem](evaluation-dtype-experiment.md) | fp32 tested and rejected; the pre-agreed cut rule applied rather than reopened | 3 min |
| 3   | [AI risk assessment](ai-risk-assessment.md)                  | Model-specific failure modes mapped to controls in code, each with a test       | 6 min |
| 4   | [Decision log](decision-log.md)                              | Dated decisions with trade-offs, reversibility, and what would change my mind   | 5 min |
| 5   | [RAID log](raid-log.md)                                      | Live risks, assumptions, issues and dependencies with owners and review dates   | 4 min |
| 6   | [Program plan](program-plan.md)                              | Increments, what was descoped and why, the critical path                        | 4 min |
| 7   | [Metrics](metrics.md)                                        | The measurement tree, and an honest instrumentation status                      | 3 min |
| 8   | [Release gates](release-gates.md)                            | Definition of Done that a machine enforces, not a checklist I promise to follow | 3 min |
| 9   | [Postmortem: rating conditions](postmortem-rating-defect.md) | A real defect, timeline, root cause, and the regression that pins it            | 4 min |
| 10  | [On-device UAT](uat-on-device.md)                            | The executable test plan for the feature that has not shipped                   | 4 min |

## The short version

ReviewLens answers questions about product reviews. The delivery problem it exists to
illustrate is the one every AI feature has: **the demo works, and that tells you nothing
about whether the feature works.**

Three things in this repository are there to address that.

**A measured baseline instead of an assumption.** The product hypothesis was that keyword
search misses paraphrased questions. That was a belief until it was measured. It is now a
number: on a human-labelled golden set, lexical retrieval scores **recall@5 = 0.20**. Four in
five relevant reviews are missed. That number justifies the semantic feature, and it is the
bar the feature has to beat.

**A gate that can fail.** `npm run eval` scores retrieval against the golden set and exits
non-zero below threshold. It runs in CI on every push. There are two threshold sets: a
regression gate pinned at the measured baseline, and a release gate — agreed _before_ the
feature was measured — that on-device semantic retrieval must clear before it can ship as a
default mode. The holdout split refuses to run without an explicit confirmation flag, and
every holdout run is appended to an audit log.

**A no-go that stuck.** On-device semantic search is built, typed, tested against synthetic
vectors, and **not shipped as a default mode**, because the model has never actually run in a
browser. The evaluation harness for it is finished and waiting for input; the feature is
behind an explicit "limited evidence" label. That call is recorded in the
[launch readiness review](launch-readiness-review.md) with the evidence for it.

## What this repository is not

It is not evidence of managing a large engineering team, a production incident under load, or
a regulated release. It is a solo build, assisted by Codex, and
[the ownership section](../product-case-study.md#ownership) says exactly which parts were
which. The transferable claim is narrower and specific: scoping an AI feature, defining what
"working" means, correcting earlier acceptance gaps, enforcing that definition mechanically, and declining to
ship against my own evidence.
