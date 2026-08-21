import { describe, expect, it } from 'vitest'
import { checkGrounding, findEvidence } from '../src/detectors/grounding.js'
import type { GuardCompletionParams, GuardProvider } from '../src/core/types.js'

class JudgeProvider implements GuardProvider {
  name = 'judge'

  async complete(params: GuardCompletionParams): Promise<string> {
    const system = params.messages[0]?.content ?? ''
    const user = params.messages.at(-1)?.content ?? ''

    if (system.includes('Extract atomic factual claims')) {
      return JSON.stringify([
        '张三于2015年从清华大学毕业',
        '张三现任ABC公司技术总监',
        '张三年薪百万',
      ])
    }

    if (system.includes('Decide whether the claim is entailed')) {
      const grounded = !user.includes('年薪百万')
      return JSON.stringify({
        grounded,
        evidence: grounded ? '2015年毕业于清华大学计算机科学专业' : '',
      })
    }

    throw new Error(`Unexpected prompt: ${system}`)
  }
}

const context = '张三，男，1990年出生，现任ABC公司技术总监。2015年毕业于清华大学计算机科学专业。'

describe('checkGrounding', () => {
  it('finds the most relevant context sentence', () => {
    const evidence = findEvidence(context, '张三毕业于清华大学')
    expect(evidence?.sentence).toContain('清华大学')
  })

  it('flags unsupported claims as hallucinations', async () => {
    const result = await checkGrounding(new JudgeProvider(), {
      context,
      response: '张三于2015年从清华大学毕业，之后在ABC公司担任技术总监，年薪百万。',
    })

    expect(result.grounded).toBe(false)
    expect(result.claims).toHaveLength(3)
    expect(result.claims.filter(claim => !claim.grounded)).toHaveLength(1)
    expect(result.claims.find(claim => !claim.grounded)?.text).toContain('年薪百万')
    expect(result.score).toBeLessThan(1)
  })
})
