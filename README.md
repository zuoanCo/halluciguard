# halluciguard

[中文文档](README.zh.md)

![halluciguard — post-hoc grounding and citation checks](docs/assets/hero.png)

Post-hoc hallucination detection for LLM outputs. `halluciguard` does not change how you call a model; it evaluates the response afterward with consistency sampling, claim-level grounding, and citation verification, then fuses the signals into a trust score.

> Status: beta. Detectors are unit-tested with mock providers; calibrate thresholds with your own model, domain, and risk tolerance before production use.

## Features

- **Self-consistency**: samples the same prompt and measures agreement; an optional LLM judge handles the uncertain lexical band.
- **Grounding**: extracts atomic claims, retrieves evidence sentences, and checks entailment in one batched call with per-claim fallback.
- **Citation verification**: matches citation-like spans to provided sources and flags numeric mismatches.
- **Trust report**: weighted overall score with `low` / `moderate` / `high` levels.
- **Provider-agnostic**: implement a small `GuardProvider` interface; built-in OpenAI chat, OpenAI Responses, OpenAI-compatible, and Anthropic providers are included.
- **Resilience**: wrap any provider with retries and per-call timeouts.

## Install

```sh
npm install halluciguard
# Install only the provider SDK you use
npm install openai                 # OpenAI / OpenAI-compatible / Responses
npm install @anthropic-ai/sdk      # Anthropic
```

## Quick start

```ts
import { HallucGuard, OpenAIProvider, withResilience } from 'halluciguard'

const provider = withResilience(new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }), {
  retries: 2,
  timeoutMs: 10_000,
})

const guard = new HallucGuard(provider, {
  consistencyJudge: true,
  groundingBatch: true,
})

const report = await guard.evaluate({
  prompt: 'Summarize Ada Lovelace',
  context: sourceDocument,
  response: modelOutput,
  options: {
    consistency: true,
    grounding: true,
    citations: true,
    samples: 3,
    sources: [{ id: 'bio', content: sourceDocument }],
  },
})
```

## Signals

| Signal | Question it answers | Default weight |
| --- | --- | --- |
| Grounding | Is each atomic claim supported by the supplied context? | 0.7 when present |
| Consistency | Do repeated samples agree semantically? | 0.3 when present |
| Citations | Do cited sources exist and do numbers match? | multiplicative penalty when unverified |

`overall.score` is in `[0, 1]`. Levels map as `>= 0.8` high, `>= 0.5` moderate, otherwise low.

## Documentation

- [Module docs](docs/README.md)
- [Design notes](DESIGN.md)
- [中文 README](README.zh.md)

## Development

```sh
npm install
npm run check
npm test
npm run build
```

## License

MIT © zuoanCo. See [LICENSE](LICENSE).
