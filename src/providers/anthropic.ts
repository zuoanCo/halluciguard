import type { GuardCompletionParams } from '../core/types.js'
import { BaseProvider, type GuardProviderConfig } from './base.js'

/** Anthropic provider. JSON mode is enforced through prompt-only instructions. */
export class AnthropicProvider extends BaseProvider {
  name = 'anthropic'
  private client: any

  constructor(config: GuardProviderConfig = {}) {
    super(config)
  }

  private async getClient() {
    if (!this.client) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk')
      this.client = new Anthropic({ apiKey: this.config.apiKey })
    }
    return this.client
  }

  protected getDefaultModel(): string {
    return 'claude-sonnet-4-20250514'
  }

  async complete(params: GuardCompletionParams): Promise<string> {
    const client = await this.getClient()
    const system = params.messages.find(message => message.role === 'system')?.content
    const messages = params.messages
      .filter(message => message.role !== 'system')
      .map(message => ({ role: message.role as 'user' | 'assistant', content: message.content }))

    const response = await client.messages.create({
      model: this.resolveModel(params.model),
      max_tokens: params.maxTokens ?? this.config.maxTokens ?? 1200,
      temperature: params.temperature ?? this.config.temperature ?? 0,
      system,
      messages,
    }, { signal: params.signal })

    const block = response.content[0]
    return block?.type === 'text' ? block.text : ''
  }
}
