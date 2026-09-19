/**
 * Pure, editor-independent helpers for the FormatContent feature.
 *
 * Operates on the serialized Lexical node shape (same style as the post-content
 * validator in `src/validators/postContent.ts`) so the transform logic can be
 * unit-tested without a live Lexical editor.
 *
 * IMPORTANT: keep these semantics in sync with the live-node mirror in
 * `src/features/formatContent/feature.client.tsx` (the plugin):
 * 1. "Empty paragraph" detection — both must agree that a paragraph is empty only when every
 *    descendant is a `text`, `linebreak`, or `tab` node with whitespace-only content. Any other
 *    node type (e.g. a future inline decorator) must make the paragraph non-empty so Format
 *    never deletes non-text content.
 * 2. "Linebreak split" scoping — both must split only on `linebreak` nodes that are direct
 *    children of a paragraph, never nested descendants (e.g. inside a link's own children).
 * 3. "Linebreak split" attribute preservation — both must copy every paragraph-level attribute
 *    (`direction`, `format`, `indent`, `textFormat`, `textStyle`) from the original paragraph onto
 *    every new split segment.
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
 * Splits a paragraph into lines at each direct-child `linebreak` node,
 * discarding the linebreak nodes themselves. Only linebreaks that are direct children of the
 * paragraph are split on — a linebreak nested inside an inline span or link (e.g. inside a
 * `link` node's own `children`) is left untouched, because this function only inspects one level
 * of children, never descendants.
 *
 * Each returned segment is a new paragraph object carrying forward every other field from the
 * original (via object spread) — `direction`, `format`, `indent`, `version`, `textFormat`,
 * `textStyle`, and anything else present on the source object. `format` here is the
 * paragraph-level alignment string (e.g. `'start'`), distinct from the numeric per-text-node
 * `format` bitmask nested inside `children` items — the spread only touches the former.
 *
 * If `paragraph.children` is not an array, or the item is not a paragraph node at all (including
 * `null`, primitives, or objects missing `type`), the item is returned unchanged. This function
 * must never throw on malformed input, since it also runs (via a mirrored live implementation) on
 * every Format button click in the admin editor.
 */
function splitParagraphIntoLines(paragraph: FormatNode): unknown[] {
  const { children } = paragraph
  if (!Array.isArray(children)) return [paragraph]
  if (!children.some((child) => isNode(child) && child.type === 'linebreak')) return [paragraph]

  // Start with one segment already present; each linebreak encountered below opens a new one.
  const segments: unknown[][] = [[]]
  for (const child of children) {
    if (isNode(child) && child.type === 'linebreak') {
      segments.push([])
    } else {
      segments[segments.length - 1].push(child)
    }
  }

  return segments.map((segmentChildren) => ({ ...paragraph, children: segmentChildren }))
}

/**
 * Splits every paragraph in a root children array that contains a direct-child `linebreak` node
 * into multiple sibling paragraphs — one per line. Non-paragraph items (blocks, headings) and
 * paragraphs without a direct-child linebreak pass through unchanged, at the same array position
 * (as a single-item pass-through, not reallocated).
 */
export function splitParagraphsAtLinebreaks(children: unknown[]): unknown[] {
  const result: unknown[] = []
  for (const child of children) {
    if (!isNode(child) || child.type !== 'paragraph') {
      result.push(child)
      continue
    }
    result.push(...splitParagraphIntoLines(child))
  }
  return result
}

/**
 * Removes empty paragraph nodes from a root children array. Everything else
 * (blocks, headings, non-empty paragraphs) is preserved untouched.
 */
export function formatContentRoot(children: unknown[]): unknown[] {
  return splitParagraphsAtLinebreaks(children).filter((child) => !isEmptyParagraph(child))
}
