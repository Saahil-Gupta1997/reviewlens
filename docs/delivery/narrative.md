# The delivery narrative

One page. The whole project, in the order it actually happened.

---

### Problem

Product managers cannot tell a recurring complaint from a memorable anecdote. Reading 2,000
reviews is not a plan, and a summary you cannot trace back to source is not evidence. The
tool needed to answer questions about reviews **and** show its working.

### Constraint

API billing blocked evaluation entirely. Any design whose core value required a paid key was
untestable by the person building it — so the product had to be useful with **no key at all**.
That single constraint shaped everything: statistics computed deterministically in code
([DEC-01](decision-log.md)), retrieval that runs on the user's own device
([DEC-03](decision-log.md)), and generation as a separately-funded option rather than the
product.

### Baseline

The hypothesis — "keyword search misses paraphrased questions" — was a belief for three weeks.
Labelling 14 questions against 24 reviews turned it into a number in two hours:

> **Lexical retrieval scores recall@5 = 0.20.** Four in five relevant reviews are missed. On
> *"Which customers are locked out of their accounts?"* it returns nothing at all.

That number justified the semantic feature and set the bar it had to clear. It should have
been measured in week one. [DEC-08](decision-log.md) records why.

### Decision

Semantic retrieval runs as quantised MiniLM in a browser worker — no per-request fee, no
hosted model, no key. The trade is a first-run download, device constraints and a CDN
dependency, all recorded with the decision. The client proposes; **the server decides**:
every returned quote is re-checked against the owned, scoped source text before it is saved
([DEC-05](decision-log.md)), because moving inference to the client moves it outside the trust
boundary.

### Defect

A hand-check of an expected count found *"How many reviews are not five-star?"* returning **2**
where the answer was **1** — and marking it `supported`, the status meaning "verified".

Root cause was not the parser. Confidence was derived from *which branch executed* rather than
*how much of the question was understood*, so a partial parse was indistinguishable from a
full one. The fix narrows what the product will answer and makes it **ask** when a question
falls outside that grammar. [Postmortem](postmortem-rating-defect.md).

### Release gate

The evaluation plan became a command that can fail a build. `npm run eval` scores retrieval
against the golden set and exits non-zero below threshold; it runs in CI on every push. Two
threshold sets — a regression gate pinned at the measured baseline, and a release bar agreed
**before** the feature was measured, so it could not be set to whatever the model produced.
The holdout split refuses to run without an explicit flag and logs every run, making *"we did
not tune on the evaluation set"* auditable rather than asserted.

### No-go

The on-device feature was held back from default-on while unverified. When it was finally run
in a real browser, two failures surfaced — stacked, the first hiding the second.

**It could never have worked.** The worker imported a Transformers.js build that ships
unresolved bare specifiers; the import threw before any model request was made. It had been
reported to users — and believed by the project — as a *network* problem, because the error
handler mapped anything unrecognised to "check your connection". Every document repeated that
false diagnosis for three weeks. [Postmortem](postmortem-device-model-load.md).

**Fixed, it missed its gate.** recall@5 **0.267** against a bar of 0.70; absent-topic false
positives **0.50** against 0.25 — worse than the lexical baseline's 0.00. A sweep of every
threshold from −0.05 to 0.60 clears the gate at **none of the 66 tested**. The weakest correct
answer scores 0.1774; the strongest pure false positive scores 0.3040. Signal and noise
interleave, so no similarity floor separates them.

The thresholds were not moved. [The result](evaluation-semantic-result.md).

### Next result

Three options, ranked by expected value rather than effort:

1. **Test fp32 MiniLM** to separate quantisation damage from model capacity — a one-line
   change to the harness.
2. **Hybrid retrieval.** Lexical is perfect on absent topics (0.00 false positives); semantic
   is perfect on the one clean paraphrase case (1.00 recall). The failure modes are
   complementary, which is the strongest signal in the data.
3. **Cut it.** The measured gain over lexical is 0.067 recall, bought with a 1.7 MB download,
   a CDN dependency and a 50% false-positive rate.

Hard stop: if fp32 does not lift recall above 0.50, take option 3.
[DEC-03](decision-log.md) was recorded as a two-way door precisely so cutting is routine.

---

## What this is evidence of

Defining "working" as a number before building; enforcing that definition in CI; finding a
defect in analytical output and root-causing it to a design assumption rather than a typo;
running the thing instead of trusting the story about why it could not be run; and reporting a
failed gate without moving the gate.

## What it is not evidence of

Managing an engineering team, a production incident under load, or a regulated release. The
measurement rests on **5 scored dev cases, 24 reviews, one annotator** — enough to fail a gate
decisively, not enough to characterise a model. A second annotator and a larger corpus are
open work, not completed work.

## The line I would defend in an interview

The most valuable thing in this repository is a **failed** measurement that took an hour to
produce, on a feature that had been described as "unverified because of the environment" for
three weeks. The environment story was plausible, self-consistent, and wrong — and it was my
own explanation. Nobody checked it, including me, until there was a harness that made checking
cheap.
