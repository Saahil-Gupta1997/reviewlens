# Three-minute demo script

Verified end to end on 2026-09-12 against `npm run demo` on Node 26.7.0. Every output below is
the **actual** observed result, not an intention.

```bash
npm ci && npm run demo
```

Open <http://127.0.0.1:8788>. Use fictional reviews only. Never expose keys, and never present
untested behaviour as successful.

---

## 0:00 — The claim (15s)

> "ReviewLens answers questions about product reviews and shows its working. The point isn't
> the answer — it's that you can check it."

Landing page: **From reviews to reasons. Find the patterns. Check the evidence. Decide what to
improve.**

## 0:15 — Load data (15s)

Select **Release feedback · demo** from the dataset picker. Overview populates immediately:

| | |
| --- | --- |
| Reviews in scope | **20** of 20 |
| Average rating | **2.80** (20 rated, 0 unrated) |
| Low-rated reviews | **10** — 1–2 stars, rating-based |
| Theme coverage | **100%** matching a recognised theme |

> "Coverage is shown on purpose. If it said 60%, you'd know 40% of reviews were invisible to
> the theme rules — and unclassified does not mean positive."

## 0:30 — A calculated answer, with its denominator (45s)

**Ask ReviewLens** → _"What percentage of reviews are two-star?"_

Actual output:

> **4 of 20 reviews (20.0%) are 2-star reviews.**
> `20%` · 2-star reviews · **4 / 20 · reviews in scope**
> _Counts refer to distinct reviews, not unique people. Theme and sentiment labels use
> English-language rules; inspect evidence for nuance._
> `Evidence engine · rules-v2 · 30 ms`

> "No model produced that number. It's computed in code, in every answer mode, and the
> denominator is on screen. A wrong quote is visible to you. A wrong denominator isn't — so
> that's the one we refuse to let a model near."

## 1:15 — Retrieved evidence, traced to source (45s)

Ask _"What negative do most people point to?"_ and open a cited review.

> "Ranking uses the whole scoped set. The examples are a sample, never the population.
> Retrieved examples are structurally prevented from becoming a prevalence denominator."

## 2:00 — Scope and comparison (30s)

**Compare** two versions, then filter to a region.

> "Every citation stays inside the filter. Ask about EU and you cannot get a North America
> review back — the server re-checks scope before saving an answer."

## 2:30 — The deliberate limitation (30s)

**Settings → on-device semantic search.** Leave it off, and say why:

> "This is the feature I'd most like to show you, and it's off by default. We ran it in a real
> browser on 12 September. It scored **recall@5 = 0.267** against a bar of **0.70** we agreed
> before building it, and it invented evidence on **50%** of questions about topics the data
> doesn't contain — where plain keyword search invented nothing.
>
> We swept every similarity threshold from −0.05 to 0.60. None of the 66 clears the gate.
>
> So it stays off, and we didn't move the threshold. That's the whole demo, really: the number
> that decides whether a feature ships is one you can run yourself, in one command, and it's
> allowed to say no."

Show it:

```bash
npm run eval -- --hits eval/captured-hits.json
```

---

## Capturing this as recruiter-facing assets

The walkthrough above is verified. The screen captures are **not yet committed**. To produce
them:

1. `npm run demo`, then follow the beats above.
2. Capture five frames: Overview with the four stat tiles · the two-star answer showing
   `4 / 20` · a cited source review · a version comparison · Settings showing on-device off
   with its limitation text.
3. Save to `docs/assets/` and link them from the README.

A short GIF of beat 0:30 — question typed, answer with denominator — is the single
highest-value frame: it shows the product working and the discipline in one motion.

Tracked as an open issue; see the [program plan](delivery/program-plan.md).
