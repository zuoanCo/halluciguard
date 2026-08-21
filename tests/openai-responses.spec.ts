import { describe, expect, it } from 'vitest'
import { OpenAIResponsesProvider } from '../src/providers/openai-responses.js'

describe('OpenAIResponsesProvider', () => {
  it('maps system messages to instructions and reads output_text', async () => {
    const provider = new OpenAIResponsesProvider({ apiKey: 'test' })
    let request: any
    ;(provider as any).client = {
      responses: {
        create: async (params: any) => {
          request = params
          return { output_text: 'ok' }
        },
      },
    }

    const output = await provider.complete({
      messages: [
        { role: 'system', content: 'judge' },
        { role: 'user', content: 'claim' },
      ],
    })

    expect(output).toBe('ok')
    expect(request.instructions).toBe('judge')
    expect(request.input).toEqual([{ role: 'user', content: 'claim' }])
  })
})
