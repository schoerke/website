import { describe, expect, it } from 'vitest'

import { formatContentRoot, isEmptyParagraph } from './formatContent'

const text = (text: string, type = 'paragraph') => ({
  children: [{ detail: 0, format: 0, mode: 'normal', style: '', text, type: 'text', version: 1 }],
  direction: null,
  format: '',
  indent: 0,
  type,
  version: 1,
})

const paragraph = (children: unknown[]) => ({
  children,
  direction: null,
  format: '',
  indent: 0,
  type: 'paragraph',
  version: 1,
})

const linebreak = () => ({ type: 'linebreak', version: 1 })
const tab = () => ({ type: 'tab', version: 1 })
const link = (label: string) => ({
  children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: label, type: 'text', version: 1 }],
  direction: null,
  fields: { linkType: 'custom', newTab: true, url: 'https://example.com' },
  format: '',
  indent: 0,
  type: 'link',
  version: 2,
})

describe('isEmptyParagraph', () => {
  it('detects a paragraph with no text', () => {
    expect(isEmptyParagraph(text(''))).toBe(true)
  })

  it('detects a paragraph with only whitespace', () => {
    expect(isEmptyParagraph(text('   '))).toBe(true)
  })

  it('treats non-paragraph nodes as not empty', () => {
    expect(isEmptyParagraph(text('', 'heading'))).toBe(false)
    expect(isEmptyParagraph({ type: 'block', version: 1 })).toBe(false)
  })

  it('treats a paragraph with text as not empty', () => {
    expect(isEmptyParagraph(text('Hello'))).toBe(false)
  })

  it('treats non-node values as not empty', () => {
    expect(isEmptyParagraph(undefined)).toBe(false)
    expect(isEmptyParagraph(null)).toBe(false)
    expect(isEmptyParagraph('paragraph')).toBe(false)
    expect(isEmptyParagraph([{ type: 'paragraph' }])).toBe(false)
  })

  it('detects a paragraph with only a linebreak as empty', () => {
    expect(isEmptyParagraph(paragraph([linebreak()]))).toBe(true)
  })

  it('detects a paragraph with only a tab as empty', () => {
    expect(isEmptyParagraph(paragraph([tab()]))).toBe(true)
  })

  it('treats a paragraph with a link containing text as not empty', () => {
    expect(isEmptyParagraph(paragraph([link('Read more')]))).toBe(false)
  })

  it('treats a paragraph with any non-text node as not empty', () => {
    expect(isEmptyParagraph(paragraph([{ type: 'block', version: 1 }]))).toBe(false)
  })

  it('treats a paragraph without a children array as empty', () => {
    expect(isEmptyParagraph({ type: 'paragraph', version: 1 })).toBe(true)
  })
})

describe('formatContentRoot', () => {
  it('removes empty paragraphs from the start', () => {
    const children = [text(''), text('Hello')]
    expect(formatContentRoot(children)).toEqual([text('Hello')])
  })

  it('removes empty paragraphs from the end', () => {
    const children = [text('Hello'), text('')]
    expect(formatContentRoot(children)).toEqual([text('Hello')])
  })

  it('removes empty paragraphs from the middle', () => {
    const children = [text('A'), text(''), text('B')]
    expect(formatContentRoot(children)).toEqual([text('A'), text('B')])
  })

  it('removes multiple consecutive empty paragraphs', () => {
    const children = [text(''), text(''), text('A'), text(''), text('')]
    expect(formatContentRoot(children)).toEqual([text('A')])
  })

  it('preserves blocks, headings, and non-empty paragraphs', () => {
    const block = { type: 'block', version: 1 }
    const children = [block, text('A', 'heading'), text(''), text('B')]
    expect(formatContentRoot(children)).toEqual([block, text('A', 'heading'), text('B')])
  })

  it('returns an empty array when everything is empty', () => {
    expect(formatContentRoot([text(''), text('')])).toEqual([])
  })

  it('does not mutate the input array', () => {
    const children = [text('A'), text('')]
    formatContentRoot(children)
    expect(children).toHaveLength(2)
  })
})
