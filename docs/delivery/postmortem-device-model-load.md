# Postmortem: the on-device model could never have loaded

**Severity:** Critical — the product's headline feature was non-functional in every browser
**Status:** Fixed, and the feature is now measured
**Date found:** 2026-09-12, on the first execution in a real browser

## Summary

`public/semantic-worker.js` imported the Transformers.js runtime from:

```
https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.web.js
```

That file is the package's *declared* default browser export, but it is **not a
self-contained bundle**. It ships unresolved bare specifiers — `onnxruntime-common` — which a
browser cannot resolve without an import map. The dynamic `import()` throws immediately:

```
SyntaxError: Failed to resolve module specifier "onnxruntime-common".
Relative references must start with either "/", "./", or "../".
```

The import fails **before any network request for the model is made**. On-device semantic
search could not have worked in any browser, on any network, at any time.

## Impact

The feature shipped — off by default and labelled "limited evidence", which limited the harm —
but it was not merely unverified. It was broken. Every user selecting on-device mode would
have received the generic failure message and fallen back to Basic analysis.

No data was lost or exposed. The fallback path worked correctly, which is the one thing that
went right.

## Why it went undetected for so long

**The error message was wrong, and the wrongness was self-confirming.** The worker's catch
block maps anything not matching `/storage|index|embedding|Close other/` to:

> Check your connection and allow downloads from Hugging Face and jsDelivr.

A module-resolution `SyntaxError` matches none of those patterns, so a **code defect was
reported to the user as a network problem** — and that message was believed. The project
documented the cause as "the authoring environment could not download the external
model/runtime", when the actual cause was a bad import that never attempted a download.

Every subsequent artefact inherited that mistaken diagnosis: the README's "not yet
established" list, ACC-01 in the risk assessment, ISS-03 in the RAID log, and the launch
readiness review all attributed the gap to environment rather than to a defect.

**No test could have caught it.** Every on-device test used synthetic vectors and never loaded
the runtime. The tests exercised `chunks()`, `cosine()`, `rank()` and the message protocol —
all of which were correct. The one line that was wrong was the one line no test touched.

## Five whys

1. Why did on-device search fail? The runtime import threw a module-resolution error.
2. Why? `transformers.web.js` has unresolved bare specifiers and needs a bundler or import map.
3. Why was that build chosen? It is the package's declared default browser export, and the
   name reads as the browser build. It is the reasonable-looking wrong choice.
4. Why did nobody notice? The catch block reported it as a connectivity problem, and the
   authoring environment genuinely had no model access — so the false explanation was
   consistent with observed reality.
5. Why was that allowed to stand? **Because the feature was never executed.** Synthetic-vector
   tests were accepted as coverage for a code path whose only real risk was the part they did
   not touch. **This is the root cause.**

## Resolution

Import `dist/transformers.min.js` — the self-contained bundle — and record in a comment why
`transformers.web.js` must not be used, so the next person does not "correct" it back.

Verified by execution: 24/24 reviews indexed in 11.2 s on Chrome 152 / Windows 11, q8 WASM
single-threaded, persistence confirmed across a re-read, 7 queries answered at 22–38 ms each.

## What it revealed

Fixing the load defect let the feature be measured for the first time —
and it [missed its release gate](evaluation-semantic-result.md) on three of four bounds. The
broken import had been concealing a second, larger problem: the retrieval quality itself is
not good enough, and a threshold sweep shows no similarity floor can fix it.

Two failures were stacked, and the first was hiding the second.

## Actions

| Action | Type | State |
| --- | --- | --- |
| Import the self-contained bundle; comment why | Fix | Done |
| Never map an unrecognised error to a specific cause — say "could not load" and log the real message | Design | **Open** — the catch block still guesses |
| A test that actually loads the runtime, even without scoring quality | Test | **Open** — needs a browser-capable CI job |
| `scripts/device-harness/` so anyone can reproduce a real run in one command | Tooling | Done |
| Correct every document that attributed the gap to the environment | Docs | Done |

## The lesson worth keeping

A synthetic test suite reported green for a feature that could not start. Coverage measured
the parts that were easy to test, and the single line carrying all the integration risk was
invisible to it.

"We could not test it in this environment" deserves the same scepticism as any other
unverified claim — **including when it is my own explanation for why something is unverified.**
The environment story was plausible, self-consistent, and wrong for three weeks. It cost
nothing but an hour to check, and nobody checked.
