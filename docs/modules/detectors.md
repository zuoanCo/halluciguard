# Detectors

## Consistency

`checkConsistency` samples the same prompt `samples` times and computes pairwise lexical similarity. When the lexical confidence is inside the uncertain band, an optional LLM judge estimates semantic agreement and the two confidences are averaged.

Defaults:

- `samples`: 3, clamped to 1–10
- `consistencyThreshold`: 0.8
- judge band: `consistencyJudgeLow` 0.45, `consistencyJudgeHigh` 0.9
- `method`: `lexical` or `llm-blend`

Enable the judge only when wording differences are common in your domain; it adds one provider call.

## Grounding

`checkGrounding` runs in four steps:

1. **Claim extraction**: provider-based atomic claim extraction with deterministic sentence/clause fallback.
2. **Evidence retrieval**: each claim is matched to the most similar context sentence; `evidenceMinScore` filters weak candidates.
3. **Entailment**: by default all claim/evidence pairs are judged in one batched provider call. If parsing fails or the provider errors, the detector falls back to per-claim judging, then to lexical thresholding.
4. **Score**: average claim score; `grounded` is true only when every extracted claim is grounded.

Useful options:

- `maxClaims`: cap provider work for long responses.
- `batch`: force batching on/off.
- `groundingThreshold`: lexical fallback threshold, default 0.35.

## Citations

`verifyCitations` is synchronous and provider-free. It recognizes common spans such as `Smith et al. (2023)`, `来源：WHO 2024`, Chinese parenthetical years, and bracket references like `[2]`.

A citation is marked down when the source cannot be matched or when numbers in the citing sentence do not appear in the matched source. Bracket indexes are resolved by source order and excluded from numeric comparison.
