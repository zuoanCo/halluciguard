import type { GuardProvider } from '../core/types.js'
import { parseJson } from '../utils/json.js'
import { splitSentences, truncate } from '../utils/text.js'

/** Deterministic fallback claim extractor: sentence/clause splitting + de-duplication. */
export function heuristicExtractClaims(text: string, maxClaims = 20): string[] {
  const claims: string[] = []
  const seen = new Set<string>()

  for (const sentence of splitSentences(text)) {
    const parts = sentence.length > 80
      ? sentence.split(/[，,、；;]/).map(part => part.trim()).filter(Boolean)
      : [sentence]

    for (const part of parts) {
      const claim = part.replace(/^[•\-*\d.)\s]+/, '').trim()
      const key = claim.toLowerCase()
      if (claim.length < 2 || claim.endsWith('?') || claim.endsWith('？') || seen.has(key)) continue
      seen.add(key)
      claims.push(claim)
      if (claims.length >= maxClaims) return claims
    }
  }

  return claims
}

/** Ask the provider for atomic claims, falling back to local sentence splitting. */
export async function extractClaims(params: {
  provider: GuardProvider
  response: string
  model?: string
  maxClaims?: number
  signal?: AbortSignal
}): Promise<string[]> {
  const maxClaims = params.maxClaims ?? 20
  const fallback = () => heuristicExtractClaims(params.response, maxClaims)

  try {
    const raw = await params.provider.complete({
      model: params.model,
      temperature: 0,
      maxTokens: 1200,
      json: true,
      signal: params.signal,
      messages: [
        {
          role: 'system',
          content: 'Extract atomic factual claims from the user text. Respond with ONLY a JSON array of strings. Do not include opinions, questions, or formatting text.',
        },
        { role: 'user', content: truncate(params.response, 8000) },
      ],
    })

    const parsed = parseJson<unknown>(raw)
    if (!Array.isArray(parsed)) return fallback()

    const claims = parsed
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, maxClaims)

    return claims.length > 0 ? claims : fallback()
  } catch {
    return fallback()
  }
}
