import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $createTabNode,
  $getRoot,
  $isTextNode,
  createEditor,
} from '@payloadcms/richtext-lexical/lexical'
import { $createListItemNode, $createListNode, ListItemNode, ListNode } from '@payloadcms/richtext-lexical/lexical/list'
import { $createAutoLinkNode, $createLinkNode, AutoLinkNode, LinkNode } from '@payloadcms/richtext-lexical/client'
import { describe, expect, it } from 'vitest'

import { createPerformersListSnapshot, getPerformersListSources, matchesPerformersListSnapshot } from './selection'

function createTestEditor() {
  return createEditor({
    namespace: 'performersListConverter',
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

describe('getPerformersListSources', () => {
  it('extracts complete consecutive root paragraphs with raw custom link fields', () => {
    const editor = createTestEditor()

    editor.update(() => {
      const first = $createParagraphNode()
      first.append($createTextNode('Tianwa '))
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: ' https://example.com/a ' } })
      link.append($createTextNode('Yang'))
      first.append(link)
      const second = $createParagraphNode().append($createTextNode('Trio Catch'))
      $getRoot().append(first, second)
      const firstText = first.getFirstChildOrThrow()
      const lastText = second.getLastChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })

    editor.read(() => {
      expect(getPerformersListSources()).toEqual({
        sources: [
          {
            key: expect.any(String),
            lineIndex: 0,
            linkType: 'custom',
            newTab: false,
            parentKey: 'root',
            siblingIndex: 0,
            sourceId: expect.any(String),
            text: 'Tianwa Yang',
            url: ' https://example.com/a ',
          },
          {
            key: expect.any(String),
            lineIndex: 0,
            linkType: undefined,
            parentKey: 'root',
            siblingIndex: 1,
            sourceId: expect.any(String),
            text: 'Trio Catch',
            url: undefined,
          },
        ],
      })
    })
  })

  it('extracts complete root paragraphs selected in reverse document order', () => {
    const editor = createTestEditor()

    editor.update(() => {
      const first = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      const second = $createParagraphNode().append($createTextNode('Trio Catch'))
      $getRoot().append(first, second)
      const firstText = first.getFirstChildOrThrow()
      const lastText = second.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectReversedTextRange(firstText, lastText)
    })

    editor.read(() => {
      expect(getPerformersListSources()).toMatchObject({
        sources: [{ text: 'Tianwa Yang' }, { text: 'Trio Catch' }],
      })
    })
  })

  it('extracts all lines from one fully selected Shift+Enter paragraph with unique source IDs', () => {
    const editor = createTestEditor()

    editor.update(() => {
      const paragraph = $createParagraphNode()
      paragraph.append(
        $createTextNode('Tianwa Yang | Violine'),
        $createLineBreakNode(),
        $createTextNode('Trio Catch'),
        $createLineBreakNode(),
        $createTextNode('Martin Adamek | Klarinette')
      )
      $getRoot().append(paragraph)
      const first = paragraph.getFirstChildOrThrow()
      const last = paragraph.getLastChildOrThrow()
      if (!$isTextNode(first) || !$isTextNode(last)) throw new Error('Expected text nodes')
      selectTextRange(first, last)
    })

    editor.read(() => {
      const result = getPerformersListSources()
      if ('error' in result) throw new Error(result.error)
      expect(result.sources.map(({ key }) => key)).toEqual([
        result.sources[0].key,
        result.sources[0].key,
        result.sources[0].key,
      ])
      expect(result.sources.map(({ sourceId }) => sourceId)).toEqual([
        `${result.sources[0].key}:0`,
        `${result.sources[0].key}:1`,
        `${result.sources[0].key}:2`,
      ])
      expect(result.sources.map(({ lineIndex }) => lineIndex)).toEqual([0, 1, 2])
    })
  })

  it('rejects partial, partial Shift+Enter, list, mixed, whitespace, auto-link, nested-link, and multiple-link selections', () => {
    const partial = createTestEditor()
    partial.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      text.select(1, 10)
    })
    partial.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const linebreak = createTestEditor()
    linebreak.update(() => {
      const paragraph = $createParagraphNode()
      paragraph.append($createTextNode('Tianwa Yang'), $createLineBreakNode(), $createTextNode('Trio Catch'))
      $getRoot().append(paragraph)
      const last = paragraph.getLastChildOrThrow()
      if (!$isTextNode(last)) throw new Error('Expected text node')
      last.select(1, last.getTextContentSize())
    })
    linebreak.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const list = createTestEditor()
    list.update(() => {
      const item = $createListItemNode().append($createTextNode('Tianwa Yang'))
      $getRoot().append($createListNode('bullet').append(item))
      item.selectStart()
      item.selectEnd()
    })
    list.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const nonconsecutive = createTestEditor()
    nonconsecutive.update(() => {
      const first = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      const list = $createListNode('bullet').append($createListItemNode().append($createTextNode('skip')))
      const last = $createParagraphNode().append($createTextNode('Trio Catch'))
      $getRoot().append(first, list, last)
      const firstText = first.getFirstChildOrThrow()
      const lastText = last.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })
    nonconsecutive.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const mixed = createTestEditor()
    mixed.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'), $createTabNode())
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      text.selectStart()
      paragraph.getLastChildOrThrow().selectEnd()
    })
    mixed.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const whitespace = createTestEditor()
    whitespace.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode(' \t\u00a0 '))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
    })
    whitespace.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const autoLink = createTestEditor()
    autoLink.update(() => {
      const paragraph = $createParagraphNode()
      const link = $createAutoLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('Tianwa Yang'))
      paragraph.append(link)
      $getRoot().append(paragraph)
      const text = link.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
    })
    autoLink.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const nestedLink = createTestEditor()
    nestedLink.update(() => {
      const paragraph = $createParagraphNode()
      const outer = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      const inner = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/b' } })
      inner.append($createTextNode('Tianwa Yang'))
      outer.append(inner)
      paragraph.append(outer)
      $getRoot().append(paragraph)
      const text = inner.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
    })
    nestedLink.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))

    const multipleLinks = createTestEditor()
    multipleLinks.update(() => {
      const paragraph = $createParagraphNode()
      const first = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      const second = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/b' } })
      first.append($createTextNode('Tianwa '))
      second.append($createTextNode('Yang'))
      paragraph.append(first, second)
      $getRoot().append(paragraph)
      const firstText = first.getFirstChildOrThrow()
      const lastText = second.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
    })
    multipleLinks.read(() => expect(getPerformersListSources()).toMatchObject({ error: expect.any(String) }))
  })
})

