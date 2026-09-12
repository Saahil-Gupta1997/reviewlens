# Threshold sweep - on-device semantic, dev split

Gate: recall@5 >= 0.7, precision@5 >= 0.5, absent-topic FP <= 0.25

| threshold | recall@5 | precision@5 | absent-topic FP | clears gate |
| --- | --- | --- | --- | --- |
| -0.05 | 0.673 | 0.360 | 1.00 | no |
| 0.00 | 0.673 | 0.360 | 1.00 | no |
| 0.05 | 0.673 | 0.360 | 1.00 | no |
| 0.10 | 0.673 | 0.360 | 1.00 | no |
| 0.15 | 0.673 | 0.360 | 1.00 | no |
| 0.20 | 0.573 | 0.560 | 1.00 | no |
| 0.25 | 0.473 | 0.560 | 1.00 | no |
| 0.30 (shipped) | 0.267 | 0.320 | 0.50 | no |
| 0.35 | 0.133 | 0.133 | 0.00 | no |
| 0.40 | 0.133 | 0.200 | 0.00 | no |
| 0.45 | 0.133 | 0.200 | 0.00 | no |
| 0.50 | 0.067 | 0.200 | 0.00 | no |
| 0.55 | 0.067 | 0.200 | 0.00 | no |
| 0.60 | 0.000 | 0.000 | 0.00 | no |

**Thresholds clearing the gate: 0 of 66 tested.**
Best achievable recall@5 at any threshold: **0.673** (at -0.05), against a bar of 0.7.

## Signal vs noise overlap

| Case | Type | Top score | What it is |
| --- | --- | --- | --- |
| D1 | has relevant | 0.3369 | top overall = VAL-020; best relevant VAL-018 @ 0.2952 |
| D2 | has relevant | 0.5737 | top overall = VAL-019; best relevant VAL-019 @ 0.5737 |
| D3 | has relevant | 0.2796 | top overall = VAL-012; best relevant VAL-012 @ 0.2796 |
| D4 | has relevant | 0.3045 | top overall = VAL-024; best relevant VAL-024 @ 0.3045 |
| D5 | has relevant | 0.2351 | top overall = VAL-011; best relevant VAL-008 @ 0.1774 |
| D6 | absent-topic (noise) | 0.2795 | highest false positive |
| D7 | absent-topic (noise) | 0.3040 | highest false positive |

Highest absent-topic (noise) score: **0.3040**
Weakest best-relevant (signal) score: **0.1774**

**Signal and noise overlap.** No similarity floor can admit the weakest correct answer while rejecting the strongest false positive. Calibration cannot fix this; the approach has to change or the feature has to be cut.
