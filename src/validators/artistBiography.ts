export type ArtistBiographyValidationError = 'malformed' | 'mediaNode' | 'emptyFirstLine' | 'emptyTrailingParagraph'

/**
 * Single source of truth for DE/EN artist-biography validation copy. Shared between the live admin
 * warning banner (feature.client.tsx) and the server publish validator (Artists.ts) so wording
 * changes only need to happen in one place.
 *
 * Ported from `src/validators/recordingDescription.ts` with one intentional divergence: the artist
 * biography ALLOWS the custom PerformersList block (rendered via the frontend), while still banning
 * uploads, relationships, and every other block type (images / embedded media).
 */
export const artistBiographyMessages: Record<'de' | 'en', Record<ArtistBiographyValidationError, string>> = {
  de: {
    malformed: 'Die Biographie ist ungueltig.',
    mediaNode: 'Die Biographie darf keine Bilder oder eingebetteten Medien enthalten.',
    emptyFirstLine: 'Bitte mit einem Satz beginnen, der als Kurzbeschreibung geeignet ist.',
    emptyTrailingParagraph: 'Leere Zeilen am Ende entfernen.',
  },
  en: {
    malformed: 'Biography is invalid.',
    mediaNode: 'The biography cannot contain images or embedded media.',
    emptyFirstLine: "Start with text usable as the artist's short biography.",
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

// The PerformersList custom block is the ONLY block allowed in a biography. Every other block type
// (videoEmbed, audioEmbed, upload, relationship, etc.) is treated as media.
const ALLOWED_BLOCK_TYPES = new Set(['performersList'])
const MEDIA_NODE_TYPES = new Set(['upload', 'relationship'])

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

function isAllowedBlock(node: LexicalNode): boolean {
  if (node.type !== 'block') return false
  const fields = (node as { fields?: unknown }).fields
  if (typeof fields !== 'object' || fields === null) return false
  const blockType = (fields as { blockType?: unknown }).blockType
  return typeof blockType === 'string' && ALLOWED_BLOCK_TYPES.has(blockType)
}

function hasMediaNode(nodes: unknown[]): boolean {
  const pending = [...nodes]

  while (pending.length > 0) {
    const current = pending.pop()
    if (!isNode(current)) continue

    if (typeof current.type === 'string') {
      if (MEDIA_NODE_TYPES.has(current.type)) return true
      // A block is only allowed when it is the PerformersList block; any other block is media.
      if (current.type === 'block' && !isAllowedBlock(current)) return true
    }
    if (Array.isArray(current.children)) {
      for (const child of current.children) {
        if (isNode(child)) pending.push(child)
      }
    }
  }

  return false
}

export function validateArtistBiography(value: unknown): true | ArtistBiographyValidationError {
  const errors = validateArtistBiographyErrors(value)
  return errors.length === 0 ? true : errors[0]
}

export function validateArtistBiographyErrors(value: unknown): ArtistBiographyValidationError[] {
  if (!hasRoot(value) || !isNode(value.root)) return ['malformed']

  const { children } = value.root
  if (!Array.isArray(children) || children.length === 0) return ['malformed']
  if (!hasValidDescendants(children)) return ['malformed']

  const first = children[0]
  const last = children.at(-1)
  if (!isNode(first) || !isNode(last)) return ['malformed']

  const errors: ArtistBiographyValidationError[] = []

  const mediaPresent = hasMediaNode(children)
  if (mediaPresent) {
    errors.push('mediaNode')
  }

  // Unlike recordingDescription, emptyFirstLine is reported even when media is present: the first
  // node here is a plain empty paragraph (the advisory list shows all fixes), not a media node that
  // structurally cannot carry text. Keep this divergence in sync with the sibling validator.
  if (!hasText(first)) {
    errors.push('emptyFirstLine')
  }

  if (last.type === 'paragraph' && !hasText(last)) {
    errors.push('emptyTrailingParagraph')
  }

  return errors
}
