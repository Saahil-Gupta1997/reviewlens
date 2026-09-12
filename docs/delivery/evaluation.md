# Evaluation and the release gate

The evaluation plan is executable. `npm run eval` scores retrieval against a human-labelled
golden set, compares the result to agreed thresholds, writes a report, and exits non-zero when
a gate fails. It runs in CI on every push.

```bash
npm run eval
```

## What is measured

| Metric                           | Definition                                                                   | Why this one                                                                                             |
| -------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| recall@5                         | Of the labelled-relevant reviews, the fraction appearing in the top 5        | The product promise is "find the evidence". Missing it is the primary failure                            |
| precision@5                      | Of the top 5 returned, the fraction labelled relevant                        | Noise costs the user reading time and erodes trust in every other answer                                 |
| MRR                              | Mean reciprocal rank of the first relevant result                            | Users read from the top. Rank 1 and rank 5 are not equally useful                                        |
| absent-topic false-positive rate | Of questions with **zero** relevant reviews, the fraction returning anything | The failure most likely to mislead a roadmap: inventing evidence for a topic the corpus does not contain |
| p95 latency                      | Retrieval only, excluding first-run model download                           | Separates steady-state cost from one-off setup cost                                                      |

Absent-topic cases have no relevant reviews, so recall and precision are undefined for them
and they are scored only on the false-positive rate. Keeping them in the set is deliberate: a
retriever can score well on recall by returning everything, and only the absent-topic cases
catch that.

## The golden set

`eval/golden-set.json` — 14 questions over the 24-review TaskFlow fixture, split 7 dev / 7
holdout, each with human-labelled relevant review ids and a written rationale.

Cases are chosen to separate mechanisms rather than to be representative:

- **paraphrase** — the question shares no vocabulary with the relevant reviews. "Which
  customers are locked out of their accounts?" matches reviews that never use "locked out" or
  "accounts". Lexical retrieval cannot succeed here; semantic retrieval should.
- **sentiment-discrimination** — "Who is happy with signing in?" Topic-only retrieval returns
  all nine login reviews and scores about 0.33 precision. This case exists to catch a
  retriever that matches topic while ignoring polarity.
- **vocabulary-overlap** — a control where lexical retrieval _should_ also win. If semantic
  loses here, it is trading recall for paraphrase handling and that trade needs to be explicit.
- **multi-theme** — a review that praises the interface while complaining about login, which a
  single-topic retriever will miss.
- **absent-topic** — no relevant reviews exist. Any result is a false positive.

Labels are from one annotator over 24 reviews. That is sufficient as a regression gate and
insufficient as an accuracy claim, and the golden set file says so in its own metadata. A
second annotator is P0 on the [program plan](program-plan.md).

## Measured baseline

Dev split, lexical retrieval as shipped:

| Retriever          | recall@5  | precision@5 | MRR       | absent-topic FP | p95 ms    |
| ------------------ | --------- | ----------- | --------- | --------------- | --------- |
| lexical-baseline   | **0.200** | 0.180       | 0.400     | 0.00            | ~13       |
| on-device-semantic | _not run_ | _not run_   | _not run_ | _not run_       | _not run_ |

**Lexical retrieval finds one in five relevant reviews on paraphrased questions.** On D1
("Which customers are locked out of their accounts?") it returns nothing at all, because no
review contains the query's vocabulary and no taxonomy term fires.

That number is the justification for the semantic feature. Before it was measured, "keyword
search misses paraphrases" was a plausible belief; it is now a quantity that a threshold can
be set against. It also sets the bar: a semantic mode that does not clearly beat 0.20 has no
reason to exist, given the download cost, the device constraints and the CDN dependency it
brings with it.

The absent-topic false-positive rate of 0.00 is worth noting as the thing the lexical baseline
gets _right_. It returns nothing for battery life and shipping, correctly. A semantic
retriever will find _something_ similar to any query, which is exactly why that metric is
gated tightly for the semantic release.

## Two gate sets

`eval/thresholds.json`

**`regression`** — enforced on every run and in CI. Pinned at the measured lexical baseline.
Passing means retrieval has not got worse. It explicitly does not mean retrieval is good, and
the report prints that sentence every time so a green build cannot be misread.

**`semantic_release`** — enforced only when a run supplies captured on-device hits via
`--hits`. recall@5 ≥ 0.70, precision@5 ≥ 0.50, absent-topic FP ≤ 0.25, p95 ≤ 1500 ms.

The release bounds were written **before** the feature was measured. That ordering is the
point: a threshold agreed after seeing the result is not a threshold, it is a description.
Recall 0.70 is a 3.5× improvement on the baseline and is roughly where a product manager can
rely on the tool to surface most of the relevant evidence rather than a sample of it.

## Holdout protection

The holdout split refuses to run without an explicit `--confirm` flag:

```
Refusing to run the holdout split without --confirm.
The holdout set exists to measure a release candidate once. Running it casually,
or after every tuning change, destroys its value as independent evidence.
```

Every holdout run appends a line to `eval/holdout-runs.log` with the timestamp, golden-set
version, retriever and result. That log is the audit trail: "we did not tune on the evaluation
set" becomes a checkable claim rather than an assurance. If the log shows forty holdout runs
and forty threshold edits, the evidence is worthless and anyone can see it.

## Running the semantic evaluation

The harness is finished and waiting on input. Once the [on-device UAT](uat-on-device.md)
produces captured hits:

```bash
npm run eval -- --hits eval/captured-hits.json
```

This adds a second row to the comparison table, promotes the run to the `semantic_release`
gate, and either clears the feature for default-on or does not. The capture format is a JSON
object keyed by case id — see [the UAT](uat-on-device.md#capturing-hits).

## What this does not establish

These numbers describe retrieval over a 24-review fictional fixture labelled by its author.
They are a regression gate and a design instrument. They are not evidence of production
accuracy, they do not measure generated-answer faithfulness, and they say nothing about
performance on real customer review data in a language other than English.

The next increment is a larger corpus with a second annotator, reported with sample sizes and
inter-annotator agreement. Until then, no accuracy claim appears anywhere in this repository.
