import { describe, expect, it } from 'vitest'

import { formatContentRoot, isEmptyParagraph, splitParagraphsAtLinebreaks } from './formatContent'

// Wraps a single text node in a paragraph (or another node type via the second argument).
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

// A bare text-node object, with no paragraph wrapper — for building mixed-children paragraphs.
const textNode = (str: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: str,
  type: 'text',
  version: 1,
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

  it('splits a paragraph with a linebreak into two paragraphs', () => {
    const original = paragraph([textNode('First'), linebreak(), textNode('Second')])
    expect(formatContentRoot([original])).toEqual([paragraph([textNode('First')]), paragraph([textNode('Second')])])
  })

  it('removes an empty segment produced by splitting a leading linebreak', () => {
    const original = paragraph([linebreak(), textNode('Second')])
    expect(formatContentRoot([original])).toEqual([paragraph([textNode('Second')])])
  })

  it('removes all segments when a paragraph contains only linebreaks', () => {
    const original = paragraph([linebreak(), linebreak()])
    expect(formatContentRoot([original])).toEqual([])
  })

  it('splits then removes empties in a single composed call with mixed content', () => {
    const block = { type: 'block', version: 1 }
    const withLinebreak = paragraph([textNode('A'), linebreak(), linebreak(), textNode('B')])
    const untouched = paragraph([textNode('C')])
    expect(formatContentRoot([block, withLinebreak, text(''), untouched])).toEqual([
      block,
      paragraph([textNode('A')]),
      paragraph([textNode('B')]),
      untouched,
    ])
  })
})

describe('splitParagraphsAtLinebreaks', () => {
  it('passes through a paragraph with no linebreak unchanged', () => {
    const original = paragraph([textNode('Hello')])
    const result = splitParagraphsAtLinebreaks([original])
    expect(result).toEqual([original])
    expect(result[0]).toBe(original)
  })

  it('passes through non-paragraph nodes unchanged', () => {
    const block = { type: 'block', version: 1 }
    const heading = text('Title', 'heading')
    const result = splitParagraphsAtLinebreaks([block, heading])
    expect(result).toEqual([block, heading])
    expect(result[0]).toBe(block)
    expect(result[1]).toBe(heading)
  })

  it('splits a paragraph with one linebreak into two paragraphs', () => {
    const original = paragraph([textNode('First'), linebreak(), textNode('Second')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([textNode('First')]),
      paragraph([textNode('Second')]),
    ])
  })

  it('preserves paragraph-level attributes on every split segment', () => {
    const original = {
      children: [textNode('First'), linebreak(), textNode('Second')],
      direction: 'rtl',
      format: 'center',
      indent: 2,
      textFormat: 1,
      textStyle: 'color: red;',
      type: 'paragraph',
      version: 1,
    }
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      {
        children: [textNode('First')],
        direction: 'rtl',
        format: 'center',
        indent: 2,
        textFormat: 1,
        textStyle: 'color: red;',
        type: 'paragraph',
        version: 1,
      },
      {
        children: [textNode('Second')],
        direction: 'rtl',
        format: 'center',
        indent: 2,
        textFormat: 1,
        textStyle: 'color: red;',
        type: 'paragraph',
        version: 1,
      },
    ])
  })

  it('splits a paragraph with multiple linebreaks into multiple segments, in order', () => {
    const original = paragraph([textNode('A'), linebreak(), textNode('B'), linebreak(), textNode('C')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([textNode('A')]),
      paragraph([textNode('B')]),
      paragraph([textNode('C')]),
    ])
  })

  it('produces an empty-children segment for consecutive linebreaks', () => {
    const original = paragraph([textNode('A'), linebreak(), linebreak(), textNode('B')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([textNode('A')]),
      paragraph([]),
      paragraph([textNode('B')]),
    ])
  })

  it('produces an empty-children segment for a leading linebreak', () => {
    const original = paragraph([linebreak(), textNode('A')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([paragraph([]), paragraph([textNode('A')])])
  })

  it('produces an empty-children segment for a trailing linebreak', () => {
    const original = paragraph([textNode('A'), linebreak()])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([paragraph([textNode('A')]), paragraph([])])
  })

  it('splits a paragraph with only linebreak children into all-empty segments', () => {
    const original = paragraph([linebreak(), linebreak()])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([paragraph([]), paragraph([]), paragraph([])])
  })

  it('leaves a nested linebreak inside a link untouched while still splitting on a real top-level linebreak', () => {
    const linkWithNestedLinebreak = {
      ...link('Read more'),
      children: [textNode('Read'), linebreak(), textNode('more')],
    }
    const original = paragraph([linkWithNestedLinebreak, linebreak(), textNode('After')])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([linkWithNestedLinebreak]),
      paragraph([textNode('After')]),
    ])
  })

  it("reproduces post 268 DE's real shape: text, linebreak, text, link", () => {
    const original = paragraph([
      textNode(
        'Christian Poltéra wird diesen Sonntag beim Beethovenfest Bonn mit dem Orchester Le Concert Olympique unter der Leitung von Jan Caeyers spielen.'
      ),
      linebreak(),
      textNode(
        'Das Konzert wird live übertragen auf dem YouTube-Kanal DW Classical Music und ist online zu finden unter '
      ),
      link('beethovenfest.de/streams'),
    ])
    expect(splitParagraphsAtLinebreaks([original])).toEqual([
      paragraph([
        textNode(
          'Christian Poltéra wird diesen Sonntag beim Beethovenfest Bonn mit dem Orchester Le Concert Olympique unter der Leitung von Jan Caeyers spielen.'
        ),
      ]),
      paragraph([
        textNode(
          'Das Konzert wird live übertragen auf dem YouTube-Kanal DW Classical Music und ist online zu finden unter '
        ),
        link('beethovenfest.de/streams'),
      ]),
    ])
  })

  it('passes through a paragraph whose children field is not an array', () => {
    const malformed = { type: 'paragraph', children: 'not-an-array', version: 1 }
    const result = splitParagraphsAtLinebreaks([malformed])
    expect(result).toEqual([malformed])
    expect(result[0]).toBe(malformed)
  })

  it('passes through a paragraph with a missing children field', () => {
    const malformed = { type: 'paragraph', version: 1 }
    expect(splitParagraphsAtLinebreaks([malformed])).toEqual([malformed])
  })

  it('passes through malformed top-level array items without throwing', () => {
    expect(splitParagraphsAtLinebreaks([null, 'not-a-node', 42, {}])).toEqual([null, 'not-a-node', 42, {}])
  })
})
