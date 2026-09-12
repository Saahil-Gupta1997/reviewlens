# dtype experiment: fp32 did not rescue this configuration

**Date:** 2026-09-12 · **Result:** Both configurations fail the development quality gate; stop investment in this on-device feature under the recorded decision rule.

The harness reran q8 as a control, then changed only dtype to fp32 with the same model revision, preprocessing, labels and ranking. The committed control results match the earlier q8 capture.

| Metric | Lexical | q8 | fp32 | Release bound |
| --- | --- | --- | --- | --- |
| Recall@5 | 0.200 | 0.267 | 0.200 | ≥ 0.70 |
| Precision over returned results, up to 5 | 0.180 | 0.320 | 0.300 | ≥ 0.50 |
| Absent-topic false positives | 0/2 | 1/2 | 1/2 | Rate ≤ 0.25 |
| Model load in the recorded experiment | — | 7,834 ms | 34,470 ms | Not gated |
| Indexing 24 reviews in that experiment | — | 706 ms | 672 ms | Not gated |
| Per-query latency | Local in-process | Separate paired capture: 22–38 ms | Not committed; NOT_MEASURED | Sample p95 ≤ 1,500 ms |

fp32 did not improve the measured quality. That result weakens the hypothesis that changing quantisation alone would solve the failures. It does **not** isolate model capacity, establish what the model learned, or rule out shared preprocessing, runtime or annotation problems. Load timings are individual observations with uncontrolled cache/network conditions, not a general speed comparison.

The pre-recorded stopping rule called for cutting this feature if fp32 recall remained below 0.50. It measured 0.200, so the feature remains outside the supported product scope. No additional model work is scheduled. A future candidate would require a new proposal, validated labels and fresh evidence; relabelling work “hybrid” would not exempt it from that process.

Reproduce quality scoring:

```bash
npm run eval -- --hits eval/captured-hits-fp32.json
```

The command exits nonzero: quality fails and per-query latency is NOT_MEASURED. See [generated report](../../eval/reports/semantic-fp32.md). Five relevant-topic questions and two absent-topic questions over 24 fictional reviews are sufficient to trigger this stopping rule, but do not characterise the model across tasks or domains.
