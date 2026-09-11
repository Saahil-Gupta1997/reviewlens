# Contributing to ReviewLens

Thanks for helping improve ReviewLens. Keep changes focused, explain product or technical trade-offs in the pull request, and add or update tests for behavior changes.

## Local workflow

```bash
npm ci
npm test
npm run demo
```

The local demo runs on loopback and persists its development database under `.reviewlens-local/` (ignored by Git). Never commit API keys, encryption secrets, customer review data, or generated build output.

## Pull requests

- Describe the user problem and the proposed change.
- Include validation steps and screenshots for UI changes.
- Call out privacy, latency, cost, or retrieval-quality implications.
- Keep the public README and relevant decision/evaluation docs current.
