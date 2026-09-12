# On-device UAT

The test plan for the feature that has not shipped. This is **ISS-03**, the P0 blocking a
default-on decision on on-device semantic search.

Everything below is **Not run**. The authoring environment could not download the model or
runtime from Hugging Face and jsDelivr, so `Xenova/all-MiniLM-L6-v2` has never produced an
embedding in this system.

## Why a checklist is not enough

Walking through the app and concluding "it seems to work" is exactly the evidence this feature
cannot be released on. Its failure mode is returning plausible, well-formatted, quote-verified
passages that are not relevant — which looks identical to success unless the results are
scored against labels decided in advance.

So this UAT has two halves: a **functional** half that a human judges, and a **measurement**
half that produces a number for `npm run eval`. Only the second can clear the release gate.

## Setup

- Corpus: `examples/validation/ReviewLens_Validation_Reviews.json` — 24 fictional TaskFlow
  reviews, the same corpus the golden set is labelled against
- Browser with site storage enabled; record browser, version and OS
- Record model revision and preprocessing version from Settings

## Part 1 — Functional checklist

| #   | Step                                                               | Pass condition                                                                              | Result  |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------- |
| 1   | With no API key, start Settings → **Download model & build index** | First-run download guidance appears; progress advances                                      | Not run |
| 2   | Let indexing complete                                              | Shows 24/24                                                                                 | Not run |
| 3   | On a second import, pause midway, then resume                      | Completed records are reused; work is not repeated                                          | Not run |
| 4   | Refresh the page                                                   | Completed index is recognised without rebuilding                                            | Not run |
| 5   | Ask the EU/login question in on-device mode                        | Every returned passage is in region EU and quoted exactly from source                       | Not run |
| 6   | Ask "Why do people struggle to access their accounts?"             | Judge each passage against source text for genuine relevance                                | Not run |
| 7   | Ask about a topic absent from the corpus                           | Record every false-positive passage returned                                                | Not run |
| 8   | Re-run numerical questions in all three modes                      | Identical results — calculations must not depend on embeddings                              | Not run |
| 9   | Clear the local index                                              | Semantic mode requires a rebuild; Basic analysis still works                                | Not run |
| 10  | Block the CDN, then retry                                          | Named error and a working Basic fallback, not a silent failure                              | Not run |
| 11  | Clear site storage mid-index                                       | Failure is reported, not silently partial                                                   | Not run |
| 12  | Index a long review with key evidence near the end                 | The tail passage is retrievable — verifies overlapping passage windows                      | Not run |
| 13  | Delete the test dataset                                            | Server records and current-browser cache both removed. Other devices require local clearing | Not run |

Record for every step: browser, OS, model and index version, question, filters, expected
evidence, actual evidence, result, latency, notes. **Mark unrun steps as Not run.** A blank
row is not a pass.

## Part 2 — Measurement

This is the half that clears the gate.

Run all 7 **dev** cases from `eval/golden-set.json` in on-device mode and capture what the
retriever returns. Do not look at the holdout cases.

### Capturing hits

Write a JSON object keyed by case id, each value the retrieved review ids in rank order:

```json
{
  "D1": ["VAL-013", "VAL-014", "VAL-018"],
  "D2": ["VAL-019", "VAL-007"],
  "D3": [],
  "D4": ["VAL-001", "VAL-002", "VAL-024"],
  "D5": ["VAL-008", "VAL-023"],
  "D6": [],
  "D7": []
}
```

An empty array is a valid and meaningful result — for D6 and D7 it is the **correct** one.
Objects of the form `{"reviewId": "VAL-013", "score": 0.42}` are also accepted, so a raw hit
dump can be used directly.

Save as `eval/captured-hits.json`, then:

```bash
npm run eval -- --hits eval/captured-hits.json
```

The report gains a second row comparing on-device semantic against the lexical baseline, and
the run is promoted to the `semantic_release` gate.

### Clearing the gate

| Gate                             | Bound     | Baseline to beat |
| -------------------------------- | --------- | ---------------- |
| recall@5                         | ≥ 0.70    | 0.200            |
| precision@5                      | ≥ 0.50    | 0.180            |
| absent-topic false-positive rate | ≤ 0.25    | 0.000            |
| p95 latency                      | ≤ 1500 ms | ~13 ms           |

Note the last two columns honestly: the lexical baseline is **better** on false positives and
far faster. Semantic retrieval has to win decisively on recall to justify the download, the
device cost and the CDN dependency it brings.

## Part 3 — If the gate is missed

Do not adjust the threshold. In order:

1. Calibrate the 0.30 similarity floor — **on the dev split only** ([DEC-04](decision-log.md))
2. Check passage windowing on the cases that failed; a missed tail is a chunking bug, not a
   model limitation
3. Re-run the dev split. Repeat at most twice — more than that is fitting to 7 cases
4. If recall stays below the bar, the honest options are to change approach or cut the
   feature. [DEC-03](decision-log.md) is a two-way door and was recorded as one for this reason

Only once the dev split clears, run the holdout **once**:

```bash
npm run eval:holdout
```

That number is the release evidence. It is appended to `eval/holdout-runs.log` whether it
passes or fails.

## Part 4 — Before any public accuracy claim

Not required for default-on; required before any number appears outside this repository.

- Second annotator on the golden set, with inter-annotator agreement reported (ASM-05)
- A corpus in the hundreds of reviews, not 24
- Sample sizes and thresholds reported alongside every figure
- Tuning on dev only, holdout untouched, audit log clean
