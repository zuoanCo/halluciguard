import type { ConsistencyOptions, ConsistencyResult, GuardProvider, HallucGuardConfig } from '../core/types.js'
import { parseJson } from '../utils/json.js'
import { average, pairwiseSimilarities } from '../utils/similarity.js'

interface ConsistencyJudgement {
  consistent?: boolean
  confidence?: number
}

function clampSamples(samples: number | undefined): number {
  return Math.max(1, Math.min(10, Math.floor(samples ?? 3)))
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

/**
 * Sample the same prompt multiple times and measure whether the answers agree.
 * Lexical similarity is the cheap default; an optional LLM judge handles the
 * uncertain band where wording differs but meaning may be equivalent.
 */
export async function checkConsistency(
  provider: GuardProvider,
  options: ConsistencyOptions,
  defaults: HallucGuardConfig = {},
): Promise<ConsistencyResult> {
  const samples = clampSamples(options.samples)
  const responses: string[] = []

  for (let index = 0; index < samples; index++) {
    responses.push(await provider.complete({
      model: options.model ?? defaults.model,
      temperature: options.temperature ?? defaults.temperature ?? 0.7,
      maxTokens: defaults.maxTokens,
      signal: options.signal,
      messages: [{ role: 'user', content: options.prompt }],
    }))
  }

  const pairwise = pairwiseSimilarities(responses)
  const lexicalConfidence = average(pairwise)
  const threshold = defaults.consistencyThreshold ?? 0.8

  const judgeEnabled = options.judge ?? defaults.consistencyJudge ?? false
  const low = defaults.consistencyJudgeLow ?? 0.45
  const high = defaults.consistencyJudgeHigh ?? 0.9

  if (judgeEnabled && responses.length > 1 && lexicalConfidence >= low && lexicalConfidence < high) {
    const judged = await judgeConsistency(provider, options, defaults, responses)
    if (judged !== null) {
      const confidence = clamp01((lexicalConfidence + judged) / 2)
      return {
        consistent: confidence >= threshold,
        confidence,
        responses,
        pairwiseSimilarities: pairwise,
        method: 'llm-blend',
      }
    }
  }

  return {
    consistent: lexicalConfidence >= threshold,
    confidence: lexicalConfidence,
    responses,
    pairwiseSimilarities: pairwise,
    method: 'lexical',
  }
}

async function judgeConsistency(
  provider: GuardProvider,
  options: ConsistencyOptions,
  defaults: HallucGuardConfig,
  responses: string[],
): Promise<number | null> {
  try {
    const raw = await provider.complete({
      model: options.model ?? defaults.model,
      temperature: 0,
      maxTokens: 400,
      json: true,
      signal: options.signal,
      messages: [
        {
          role: 'system',
          content: 'Judge whether the sampled answers mean the same thing. Respond with ONLY JSON: {"consistent":boolean,"confidence":number}. confidence is semantic agreement in [0,1].',
        },
        {
          role: 'user',
          content: `Prompt: ${options.prompt}\nSamples:\n${responses.map((response, index) => `${index + 1}. ${response}`).join('\n')}`,
        },
      ],
    })

    const parsed = parseJson<ConsistencyJudgement>(raw)
    if (typeof parsed.confidence === 'number') return clamp01(parsed.confidence)
    if (typeof parsed.consistent === 'boolean') return parsed.consistent ? 1 : 0
    return null
  } catch {
    return null
  }
}
