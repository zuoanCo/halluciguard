/** Minimal provider interface used by all detectors. */
export interface GuardProvider {
  name: string
  complete(params: GuardCompletionParams): Promise<string>
}

export interface GuardCompletionParams {
  messages: GuardMessage[]
  model?: string
  temperature?: number
  maxTokens?: number
  /** Ask the provider to emit JSON when it supports a JSON mode. */
  json?: boolean
  signal?: AbortSignal
}

export interface GuardMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface HallucGuardConfig {
  model?: string
  temperature?: number
  maxTokens?: number
  /** Similarity threshold used by the consistency detector. */
  consistencyThreshold?: number
  /** Enable an LLM judge when lexical consistency is uncertain. */
  consistencyJudge?: boolean
  /** Lower bound of the uncertain lexical-confidence band. */
  consistencyJudgeLow?: number
  /** Upper bound of the uncertain lexical-confidence band. */
  consistencyJudgeHigh?: number
  /** Lexical fallback threshold used when no judge provider is available. */
  groundingThreshold?: number
  /** Minimum lexical score for a context sentence to count as candidate evidence. */
  evidenceMinScore?: number
  /** Batch entailment checks into one provider call when possible. */
  groundingBatch?: boolean
  /** Maximum claims sent through grounding. */
  maxClaims?: number
}

export interface ConsistencyOptions {
  prompt: string
  samples?: number
  temperature?: number
  model?: string
  /** Force the semantic judge on/off for this call. */
  judge?: boolean
  signal?: AbortSignal
}

export interface ConsistencyResult {
  consistent: boolean
  confidence: number
  responses: string[]
  pairwiseSimilarities: number[]
  /** Which signal produced the final confidence. */
  method?: 'lexical' | 'llm-blend'
}

export interface SourceDocument {
  id: string
  content: string
}

export interface Claim {
  text: string
  grounded: boolean
  evidence: string | null
  score: number
}

export interface GroundingOptions {
  context: string
  response: string
  model?: string
  maxClaims?: number
  /** Force batch entailment on/off for this call. */
  batch?: boolean
  /** Minimum lexical score for candidate evidence. */
  evidenceMinScore?: number
  signal?: AbortSignal
}

export interface GroundingResult {
  grounded: boolean
  score: number
  claims: Claim[]
}

export interface Citation {
  text: string
  name?: string
  year?: string
  found: boolean
  sourceId: string | null
  note?: string
}

export interface CitationOptions {
  response: string
  sources: SourceDocument[]
}

export interface CitationResult {
  citations: Citation[]
  verified: boolean
}

export interface EvaluateOptions {
  prompt: string
  context?: string
  response: string
  options?: {
    consistency?: boolean
    grounding?: boolean
    citations?: boolean
    samples?: number
    sources?: SourceDocument[]
  }
  signal?: AbortSignal
}

export type TrustLevel = 'low' | 'moderate' | 'high'

export interface EvaluationReport {
  overall: {
    score: number
    level: TrustLevel
  }
  consistency?: ConsistencyResult
  grounding?: GroundingResult
  citations?: CitationResult
}
