import type { Citation, CitationOptions, CitationResult, SourceDocument } from '../core/types.js'
import { extractNumbers, normalizeText, splitSentences } from '../utils/text.js'
import { textSimilarity } from '../utils/similarity.js'

interface ParsedCitation {
  text: string
  name?: string
  year?: string
  sourceIndex?: number
}

function parseCitation(sentence: string): ParsedCitation | null {
  const bracket = sentence.match(/\[(\d+)\]/)
  if (bracket) {
    return { text: sentence, sourceIndex: Number(bracket[1]) - 1 }
  }

  const western = sentence.match(/([A-Z][A-Za-z-]+(?:\s+et\s+al\.)?)\s*\((\d{4})\)/)
  if (western) {
    return { text: sentence, name: western[1].replace(/\s+et\s+al\./i, ''), year: western[2] }
  }

  const source = sentence.match(/来源[:：]\s*([^）)]+?)(?:\s+(\d{4}))?\s*[）)]/)
  if (source) {
    return { text: sentence, name: source[1].trim(), year: source[2] }
  }

  const chineseParen = sentence.match(/([A-Za-z0-9_.-]{2,}|[\p{Script=Han}]{2,})\s*（(\d{4})）/u)
  if (chineseParen) {
    return { text: sentence, name: chineseParen[1], year: chineseParen[2] }
  }

  return null
}

function matchSource(parsed: ParsedCitation, sources: SourceDocument[]): SourceDocument | null {
  if (parsed.sourceIndex !== undefined) {
    return sources[parsed.sourceIndex] ?? null
  }

  if (!parsed.name) return null
  const name = normalizeText(parsed.name)

  let best: { source: SourceDocument; score: number } | null = null
  for (const source of sources) {
    const haystack = normalizeText(`${source.id}\n${source.content}`)
    const nameScore = haystack.includes(name) ? 1 : textSimilarity(parsed.name, source.id)
    const yearScore = parsed.year
      ? haystack.includes(parsed.year) ? 1 : 0
      : 0.5
    const score = nameScore * 0.75 + yearScore * 0.25
    if (!best || score > best.score) best = { source, score }
  }

  return best && best.score >= 0.45 ? best.source : null
}

function verifyNumbers(claim: string, source: SourceDocument | null, year?: string): string | undefined {
  if (!source) return undefined
  const withoutCitationMarkers = claim.replace(/\[\d+\]/g, ' ')
  const claimNumbers = extractNumbers(withoutCitationMarkers).filter(number => number !== year)
  if (claimNumbers.length === 0) return undefined

  const sourceNumbers = new Set(extractNumbers(source.content))
  const missing = claimNumbers.filter(number => !sourceNumbers.has(number))
  return missing.length > 0 ? `数字不一致：${missing.join(', ')}` : undefined
}

/** Verify that citation-looking spans in a response point at the provided sources. */
export function verifyCitations(options: CitationOptions): CitationResult {
  const citations: Citation[] = []

  for (const sentence of splitSentences(options.response)) {
    const parsed = parseCitation(sentence)
    if (!parsed) continue

    const source = matchSource(parsed, options.sources)
    const note = verifyNumbers(parsed.text, source, parsed.year)
    citations.push({
      text: parsed.text,
      name: parsed.name,
      year: parsed.year,
      found: source !== null,
      sourceId: source?.id ?? null,
      note,
    })
  }

  return {
    citations,
    verified: citations.every(citation => citation.found && !citation.note),
  }
}
