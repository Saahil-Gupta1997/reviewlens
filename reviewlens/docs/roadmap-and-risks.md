# Backlog and risk register

| Priority | Work | Acceptance |
| --- | --- | --- |
| P0 | Real browser MiniLM/download/cache UAT | Complete checklist on target device and record failures |
| P0 | Held-out retrieval evaluation | Label separate data; report recall, precision and no-evidence behavior |
| P1 | Recruiter recording | Three-minute workflow with source evidence and limitations |
| P1 | Unfamiliar-topic coverage | Improve unseen domains without numeric regression |
| P2 | Optional local generation | Assess size, compatibility and claim support first |
| P2 | Broader customer launch | Decide sharing, backups and abuse controls |

| Risk | Impact | Mitigation / proposed owner role |
| --- | --- | --- |
| CDN blocked | Model cannot load | Frontend: clear error, Basic fallback; assess bundling later |
| Memory/storage pressure | Index failure or eviction | Frontend: small inference units, per-review checkpoints |
| Semantic false positives | Misleading evidence | ML/QA: human labels, limited-evidence messaging, held-out tests |
| Rules miss nuance | Wrong complaint labels | Product/QA: explicit methodology and independent examples |
| Browser ranking untrusted | Manipulated ordering | Backend: validate scope/quotes; no certified-relevance claim |
| Private data published | Privacy breach | Maintainer: omit runtime data and original archive from export |
| Private Site inaccessible to recruiters | Demo cannot be viewed | Portfolio owner: local runner and recorded demo |

These are suggested responsibilities, not claims that separate engineers completed the work.
