# Evaluation and release gate

`npm run eval` runs the lexical development regression check. It does not evaluate semantic retrieval unless captured hits are supplied. CI passing means the baseline has not regressed; it does not approve semantic quality.

The golden set contains 24 fictional reviews and 14 questions, split into seven development and seven holdout cases. The development split has five relevant-topic and two absent-topic cases, with one annotator. It is a diagnostic fixture, not a representative customer benchmark.

| Metric | Definition |
| --- | --- |
| Recall@5 | Relevant hits among the first five returned, divided by all labelled relevant reviews; mean across relevant-topic questions |
| `precision_at_5` (legacy key) | Relevant hits divided by the number returned, up to five; mean across relevant-topic questions. This is not fixed-denominator precision@5. |
| MRR | Reciprocal rank of the first relevant hit; mean across relevant-topic questions |
| Absent-topic false-positive rate | Questions returning any review divided by absent-topic questions; report numerator and denominator |
| Latency | Lexical: measured in-process execution. Semantic: paired browser worker round-trips, or NOT_MEASURED. Excludes initial indexing/download. |

## Captured semantic results

```bash
npm run eval -- --hits eval/captured-hits.json --timings eval/captured-hits.meta.json
npm run eval -- --hits eval/captured-hits-fp32.json
```

Both commands intentionally exit nonzero. q8 and fp32 fail quality thresholds. q8 timing uses seven recorded browser requests, sample p95 38 ms. fp32 timing is NOT_MEASURED. Reading saved hit IDs is never used as inference latency.

Timing metadata must include the SHA-256 of the exact hit file, capture time, browser, measurement scope and a finite nonnegative duration for every evaluated case. A mismatch or incomplete supplied metadata is an error. Without metadata the timing gate remains unmeasured and cannot pass. A file hash prevents accidental mismatching; it does not authenticate who recorded the data.

Use `--output-dir work/evaluation-run` to keep an exploratory report separate. The committed [q8](../../eval/reports/semantic-q8.md) and [fp32](../../eval/reports/semantic-fp32.md) reports retain the negative results when CI refreshes `latest.md` with a lexical run.

The semantic thresholds (recall ≥ 0.70, returned-result precision ≥ 0.50, absent-topic error rate ≤ 0.25, sample p95 ≤ 1,500 ms) are portfolio acceptance targets. They were recorded before captured semantic measurements, after implementation. They are not evidence of user trust or production readiness. No bounds changed after failure.

## Holdout and limits

The harness requires `--holdout --confirm` and records its own invocations. No holdout run is recorded; that cannot prove public labels were never accessed by other means. The current candidate failed development gates, so no holdout run is planned.

Full browser UAT, independent labels, representative datasets, live generated-answer faithfulness and operational performance remain unverified. See [current release decision](launch-readiness-review.md).
