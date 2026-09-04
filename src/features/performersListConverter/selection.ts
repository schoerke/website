import {
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from '@payloadcms/richtext-lexical/lexical'
import { $isAutoLinkNode, $isLinkNode } from '@payloadcms/richtext-lexical/client'

export interface PerformersListSource {
  key: NodeKey
  lineIndex: number
  linkType?: 'custom'
  newTab?: boolean
  parentKey: NodeKey
  siblingIndex: number
  sourceId: string
  text: string
  /** Raw, untrusted snapshot provenance. Never navigation target; drawer renders sanitized plain text only. */
  url?: string
}

export interface PerformersListSnapshot {
  editorKey: string
  locale: string
  parentKey: NodeKey
  schemaPath: string
  sources: PerformersListSource[]
}

export type PerformersListSourcesResult =
  | { error: string; sources?: never }
  | { error?: never; sources: PerformersListSource[] }

function error(message: string): PerformersListSourcesResult {
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

function sourceLines(paragraph: LexicalNode, siblingIndex: number): PerformersListSourcesResult {
  if (!$isParagraphNode(paragraph) || paragraph.getParentOrThrow() !== $getRoot())
    return error('Only root paragraphs are supported')

  const lines: PerformersListSource[] = []
  let linkType: 'custom' | undefined
  let newTab: boolean | undefined
  let text = ''
  let url: string | undefined

  function addLine(): PerformersListSourcesResult | undefined {
    if (!text.trim()) return error('Whitespace-only lines are not supported')
    const lineIndex = lines.length
    const key = paragraph.getKey()
    lines.push({
      key,
      lineIndex,
      linkType,
      newTab,
      parentKey: 'root',
      siblingIndex,
      sourceId: `${key}:${lineIndex}`,
      text,
      url,
    })
    linkType = undefined
    newTab = undefined
    text = ''
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
    url = linkUrl
  }

  const result = addLine()
  return result ?? { sources: lines }
}

function sourcesMatch(snapshotSources: PerformersListSource[], currentSources: PerformersListSource[]): boolean {
  return (
    snapshotSources.length === currentSources.length &&
    snapshotSources.every((source, index) => {
      const current = currentSources[index]
      return (
        source.key === current.key &&
        source.parentKey === current.parentKey &&
        source.siblingIndex === current.siblingIndex &&
        source.lineIndex === current.lineIndex &&
        source.sourceId === current.sourceId &&
        source.text === current.text &&
        source.url === current.url &&
        source.linkType === current.linkType &&
        source.newTab === current.newTab
      )
    })
  )
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
  if (!hasCompleteParagraphBoundaries(paragraphs)) return { error: 'Select complete paragraph contents' }
  if (paragraphs.length > 1 && paragraphs.some((paragraph) => paragraph.getChildren().some($isLineBreakNode)))
    return { error: 'Select one complete Shift+Enter paragraph' }
  return { paragraphs }
}

export function getPerformersListSources(): PerformersListSourcesResult {
  const selected = selectedParagraphs()
  if ('error' in selected) return error(selected.error)

  const sources: PerformersListSource[] = []
  for (const paragraph of selected.paragraphs) {
    const result = sourceLines(paragraph, paragraph.getIndexWithinParent())
    if ('error' in result) return result
    sources.push(...result.sources)
  }
  return { sources }
}

export function createPerformersListSnapshot(
  editor: LexicalEditor,
  schemaPath: string,
  locale: string
): PerformersListSnapshot | undefined {
  const result = getPerformersListSources()
  if ('error' in result) return undefined

  return {
    editorKey: editor._key,
    locale,
    parentKey: result.sources[0].parentKey,
    schemaPath,
    sources: result.sources,
  }
}

export function matchesPerformersListSnapshot(
  snapshot: PerformersListSnapshot,
  editor: LexicalEditor,
  schemaPath: string,
  locale: string
): boolean {
  // Lexical editor identity follows the existing EventDates snapshot pattern.
  if (snapshot.editorKey !== editor._key || snapshot.schemaPath !== schemaPath || snapshot.locale !== locale)
    return false

  const current: PerformersListSource[] = []
  for (const key of [...new Set(snapshot.sources.map((source) => source.key))]) {
    const paragraph = $getNodeByKey(key)
    if (!paragraph || paragraph.getParent()?.getKey() !== snapshot.parentKey) return false
    const result = sourceLines(paragraph, paragraph.getIndexWithinParent())
    if ('error' in result) return false
    current.push(...result.sources)
  }

  return sourcesMatch(snapshot.sources, current)
}
