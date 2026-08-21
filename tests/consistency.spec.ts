import { describe, expect, it } from 'vitest'
import { checkConsistency } from '../src/detectors/consistency.js'
import type { GuardCompletionParams, GuardProvider } from '../src/core/types.js'

class QueueProvider implements GuardProvider {
  name = 'queue'
  calls: GuardCompletionParams[] = []

  constructor(private outputs: string[]) {}

  async complete(params: GuardCompletionParams): Promise<string> {
    this.calls.push(params)
    const output = this.outputs.shift()
    if (output === undefined) throw new Error('No mock output left')
    return output
  }
}

describe('checkConsistency', () => {
  it('marks identical answers as consistent', async () => {
    const provider = new QueueProvider(['Paris', 'Paris', 'Paris'])
    const result = await checkConsistency(provider, { prompt: 'Capital of France?', samples: 3 })

    expect(result.consistent).toBe(true)
    expect(result.confidence).toBe(1)
    expect(result.responses).toEqual(['Paris', 'Paris', 'Paris'])
    expect(provider.calls[0].temperature).toBe(0.7)
  })

  it('marks contradictory answers as inconsistent', async () => {
    const provider = new QueueProvider(['Paris', 'London', 'Berlin'])
    const result = await checkConsistency(provider, { prompt: 'Capital of France?', samples: 3 })

    expect(result.consistent).toBe(false)
    expect(result.confidence).toBeLessThan(0.8)
    expect(result.pairwiseSimilarities).toHaveLength(3)
  })
})
