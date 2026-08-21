import { checkConsistency } from '../detectors/consistency.js'
import { checkGrounding } from '../detectors/grounding.js'
import { verifyCitations } from '../detectors/citation.js'
import { aggregateScores } from '../scoring/aggregator.js'
import type {
  CitationOptions,
  CitationResult,
  ConsistencyOptions,
  ConsistencyResult,
  EvaluateOptions,
  EvaluationReport,
  GroundingOptions,
  GroundingResult,
  GuardProvider,
  HallucGuardConfig,
} from './types.js'

/** Main entry point for post-hoc hallucination checks. */
export class HallucGuard {
  constructor(
    private readonly provider: GuardProvider,
    private readonly config: HallucGuardConfig = {},
  ) {}

  checkConsistency(options: ConsistencyOptions): Promise<ConsistencyResult> {
    return checkConsistency(this.provider, options, this.config)
  }

  checkGrounding(options: GroundingOptions): Promise<GroundingResult> {
    return checkGrounding(this.provider, options, this.config)
  }

  verifyCitations(options: CitationOptions): CitationResult {
    return verifyCitations(options)
  }

  async evaluate(options: EvaluateOptions): Promise<EvaluationReport> {
    const enabled = {
      consistency: options.options?.consistency ?? true,
      grounding: options.options?.grounding ?? Boolean(options.context),
      citations: options.options?.citations ?? Boolean(options.options?.sources?.length),
    }

    if (enabled.grounding && !options.context) {
      throw new Error('evaluate({ grounding: true }) requires context')
    }
    if (enabled.citations && !options.options?.sources?.length) {
      throw new Error('evaluate({ citations: true }) requires options.sources')
    }

    const [consistency, grounding, citations] = await Promise.all([
      enabled.consistency
        ? this.checkConsistency({
            prompt: options.prompt,
            samples: options.options?.samples,
            signal: options.signal,
          })
        : Promise.resolve(undefined),
      enabled.grounding
        ? this.checkGrounding({
            context: options.context!,
            response: options.response,
            signal: options.signal,
          })
        : Promise.resolve(undefined),
      enabled.citations
        ? Promise.resolve(this.verifyCitations({
            response: options.response,
            sources: options.options!.sources!,
          }))
        : Promise.resolve(undefined),
    ])

    return {
      overall: aggregateScores({ consistency, grounding, citations }),
      consistency,
      grounding,
      citations,
    }
  }
}

export function createHallucGuard(provider: GuardProvider, config: HallucGuardConfig = {}): HallucGuard {
  return new HallucGuard(provider, config)
}
