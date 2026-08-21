import type { GuardCompletionParams } from '../core/types.js'
import { BaseProvider, type GuardProviderConfig } from './base.js'

/** OpenAI Responses API provider for halluciguard text completions. */
export class OpenAIResponsesProvider extends BaseProvider {
  name = 'openai-responses'
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
    const instructions = params.messages
      .filter(message => message.role === 'system')
      .map(message => message.content)
      .join('\n\n')
    const input = params.messages
      .filter(message => message.role !== 'system')
      .map(message => ({ role: message.role, content: message.content }))

    const response = await client.responses.create({
      model: this.resolveModel(params.model),
      instructions: instructions || undefined,
      input,
      temperature: params.temperature ?? this.config.temperature ?? 0,
      max_output_tokens: params.maxTokens ?? this.config.maxTokens ?? 1200,
    }, { signal: params.signal })

    if (typeof response?.output_text === 'string') return response.output_text

    const chunks: string[] = []
    for (const item of response?.output ?? []) {
      if (item?.type !== 'message') continue
      for (const content of item.content ?? []) {
        if (content?.type === 'output_text' && typeof content.text === 'string') {
          chunks.push(content.text)
        }
      }
    }
    return chunks.join('')
  }
}
