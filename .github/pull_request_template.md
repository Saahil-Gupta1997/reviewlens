## Problem and resulting behavior

## Gates

See [release gates](../docs/delivery/release-gates.md). `npm run verify` runs 1, 2, 4, 5 and 6.

- [ ] Types, formatting, lint
- [ ] Behaviour tests and production build
- [ ] Retrieval quality gate — `npm run eval` (state the recall@5 and precision@5 here)
- [ ] Source scope and exact quotations re-checked when affected
- [ ] Model-dependent behavior marked **tested** or **not tested** — never left implied

## Evidence

<!-- Paste the gate result. A threshold change requires a dated entry in
     docs/delivery/decision-log.md, not an edit to eval/thresholds.json alone. -->

## Risks and rollback

<!-- New risk, or a change to an existing one? Update docs/delivery/raid-log.md. -->
