# The delivery narrative

ReviewLens helps a product manager inspect recurring complaints and verify the source reviews behind a finding. Its supported demonstration imports fictional reviews, calculates statistics, ranks rule-labelled complaints and shows source evidence. It does not make roadmap decisions.

API billing was a constraint, so the core calculations run without a paid key. Counts use the whole filtered population; retrieved examples never become the denominator. Codex assisted implementation and documentation; Saahil directed scope and validation. See [ownership](../product-case-study.md#ownership).

The first implementation preceded measurement. A later labelled development set established lexical recall@5 of 0.200 across five relevant-topic questions. This was a small diagnostic baseline, not a general accuracy estimate. The semantic release thresholds were recorded before captured semantic results, not before building the feature.

Real browser execution exposed a runtime-import defect that had been misreported as a connectivity problem. The import was corrected, and the error handler now preserves the underlying error without assigning an unsupported cause. Regression tests cover that diagnosis.

After the fix, q8 semantic retrieval achieved recall 0.267, returned-result precision 0.320 and one false positive across two absent-topic questions. It failed the quality gate. A sweep of 66 thresholds did not clear the gate on this development sample. Switching the same pipeline to fp32 produced recall 0.200 and did not rescue it. This does not identify model capacity as the root cause.

The on-device feature is closed as a supported product feature; its source and harness remain as experimental evidence. No threshold was relaxed. Basic analysis remains the supported demonstration. Live OpenAI generation quality is still unmeasured.

A subsequent review found that the evaluator’s semantic latency timed saved-result lookup. That measurement was invalidated. The corrected gate uses paired browser timings or reports NOT_MEASURED. q8 has seven worker round-trips with sample p95 38 ms; fp32 latency remains unmeasured.

This project demonstrates scope decisions, defect investigation, measurement and release restraint. It does not establish enterprise team leadership, production operations, customer adoption or business impact. Those require separate evidence.
