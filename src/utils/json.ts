/** Extract the first balanced JSON object or array from an LLM response. */
export function extractJson(text: string): string {
  let cleaned = text.trim()

  const fenceMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
  if (fenceMatch) cleaned = fenceMatch[1].trim()

  if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const objectStart = cleaned.indexOf('{')
    const arrayStart = cleaned.indexOf('[')
    const starts = [objectStart, arrayStart].filter(index => index >= 0)
    if (starts.length > 0) cleaned = cleaned.slice(Math.min(...starts))
  }

  if (cleaned.startsWith('{')) return findMatching(cleaned, '{', '}')
  if (cleaned.startsWith('[')) return findMatching(cleaned, '[', ']')
  return cleaned
}

export function parseJson<T>(text: string): T {
  return JSON.parse(extractJson(text)) as T
}

function findMatching(text: string, open: string, close: string): string {
  let depth = 0
  let inString = false
  let escaped = false

  for (let index = 0; index < text.length; index++) {
    const char = text[index]

    if (escaped) {
      escaped = false
      continue
    }
    if (char === '\\' && inString) {
      escaped = true
      continue
    }
    if (char === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (char === open) depth++
    if (char === close) {
      depth--
      if (depth === 0) return text.slice(0, index + 1)
    }
  }

  return text
}
