/**
 * Pure, editor-independent helpers for the FormatContent feature.
 *
 * Operates on the serialized Lexical node shape (same style as the post-content
 * validator in `src/validators/postContent.ts`) so the transform logic can be
 * unit-tested without a live Lexical editor.
 *
 * IMPORTANT: keep the "empty paragraph" semantics here in sync with the live-node
 * check in `src/features/formatContent/feature.client.tsx` (the plugin). Both must
 * agree that a paragraph is empty only when every descendant is a `text`,
 * `linebreak`, or `tab` node with whitespace-only content. Any other node type
 * (e.g. a future inline decorator) must make the paragraph non-empty so Format
 * never deletes non-text content.
 */

export interface FormatNode {
  children?: unknown
  text?: string
  type?: string
}

export function isNode(value: unknown): value is FormatNode {
  return typeof value === 'object' && value !== null
}

const LEAF_NODE_TYPES = new Set(['text', 'linebreak', 'tab'])

/**
 * True when any descendant of `node` contains non-whitespace text, or when the
 * subtree contains anything Format is not allowed to delete (a non-leaf node
 * type, a malformed structure, or a non-node child).
 */
function hasProtectedContent(node: FormatNode): boolean {
  const pending: FormatNode[] = [node]

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) continue

    if (typeof current.text === 'string' && current.text.trim()) return true

    if (current.children === undefined) continue

    if (!Array.isArray(current.children)) return true

    for (const child of current.children) {
      if (!isNode(child) || !LEAF_NODE_TYPES.has(child.type ?? '')) return true
      pending.push(child)
    }
  }

  return false
}

/**
 * True when `value` is a paragraph node whose only descendants are empty
 * text/linebreak/tab leaves. Used to detect "empty lines" that Format removes.
 */
export function isEmptyParagraph(value: unknown): boolean {
  return isNode(value) && value.type === 'paragraph' && !hasProtectedContent(value)
}

/**
 * Removes empty paragraph nodes from a root children array. Everything else
 * (blocks, headings, non-empty paragraphs) is preserved untouched.
 */
export function formatContentRoot(children: unknown[]): unknown[] {
  return children.filter((child) => !isEmptyParagraph(child))
}
