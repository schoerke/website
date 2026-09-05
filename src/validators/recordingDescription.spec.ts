import { describe, expect, it } from 'vitest'

import {
  recordingDescriptionMessages,
  validateRecordingDescription,
  validateRecordingDescriptionErrors,
} from './recordingDescription'

const paragraph = (text: string) => ({ type: 'paragraph', children: [{ type: 'text', text }] })
const content = (...children: unknown[]) => ({ root: { children } })

describe('validateRecordingDescription', () => {
  it('accepts text-first content with a non-empty final paragraph', () => {
    expect(validateRecordingDescription(content(paragraph('Opening'), paragraph('Closing')))).toBe(true)
  })

  it('rejects missing or empty editor state', () => {
    expect(validateRecordingDescription(undefined)).toBe('malformed')
    expect(validateRecordingDescription({})).toBe('malformed')
    expect(validateRecordingDescription({ root: null })).toBe('malformed')
    expect(validateRecordingDescription({ root: 'bad' })).toBe('malformed')
    expect(validateRecordingDescription({ root: { children: [] } })).toBe('malformed')
  })

  it('rejects malformed non-empty editor state without throwing', () => {
    expect(validateRecordingDescription({ root: { children: [null] } })).toBe('malformed')
    expect(validateRecordingDescription({ root: { children: ['bad'] } })).toBe('malformed')
    expect(validateRecordingDescription({ root: { children: [1] } })).toBe('malformed')
    expect(validateRecordingDescription(content({ type: 1 }, paragraph('Text')))).toBe('malformed')
    expect(validateRecordingDescription(content(paragraph('Text'), { type: null }))).toBe('malformed')
  })

  it('rejects any media node anywhere (leading or trailing)', () => {
    expect(
      validateRecordingDescription(content(paragraph('Opening'), { type: 'block', fields: { blockType: 'videoEmbed' } }))
    ).toBe('mediaNode')
    expect(
      validateRecordingDescription(content(paragraph('Opening'), { type: 'upload', fields: { id: '1' } }))
    ).toBe('mediaNode')
    expect(
      validateRecordingDescription(content(paragraph('Opening'), { type: 'relationship', fields: { id: '1' } }))
    ).toBe('mediaNode')
  })

  it('rejects a leading block', () => {
    expect(
      validateRecordingDescription(content({ type: 'block', fields: { blockType: 'videoEmbed' } }, paragraph('Text')))
    ).toBe('mediaNode')
  })

  it('rejects an empty first paragraph', () => {
    expect(validateRecordingDescription(content(paragraph('  '), paragraph('Text')))).toBe('emptyFirstLine')
  })

  it('rejects a linebreak-only first paragraph', () => {
    expect(validateRecordingDescription(content(paragraph('\n\t'), paragraph('Text')))).toBe('emptyFirstLine')
  })

  it('uses recursively nested descendant text for the first top-level node', () => {
    expect(
      validateRecordingDescription(
        content(
          { type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', text: 'Opening' }] }] },
          paragraph('Closing')
        )
      )
    ).toBe(true)
  })

  it('rejects an empty final paragraph', () => {
    expect(validateRecordingDescription(content(paragraph('Text'), paragraph('\n  ')))).toBe(
      'emptyTrailingParagraph'
    )
  })

  it('uses recursively nested descendant text for the final paragraph', () => {
    expect(
      validateRecordingDescription(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [{ type: 'link', children: [{ type: 'text', text: 'Closing' }] }],
        })
      )
    ).toBe(true)
  })

  it('rejects a trailing media block', () => {
    expect(
      validateRecordingDescription(
        content(
          { type: 'paragraph', children: [{ type: 'link', children: [{ type: 'text', text: 'Opening' }] }] },
          { type: 'block', fields: { blockType: 'videoEmbed' } }
        )
      )
    ).toBe('mediaNode')
  })

  it('rejects malformed descendants before editor validation can traverse them', () => {
    expect(validateRecordingDescription(content({ type: 'paragraph', children: [null] }, paragraph('Closing')))).toBe(
      'malformed'
    )
    expect(validateRecordingDescription(content({ type: 'paragraph', children: ['bad'] }, paragraph('Closing')))).toBe(
      'malformed'
    )
    expect(validateRecordingDescription(content({ type: 'paragraph', children: [{}] }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })

  it('handles deeply nested editor content without throwing', () => {
    let node: unknown = { type: 'text', text: '' }
    for (let depth = 0; depth < 20_000; depth += 1) {
      node = { type: 'link', children: [node] }
    }

    expect(validateRecordingDescription(content({ type: 'paragraph', children: [node] }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })

  it('rejects excessively deep editor content', () => {
    let node: unknown = { type: 'text', text: '' }
    for (let depth = 0; depth < 100_001; depth += 1) {
      node = { type: 'link', children: [node] }
    }

    expect(validateRecordingDescription(content({ type: 'paragraph', children: [node] }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })

  it('rejects excessively wide primitive editor content', () => {
    const children = Array.from({ length: 100_001 }, () => null)

    expect(validateRecordingDescription(content({ type: 'paragraph', children }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })

  it('rejects self-referential nodes before Payload can recurse forever', () => {
    const node: { type: string; children: unknown[] } = { type: 'link', children: [] }
    node.children.push(node)

    expect(validateRecordingDescription(content({ type: 'paragraph', children: [node] }, paragraph('Closing')))).toBe(
      'malformed'
    )
  })
})

describe('validateRecordingDescriptionErrors', () => {
  it('returns an empty list for valid content', () => {
    expect(validateRecordingDescriptionErrors(content(paragraph('Opening'), paragraph('Closing')))).toEqual([])
  })

  it('returns a single malformed error and stops further checks', () => {
    expect(validateRecordingDescriptionErrors(undefined)).toEqual(['malformed'])
    expect(validateRecordingDescriptionErrors({ root: { children: [null] } })).toEqual(['malformed'])
  })

  it('returns mediaNode alone when a media node is present', () => {
    expect(
      validateRecordingDescriptionErrors(content({ type: 'block', fields: { blockType: 'videoEmbed' } }, paragraph('Closing')))
    ).toEqual(['mediaNode'])
  })

  it('returns emptyFirstLine alone when only the first paragraph is empty', () => {
    expect(validateRecordingDescriptionErrors(content(paragraph('  '), paragraph('Closing')))).toEqual([
      'emptyFirstLine',
    ])
  })

  it('returns emptyTrailingParagraph alone when only the final paragraph is empty', () => {
    expect(validateRecordingDescriptionErrors(content(paragraph('Opening'), paragraph('  ')))).toEqual([
      'emptyTrailingParagraph',
    ])
  })

  it('returns both mediaNode and emptyTrailingParagraph together', () => {
    expect(
      validateRecordingDescriptionErrors(content({ type: 'block', fields: { blockType: 'videoEmbed' } }, paragraph('  ')))
    ).toEqual(['mediaNode', 'emptyTrailingParagraph'])
  })

  it('returns both emptyFirstLine and emptyTrailingParagraph together', () => {
    expect(validateRecordingDescriptionErrors(content(paragraph('  '), paragraph('  ')))).toEqual([
      'emptyFirstLine',
      'emptyTrailingParagraph',
    ])
  })

  it('reports mediaNode when the final node is a media block', () => {
    expect(
      validateRecordingDescriptionErrors(content(paragraph('Opening'), { type: 'block', fields: { blockType: 'videoEmbed' } }))
    ).toEqual(['mediaNode'])
  })
})

describe('recordingDescriptionMessages', () => {
  const errorIds: (keyof typeof recordingDescriptionMessages.en)[] = [
    'malformed',
    'mediaNode',
    'emptyFirstLine',
    'emptyTrailingParagraph',
  ]

  it('defines German and English text for every error ID', () => {
    for (const id of errorIds) {
      expect(recordingDescriptionMessages.en[id]).toBeTruthy()
      expect(recordingDescriptionMessages.de[id]).toBeTruthy()
    }
  })
})