import { describe, expect, it } from 'vitest'
import { verifyCitations } from '../src/detectors/citation.js'

describe('verifyCitations', () => {
  it('matches western-style citations and flags numeric mismatch', () => {
    const result = verifyCitations({
      response: '根据Smith et al. (2023)的研究，AI的准确率达到了98%。',
      sources: [{ id: 'paper1', content: 'Smith et al. (2023) report 95% accuracy for the model.' }],
    })

    expect(result.citations).toHaveLength(1)
    expect(result.citations[0].found).toBe(true)
    expect(result.citations[0].sourceId).toBe('paper1')
    expect(result.citations[0].note).toContain('数字不一致')
    expect(result.verified).toBe(false)
  })

  it('resolves bracket citations by source order', () => {
    const result = verifyCitations({
      response: '该结论来自年度报告[2]。',
      sources: [
        { id: 'a', content: '无关文档' },
        { id: 'b', content: '年度报告内容' },
      ],
    })

    expect(result.citations[0].sourceId).toBe('b')
    expect(result.verified).toBe(true)
  })
})
