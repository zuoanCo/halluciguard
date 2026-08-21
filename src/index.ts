export { HallucGuard, createHallucGuard } from './core/guard.js'
export type {
  Claim,
  Citation,
  CitationOptions,
  CitationResult,
  ConsistencyOptions,
  ConsistencyResult,
  EvaluateOptions,
  EvaluationReport,
  GroundingOptions,
  GroundingResult,
  GuardCompletionParams,
  GuardMessage,
  GuardProvider,
  HallucGuardConfig,
  SourceDocument,
  TrustLevel,
} from './core/types.js'

export { checkConsistency, checkGrounding, findEvidence, verifyCitations } from './detectors/index.js'
export { extractClaims, heuristicExtractClaims } from './extractors/index.js'
export { aggregateScores, trustLevel } from './scoring/index.js'
export { extractJson, parseJson } from './utils/json.js'
export { cosineSimilarity, jaccardSimilarity, textSimilarity } from './utils/similarity.js'
export { extractNumbers, normalizeText, splitSentences, tokenize, truncate } from './utils/text.js'

export { AnthropicProvider, BaseProvider, OpenAIProvider, OpenAIResponsesProvider, ResilientProvider, withResilience } from './providers/index.js'
export type { GuardProviderConfig, ResilienceOptions } from './providers/index.js'
