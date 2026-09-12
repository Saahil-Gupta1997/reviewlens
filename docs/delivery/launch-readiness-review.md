# Launch readiness review

**Current decision:** Basic analysis is the supported portfolio demonstration. On-device semantic retrieval is a failed experiment. OpenAI RAG remains an opt-in, unevaluated generation path. This review supersedes the earlier “model never ran” status.

| Scope | Decision | Evidence and remaining limits |
| --- | --- | --- |
| Basic analysis | GO for a single-user portfolio demonstration | Automated engine/API tests, build and production smoke; fictional data. No adoption or business-impact claim. |
| On-device MiniLM | NO-GO as a supported product feature; experiment retained | Real Chrome 152 execution captured on 2026-09-12. q8 recall 0.267, returned-result precision 0.320, absent-topic errors 1/2. fp32 did not improve recall. Both fail quality gates. |
| OpenAI RAG | Experimental opt-in only | Simulated provider and quote checks pass; live generation faithfulness has not been evaluated. No production-quality approval. |
| Multi-tenant public service | NO-GO | Gateway declaration is a configuration check, not cryptographic authentication. |

The original implementation preceded the evaluation harness and thresholds. Thresholds were recorded before the captured semantic measurements, not before implementation. No thresholds were relaxed after the failed results.

## Timing correction

The old evaluator timed reading saved hit IDs, not semantic search. Its sub-millisecond semantic latency and PASS are invalid. The corrected evaluator accepts explicitly paired browser timing metadata. q8 has seven recorded worker round-trips (22–38 ms; sample p95 38 ms). fp32 has no committed per-query timing capture: its latency gate is NOT_MEASURED and cannot pass. Neither is a load-test percentile.

See the generated [q8 report](../../eval/reports/semantic-q8.md) and [fp32 report](../../eval/reports/semantic-fp32.md).

## Still unverified

- Full app on-device UAT, pause/resume, page reload and cross-browser cache lifecycle. The captured harness verified an in-session storage re-read, not a reload.
- Independent relevance labels and held-out retrieval performance. The development sample contains five relevant-topic and two absent-topic questions over 24 fictional reviews.
- Live provider faithfulness, load/concurrency behaviour and business outcomes.

The failed experiment is excluded from the supported walkthrough. The harness and source remain available for inspection. Current priorities are accurate evidence, a working Basic demonstration and reproducible verification, not another model experiment.
