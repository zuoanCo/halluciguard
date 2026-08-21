import { describe, expect, it } from 'vitest'
import { aggregateScores, trustLevel } from '../src/scoring/aggregator.js'

describe('aggregateScores', () => {
  it('weights grounding above consistency when both are present', () => {
    const result = aggregateScores({
      grounding: { grounded: true, score: 1, claims: [] },
      consistency: { consistent: false, confidence: 0, responses: [], pairwiseSimilarities: [] },
    })

    expect(result.score).toBeCloseTo(0.7)
    expect(result.level).toBe('moderate')
  })

  it('penalizes unverified citations', () => {
    const clean = aggregateScores({
      grounding: { grounded: true, score: 1, claims: [] },
      citations: { verified: true, citations: [{ text: 'x', found: true, sourceId: 's' }] },
    })
    const dirty = aggregateScores({
      grounding: { grounded: true, score: 1, claims: [] },
      citations: { verified: false, citations: [{ text: 'x', found: false, sourceId: null }] },
    })

    expect(clean.score).toBe(1)
    expect(dirty.score).toBeCloseTo(0.85)
  })
})

describe('trustLevel', () => {
  it('maps scores to low/moderate/high', () => {
    expect(trustLevel(0.2)).toBe('low')
    expect(trustLevel(0.6)).toBe('moderate')
    expect(trustLevel(0.9)).toBe('high')
  })
})
