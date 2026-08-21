import { describe, expect, it, vi } from 'vitest'
import { checkConsistency } from '../src/detectors/consistency.js'
import { checkGrounding } from '../src/detectors/grounding.js'
import type { GuardCompletionParams, GuardProvider } from '../src/core/types.js'
import { withResilience } from '../src/providers/resilient.js'

class ConsistencyProvider implements GuardProvider {
  name = 'consistency'
  private samples = ['Paris', 'The capital is Paris', 'Paris']

  async complete(params: GuardCompletionParams): Promise<string> {
    const system = params.messages[0]?.content ?? ''
    if (system.includes('Judge whether the sampled answers')) {
      return '{"consistent":true,"confidence":1}'
    }
    return this.samples.shift() ?? 'Paris'
  }
}

class BatchGroundingProvider implements GuardProvider {
  name = 'batch-grounding'
  batchCalls = 0

  async complete(params: GuardCompletionParams): Promise<string> {
    const system = params.messages[0]?.content ?? ''
    if (system.includes('Extract atomic factual claims')) {
      return '["A is supported","B is supported"]'
    }
    if (system.includes('Judge whether each claim is entailed')) {
      this.batchCalls++
      return '[{"grounded":true,"evidence":"A is supported."},{"grounded":false,"evidence":""}]'
    }
    throw new Error('should not fall back to single-claim judging')
  }
}

describe('advanced consistency', () => {
  it('blends lexical uncertainty with an LLM judge', async () => {
    const result = await checkConsistency(new ConsistencyProvider(), {
      prompt: 'Capital of France?',
      samples: 3,
      judge: true,
    }, {
      consistencyThreshold: 0.7,
      consistencyJudgeLow: 0.2,
      consistencyJudgeHigh: 0.9,
    })

    expect(result.method).toBe('llm-blend')
    expect(result.consistent).toBe(true)
    expect(result.confidence).toBeGreaterThan(0.7)
  })
})

describe('batched grounding', () => {
  it('judges claims in one batch call', async () => {
    const provider = new BatchGroundingProvider()
    const result = await checkGrounding(provider, {
      context: 'A is supported.',
      response: 'A is supported. B is supported.',
      batch: true,
    })

    expect(provider.batchCalls).toBe(1)
    expect(result.claims).toHaveLength(2)
    expect(result.claims[0].grounded).toBe(true)
    expect(result.claims[1].grounded).toBe(false)
    expect(result.grounded).toBe(false)
  })
})

describe('withResilience', () => {
  it('retries transient provider failures', async () => {
    let calls = 0
    const provider = withResilience({
      name: 'flaky',
      async complete() {
        calls++
        if (calls === 1) throw new Error('HTTP 500')
        return 'ok'
      },
    }, { retries: 1, delayMs: 1 })

    await expect(provider.complete({ messages: [] })).resolves.toBe('ok')
    expect(calls).toBe(2)
  })

  it('times out slow providers', async () => {
    const provider = withResilience({
      name: 'slow',
      async complete() {
        await new Promise(resolve => setTimeout(resolve, 30))
        return 'too late'
      },
    }, { retries: 0, timeoutMs: 5 })

    await expect(provider.complete({ messages: [] })).rejects.toThrow('Provider timeout')
  })
})
