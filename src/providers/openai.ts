import type { GuardCompletionParams } from '../core/types.js'
import { BaseProvider, type GuardProviderConfig } from './base.js'

/** OpenAI provider; also works with OpenAI-compatible endpoints via baseURL. */
export class OpenAIProvider extends BaseProvider {
  name = 'openai'
  private client: any

  constructor(config: GuardProviderConfig = {}) {
    super(config)
  }

  private async getClient() {
    if (!this.client) {
      const { default: OpenAI } = await import('openai')
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
      })
    }
    return this.client
  }

  protected getDefaultModel(): string {
    return 'gpt-4o-mini'
  }

  async complete(params: GuardCompletionParams): Promise<string> {
    const client = await this.getClient()
    const response = await client.chat.completions.create({
      model: this.resolveModel(params.model),
      messages: params.messages,
      temperature: params.temperature ?? this.config.temperature ?? 0,
      max_tokens: params.maxTokens ?? this.config.maxTokens ?? 1200,
      ...(params.json ? { response_format: { type: 'json_object' } } : {}),
    }, { signal: params.signal })

    return response.choices[0]?.message?.content ?? ''
  }
}
