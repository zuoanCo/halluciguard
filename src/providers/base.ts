import type { GuardCompletionParams, GuardProvider } from '../core/types.js'

export interface GuardProviderConfig {
  apiKey?: string
  baseURL?: string
  defaultModel?: string
  temperature?: number
  maxTokens?: number
}

export abstract class BaseProvider implements GuardProvider {
  abstract name: string

  constructor(protected readonly config: GuardProviderConfig = {}) {}

  abstract complete(params: GuardCompletionParams): Promise<string>

  protected resolveModel(model?: string): string {
    return model ?? this.config.defaultModel ?? this.getDefaultModel()
  }

  protected abstract getDefaultModel(): string
}
