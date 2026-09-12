# Program plan

## Increments delivered

| #   | Increment                                                                                                                                                                      | Shipped    | Gate applied                                                          | Outcome                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | --------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Owned-dataset workspace — CSV/JSON import with row-level validation, corpus statistics, scoped questions, source inspection, version/region comparison, answer history, export | 2026-08    | Automated suite + typecheck                                           | Shipped                                                        |
| 2   | Defect response — rating-condition parser returning wrong counts on negation and alternatives                                                                                  | 2026-09    | Reproduction test before fix; regression suite across all three modes | Shipped, [postmortem](postmortem-rating-defect.md)             |
| 3   | No-key semantic retrieval — MiniLM in a browser worker, IndexedDB checkpointing, pause/resume, server-side scope and quote verification                                        | 2026-09    | Synthetic-vector tests only                                           | **Built, held back**. Off by default, "limited evidence" label |
| 4   | Measurement and controls — labelled golden set, executable eval gate in CI, identity-gateway enforcement, delivery documentation                                               | 2026-09-12 | `npm run verify`                                                      | Shipped                                                        |

Increment 4 is the one that produced a number: the lexical baseline of **recall@5 = 0.20**,
which is the first quantitative justification the semantic feature has had.

## Critical path to a default-on semantic feature

Each step gates the next. Nothing after step 2 is worth starting until step 2 returns a
number.

```
ISS-03  Run the model in a real browser ──► capture hits ──► npm run eval -- --hits
                                                                    │
                                            ┌───────────────────────┴──────────────────┐
                                       clears gate                              misses gate
                                            │                                          │
                                  calibrate 0.30 floor                     cut, or change approach
                                     on dev split only                     (DEC-03 is two-way)
                                            │
                                  second annotator + larger corpus
                                            │
                                    holdout run (once)
                                            │
                                     default-on decision
```

## Backlog

| Priority | Item                                                                 | Acceptance                                                                                  | Blocked by                           |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| **P0**   | Execute the [on-device UAT](uat-on-device.md) on a real browser      | Checklist complete on a named device/OS; failures recorded, not summarised                  | —                                    |
| **P0**   | Score captured hits against the golden set                           | `npm run eval -- --hits` produces a semantic row; gate result recorded either way           | Above                                |
| **P0**   | Second annotator on the golden set; report inter-annotator agreement | Agreement reported with sample size; disagreements adjudicated and rationale updated        | —                                    |
| **P1**   | Recorded three-minute walkthrough                                    | Import → complaint ranking → source evidence → calculation → comparison → stated limitation | —                                    |
| **P1**   | Read-only hosted demo a reader can open                              | Public URL, seeded dataset, no key required                                                 | ISS-01 or a single-tenant deployment |
| **P1**   | Persist source `review_id` through import                            | A review traces back to the customer's own record; eval harness uses the real import path   | Migration                            |
| **P2**   | Signed session or mTLS between gateway and Worker                    | Header forgery fails closed with a cryptographic check, not a configuration assertion       | —                                    |
| **P2**   | Faithfulness rubric for the generated mode                           | Labelled rubric scored over held-out questions; unsupported-claim rate reported             | Funded provider access               |
| **P2**   | Taxonomy coverage for unfamiliar domains                             | Coverage improves on a new corpus with no regression in `npm run eval`                      | —                                    |
| **P3**   | Raise the dataset ceiling                                            | Vector storage + ANN index replacing per-question full loads                                | [DEC-07](decision-log.md)            |

## Descoped, with reasons

Recorded because what was cut is more informative than what was built.

| Cut                                               | Why                                                                                                                                                    | Revisit when                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| Local generative model in the browser             | Size and device compatibility cost far exceeds the value of prose over verified quotations. The retrieval problem was the real one                     | Retrieval clears its gate and prose is the remaining gap |
| Organisation accounts, billing, backup-restore UI | Single-user scope. Building tenancy features before tenant isolation is solved (ISS-01) would be building on a known defect                            | ISS-01 fixed                                             |
| Automatic roadmap recommendations                 | The product deliberately stops at evidence. A tool that ranks complaints _and_ recommends what to build hides the judgement step where a PM adds value | Not planned                                              |
| Scale beyond 2,000 reviews/dataset                | [DEC-07](decision-log.md). Correct and simple at the documented ceiling                                                                                | A real dataset exceeds it                                |
| Multi-language theme rules                        | The rule-based taxonomy is English-only and honest about it. Half-working multi-language support is worse than a stated limit                          | A corpus requires it                                     |

## Process changes carried forward

| From                                           | Change                                                                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Postmortem](postmortem-rating-defect.md)      | Every calculation path gets an explicit clarification branch. Ambiguity returns a question, never a silent default    |
| [DEC-08](decision-log.md)                      | Label the data and measure the baseline _before_ building the retrieval change, not after                             |
| [ISS-06](raid-log.md)                          | Work from here lands as branches and pull requests. The three-commit history cannot be retrofitted, but it stops here |
| [Launch readiness](launch-readiness-review.md) | No feature ships default-on without a number from `npm run eval`                                                      |
