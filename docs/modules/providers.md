# Providers and resilience

## `GuardProvider`

```ts
interface GuardProvider {
  name: string
  complete(params: GuardCompletionParams): Promise<string>
}
```

A provider receives chat-style messages and returns raw text. Detectors own prompt construction and JSON parsing; providers should stay thin.

## Built-in providers

| Provider | Class | Notes |
| --- | --- | --- |
| OpenAI chat.completions | `OpenAIProvider` | Also covers OpenAI-compatible gateways through `baseURL`; `json: true` maps to JSON mode. |
| OpenAI Responses API | `OpenAIResponsesProvider` | Maps system messages to `instructions` and reads `output_text` / message output text. |
| Anthropic | `AnthropicProvider` | Moves system messages into `system`; JSON behavior is prompt-enforced. |

## Custom provider

```ts
const provider: GuardProvider = {
  name: 'my-gateway',
  async complete({ messages, model, temperature, signal }) {
    const text = await callMyGateway({ messages, model, temperature, signal })
    return text
  },
}
```

Return only the model text. Throw the original network/HTTP error so `withResilience` can classify and retry it.

## Resilience wrapper

```ts
const resilient = withResilience(provider, {
  retries: 2,
  delayMs: 200,
  timeoutMs: 10_000,
  onRetry: (attempt, error) => metrics.increment('provider_retry', { attempt }),
})
```

- Retries use exponential backoff and do not consume detector logic.
- Abort errors are not retried.
- Timeouts abort the inner provider through `AbortSignal` and also win a race, so slow providers that ignore signals still fail the call.
