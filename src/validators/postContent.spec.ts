import { describe, expect, it } from 'vitest'

import { postContentMessages, validatePostContent, validatePostContentErrors } from './postContent'

const paragraph = (text: string) => ({ type: 'paragraph', children: [{ type: 'text', text }] })
const content = (...children: unknown[]) => ({ root: { children } })

describe('validatePostContent', () => {
  it('accepts text-first content with a non-empty final paragraph', () => {
    expect(validatePostContent(content(paragraph('Opening'), paragraph('Closing')))).toBe(true)
  })

  it('rejects missing or empty editor state', () => {
    expect(validatePostContent(undefined)).toBe('malformed')
    expect(validatePostContent({})).toBe('malformed')
    expect(validatePostContent({ root: null })).toBe('malformed')
    expect(validatePostContent({ root: 'bad' })).toBe('malformed')
    expect(validatePostContent({ root: { children: [] } })).toBe('malformed')
  })

  it('rejects malformed non-empty editor state without throwing', () => {
    expect(validatePostContent({ root: { children: [null] } })).toBe('malformed')
    expect(validatePostContent({ root: { children: ['bad'] } })).toBe('malformed')
    expect(validatePostContent({ root: { children: [1] } })).toBe('malformed')
    expect(validatePostContent(content({ type: 1 }, paragraph('Text')))).toBe('malformed')
    expect(validatePostContent(content(paragraph('Text'), { type: null }))).toBe('malformed')
  })

  it('rejects a leading block', () => {
    expect(
      validatePostContent(content({ type: 'block', fields: { blockType: 'eventDates' } }, paragraph('Text')))
    ).toBe('leadingBlock')
  })

  it('rejects video and audio leading blocks', () => {
    expect(
      validatePostContent(content({ type: 'block', fields: { blockType: 'videoEmbed' } }, paragraph('Text')))
    ).toBe('leadingBlock')
    expect(
      validatePostContent(content({ type: 'block', fields: { blockType: 'audioEmbed' } }, paragraph('Text')))
    ).toBe('leadingBlock')
  })

  it('rejects an empty first paragraph', () => {
    expect(validatePostContent(content(paragraph('  '), paragraph('Text')))).toBe('emptyFirstLine')
  })

  it('rejects a linebreak-only first paragraph', () => {
    expect(validatePostContent(content(paragraph('\n\t'), paragraph('Text')))).toBe('emptyFirstLine')
  })

  it('uses recursively nested descendant text for the first top-level node', () => {
    expect(
      validatePostContent(
        content(
          { type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', text: 'Opening' }] }] },
          paragraph('Closing')
        )
      )
    ).toBe(true)
  })

  it('rejects an empty final paragraph', () => {
    expect(validatePostContent(content(paragraph('Text'), paragraph('\n  ')))).toBe('emptyTrailingParagraph')
  })

  it('uses recursively nested descendant text for the final paragraph', () => {
    expect(
      validatePostContent(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [{ type: 'link', children: [{ type: 'text', text: 'Closing' }] }],
        })
      )
    ).toBe(true)
  })

  it('accepts nested link text and a final block', () => {
    expect(
      validatePostContent(
        content(
          { type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', text: 'Opening' }] }] },
          { type: 'block', fields: { blockType: 'videoEmbed' } }
        )
      )
    ).toBe(true)
  })

  it('rejects malformed descendants before editor validation can traverse them', () => {
    expect(validatePostContent(content({ type: 'paragraph', children: [null] }, paragraph('Closing')))).toBe(
      'malformed'
    )
    expect(validatePostContent(content({ type: 'paragraph', children: ['bad'] }, paragraph('Closing')))).toBe(
      'malformed'
    )
    expect(validatePostContent(content({ type: 'paragraph', children: [{}] }, paragraph('Closing')))).toBe('malformed')
    expect(
      validatePostContent(
        content(paragraph('Opening'), { type: 'paragraph', children: [{ type: 'link', children: 1 }] })
      )
    ).toBe('malformed')
  })

  it('accepts text leaf nodes without children', () => {
    expect(validatePostContent(content(paragraph('Opening'), paragraph('Closing')))).toBe(true)
  })

  it('handles deeply nested editor content without throwing', () => {
    let node: unknown = { type: 'text', text: '' }
    for (let depth = 0; depth < 20_000; depth += 1) {
      node = { type: 'link', children: [node] }
    }

    expect(validatePostContent(content({ type: 'paragraph', children: [node] }, paragraph('Closing')))).toBe(
      'emptyFirstLine'
    )
  })

  it('rejects excessively deep editor content', () => {
    let node: unknown = { type: 'text', text: '' }
    for (let depth = 0; depth < 100_001; depth += 1) {
      node = { type: 'link', children: [node] }
    }

    expect(validatePostContent(content({ type: 'paragraph', children: [node] }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })

  it('rejects excessively wide primitive editor content', () => {
    const children = Array.from({ length: 100_001 }, () => null)

    expect(validatePostContent(content({ type: 'paragraph', children }, paragraph('Closing')))).toBe('malformed')
  })

  it('rejects self-referential nodes before Payload can recurse forever', () => {
    const node: { type: string; children: unknown[] } = { type: 'link', children: [] }
    node.children.push(node)

    expect(validatePostContent(content({ type: 'paragraph', children: [node] }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })
})

describe('validatePostContentErrors', () => {
  it('returns an empty list for valid content', () => {
    expect(validatePostContentErrors(content(paragraph('Opening'), paragraph('Closing')))).toEqual([])
  })

  it('returns a single malformed error and stops further checks', () => {
    expect(validatePostContentErrors(undefined)).toEqual(['malformed'])
    expect(validatePostContentErrors({ root: { children: [null] } })).toEqual(['malformed'])
  })

  it('returns leadingBlock alone when only the first node is invalid', () => {
    expect(
      validatePostContentErrors(content({ type: 'block', fields: { blockType: 'eventDates' } }, paragraph('Closing')))
    ).toEqual(['leadingBlock'])
  })

  it('returns emptyFirstLine alone when only the first paragraph is empty', () => {
    expect(validatePostContentErrors(content(paragraph('  '), paragraph('Closing')))).toEqual(['emptyFirstLine'])
  })

  it('returns emptyTrailingParagraph alone when only the final paragraph is empty', () => {
    expect(validatePostContentErrors(content(paragraph('Opening'), paragraph('  ')))).toEqual([
      'emptyTrailingParagraph',
    ])
  })

  it('returns both leadingBlock and emptyTrailingParagraph together', () => {
    expect(
      validatePostContentErrors(content({ type: 'block', fields: { blockType: 'eventDates' } }, paragraph('  ')))
    ).toEqual(['leadingBlock', 'emptyTrailingParagraph'])
  })

  it('returns both emptyFirstLine and emptyTrailingParagraph together', () => {
    expect(validatePostContentErrors(content(paragraph('  '), paragraph('  ')))).toEqual([
      'emptyFirstLine',
      'emptyTrailingParagraph',
    ])
  })

  it('does not report emptyTrailingParagraph when the final node is not a paragraph', () => {
    expect(
      validatePostContentErrors(content(paragraph('Opening'), { type: 'block', fields: { blockType: 'videoEmbed' } }))
    ).toEqual([])
  })
})

describe('postContentMessages', () => {
  const errorIds: (keyof typeof postContentMessages.en)[] = [
    'malformed',
    'leadingBlock',
    'emptyFirstLine',
    'emptyTrailingParagraph',
  ]

  it('defines German and English text for every error ID', () => {
    for (const id of errorIds) {
      expect(postContentMessages.en[id]).toBeTruthy()
      expect(postContentMessages.de[id]).toBeTruthy()
    }
  })
})
