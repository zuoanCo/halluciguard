# Testing and calibration

## Local verification

```sh
npm install
npm run check
npm test
npm run build
```

The suite runs without API keys by using mock providers.

## Covered behavior

- Consistency: identical vs contradictory samples, uncertain-band LLM judge blending.
- Grounding: evidence selection, unsupported claim detection, batched entailment with fallback.
- Citations: western citations, bracket source indexes, numeric mismatch notes.
- Scoring: weighting, level thresholds, citation penalty.
- Providers: OpenAI Responses request mapping, resilience retry and timeout.

## Calibration loop before production

1. Collect 100–500 labeled examples from your real traffic: supported, partially supported, fabricated, mis-cited.
2. Run `evaluate` with fixed prompts and sources; record each signal separately.
3. Choose thresholds by risk: optimize recall for fabrication in high-risk domains, precision in low-risk UX.
4. Freeze a regression set and run it in CI with recorded provider fixtures.
5. Add a weekly real-model sample review to catch provider drift.

## Known limits

- No embedding/vector retrieval yet; evidence retrieval is lexical sentence matching.
- Numeric citation checks are exact string matches after normalization; unit conversion and rounded figures need domain rules.
- Real provider behavior should be verified with integration tests before claiming a cross-provider guarantee.
