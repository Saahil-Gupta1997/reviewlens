# Evaluation and release acceptance

## Verified on 2026-09-11

- 35 engine/API/device tests passed, including rating negation and alternatives through all three answer modes.
- TypeScript check and production build passed.
- One production-worker rendering/private-API smoke test passed.
- Browser interaction and actual model inference were not tested in this verification pass.

See the [QA case study](qa-rating-fix.md) for the reproduced defect, behavior boundaries and regression coverage.

| Evidence | Status and limitation |
| --- | --- |
| Original owner walkthrough with supplied JSON fixtures | Reported correct; not an independent audit |
| Domain/API regression suite | Local automated checks; simulated provider responses |
| Device ranking/source checks | Synthetic vectors; dimensions, cosine, scope, deduplication, quotations |
| Production compilation/rendering | Does not establish browser inference |
| Real MiniLM download/inference and cache lifecycle | Pending: external downloads unavailable in authoring environment |
| Real OpenAI generation quality | Pending; no funded provider test requested |
| GitHub Actions | Workflow prepared; remote execution pending publishing |

## On-device UAT

Use the 24-row fictional TaskFlow fixture in a browser with site storage enabled.

1. With no API key, start Settings → on-device indexing. Check first-download guidance and progress.
2. Confirm completion shows 24/24; pause midway on another test import, then resume and verify saved progress is reused.
3. Refresh; check the completed index is recognised.
4. Ask the EU/login question in on-device mode. Inspect every region and quote.
5. Ask “Why do people struggle to access their accounts?” Assess actual relevance against source text.
6. Ask an absent topic and record false-positive passages. Calibrate only on development data.
7. Rerun numerical questions in each mode; results must not depend on embeddings.
8. Clear the local index; verify semantic mode requires rebuilding and Basic analysis still works.
9. Test blocked downloads, cleared storage and a long review with key evidence near its end.
10. Delete the test dataset; verify server removal and current-browser cache removal. Other devices require local clearing.

Record browser/OS, model/index version, question, filters, expected/actual evidence, result, latency and notes. Mark Not run until executed. Unit tests and deployment are not proof that these steps passed.

## Independent benchmark next

Create separate development and untouched evaluation sets with human-labelled relevant review IDs. Include paraphrases, mixed themes, negation, irrelevant questions and conflicting scope. Measure recall@5, precision@5, absent-topic false positives and latency; compare with lexical retrieval. Report sample sizes and thresholds. Never tune on the final evaluation set.
