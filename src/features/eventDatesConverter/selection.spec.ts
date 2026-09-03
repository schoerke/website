import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $createTabNode,
  $getRoot,
  $isElementNode,
  $isTextNode,
  createEditor,
} from '@payloadcms/richtext-lexical/lexical'
import { $createListItemNode, $createListNode, ListItemNode, ListNode } from '@payloadcms/richtext-lexical/lexical/list'
import { $createAutoLinkNode, $createLinkNode, AutoLinkNode, LinkNode } from '@payloadcms/richtext-lexical/client'
import { describe, expect, it } from 'vitest'

import { createEventDateSnapshot, getEventDateSources, matchesEventDateSnapshot } from './selection'

function createTestEditor() {
  return createEditor({
    namespace: 'eventDatesConverter',
    nodes: [AutoLinkNode, LinkNode, ListItemNode, ListNode],
    onError: (error) => {
      throw error
    },
  })
}

function selectTextRange(first: ReturnType<typeof $createTextNode>, last: ReturnType<typeof $createTextNode>): void {
  first.selectStart().setTextNodeRange(first, 0, last, last.getTextContentSize())
}

function selectReversedTextRange(
  first: ReturnType<typeof $createTextNode>,
  last: ReturnType<typeof $createTextNode>
): void {
  last.selectEnd().setTextNodeRange(last, last.getTextContentSize(), first, 0)
}

describe('getEventDateSources', () => {
  it('extracts complete consecutive root paragraphs and a direct custom link', () => {
    const editor = createTestEditor()

    editor.update(() => {
      const first = $createParagraphNode()
      first.append($createTextNode('29.5.2026 '))
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('A'))
      first.append(link)
      const second = $createParagraphNode().append($createTextNode('30.5.2026 B'))
      $getRoot().append(first, second)
      const firstText = first.getFirstChildOrThrow()
      const lastText = second.getLastChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })

    editor.read(() => {
      expect(getEventDateSources()).toEqual({
        sources: [
          {
            key: expect.any(String),
            linkType: 'custom',
            newTab: false,
            parentKey: 'root',
            siblingIndex: 0,
            text: '29.5.2026 A',
            url: 'https://example.com/a',
          },
          {
            key: expect.any(String),
            linkType: undefined,
            newTab: undefined,
            parentKey: 'root',
            siblingIndex: 1,
            text: '30.5.2026 B',
            url: undefined,
          },
        ],
      })
    })
  })

  it('extracts every line from a completely selected Shift+Enter paragraph', () => {
    const editor = createTestEditor()

    editor.update(() => {
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('29.5.2026 A'), $createLineBreakNode(), $createTextNode('30.5.2026 B'))
      $getRoot().append(paragraph)
      const firstText = paragraph.getFirstChildOrThrow()
      const lastText = paragraph.getLastChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })

    editor.read(() => {
      expect(getEventDateSources()).toEqual({
        sources: [
          {
            key: expect.any(String),
            linkType: undefined,
            newTab: undefined,
            parentKey: 'root',
            siblingIndex: 0,
            text: '29.5.2026 A',
            url: undefined,
          },
          {
            key: expect.any(String),
            linkType: undefined,
            newTab: undefined,
            parentKey: 'root',
            siblingIndex: 0,
            text: '30.5.2026 B',
            url: undefined,
          },
        ],
      })
    })
  })

  it('extracts complete root paragraphs selected in reverse direction', () => {
    const editor = createTestEditor()

    editor.update(() => {
      const first = $createParagraphNode().append($createTextNode('29.5.2026 A'))
      const second = $createParagraphNode().append($createTextNode('30.5.2026 B'))
      $getRoot().append(first, second)
      const firstText = first.getFirstChildOrThrow()
      const lastText = second.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectReversedTextRange(firstText, lastText)
    })

    editor.read(() => {
      expect(getEventDateSources()).toMatchObject({
        sources: [{ text: '29.5.2026 A' }, { text: '30.5.2026 B' }],
      })
    })
  })

  it('rejects partial, list, auto-link, and multiple-link selections', () => {
    const partial = createTestEditor()
    partial.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 A'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      text.select(1, 10)
    })
    partial.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const linebreak = createTestEditor()
    linebreak.update(() => {
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('29.5.2026 A'), $createLineBreakNode(), $createTextNode('30.5.2026 B'))
      $getRoot().append(paragraph)
      const firstText = paragraph.getFirstChildOrThrow()
      const lastText = paragraph.getLastChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
      lastText.select(5, 10)
    })
    linebreak.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const list = createTestEditor()
    list.update(() => {
      const item = $createListItemNode().append($createTextNode('29.5.2026 A'))
      $getRoot().append($createListNode('bullet').append(item))
      item.selectStart()
      item.selectEnd()
    })
    list.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const autoLink = createTestEditor()
    autoLink.update(() => {
      const paragraph = $createParagraphNode()
      const link = $createAutoLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('29.5.2026 A'))
      paragraph.append(link)
      $getRoot().append(paragraph)
      const linkText = paragraph.getFirstChildOrThrow()
      if (!$isElementNode(linkText)) throw new Error('Expected link node')
      const text = linkText.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
    })
    autoLink.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const multipleLinks = createTestEditor()
    multipleLinks.update(() => {
      const paragraph = $createParagraphNode()
      const first = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      first.append($createTextNode('29.5.2026 '))
      const second = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/b' } })
      second.append($createTextNode('A'))
      paragraph.append(first, second)
      $getRoot().append(paragraph)
      const firstLink = paragraph.getFirstChildOrThrow()
      const lastLink = paragraph.getLastChildOrThrow()
      if (!$isElementNode(firstLink) || !$isElementNode(lastLink)) throw new Error('Expected link nodes')
      const firstText = firstLink.getFirstChildOrThrow()
      const lastText = lastLink.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })
    multipleLinks.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))
  })

  it('rejects decorators, nested links, mixed inline nodes, and nonconsecutive source paragraphs', () => {
    const decorator = createTestEditor()
    decorator.update(() => {
      const paragraph = $createParagraphNode().append($createTabNode())
      $getRoot().append(paragraph)
      paragraph.selectStart()
      paragraph.selectEnd()
    })
    decorator.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const nestedLink = createTestEditor()
    nestedLink.update(() => {
      const paragraph = $createParagraphNode()
      const outer = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      const inner = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/b' } })
      inner.append($createTextNode('29.5.2026 A'))
      outer.append(inner)
      paragraph.append(outer)
      $getRoot().append(paragraph)
      const text = inner.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
    })
    nestedLink.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const mixed = createTestEditor()
    mixed.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 A'), $createTabNode())
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      text.selectStart()
      paragraph.getLastChildOrThrow().selectEnd()
    })
    mixed.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))

    const nonconsecutive = createTestEditor()
    nonconsecutive.update(() => {
      const first = $createParagraphNode().append($createTextNode('29.5.2026 A'))
      const list = $createListNode('bullet').append($createListItemNode().append($createTextNode('skip')))
      const last = $createParagraphNode().append($createTextNode('30.5.2026 B'))
      $getRoot().append(first, list, last)
      const firstText = first.getFirstChildOrThrow()
      const lastText = last.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })
    nonconsecutive.read(() => expect(getEventDateSources()).toMatchObject({ error: expect.any(String) }))
  })
})

