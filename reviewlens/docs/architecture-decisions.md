# Architecture decisions

| Decision | Reason | Trade-off |
| --- | --- | --- |
| Calculate statistics in code | Defined populations and exact denominators | Bounded natural-language coverage |
| Explicit theme rules | Inspectable baseline without API fees | Limited domain/sentiment coverage |
| MiniLM in a browser worker | No per-request fee; avoids hosted model memory | Initial downloads and device/browser constraints |
| Overlapping review passages | Preserve evidence near long-review tails | More inference; pathological tokenization can still truncate |
| IndexedDB checkpoints | Device-local resume and reuse | Eviction and no cross-device sync |
| Server rechecks quotations/scope | Reject fabricated and foreign-source text | Does not certify semantic relevance or client honesty |
| Limited-evidence labels | Similarity is not confidence | Human review still required |
| Optional OpenAI generation | Retain user choice | Separately billed external processing |

Model: Xenova/all-MiniLM-L6-v2 revision 751bff3. Runtime: Transformers.js 3.8.1 browser ESM from jsDelivr. Inference: single-threaded WebAssembly, q8, mean pooling, normalization, 384 dimensions. Fingerprint includes model/preprocessing identifier and review text SHA-256. Update the identifier when processing changes.

Rank the best passage per allowed review, deduplicate IDs, return up to five above cosine 0.30. The cutoff is a heuristic awaiting calibration, not a probability. Corpus theme statistics use rules, never neighbour counts. OpenAI indexes remain separate.
