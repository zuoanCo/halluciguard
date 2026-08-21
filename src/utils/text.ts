const WORD_RE = /[\p{L}\p{N}]+/gu

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenize(text: string): string[] {
  const tokens: string[] = []
  for (const match of normalizeText(text).match(WORD_RE) ?? []) {
    if (/\p{Script=Han}/u.test(match)) {
      // Chinese has no word boundaries; character unigrams/bigrams give a stable lexical signal.
      for (let index = 0; index < match.length; index++) {
        tokens.push(match[index])
        if (index < match.length - 1) tokens.push(match.slice(index, index + 2))
      }
    } else {
      tokens.push(match)
    }
  }
  return tokens
}

export function splitSentences(text: string): string[] {
  const protectedText = text
    .replace(/\r/g, '')
    .replace(/\bet al\./gi, 'et al<DOT>')
    .replace(/\b(e\.g|i\.e|etc|vs|Dr|Mr|Ms|Prof)\./gi, '$1<DOT>')

  return protectedText
    .split(/(?<=[.!?。！？；;])\s+|\n+/)
    .map(sentence => sentence.replace(/<DOT>/g, '.').trim())
    .filter(Boolean)
}

export function extractNumbers(text: string): string[] {
  return normalizeText(text).match(/-?\d+(?:\.\d+)?%?/g) ?? []
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}
