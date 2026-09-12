# Retrieval evaluation report

- Generated: 2026-09-12T20:07:26.561Z
- Golden set: `golden-v1` / corpus 24 reviews / k=5
- Split: **dev**
- Gate result: **PASS**
- Semantic retrieval: Not evaluated in this run. See semantic-q8.md and semantic-fp32.md for the captured development results.

## Retriever comparison

| Retriever | recall@5 | precision@5 | MRR | absent-topic FP rate | p50 ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| lexical-baseline | 0.200 | 0.180 | 0.400 | 0.00 | 0.3 | 5.8 |

- Timing (lexical-baseline): Measured in-process lexical search; excludes network and UI.

Precision is measured over returned results (up to 5), averaged over relevant-topic cases; it is not fixed-denominator precision@5.

## Gate set `regression` applied to `lexical-baseline`

> Pinned at the measured lexical baseline with a small tolerance for floating-point summation. Passing this gate means retrieval has not got worse. It does NOT mean retrieval is good.

| Gate | Bound | Actual | Result |
| --- | --- | --- | --- |
| recall_at_5 | >= 0.19 | 0.200 | PASS |
| precision_at_5 | >= 0.17 | 0.180 | PASS |
| absent_topic_false_positive_rate | <= 0.3 | 0.000 | PASS |
| p95_latency_ms | <= 250 | 5.825 | PASS |

## Per-case detail - lexical-baseline

| Case | Category | Question | Relevant | Retrieved | R@5 | P@5 | Missed | Spurious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | paraphrase | Which customers are locked out of their accounts? | 5 | 0 | 0.00 | 0.00 | VAL-013 VAL-014 VAL-015 VAL-017 VAL-018 | - |
| D2 | paraphrase | Does anything take a long time to appear on screen? | 3 | 2 | 0.33 | 0.50 | VAL-007 VAL-010 | VAL-011 |
| D3 | paraphrase | Is anyone struggling to get assistance from the team? | 2 | 1 | 0.00 | 0.00 | VAL-012 VAL-020 | VAL-016 |
| D4 | sentiment-discrimination | Who is happy with signing in? | 3 | 5 | 0.67 | 0.40 | VAL-024 | VAL-013 VAL-014 VAL-015 |
| D5 | paraphrase | Can people get their information out of the product? | 2 | 2 | 0.00 | 0.00 | VAL-008 VAL-023 | VAL-001 VAL-016 |
| D6 | absent-topic | What do people say about battery life? | - | 0 | n/a | n/a | - | - |
| D7 | absent-topic | Are there complaints about delivery or shipping? | - | 0 | n/a | n/a | - | - |

## How to read this

Absent-topic cases have no relevant reviews. For those, any retrieved result is a false
positive, and recall/precision are undefined. A high false-positive rate means the retriever
answers questions the corpus cannot support - the failure mode most likely to mislead a
product decision.

Similarity is not confidence. These numbers describe retrieval over a 24-review fixture
labelled by one annotator. Gate results apply to this sample, not production accuracy.
