// @vitest-environment node

import { describe, expect, it } from 'vitest'

// Test the normalizedContent hook logic directly (extracted for testability)
import { extractLexicalText } from '@/utils/search/extractLexicalText'
import { normalizeText } from '@/utils/search/normalizeText'

function runNormalizedContentHook(siblingData: { content?: unknown }): string {
  return siblingData.content
    ? normalizeText(extractLexicalText(siblingData.content as Parameters<typeof extractLexicalText>[0]))
    : ''
}

describe('normalizedContent hook', () => {
  it('returns empty string when content is undefined', () => {
    expect(runNormalizedContentHook({})).toBe('')
  })

  it('returns empty string when content is null', () => {
    expect(runNormalizedContentHook({ content: null })).toBe('')
  })

  it('extracts and normalizes plain text from Lexical JSON', () => {
    const lexicalContent = {
      root: {
        children: [
          {
            children: [{ text: 'Müller spielt Violine', type: 'text', version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }

    const result = runNormalizedContentHook({ content: lexicalContent })
    // normalizeText strips diacritics and lowercases
    expect(result).toBe('muller spielt violine')
  })

  it('handles empty Lexical document', () => {
    const emptyContent = {
      root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }

    const result = runNormalizedContentHook({ content: emptyContent })
    expect(result).toBe('')
  })
})