describe('performers-list snapshots', () => {
  it('rejects a snapshot from another editor with the same path and locale', () => {
    const editor = createTestEditor()
    const otherEditor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
    })

    otherEditor.read(() => expect(matchesPerformersListSnapshot(snapshot!, otherEditor, 'content', 'de')).toBe(false))
  })

  it('matches unchanged sources after active selection moves', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>

    editor.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
    })

    editor.update(() => $getRoot().getFirstChildOrThrow().selectStart())
    editor.read(() => {
      expect(matchesPerformersListSnapshot(snapshot!, editor, 'content', 'de')).toBe(true)
      expect(matchesPerformersListSnapshot(snapshot!, editor, 'content', 'en')).toBe(false)
      expect(matchesPerformersListSnapshot(snapshot!, editor, 'other', 'de')).toBe(false)
    })
  })

  it('rejects source text, parent, ordering, deletion, and raw link changes', () => {
    const editor = createTestEditor()
    let snapshot: ReturnType<typeof createPerformersListSnapshot>

    editor.update(() => {
      const first = $createParagraphNode()
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: ' https://example.com/a ' } })
      link.append($createTextNode('Tianwa Yang'))
      first.append(link)
      const second = $createParagraphNode().append($createTextNode('Trio Catch'))
      $getRoot().append(first, second)
      const firstText = link.getFirstChildOrThrow()
      const lastText = second.getFirstChildOrThrow()
      if (!$isTextNode(firstText) || !$isTextNode(lastText)) throw new Error('Expected text nodes')
      selectTextRange(firstText, lastText)
      snapshot = createPerformersListSnapshot(editor, 'content', 'de')
    })

    editor.update(() => {
      const first = $getRoot().getFirstChildOrThrow()
      const second = $getRoot().getLastChildOrThrow()
      second.insertAfter(first)
    })
    editor.read(() => expect(matchesPerformersListSnapshot(snapshot!, editor, 'content', 'de')).toBe(false))

    const changed = createTestEditor()
    let changedSnapshot: ReturnType<typeof createPerformersListSnapshot>
    changed.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      changedSnapshot = createPerformersListSnapshot(changed, 'content', 'de')
      text.setTextContent('Changed')
    })
    changed.read(() => expect(matchesPerformersListSnapshot(changedSnapshot!, changed, 'content', 'de')).toBe(false))

    const linkChanged = createTestEditor()
    let linkSnapshot: ReturnType<typeof createPerformersListSnapshot>
    linkChanged.update(() => {
      const paragraph = $createParagraphNode()
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('Tianwa Yang'))
      paragraph.append(link)
      $getRoot().append(paragraph)
      const text = link.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      linkSnapshot = createPerformersListSnapshot(linkChanged, 'content', 'de')
      link.setFields({ linkType: 'custom', newTab: false, url: 'https://example.com/b' })
    })
    linkChanged.read(() =>
      expect(matchesPerformersListSnapshot(linkSnapshot!, linkChanged, 'content', 'de')).toBe(false)
    )

    const whitespaceUrlChanged = createTestEditor()
    let whitespaceUrlSnapshot: ReturnType<typeof createPerformersListSnapshot>
    whitespaceUrlChanged.update(() => {
      const paragraph = $createParagraphNode()
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: ' https://x ' } })
      link.append($createTextNode('Tianwa Yang'))
      paragraph.append(link)
      $getRoot().append(paragraph)
      const text = link.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      whitespaceUrlSnapshot = createPerformersListSnapshot(whitespaceUrlChanged, 'content', 'de')
      link.setFields({ linkType: 'custom', newTab: false, url: 'https://x' })
    })
    whitespaceUrlChanged.read(() =>
      expect(matchesPerformersListSnapshot(whitespaceUrlSnapshot!, whitespaceUrlChanged, 'content', 'de')).toBe(false)
    )

    const newTabChanged = createTestEditor()
    let newTabSnapshot: ReturnType<typeof createPerformersListSnapshot>
    newTabChanged.update(() => {
      const paragraph = $createParagraphNode()
      const link = $createLinkNode({ fields: { linkType: 'custom', newTab: false, url: 'https://example.com/a' } })
      link.append($createTextNode('Tianwa Yang'))
      paragraph.append(link)
      $getRoot().append(paragraph)
      const text = link.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      newTabSnapshot = createPerformersListSnapshot(newTabChanged, 'content', 'de')
      link.setFields({ linkType: 'custom', newTab: true, url: 'https://example.com/a' })
    })
    newTabChanged.read(() =>
      expect(matchesPerformersListSnapshot(newTabSnapshot!, newTabChanged, 'content', 'de')).toBe(false)
    )

    const deleted = createTestEditor()
    let deletedSnapshot: ReturnType<typeof createPerformersListSnapshot>
    deleted.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      $getRoot().append(paragraph)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      deletedSnapshot = createPerformersListSnapshot(deleted, 'content', 'de')
      paragraph.remove()
    })
    deleted.read(() => expect(matchesPerformersListSnapshot(deletedSnapshot!, deleted, 'content', 'de')).toBe(false))

    const reparented = createTestEditor()
    let reparentedSnapshot: ReturnType<typeof createPerformersListSnapshot>
    reparented.update(() => {
      const paragraph = $createParagraphNode().append($createTextNode('Tianwa Yang'))
      const container = $createParagraphNode()
      $getRoot().append(paragraph, container)
      const text = paragraph.getFirstChildOrThrow()
      if (!$isTextNode(text)) throw new Error('Expected text node')
      selectTextRange(text, text)
      reparentedSnapshot = createPerformersListSnapshot(reparented, 'content', 'de')
      container.append(paragraph)
    })
    reparented.read(() =>
      expect(matchesPerformersListSnapshot(reparentedSnapshot!, reparented, 'content', 'de')).toBe(false)
    )
  })
})
