# Program plan

## Current delivery state

| Work | State | Evidence / next action |
| --- | --- | --- |
| Basic analysis, scoped statistics and citations | Supported single-user demonstration | Automated tests, production build/smoke and walkthrough |
| Rating interpretation and input validation defects | Fixed | Regression tests |
| Runtime import and misleading error diagnosis | Fixed | Browser capture and diagnosis tests |
| q8 and fp32 retrieval evaluation | Complete; quality gate failed | Captured hits and generated reports |
| On-device semantic product feature | Closed / not supported | DEC-09; harness retained |
| Short demonstration | Captured and packaged | [48-second API replay](../demo-script.md), actual HTTP responses; browser recording remains open |
| Evaluation latency defect | Fixed | Paired browser timings or NOT_MEASURED; regression tests |
| Live provider faithfulness | Open | Requires a funded, labelled evaluation before any production claim |
| Multi-tenant security | Open | Requires authenticated identity, not merely a gateway declaration |
| Source review IDs, independent labels and broader evaluation | Deferred | Required before a broader release candidate |

The demonstration uses Basic analysis and fictional reviews. It does not depend on the failed experiment or claim business impact. The original code preceded measurement; future candidates must establish labels, baseline and acceptance criteria first.

Organisation billing, local generation, broader language support and scaling beyond the current 2,000-review ceiling remain outside this portfolio release.
