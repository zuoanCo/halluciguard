import type { CitationResult, ConsistencyResult, GroundingResult, TrustLevel } from '../core/types.js'

export function trustLevel(score: number): TrustLevel {
  if (score >= 0.8) return 'high'
  if (score >= 0.5) return 'moderate'
  return 'low'
}

/** Fuse detector scores into a single trust score in [0, 1]. */
export function aggregateScores(parts: {
  consistency?: ConsistencyResult
  grounding?: GroundingResult
  citations?: CitationResult
}): { score: number; level: TrustLevel } {
  const weighted: Array<{ value: number; weight: number }> = []

  if (parts.grounding) weighted.push({ value: parts.grounding.score, weight: 0.7 })
  if (parts.consistency) weighted.push({ value: parts.consistency.confidence, weight: 0.3 })

  let score = weighted.length === 0
    ? 0
    : weighted.reduce((sum, part) => sum + part.value * part.weight, 0) /
      weighted.reduce((sum, part) => sum + part.weight, 0)

  if (parts.citations && parts.citations.citations.length > 0 && !parts.citations.verified) {
    score *= 0.85
  }

  score = Math.max(0, Math.min(1, score))
  return { score, level: trustLevel(score) }
}
