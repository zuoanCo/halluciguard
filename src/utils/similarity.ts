import { tokenize } from './text.js'

function termCounts(text: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }
  return counts
}

export function jaccardSimilarity(a: string, b: string): number {
  const left = new Set(tokenize(a))
  const right = new Set(tokenize(b))
  if (left.size === 0 && right.size === 0) return 1
  if (left.size === 0 || right.size === 0) return 0

  let intersection = 0
  for (const token of left) {
    if (right.has(token)) intersection++
  }
  return intersection / (left.size + right.size - intersection)
}

export function cosineSimilarity(a: string, b: string): number {
  const left = termCounts(a)
  const right = termCounts(b)
  if (left.size === 0 && right.size === 0) return 1
  if (left.size === 0 || right.size === 0) return 0

  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (const value of left.values()) leftNorm += value * value
  for (const value of right.values()) rightNorm += value * value
  for (const [token, value] of left) {
    dot += value * (right.get(token) ?? 0)
  }

  if (leftNorm === 0 || rightNorm === 0) return 0
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

/** Hybrid lexical similarity that works for both English and Chinese token streams. */
export function textSimilarity(a: string, b: string): number {
  return (jaccardSimilarity(a, b) + cosineSimilarity(a, b)) / 2
}

export function pairwiseSimilarities(values: string[]): number[] {
  const scores: number[] = []
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      scores.push(textSimilarity(values[i], values[j]))
    }
  }
  return scores
}

export function average(values: number[]): number {
  if (values.length === 0) return 1
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
