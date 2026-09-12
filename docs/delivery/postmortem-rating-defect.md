# Postmortem: rating conditions returned wrong counts

**Severity:** High — wrong analytical results presented as verified
**Status:** Resolved, regression-covered
**Owner:** Saahil Gupta

## Summary

The rating-condition parser extracted only the first rating from a question and applied
equality, silently discarding the rest of the condition. Negated and multi-value rating
questions returned wrong counts, and the answers were labelled `supported` — the status the
product uses to mean "this number is verified".

## Impact

On a corpus with ratings `[5, 1, 5]`:

| Question                                        | Returned | Correct |
| ----------------------------------------------- | -------- | ------- |
| "How many reviews are not five-star?"           | 2        | **1**   |
| "How many reviews are three-star or five-star?" | 0        | **2**   |

Both were presented as supported results. No user data was lost or exposed. The damage class
is the worst one this product has: a confidently wrong number, in the code path the product
exists to make trustworthy, with nothing on screen to signal doubt.

## Timeline

|                    |                                                                                                                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Introduced         | With the rating-filter feature. The parser handled the single-exact-rating case correctly and silently mishandled everything else                                                                                 |
| Detected           | Owner walkthrough against supplied validation fixtures, checking an expected count by hand                                                                                                                        |
| Reproduced         | Failing test written before any fix, pinning both questions and the ratings that produce them                                                                                                                     |
| Resolved           | Parser rewritten to a bounded grammar with an explicit clarification branch                                                                                                                                       |
| Regression-covered | Engine tests for the reproductions, percentages, unrated records, active filters and clarification; API tests running both questions through Basic, on-device and OpenAI modes with the provider budget exhausted |

## Root cause

**Direct cause.** The parser took the first rating token and compared for equality. Negation
("not five-star") and alternation ("three-star or five-star") were parsed away without trace.

**Why it was silent.** Confidence was attached to the _code path_ rather than to the _parse_.
Any question that reached the calculation branch was marked `supported`, because reaching that
branch was treated as proof of understanding. There was no representation for "I parsed part
of this question and ignored the rest", so partial understanding was indistinguishable from
full understanding.

**Why tests missed it.** Existing tests covered the single-exact-rating case, which worked.
The test set was built from the shapes the parser was written for — the standard failure of
testing the implementation rather than the requirement.

## Five whys

1. Why was the count wrong? The parser used equality against the first rating only.
2. Why did it ignore the rest? It had no grammar for negation or alternation.
3. Why did it answer anyway instead of declining? No code path represented partial parse.
4. Why did no path exist? Confidence was derived from which branch executed, not from how
   much of the question was consumed.
5. Why was that acceptable? The design treated "can calculate" and "understood the question"
   as the same property. **This is the root cause.** Every other symptom follows from it.

## Resolution

Support exactly three rating conditions, and refuse the rest:

- a single exact rating
- a directly negated rating
- explicitly repeated alternatives joined by "or"

Unrated records are excluded from rating matches including negated matches; percentage
denominators remain all reviews in scope, and the answer notes state that convention.
Compound conditions, inequalities, ambiguous conjunctions and rating conditions nested with
averages or themes return a **clarification** rather than a number.

The product now answers a narrower set of questions and says so, instead of answering a wider
set and being wrong about some of them.

## Regression evidence

| Test                                                                   | Pins                                                                                                                        |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| _rating questions preserve negation and explicit alternatives_         | Both original reproductions                                                                                                 |
| _ambiguous rating expressions clarify instead of silently calculating_ | The root cause — partial parse must clarify                                                                                 |
| _low rated share and average handle unrated records_                   | The unrated convention                                                                                                      |
| _rating conditions remain deterministic through every answer mode_     | Same result in Basic, on-device and OpenAI, with the provider budget exhausted — proving calculations need no provider call |

## Actions carried forward

| Action                                                                                                             | Type    | State                                                                   |
| ------------------------------------------------------------------------------------------------------------------ | ------- | ----------------------------------------------------------------------- |
| Every calculation path gets an explicit clarification branch; ambiguity returns a question, never a silent default | Process | Done, applied across scope, date and comparison parsing                 |
| Confidence is derived from how much of the question was consumed, not from which branch ran                        | Design  | Done for rating conditions; the principle is now the parser's contract  |
| Calculation correctness is verified in all three answer modes, not only the default                                | Test    | Done                                                                    |
| Acceptance cases are written from the requirement, not from the implementation                                     | Process | Applied to the 24 in-app acceptance cases and to `eval/golden-set.json` |

## What this did not fix

A correct calculation says nothing about semantic retrieval quality. The two failure modes are
independent, and the second one is why the on-device feature is
[held back](launch-readiness-review.md). Fixing a visible defect is easier than proving the
absence of an invisible one, and it is important not to let the first feel like the second.
