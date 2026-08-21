# Scoring

`aggregateScores` fuses detector outputs into a single trust score.

## Weights

- Grounding: `0.7` when present.
- Consistency: `0.3` when present.
- If only one signal is present, it is used with weight `1`.
- Unverified citations apply a multiplicative penalty of `0.85` when at least one citation was detected.

The final score is clamped to `[0, 1]`.

## Levels

| Score | Level |
| --- | --- |
| `>= 0.8` | `high` |
| `>= 0.5` | `moderate` |
| `< 0.5` | `low` |

## Calibration guidance

The defaults are a starting point, not a universal threshold. Calibrate per domain:

- High-risk RAG: require `grounding.grounded === true` regardless of the fused score.
- Creative writing: disable grounding or lower its weight; consistency is usually the wrong signal.
- Support automation: route `moderate` to human review and block `low`.
- Citation-heavy answers: treat `citations.verified === false` as a hard failure even when the fused score remains high.
