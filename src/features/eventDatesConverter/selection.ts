import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isLineBreakNode,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from '@payloadcms/richtext-lexical/lexical'
import { $isAutoLinkNode, $isLinkNode } from '@payloadcms/richtext-lexical/client'

export interface EventDateSource {
  key: NodeKey
  linkType?: 'custom'
  newTab?: boolean
  parentKey: NodeKey
  siblingIndex: number
  text: string
  url?: string
}

export interface EventDateSnapshot {
  anchorKey: NodeKey
  anchorOffset: number
  anchorType: string
  editorKey: string
  focusKey: NodeKey
  focusOffset: number
  focusType: string
  isBackward: boolean
  locale: string
  parentKey: NodeKey
  schemaPath: string
  sources: EventDateSource[]
}

export type EventDateSourcesResult = { error: string; sources?: never } | { error?: never; sources: EventDateSource[] }

function error(message: string): EventDateSourcesResult {
  return { error: message }
}

function boundaryTextNode(node: LexicalNode, direction: 'first' | 'last'): LexicalNode | undefined {
  if ($isTextNode(node)) return node
  if (!$isElementNode(node)) return undefined

  const child = direction === 'first' ? node.getFirstChild() : node.getLastChild()
  return child ? boundaryTextNode(child, direction) : undefined
}

function isAtTextBoundary(
  node: LexicalNode,
  offset: number,
  paragraph: LexicalNode,
  boundary: 'start' | 'end'
): boolean {
  const textNode = boundaryTextNode(paragraph, boundary === 'start' ? 'first' : 'last')
  return (
    $isTextNode(textNode) &&
    node.getKey() === textNode.getKey() &&
    offset === (boundary === 'start' ? 0 : textNode.getTextContentSize())
  )
}

function hasCompleteParagraphBoundaries(paragraphs: LexicalNode[]): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false

  const first = paragraphs[0]
  const last = paragraphs.at(-1)!
  const anchor = selection.anchor.getNode()
  const focus = selection.focus.getNode()
  return (
    (isAtTextBoundary(anchor, selection.anchor.offset, first, 'start') &&
      isAtTextBoundary(focus, selection.focus.offset, last, 'end')) ||
    (isAtTextBoundary(focus, selection.focus.offset, first, 'start') &&
      isAtTextBoundary(anchor, selection.anchor.offset, last, 'end'))
  )
}

function sourceLines(paragraph: LexicalNode, siblingIndex: number): EventDateSourcesResult {
  if (!$isParagraphNode(paragraph) || paragraph.getParentOrThrow() !== $getRoot())
    return error('Only root paragraphs are supported')

  const lines: EventDateSource[] = []
  let linkType: 'custom' | undefined
  let newTab: boolean | undefined
  let text = ''
  let url: string | undefined

  function addLine(): EventDateSourcesResult | undefined {
    if (!text) return error('Empty lines are not supported')
    lines.push({ key: paragraph.getKey(), linkType, newTab, parentKey: 'root', siblingIndex, text, url })
    text = ''
    linkType = undefined
    newTab = undefined
    url = undefined
  }

  for (const child of paragraph.getChildren()) {
    if ($isTextNode(child)) {
      text += child.getTextContent()
      continue
    }

    if ($isLineBreakNode(child)) {
      const result = addLine()
      if (result) return result
      continue
    }

    if ($isAutoLinkNode(child) || !$isLinkNode(child)) return error('Only direct custom links are supported')
    if (url !== undefined || child.getFields().linkType !== 'custom')
      return error('Only one direct custom link is supported')

    const linkUrl = child.getFields().url
    if (typeof linkUrl !== 'string') return error('Custom link URL is required')
    for (const linkChild of child.getChildren()) {
      if (!$isTextNode(linkChild)) return error('Links may contain text only')
      text += linkChild.getTextContent()
    }
    linkType = 'custom'
    newTab = child.getFields().newTab
    url = linkUrl.trim()
  }

  const result = addLine()
  return result ?? { sources: lines }
}

function selectedParagraphs(): { error: string } | { paragraphs: LexicalNode[] } {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return { error: 'Select complete paragraphs' }

  const rootChildren = $getRoot().getChildren()
  const anchorParagraph = selection.anchor.getNode().getTopLevelElementOrThrow()
  const focusParagraph = selection.focus.getNode().getTopLevelElementOrThrow()
  const start = rootChildren.findIndex((node) => node === anchorParagraph)
  const end = rootChildren.findIndex((node) => node === focusParagraph)
  if (start < 0 || end < 0) return { error: 'Only root paragraphs are supported' }

  const paragraphs = rootChildren.slice(Math.min(start, end), Math.max(start, end) + 1)
  if (!paragraphs.every($isParagraphNode)) return { error: 'Only root paragraphs are supported' }
  if (!hasCompleteParagraphBoundaries(paragraphs)) {
    return { error: 'Select complete paragraph contents' }
  }
  if (paragraphs.length > 1 && paragraphs.some((paragraph) => paragraph.getChildren().some($isLineBreakNode))) {
    return { error: 'Select one complete Shift+Enter paragraph' }
  }
  return { paragraphs }
}

export function getEventDateSources(): EventDateSourcesResult {
  const selected = selectedParagraphs()
  if ('error' in selected) return error(selected.error)

  const sources: EventDateSource[] = []
  for (const paragraph of selected.paragraphs) {
    const siblingIndex = paragraph.getIndexWithinParent()
    const result = sourceLines(paragraph, siblingIndex)
    if ('error' in result) return result
    sources.push(...result.sources)
  }
  return { sources }
}

export function createEventDateSnapshot(
  editor: LexicalEditor,
  schemaPath: string,
  locale: string
): EventDateSnapshot | undefined {
  const result = getEventDateSources()
  if ('error' in result) return undefined
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return undefined

  return {
    anchorKey: selection.anchor.key,
    anchorOffset: selection.anchor.offset,
    anchorType: selection.anchor.type,
    editorKey: editor._key,
    focusKey: selection.focus.key,
    focusOffset: selection.focus.offset,
    focusType: selection.focus.type,
    isBackward: selection.isBackward(),
    locale,
    parentKey: result.sources[0].parentKey,
    schemaPath,
    sources: result.sources,
  }
}

export function matchesEventDateSnapshot(
  snapshot: EventDateSnapshot,
  editor: LexicalEditor,
  schemaPath: string,
  locale: string
): boolean {
  if (snapshot.editorKey !== editor._key || snapshot.schemaPath !== schemaPath || snapshot.locale !== locale)
    return false
  const keys = [...new Set(snapshot.sources.map((source) => source.key))]
  const current: EventDateSource[] = []
  for (const key of keys) {
    const paragraph = $getNodeByKey(key)
    if (!paragraph || paragraph.getParent()?.getKey() !== snapshot.parentKey) return false
    const result = sourceLines(paragraph, paragraph.getIndexWithinParent())
    if ('error' in result) return false
    current.push(...result.sources)
  }

  return JSON.stringify(current) === JSON.stringify(snapshot.sources)
}
