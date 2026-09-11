# ReviewLens: first validation session

All reviews are fictional, authored for testing. TaskFlow is a fictional productivity app. These are deliberately small, inspectable fixtures, not real customer evidence or a representative model benchmark.

## Start here

1. Open https://reviewlens-workspace.gupta-saahil97.chatgpt.site in your browser. Sign in with the account used to create the private app if prompted. No local installation or terminal command is needed.
2. Choose Import and upload ReviewLens_Validation_Reviews.json. Name it TaskFlow - validation.
3. Check the mappings: review_text to Text, rating to Rating, review_date to Date, product to Product, product_version to Version, region to Region, source to Source, review_id to ID. Confirm the preview before saving.
4. Expect 24 accepted reviews, no rejected reviews and no duplicates. Select this dataset and clear all filters.
5. Leave AI search OFF for the first pass. Test the questions below and inspect source reviews. Record actual output, pass/fail and any screenshot or notes separately.
6. Do not upload this guide as review data. Its answers must remain outside the application's evidence.

## Exact numerical checks

Use the full dataset unless a scope is specified. Rounded equivalents are acceptable for averages and percentages, but counts must match exactly.

| Check or question | Expected result |
| --- | --- |
| How many reviews are there? | 24 reviews, not 24 unique people |
| What is the average rating? | 3.25; total stars 78 divided by 24 rated reviews |
| What percentage are two-star? | 5/24 = 20.83% |
| What percentage are one-star? | 3/24 = 12.5% |
| Overview: low-rated reviews (1 or 2 stars) | 8/24 = 33.33% |
| Set Version filter to 1.0; inspect count and average | 12 reviews; 4.00 average |
| Set Version filter to 2.0; inspect count and average | 12 reviews; 2.50 average |
| Compare version 1.0 with 2.0 | Average decreases by 1.50 stars; equal group sizes. This does not prove the update caused the change. |
| Region filter EU, then NA | 12 reviews in each region |
| Source filter App Store, then Google Play | 8 and 16 reviews respectively |
| Dates 2026-08-01 through 2026-08-06, inclusive | 6 reviews; average 1.50; every review is version 2.0 |
| Rating distribution | 1 star: 3; 2 stars: 5; 3 stars: 4; 4 stars: 7; 5 stars: 5 |

## Human-authored meaning and evidence checks

These expectations were derived from the written reviews, not the app's classifier. A mismatch is a finding to investigate; do not change the answer key to fit the software.

| Question or action | Expected meaning and evidence |
| --- | --- |
| What negative do most people point to? | Login is the largest explicitly criticised theme: 6/24 = 25%. Supporting original IDs: VAL-013 through VAL-018. All six are version 2.0. Do not call 25% a majority. |
| What are EU customers saying about login? | Negative examples: VAL-013, VAL-015, VAL-017. Positive example: VAL-001. All shown citations must be EU; scope has 12 reviews. |
| What are NA customers saying about login? | Negative: VAL-014, VAL-016, VAL-018. Positive: VAL-002 and VAL-024. All citations must be NA. |
| Inspect VAL-016 | Negative login, positive interface. Do not classify every mentioned feature as negative simply because its rating is 2. |
| Find complaints about performance | Slow dashboard/report behaviour: VAL-007, VAL-010 and VAL-019; 3/24 = 12.5% by the human label. |
| Find complaints about customer support | VAL-012 and VAL-020; 2/24 = 8.33%. VAL-004 is positive, not a complaint. |
| Explore and open the review about the report title | VAL-023 retains the quotation marks, comma and multiline text without creating a second record. |
| What do reviews say about waterproofing? | No supporting evidence; abstain or clearly state insufficient evidence. Do not invent a product property. |
| What are APAC customers saying? | APAC is absent. Clarify or state no matching reviews; do not substitute EU/NA evidence. |
| How many unique people complained? | Cannot establish unique people from these records. Report review counts only if clearly distinguished. |

Original IDs help you locate rows in the JSON file. The application generates internal citation IDs during import; match text and metadata if original IDs are not displayed. Citation samples need not contain every relevant review, but numerical prevalence must not be calculated only from those samples.

## Import-error test (separate dataset)

Import ReviewLens_Import_Errors.json as TaskFlow - import errors, not as a replacement for the clean dataset. It contains 6 input records. Expected outcome:

- 2 accepted records: EDGE-001 (rating 5) and EDGE-002 (unrated).
- 1 duplicate skipped: the repeated EDGE-001.
- 3 rejected records: rating 6; empty review text; impossible date 2026-02-30.
- Average rating of accepted data: 5.0, using the one rated record; total review count remains 2. The unrated record is not zero stars.
- Clear validation messages, with no server crash. Use record contents to identify errors if reported row numbers differ from JSON object positions.

## Optional semantic RAG pass

First complete the no-key tests. To test semantic RAG, open Settings, enter your own OpenAI API key, and build the semantic index for the clean dataset. Do not paste the key into this chat, source code, screenshots or your report. Provider calls may incur charges.

Enable AI search in Ask. Try “What are customers saying about login?” and the EU question above. Inspect whether each claim is supported by its exact quoted review and whether the source respects your filters. Exact wording can vary; correct meaning, appropriate scope and valid evidence are the checks. Exact quotes alone do not prove that the interpretation is correct. Numerical questions should remain deterministic with AI enabled.

## Record and prioritise findings

For each check record: check name, filters, AI on/off, expected, actual, pass/fail, supporting screenshot, severity and notes. Mark a check Not run until you actually execute it. Do not use the built-in Quality score as proof that these new fixtures passed.

Fix data loss, incorrect statistics, wrong-scope citations, fabricated evidence and crashes before a recruiter demo. Separate minor wording or layout issues. After fixes, rerun affected checks and the numerical baseline. These fixtures validate controlled behaviour; later add real or appropriately licensed, independently labelled reviews for model-quality evaluation.
