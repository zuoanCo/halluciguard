import type { Claim, GroundingOptions, GroundingResult, GuardProvider, HallucGuardConfig } from '../core/types.js'
import { extractClaims } from '../extractors/claims.js'
import { parseJson } from '../utils/json.js'
import { splitSentences, truncate } from '../utils/text.js'
import { average, textSimilarity } from '../utils/similarity.js'

interface EntailmentJudgement {
  grounded: boolean
  evidence?: string
}

interface EvidenceHit {
  sentence: string
  score: number
}

/** Find the context sentence most likely to support a claim. */
export function findEvidence(context: string, claim: string, minScore = 0): EvidenceHit | null {
  let best: EvidenceHit | null = null
  for (const sentence of splitSentences(context)) {
    const score = textSimilarity(claim, sentence)
    if (!best || score > best.score) best = { sentence, score }
  }
  return best && best.score >= minScore ? best : null
}

/** Check whether every factual claim in a response is supported by the supplied context. */
export async function checkGrounding(
  provider: GuardProvider,
  options: GroundingOptions,
  defaults: HallucGuardConfig = {},
): Promise<GroundingResult> {
  const maxClaims = options.maxClaims ?? defaults.maxClaims ?? 20
  const threshold = defaults.groundingThreshold ?? 0.35
  const evidenceMinScore = options.evidenceMinScore ?? defaults.evidenceMinScore ?? 0.08
  const claimTexts = await extractClaims({
    provider,
    response: options.response,
    model: options.model ?? defaults.model,
    maxClaims,
    signal: options.signal,
  })

  const hits = claimTexts.map(text => ({
    text,
    evidence: findEvidence(options.context, text, evidenceMinScore),
  }))

  const batchEnabled = options.batch ?? defaults.groundingBatch ?? true
  let claims: Claim[] | null = null

  if (batchEnabled && hits.some(hit => hit.evidence)) {
    claims = await judgeClaimsBatch({
      provider,
      context: options.context,
      hits,
      model: options.model ?? defaults.model,
      threshold,
      signal: options.signal,
    })
  }

  if (!claims) {
    claims = []
    for (const hit of hits) {
      claims.push(await judgeClaim({
        provider,
        context: options.context,
        claim: hit.text,
        evidence: hit.evidence?.sentence ?? null,
        model: options.model ?? defaults.model,
        threshold,
        signal: options.signal,
      }))
    }
  }

  const score = claims.length === 0 ? 0 : average(claims.map(claim => claim.score))

  return {
    grounded: claims.length > 0 && claims.every(claim => claim.grounded),
    score,
    claims,
  }
}

async function judgeClaimsBatch(params: {
  provider: GuardProvider
  context: string
  hits: Array<{ text: string; evidence: EvidenceHit | null }>
  model?: string
  threshold: number
  signal?: AbortSignal
}): Promise<Claim[] | null> {
  const { provider, context, hits, model, threshold, signal } = params

  try {
    const raw = await provider.complete({
      model,
      temperature: 0,
      maxTokens: 1600,
      json: true,
      signal,
      messages: [
        {
          role: 'system',
          content: 'Judge whether each claim is entailed by its evidence. Respond with ONLY a JSON array in the same order: [{"grounded":boolean,"evidence":string}]. Use the shortest supporting evidence span. If evidence does not support the claim, set grounded=false.',
        },
        {
          role: 'user',
          content: `Context excerpt: ${truncate(context, 5000)}\n\nItems:\n${hits.map((hit, index) => `${index + 1}. Claim: ${hit.text}\nEvidence: ${hit.evidence?.sentence ?? ''}`).join('\n')}`,
        },
      ],
    })

    const parsed = parseJson<unknown>(raw)
    if (!Array.isArray(parsed) || parsed.length !== hits.length) return null

    return hits.map((hit, index) => {
      const judgement = parsed[index] as EntailmentJudgement
      const lexicalScore = hit.evidence?.score ?? 0
      const grounded = Boolean(judgement?.grounded) && Boolean(hit.evidence)
      const judgedEvidence = typeof judgement?.evidence === 'string' && judgement.evidence.trim()
        ? judgement.evidence.trim()
        : hit.evidence?.sentence ?? null

      return {
        text: hit.text,
        grounded,
        evidence: grounded ? judgedEvidence : null,
        score: grounded ? Math.max(lexicalScore, threshold) : Math.min(lexicalScore, threshold / 2),
      }
    })
  } catch {
    return null
  }
}

async function judgeClaim(params: {
  provider: GuardProvider
  context: string
  claim: string
  evidence: string | null
  model?: string
  threshold: number
  signal?: AbortSignal
}): Promise<Claim> {
  const { provider, context, claim, evidence, model, threshold, signal } = params

  if (!evidence) {
    return { text: claim, grounded: false, evidence: null, score: 0 }
  }

  const lexicalScore = textSimilarity(claim, evidence)

  try {
    const raw = await provider.complete({
      model,
      temperature: 0,
      maxTokens: 800,
      json: true,
      signal,
      messages: [
        {
          role: 'system',
          content: 'Decide whether the claim is entailed by the evidence. Respond with ONLY JSON: {"grounded":boolean,"evidence":string}. Use the shortest supporting evidence span. If the evidence does not support the claim, set grounded=false.',
        },
        {
          role: 'user',
          content: `Claim: ${claim}\nEvidence: ${evidence}\nContext excerpt: ${truncate(context, 4000)}`,
        },
      ],
    })

    const judged = parseJson<EntailmentJudgement>(raw)
    const grounded = Boolean(judged.grounded)
    const judgedEvidence = typeof judged.evidence === 'string' && judged.evidence.trim()
      ? judged.evidence.trim()
      : evidence

    return {
      text: claim,
      grounded,
      evidence: grounded ? judgedEvidence : null,
      score: grounded ? Math.max(lexicalScore, threshold) : Math.min(lexicalScore, threshold / 2),
    }
  } catch {
    const grounded = lexicalScore >= threshold
    return {
      text: claim,
      grounded,
      evidence: grounded ? evidence : null,
      score: lexicalScore,
    }
  }
}
