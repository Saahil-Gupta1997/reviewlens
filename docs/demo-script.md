# Working-product demonstration

The published [48-second API walkthrough](demo/reviewlens-api-walkthrough.gif) is rendered from [captured HTTP requests and responses](demo/captured-workflow.json). [MP4](demo/reviewlens-api-walkthrough.mp4) is also available. This is not a browser recording or a mock interface.

| Scene | Checked result |
| --- | --- |
| Load fictional demo | 20 accepted reviews, then 20 persisted reviews read back |
| Calculate two-star share | 4/20 = 20%; checked against stored ratings |
| Rank complaints | Login & authentication: 8/20; 90% recognised-theme coverage |
| Verify source | Returned complaint citation texts match their stored reviews |
| Scope to EU | 8 reviews; every returned citation has region EU |
| Persist answers | Calculation and complaint answer IDs present in history |

## Reproduce

```bash
npm ci
npm run build
node scripts/capture-demo.mjs
```

The capture command starts and stops its own loopback adapter and uses only the fictional built-in dataset. It asserts counts, citations, scope and persistence. The local adapter is not a public production server.

To regenerate the visual replay, install Pillow in your Python environment, run `python scripts/render-demo.py`, then:

```bash
ffmpeg -y -f concat -safe 0 -i work/demo-frames/concat.txt -vf 'fps=12,format=yuv420p' -c:v libx264 -crf 23 -movflags +faststart docs/demo/reviewlens-api-walkthrough.mp4
```

The on-device experiment is excluded. Live OpenAI quality, browser UI interactions, customer adoption and business impact are not demonstrated by this recording.
