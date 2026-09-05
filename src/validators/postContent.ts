export type PostContentValidationError = 'malformed' | 'leadingBlock' | 'emptyFirstLine' | 'emptyTrailingParagraph'

// NOTE: keep the error union, message shape, and node-scan guards in sync with
// `src/validators/recordingDescription.ts` (recordings bans media nodes anywhere, so its union is a
// subset without `leadingBlock`). Posts allow blocks after text; recordings reject all media nodes.

/**
 * Single source of truth for DE/EN post-content validation copy. Shared between the live admin
 * warning banner (feature.client.tsx) and the server publish validator (Posts.ts) so wording
 * changes only need to happen in one place.
 */
export const postContentMessages: Record<'de' | 'en', Record<PostContentValidationError, string>> = {
  de: {
    malformed: 'Der Beitragsinhalt ist ungueltig.',
    leadingBlock: 'Der Beitrag muss mit Text beginnen, nicht mit einem Einbettungsblock.',
    emptyFirstLine: 'Bitte mit einem Satz beginnen, der als Beitrags-Kurztext geeignet ist.',
    emptyTrailingParagraph: 'Leere Zeilen am Ende entfernen.',
  },
  en: {
    malformed: 'Post content is invalid.',
    leadingBlock: 'Start the post with text, not an embed block.',
    emptyFirstLine: "Start with text usable as the post's blurb.",
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

  const pending = [...nodes]
  const visited = new Set<LexicalNode>()

  while (pending.length > 0) {
    const current = pending.pop()
    if (!isNode(current) || visited.has(current) || typeof current.type !== 'string') return false
    if (visited.size >= MAX_NODES_TO_SCAN) return false

    visited.add(current)
    if (current.children === undefined) continue
    if (
      !Array.isArray(current.children) ||
      current.children.length > MAX_NODES_TO_SCAN - visited.size - pending.length
    ) {
      return false
    }

    for (const child of current.children) {
      if (!isNode(child) || visited.has(child)) return false
      pending.push(child)
    }
  }

  return true
}

export function validatePostContent(value: unknown): true | PostContentValidationError {
  const errors = validatePostContentErrors(value)
  return errors.length === 0 ? true : errors[0]
}

/**
 * Returns every violated structural rule for advisory UI display. Unlike
 * `validatePostContent`, this reports all applicable errors at once (e.g. a
 * leading block AND an empty trailing paragraph) so editors see the full
 * list of required fixes instead of one at a time.
 */
export function validatePostContentErrors(value: unknown): PostContentValidationError[] {
  if (!hasRoot(value) || !isNode(value.root)) return ['malformed']

  const { children } = value.root
  if (!Array.isArray(children) || children.length === 0) return ['malformed']
  if (!hasValidDescendants(children)) return ['malformed']

  const first = children[0]
  const last = children.at(-1)
  if (!isNode(first) || !isNode(last)) return ['malformed']

  const errors: PostContentValidationError[] = []

  if (first.type === 'block') {
    errors.push('leadingBlock')
  } else if (!hasText(first)) {
    errors.push('emptyFirstLine')
  }

  if (last.type === 'paragraph' && !hasText(last)) {
    errors.push('emptyTrailingParagraph')
  }

  return errors
}
