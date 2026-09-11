# QA case study: incorrect rating conditions

## Defect

With ratings [5, 1, 5], the question “How many reviews are not five-star?” returned 2 instead of 1. “How many reviews are three-star or five-star?” returned 0 instead of 2. Both answers were marked supported.

The parser extracted only the first rating and used equality, silently discarding the rest of the condition. Severity: high because this compromises the core analytical result.

## Resolution

Support a single exact rating, a directly negated rating, and explicitly repeated alternatives joined by “or”. Preserve active filters. Exclude unrated records from rating matches, including negated matches; percentage denominators remain all reviews in scope. Explain this convention in the answer notes.

Request clarification for unsupported inequalities, ambiguous conjunctions and negations, or compound rating conditions with averages, themes or nested denominators. This is a bounded English parser, not general natural-language SQL.

## Regression evidence

Engine tests cover the original reproductions, percentages, unrated records, active filters and clarification. API tests exercise both corrected questions in Basic, device and OpenAI modes with the provider budget exhausted, verifying that calculations require no provider call.

## Release gate

Run the automated suite and TypeScript check before release. Browser UAT and real-model retrieval validation remain separate pending activities. A correct calculation does not establish semantic retrieval quality.
