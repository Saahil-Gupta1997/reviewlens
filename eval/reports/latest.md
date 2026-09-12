# Retrieval evaluation report

- Generated: 2026-09-12T13:22:00.469Z
- Golden set: `golden-v1` / corpus 24 reviews / k=5
- Split: **dev**
- Gate result: **FAIL**
- Semantic retrieval: measured from captured on-device hits

## Retriever comparison

| Retriever | recall@5 | precision@5 | MRR | absent-topic FP rate | p50 ms | p95 ms |
| --- | --- | --- | --- | --- | --- | --- |
| lexical-baseline | 0.200 | 0.180 | 0.400 | 0.00 | 0.6 | 12.1 |
| on-device-semantic | 0.200 | 0.300 | 0.400 | 0.50 | 0.0 | 0.1 |

## Gate set `semantic_release` applied to `on-device-semantic`

> Agreed before the feature was measured, so the bar could not be set to whatever the model happened to produce. Recall 0.70 is a 3.5x improvement on the lexical baseline and is the point at which a product manager can trust the tool to surface most relevant evidence. The absent-topic bound is deliberately tight: a semantic retriever that invents relevance on topics the corpus does not contain is worse than no feature at all. Latency allows for on-device inference but excludes first-run model download.

| Gate | Bound | Actual | Result |
| --- | --- | --- | --- |
| recall_at_5 | >= 0.7 | 0.200 | FAIL |
| precision_at_5 | >= 0.5 | 0.300 | FAIL |
| absent_topic_false_positive_rate | <= 0.25 | 0.500 | FAIL |
| p95_latency_ms | <= 1500 | 0.078 | PASS |

## Per-case detail - on-device-semantic

| Case | Category | Question | Relevant | Retrieved | R@5 | P@5 | Missed | Spurious |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | paraphrase | Which customers are locked out of their accounts? | 5 | 2 | 0.00 | 0.00 | VAL-013 VAL-014 VAL-015 VAL-017 VAL-018 | VAL-020 VAL-012 |
| D2 | paraphrase | Does anything take a long time to appear on screen? | 3 | 4 | 0.67 | 0.50 | VAL-010 | VAL-005 VAL-011 |
| D3 | paraphrase | Is anyone struggling to get assistance from the team? | 2 | 0 | 0.00 | 0.00 | VAL-012 VAL-020 | - |
| D4 | sentiment-discrimination | Who is happy with signing in? | 3 | 1 | 0.33 | 1.00 | VAL-001 VAL-002 | - |
| D5 | paraphrase | Can people get their information out of the product? | 2 | 0 | 0.00 | 0.00 | VAL-008 VAL-023 | - |
| D6 | absent-topic | What do people say about battery life? | - | 0 | n/a | n/a | - | - |
| D7 | absent-topic | Are there complaints about delivery or shipping? | - | 1 | n/a | 0.00 | - | VAL-022 |

## How to read this

Absent-topic cases have no relevant reviews. For those, any retrieved result is a false
positive, and recall/precision are undefined. A high false-positive rate means the retriever
answers questions the corpus cannot support - the failure mode most likely to mislead a
product decision.

Similarity is not confidence. These numbers describe retrieval over a 24-review fixture
labelled by one annotator. They are a regression gate, not evidence of production accuracy.
