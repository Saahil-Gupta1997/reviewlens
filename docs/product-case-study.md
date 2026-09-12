# Product case study

Product managers need to distinguish recurring complaints from memorable anecdotes. ReviewLens
supports investigation through imports, corpus statistics, scoped questions and traceable
evidence. It does not decide a roadmap, and that boundary is deliberate: a tool that ranks
complaints _and_ recommends what to build hides the judgement step where a product manager
adds value.

The first release covered CSV/JSON validation, statistics, source inspection, comparison,
history and exports. The next increment added no-key semantic retrieval, because API billing
blocked evaluation entirely and a mode that costs nothing per request was the only way to make
semantic retrieval demonstrable. Generated interpretations remain a separately paid option.

## Acceptance criteria

Preserve valid rows; calculate exact counts and denominators; isolate owners; keep citations
inside scope; show exact quotations; distinguish generated prose, rule labels and retrieved
evidence. Device indexing should require no key, preserve completed progress, and fail with an
actionable fallback.

Each of these became a test rather than an intention — see
[release gates](delivery/release-gates.md).

## Success measures

Definitions and instrumentation status are in [metrics](delivery/metrics.md), which separates
the numbers that are **measured** from the targets that are **proposed**. One measured number
matters most: lexical retrieval scores **recall@5 = 0.20** on the labelled golden set, which
is the baseline the semantic feature exists to beat.

No real-world accuracy, time-saving percentage, revenue or adoption figure is asserted
anywhere in this repository, because none has been measured.

## Ownership

This project was built with Codex assistance. Being specific about the division of labour
matters more than the headline, because "an AI wrote it" and "I directed an AI-assisted
delivery" are different claims, and only one of them is demonstrable.

**Mine, and checkable in this repository:**

- The product boundary — evidence, not recommendations — and the decision to compute every
  statistic in code so the core value never depends on an API key
  ([DEC-01, DEC-02](delivery/decision-log.md))
- The cost constraint that forced the architecture. API billing blocked evaluation; the
  on-device mode is the response to that constraint, not a technology preference
  ([DEC-03](delivery/decision-log.md))
- The acceptance criteria above, and the 24 in-app acceptance cases written from the
  requirement rather than from the implementation
- The rating defect: found by hand-checking an expected count against a fixture, reproduced in
  a failing test before any fix, and root-caused to a design assumption rather than to a
  parsing bug ([postmortem](delivery/postmortem-rating-defect.md))
- The golden set — 14 questions with human-labelled relevant review ids, chosen to separate
  retrieval mechanisms rather than to be representative, each with a written rationale
- The thresholds, agreed before the feature was measured, and the rule that changing one
  requires a dated decision entry
- The no-go on the headline feature, against my own sunk effort
  ([launch readiness](delivery/launch-readiness-review.md))
- The review pass over the shipped code that found the identity-header risk, and the decision
  to convert it from a README warning into a control that fails closed
  ([DEC-06](delivery/decision-log.md))

**Codex's, with my review:** implementation of the application code, the browser worker, the
test suites, the evaluation harness, and drafting of this documentation.

**What this is evidence of:** scoping an AI feature against a cost constraint, defining what
"working" means before measuring the semantic results, enforcing that definition mechanically, root-causing a
defect in analytical output, and declining to ship against my own evidence.

**What it is not evidence of:** managing an enterprise engineering team, running a production
incident under load, or delivering a regulated release. A solo portfolio build cannot
demonstrate those, and claiming otherwise would contradict the discipline this project is
about.

## The honest weakness

The measurement came after the feature. The golden set, the harness and the thresholds were
all built once the semantic mode already existed, which is why this release ends in a no-go
rather than in a number. Had the labelling happened first — a two-hour exercise — the lexical
baseline of recall@5 = 0.20 would have been known in week one, and it is the single strongest
justification the feature has.

The correct order is: label the data, measure the baseline, agree the bar, then build. That is
recorded as [DEC-08](delivery/decision-log.md) and is the first process change carried into
the [program plan](delivery/program-plan.md).
