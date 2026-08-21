# HallucGuard and evaluation flow

`HallucGuard` is the facade over the detectors. Construct it with any `GuardProvider` and optional defaults.

```ts
const guard = new HallucGuard(provider, {
  model: 'gpt-4o-mini',
  consistencyJudge: true,
  groundingBatch: true,
})
```

## Methods

- `checkConsistency({ prompt, samples, temperature, judge })`
- `checkGrounding({ context, response, maxClaims, batch, evidenceMinScore })`
- `verifyCitations({ response, sources })` — synchronous, no provider call
- `evaluate({ prompt, context, response, options })` — runs the requested signals and fuses scores

## `evaluate` defaults

```ts
const enabled = {
  consistency: options.options?.consistency ?? true,
  grounding: options.options?.grounding ?? Boolean(options.context),
  citations: options.options?.citations ?? Boolean(options.options?.sources?.length),
}
```

Grounding requires `context`; citation verification requires `options.sources`. Missing inputs throw early instead of silently producing a misleading score.

## Result shape

```ts
{
  overall: { score: number, level: 'low' | 'moderate' | 'high' },
  consistency?: ConsistencyResult,
  grounding?: GroundingResult,
  citations?: CitationResult,
}
```

Treat `overall` as a triage signal. For high-risk flows, inspect `grounding.claims` and `citations.citations` before accepting a response.
