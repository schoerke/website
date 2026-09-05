export type RecordingDescriptionValidationError =
  | 'malformed'
  | 'mediaNode'
  | 'emptyFirstLine'
  | 'emptyTrailingParagraph'

// NOTE: keep the error union, message shape, and node-scan guards in sync with
// `src/validators/postContent.ts` (Posts uses a superset incl. `leadingBlock`). The two validators
// intentionally diverge: recordings ban media nodes anywhere, posts only reject leading blocks.

/**
 * Single source of truth for DE/EN recording-description validation copy. Shared between the
 * live admin warning banner (feature.client.tsx) and the server publish validator (Recordings.ts)
 * so wording changes only need to happen in one place.
 */
export const recordingDescriptionMessages: Record<
  'de' | 'en',
  Record<RecordingDescriptionValidationError, string>
> = {
  de: {
    malformed: 'Die Beschreibung der Aufnahme ist ungueltig.',
    mediaNode: 'Die Beschreibung darf keine Bilder oder eingebetteten Medien enthalten.',
    emptyFirstLine: 'Bitte mit einem Satz beginnen, der als Kurzbeschreibung geeignet ist.',
    emptyTrailingParagraph: 'Leere Zeilen am Ende entfernen.',
  },
  en: {
    malformed: 'Recording description is invalid.',
    mediaNode: 'The description cannot contain images or embedded media.',
    emptyFirstLine: "Start with text usable as the recording's description.",
    emptyTrailingParagraph: 'Remove any empty lines at the end.',
  },
}

interface LexicalNode {
  children?: unknown
  text?: unknown
  type?: unknown
}

interface LexicalEditorState {
  root?: unknown
}

const MAX_NODES_TO_SCAN = 100_000
const MAX_NESTING_DEPTH = 1_000

function isNode(value: unknown): value is LexicalNode {
  return typeof value === 'object' && value !== null
}

function hasRoot(value: unknown): value is LexicalEditorState {
  return typeof value === 'object' && value !== null && 'root' in value
}

function hasText(node: LexicalNode): boolean {
  const nodes = [node]

  while (nodes.length > 0) {
    const current = nodes.pop()
    if (!current) continue

    if (typeof current.text === 'string' && current.text.trim()) return true
    if (Array.isArray(current.children)) {
      for (const child of current.children) {
        if (isNode(child)) nodes.push(child)
      }
    }
  }

  return false
}

function hasValidDescendants(nodes: unknown[]): boolean {
  if (nodes.length > MAX_NODES_TO_SCAN) return false

  // FIFO breadth-first scan with per-node depth. Caps total nodes AND nesting depth so an extreme
  // but node-cheap structure (e.g. 20k nested links) can't later overflow the unguarded Lexical
  // `validateNodes` recursion inside options.editor.validate.
  const pending: Array<{ node: LexicalNode; depth: number }> = nodes.map((n) => ({ node: n as LexicalNode, depth: 0 }))
  const visited = new Set<LexicalNode>()

  while (pending.length > 0) {
    const current = pending.shift()
    if (!current || !isNode(current.node) || visited.has(current.node) || typeof current.node.type !== 'string') {
      return false
    }
    if (visited.size >= MAX_NODES_TO_SCAN) return false
    if (current.depth >= MAX_NESTING_DEPTH) return false

    visited.add(current.node)
    if (current.node.children === undefined) continue
    if (
      !Array.isArray(current.node.children) ||
      current.node.children.length > MAX_NODES_TO_SCAN - visited.size - pending.length
    ) {
      return false
    }

    for (const child of current.node.children) {
      if (!isNode(child) || visited.has(child)) return false
      pending.push({ node: child, depth: current.depth + 1 })
    }
  }

  return true
}

const MEDIA_NODE_TYPES = new Set(['block', 'upload', 'relationship'])

/**
 * Scans every node (recursively) for media-bearing node types. Recordings descriptions ban images
 * and embedded media anywhere in the content, not just as a leading node.
 */
function hasMediaNode(nodes: unknown[]): boolean {
  const pending = [...nodes]

  while (pending.length > 0) {
    const current = pending.pop()
    if (!isNode(current)) continue

    if (typeof current.type === 'string' && MEDIA_NODE_TYPES.has(current.type)) return true
    if (Array.isArray(current.children)) {
      for (const child of current.children) {
        if (isNode(child)) pending.push(child)
      }
    }
  }

  return false
}

export function validateRecordingDescription(value: unknown): true | RecordingDescriptionValidationError {
  const errors = validateRecordingDescriptionErrors(value)
  return errors.length === 0 ? true : errors[0]
}

/**
 * Returns every violated structural rule for advisory UI display. Unlike
 * `validateRecordingDescription`, this reports all applicable errors at once (e.g. a leading block
 * AND an empty trailing paragraph) so editors see the full list of required fixes.
 */
export function validateRecordingDescriptionErrors(
  value: unknown
): RecordingDescriptionValidationError[] {
  if (!hasRoot(value) || !isNode(value.root)) return ['malformed']

  const { children } = value.root
  if (!Array.isArray(children) || children.length === 0) return ['malformed']
  if (!hasValidDescendants(children)) return ['malformed']

  const first = children[0]
  const last = children.at(-1)
  if (!isNode(first) || !isNode(last)) return ['malformed']

  const errors: RecordingDescriptionValidationError[] = []

  const mediaPresent = hasMediaNode(children)
  if (mediaPresent) {
    errors.push('mediaNode')
  }

  // A media node can't carry text, so only check the text-leading rule when the first node is a
  // plain paragraph — otherwise emptyFirstLine would double-report alongside mediaNode.
  if (!mediaPresent && !hasText(first)) {
    errors.push('emptyFirstLine')
  }

  if (last.type === 'paragraph' && !hasText(last)) {
    errors.push('emptyTrailingParagraph')
  }

  return errors
}