# QA remediation — September 2026

This release closes the original 21 defects and the reproducible/code-review findings in the subsequent 50-item adversarial report. Corrected behaviors are protected by automated tests, UI guards, or build-time quality gates.

| Defects | Resolution | Verification |
| --- | --- | --- |
| QA-001–002 | Percentage questions now derive their denominator from the named population (for example, login reviews), not the entire active scope. | Exact 50% and 80% regression cases |
| QA-003–006 | Query parsing now distinguishes topic AND/OR, topic negation, sentiment negation, and ambiguous “bad” wording. | Engine regression tests |
| QA-007 | Next.js and its ESLint configuration were upgraded from 16.2.6 to 16.3.4. | Locked dependency install and production build |
| QA-008 | Contracted negation is recognized before negative terms; generic auxiliary contractions no longer add a false negative score. | Three reported phrases tested |
| QA-009 | A blocked IndexedDB opening now clears the cached database promise so retry creates a new connection attempt. | Source review and worker regression behavior |
| QA-010 | Dataset deletion is disabled while answers or either indexing engine are active; the delete handler also refuses concurrent execution and cancels pending client work. | UI state and handler guard |
| QA-011 | CSV records retain their physical source-line number through parsing and normalization. | Blank-plus-malformed-row regression test |
| QA-012–013 | Compare values and calculations use the current filter scope with the comparison field intentionally removed. | Scoped comparison implementation |
| QA-014 | Rating bar widths use rated reviews as the denominator. | UI calculation review |
| QA-015 | Provider usage refreshes after paid indexing batches and paid questions, including failed attempts. | UI lifecycle review |
| QA-016 | First-run answer mode is Basic analysis. | Initial state review |
| QA-017 | Opening a leading complaint resets Explore pagination. | Click-handler review |
| QA-018 | API filters reject invalid ratings, impossible dates, malformed date strings and reversed ranges. | API regression tests |
| QA-019 | Provider accounting captures one UTC usage-row ID before the request and reuses it for token updates. | Server implementation review |
| QA-020 | The production Worker attaches CSP, frame, MIME-sniffing, referrer and permissions headers to responses. | Rendered production response test |
| QA-021 | CI now executes lint before the test/build suite. | Local lint pass and workflow definition |

### Extended adversarial report (RL-01–RL-50)

| Defects | Resolution | Verification |
| --- | --- | --- |
| RL-01–RL-13 | Scope detection now avoids pronoun, short-region, version/rating and comparison collisions; common rating, complaint, proportion and average-score wording is explicit; “negative reviews” is defined as 1–2 stars. | Query-parser regression cases and 24/24 in-app acceptance evaluation |
| RL-14–RL-20 | Theme matching uses word boundaries, removes ambiguous clean/broken/report prefixes, handles straight and curly contractions plus “no longer,” detects expensive pricing, and limits complaint evidence to negative aspects. | Theme and evidence regression cases |
| RL-21–RL-28 | JSON/CSV physical row references, literal inch marks, common dates, strict decimal ratings, normalized headers and mapping-key/type validation are enforced. Invalid dates become warnings while the review is retained. | Import regression cases |
| RL-29–RL-36 | Undecryptable keys no longer lock datasets; server-wide provider keys are not silently charged to users; empty scopes avoid provider calls; upload retries/collisions and request identifiers are validated; stale imports and evaluation history are bounded. | D1-backed API integration tests |
| RL-37–RL-46 | Basic analysis is the first-run default; pickers, comparison scopes, settings refresh, search state, suggestion locks, file reselection, disappearing themes, date ranges, pagination and fractional-rating visuals are synchronized. | Component state review, lint, typecheck and production build |
| RL-47–RL-50 | The loopback demo accepts localhost safely and rejects malformed origins/URLs; test tools are direct dependencies; public documentation distinguishes the private hosted workspace from the local recruiter demo. | Locked dependencies, local-adapter code review and documentation review |

## Release evidence

- TypeScript compilation passes.
- ESLint completes with zero errors.
- Fifty-one engine, device-search and API tests pass, including the reported question phrasings.
- The production Vinext build completes.
- The rendered Worker smoke test verifies the application shell, private API boundary and security headers.

## Remaining validation risks

The defects above are closed, but real-browser MiniLM compatibility, storage eviction/private-mode behavior, held-out semantic retrieval quality, live-provider quality, and full mobile/keyboard accessibility remain UAT work. These are product-validation risks rather than claims of completed verification; see [Evaluation and UAT](evaluation.md).