describe('event-date snapshots', () => {
  it('matches only unchanged editor, path, locale, ordered source nodes, text, links, and parents', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('29.5.2026 A'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })

    editor.read(() => {
      expect(matchesEventDateSnapshot(snapshot!, editor, 'content', 'de')).toBe(true)
      expect(matchesEventDateSnapshot(snapshot!, editor, 'content', 'en')).toBe(false)
      expect(matchesEventDateSnapshot(snapshot!, editor, 'other', 'de')).toBe(false)
    })

    editor.update(() => {
      const paragraph = $getRoot().getFirstChildOrThrow()
      if (!$isElementNode(paragraph)) throw new Error('Expected paragraph')
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      text.setTextContent('30.5.2026 A')
    })
    editor.read(() => expect(matchesEventDateSnapshot(snapshot!, editor, 'content', 'de')).toBe(false))
  })

  it('rejects editor mismatch, parent moves, reordering, and link field changes', () => {
    const editor = createTestEditor()
    const otherEditor = createTestEditor()
    let snapshot: ReturnType<typeof createEventDateSnapshot>

    editor.update(() => {
      const first = $createParagraphNode()
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('29.5.2026 A'))
      first.append(link)
      const second = $createParagraphNode().append($createTextNode('30.5.2026 B'))
      $getRoot().append(first, second)
      const firstText = link.getFirstChildOrThrow()
      const lastText = second.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
      snapshot = createEventDateSnapshot(editor, 'content', 'de')
    })

    otherEditor.read(() => expect(matchesEventDateSnapshot(snapshot!, otherEditor, 'content', 'de')).toBe(false))
    // Opening the drawer moves browser focus outside Lexical and can clear selection.
    editor.update(() => $getRoot().getLastChildOrThrow().selectStart())
    editor.read(() => expect(matchesEventDateSnapshot(snapshot!, editor, 'content', 'de')).toBe(true))
    editor.update(() => {
      const first = $getRoot().getFirstChildOrThrow()
      const second = $getRoot().getLastChildOrThrow()
      second.insertAfter(first)
    })
    editor.read(() => expect(matchesEventDateSnapshot(snapshot!, editor, 'content', 'de')).toBe(false))

    const linkEditor = createTestEditor()
    let linkSnapshot: ReturnType<typeof createEventDateSnapshot>
    linkEditor.update(() => {
      const paragraph = $createParagraphNode()
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('29.5.2026 A'))
      paragraph.append(link)
      $getRoot().append(paragraph)
      const text = link.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      linkSnapshot = createEventDateSnapshot(linkEditor, 'content', 'de')
      link.setFields({ linkType: 'custom', newTab: true, url: 'https://example.com/b' })
    })
    linkEditor.read(() => expect(matchesEventDateSnapshot(linkSnapshot!, linkEditor, 'content', 'de')).toBe(false))
  })
})
