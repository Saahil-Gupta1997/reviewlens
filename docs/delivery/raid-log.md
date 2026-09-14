# RAID log

Risks, Assumptions, Issues and Dependencies. Reviewed at each release candidate; next review
is triggered by the on-device UAT completing.

Scoring: probability and impact on 1–5. Exposure = P × I. Anything at 12 or above blocks a
default-on release of the affected feature.

---

## Risks — might happen

| ID     | Risk                                                                                                             | P   | I   | Exp    | Response            | Mitigation                                                                                                                                    | Owner role      |
| ------ | ---------------------------------------------------------------------------------------------------------------- | --- | --- | ------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| RSK-01 | On-device retrieval returns plausible but irrelevant passages, and the similarity score reads as confidence      | 4   | 5   | **20** | Mitigate + hold     | Feature off by default; "limited evidence" labelling; absent-topic FP rate gated in `npm run eval`; [UAT](uat-on-device.md) before default-on | ML / QA         |
| RSK-02 | Model or runtime CDN blocked by network policy, so the feature silently never loads                              | 3   | 3   | 9      | Mitigate            | Explicit error copy naming the cause; Basic analysis fallback is complete, not degraded; 180s timeout with resume                             | Frontend        |
| RSK-03 | English rule-based theme labels miss non-English, sarcasm or unfamiliar domains, so complaints are under-counted | 4   | 4   | **16** | Mitigate + disclose | Coverage percentage surfaced with every ranking; "unclassified does not mean positive" in answer notes; taxonomy is inspectable in source     | Product / QA    |
| RSK-04 | Device storage pressure or cache eviction breaks indexing mid-run                                                | 3   | 2   | 6      | Mitigate            | Per-review checkpoints; resume reuses completed records; rebuild path documented                                                              | Frontend        |
| RSK-05 | Generated interpretations are faithful to quotes but wrong in claim                                              | 3   | 4   | 12     | Mitigate + disclose | Quote verification bounds fabrication; answer notes state interpretations may still be wrong; mode is opt-in and user-funded                  | ML / Product    |
| RSK-06 | Golden set overfits — 24 reviews, one annotator                                                                  | 4   | 3   | 12     | Accept + plan       | Dev/holdout split enforced in the harness; holdout runs audited; second annotator is a P0 on the [program plan](program-plan.md)              | ML              |
| RSK-07 | Provider cost runs away through retries or abuse                                                                 | 2   | 4   | 8      | Mitigate            | Budget consumed before the outbound call; 100/user/UTC day including failures                                                                 | Backend         |
| RSK-08 | A recruiter or hiring manager cannot run the demo and forms a judgement from the README alone                    | 5   | 3   | **15** | Mitigate            | 48-second API replay published; browser UI recording and public interactive hosting still open                                                          | Portfolio owner |

---

## Assumptions — believed, not proven

| ID     | Assumption                                                                    | If wrong                                                             | How it gets tested                                                                            |
| ------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| ASM-01 | Product teams want traceable evidence more than fluent summaries              | The product optimises the wrong thing entirely                       | Analyst-rated useful-answer rate on real questions ([metrics](metrics.md)) — not instrumented |
| ASM-02 | MiniLM on q8 WASM is accurate enough to beat lexical retrieval on paraphrase  | The central feature has no justification and should be cut           | `npm run eval -- --hits` against the **measured** lexical baseline of recall@5 = 0.20         |
| ASM-03 | A first-run model download is acceptable to users in exchange for no API cost | Adoption stalls at the download prompt                               | Download-to-first-answer time and abandonment ([metrics](metrics.md)) — not instrumented      |
| ASM-04 | 2,000 reviews per dataset covers the intended investigation                   | The ceiling blocks the actual use case                               | Not tested. [DEC-07](decision-log.md) records where the design breaks                         |
| ASM-05 | One annotator's relevance labels approximate a product manager's judgement    | Every number the eval harness produces is measuring the wrong target | Second annotator and inter-annotator agreement — P0, not done                                 |

---

## Issues — already true

| ID     | Issue                                                           | Impact                                                                                                                                   | State                                                                                                | Next action                                                                   |
| ------ | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| ISS-01 | Tenant isolation depends on an unauthenticated gateway header   | Blocks any multi-tenant hosted deployment, and therefore blocks a public demo                                                            | **Mitigated, not fixed.** API now returns 503 without `IDENTITY_GATEWAY` ([DEC-06](decision-log.md)) | Signed session or mTLS between gateway and Worker                             |
| ISS-02 | Import discards the source `review_id` and assigns a fresh UUID | A reviewer cannot be traced back to the customer's own record; the eval harness has to bypass the import path to keep labels addressable | Open                                                                                                 | Persist source id alongside the internal id; migration required               |
| ISS-03 | On-device model had never executed in a browser | Headline feature unverified | **Closed 2026-09-12.** Ran on Chrome 152 after fixing a load defect ([postmortem](postmortem-device-model-load.md)) | Superseded by ISS-07 |
| ISS-07 | q8 and fp32 missed the development quality gate | On-device mode cannot be supported | Closed by scope decision, DEC-09 | Preserve experiment; exclude from supported workflow |
| ISS-08 | The worker mapped any unrecognised error to "check your connection", reporting a code defect as a network problem | A wrong diagnosis propagated into every project document until direct execution | **Closed 2026-09-12.** Diagnosis extracted to `describeFailure()`, which explains only recognised conditions and carries the real message otherwise. 4 tests, including the exact SyntaxError that fooled the project | — |
| ISS-04 | Generation faithfulness is unmeasured                           | No basis for any quality claim on the paid mode                                                                                          | Open                                                                                                 | Labelled faithfulness rubric over held-out questions                          |
| ISS-05 | No hosted demo reachable by a reader                            | High-exposure risk RSK-08 realised                                                                                                       | Open, **P1**                                                                                         | Blocked on ISS-01, or a read-only single-tenant deployment                    |
| ISS-06 | History before 2026-09-11 is not in the repository              | The delivery trail up to publication is asserted in documents rather than visible in git; the build happened in a sandbox without version control | **Closed 2026-09-15.** Provenance stated at the top of the README; everything since the first commit has landed through PRs | — |

---

## Dependencies — outside my control

| ID     | Dependency                                                             | Exposure                                                 | Contingency                                                                          |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| DEP-01 | Hugging Face model hosting for `Xenova/all-MiniLM-L6-v2`               | Feature cannot initialise if unavailable                 | Basic analysis fallback; bundling the model is assessed but rejected on size for now |
| DEP-02 | jsDelivr for Transformers.js 3.8.1 browser ESM                         | Same                                                     | Same; version is pinned so a CDN change is visible                                   |
| DEP-03 | OpenAI API availability and pricing                                    | Paid mode degrades; typed error messages per status/code | Both other modes are unaffected by design                                            |
| DEP-04 | Cloudflare D1 and Workers runtime                                      | Total outage                                             | None. Accepted for a portfolio-scale deployment                                      |
| DEP-05 | Identity gateway in front of the Worker                                | No safe multi-tenant deployment (ISS-01)                 | Local single-user loopback adapter for demonstration                                 |
| DEP-06 | A browser with WebAssembly, module workers, IndexedDB and SubtleCrypto | On-device mode unavailable                               | Capability check before indexing, with a named reason and fallback                   |
