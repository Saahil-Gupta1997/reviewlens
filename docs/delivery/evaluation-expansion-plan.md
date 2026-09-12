# Evaluation expansion: deferred after the failed experiment

q8 and fp32 measurements are complete. Both failed the development quality gate. The on-device feature is closed as a supported product feature; there is no current release candidate to justify a holdout run.

Before reopening retrieval work:

1. Have a different human independently label relevance without seeing the existing labels or outputs. Resolve disagreements, including the ambiguous login wording in VAL-016.
2. Validate the inference and evaluation pipeline, rather than assuming model capacity caused the failure.
3. Define a candidate and its acceptance bounds; build a larger development corpus and a separate held-out set with representative questions.
4. Measure the candidate and report results with case counts and measurement conditions.

The current set has 24 reviews, five relevant-topic development questions and two absent-topic development questions. One absent-topic error is 50%; this is not a stable population estimate. A larger or differently labelled sample could change the estimated performance. Failing the current gate justifies the recorded scope decision, not a claim about every corpus.

No holdout invocation is recorded by the repository harness. Its confirmation flag and local log discourage accidental runs; an absent log cannot prove that nobody inspected or evaluated publicly available holdout data elsewhere.
