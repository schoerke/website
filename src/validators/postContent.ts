export type PostContentValidationError =
  | 'malformed'
  | 'leadingBlock'
  | 'emptyFirstLine'
  | 'emptyTrailingParagraph'
  | 'emptyMiddleParagraph'

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
    emptyMiddleParagraph: 'Leere Zeilen zwischen Absätzen entfernen.',
  },
  en: {
    malformed: 'Post content is invalid.',
    leadingBlock: 'Start the post with text, not an embed block.',
    emptyFirstLine: "Start with text usable as the post's blurb.",
    emptyTrailingParagraph: 'Remove any empty lines at the end.',
    emptyMiddleParagraph: 'Remove any empty lines between paragraphs.',
  },
}

/**
 * Advisory-only reminder message shown in the admin banner when a post's final paragraph looks
 * like a manually-typed event date with a link (e.g. "4. Juli 2026, Yamagata [link]"), instead of
 * the `EventDates` block. Unlike `postContentMessages`, this dict is a flat `{ de, en }` pair (not
 * keyed by error ID) because there is only one advisory message today. Deliberately NOT merged
 * into `postContentMessages` or `PostContentValidationError`: this check never participates in
 * `validatePostContent`/`validatePostContentErrors`/the publish validator in `Posts.ts`, so it can
 * never block saving or publishing. See `hasTrailingDateUrl` below.
 */
export const postContentAdvisoryMessages: Record<'de' | 'en', string> = {
  de: 'Bitte den EventDates-Block für einheitliche Darstellung verwenden.',
  en: 'Please use the EventDates block for consistent styling.',
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

  // Any empty paragraph strictly between the first and last node is an unwanted
  // empty line. The FormatContent util removes these.
  for (let i = 1; i < children.length - 1; i++) {
    const child = children[i]
    if (isNode(child) && child.type === 'paragraph' && !hasText(child)) {
      errors.push('emptyMiddleParagraph')
      break
    }
  }

  return errors
}

const TRAILING_DATE_URL_MAX_NODES_TO_SCAN = 100_000

const MONTH_NAMES =
  'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December'

const TRAILING_DATE_PATTERN = new RegExp(
  [
    '\\b\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}\\b',
    '\\b\\d{4}-\\d{2}-\\d{2}\\b',
    // Day-first written dates, e.g. "4. Juli 2026" / "4 July 2026" / "4th July 2026". The
    // optional ordinal suffix (st/nd/rd/th) is required for real EN post content, e.g.
    // "25th August 2026" — without it, ordinary English ordinal dates silently fail to match.
    `\\b\\d{1,2}(?:st|nd|rd|th)?\\.?\\s*(?:${MONTH_NAMES})\\s+\\d{4}\\b`,
    // Month-first written dates, e.g. "July 4, 2026" / "August 25th, 2026".
    `\\b(?:${MONTH_NAMES})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4}\\b`,
  ].join('|'),
  'i'
)

interface TrailingDateUrlScanResult {
  hasLink: boolean
  text: string
}

/**
 * Order-preserving, cycle-safe walk of a single paragraph's descendants, collecting joined text
 * (left-to-right, document order) and whether any `link`/`autolink` node was seen.
 *
 * This is intentionally NOT `hasText`'s traversal: `hasText` uses a pop-from-end stack, which
 * visits children in reverse order. That's fine for `hasText`'s existence-only check, but would
 * scramble text split across sibling nodes here (e.g. a link node sitting between two date
 * fragments), defeating the date regex. This function recurses in source order instead, and
 * embeds its own `MAX_NODES_TO_SCAN`/`visited`-Set guard (structurally like
 * `hasValidDescendants`'s) inline, in the same single pass — it does not call
 * `hasValidDescendants` separately.
 */
function scanParagraphForDateUrl(node: LexicalNode): TrailingDateUrlScanResult | null {
  const visited = new Set<LexicalNode>()
  let hasLink = false
  const textParts: string[] = []

  // A plain recursive walk hits the native call-stack limit well before
  // `TRAILING_DATE_URL_MAX_NODES_TO_SCAN` for a linear (single-child-per-node) chain, e.g. the
  // "excessively deep last-node content" test's 100,001-deep link chain. Cap recursion depth
  // separately (well under typical JS engine stack limits) and bail out safely rather than
  // letting a `RangeError: Maximum call stack size exceeded` escape.
  const MAX_RECURSION_DEPTH = 1_000

  function walk(current: unknown, depth: number): boolean {
    if (depth > MAX_RECURSION_DEPTH) return false
    if (!isNode(current)) return false
    if (visited.has(current)) return false
    if (visited.size >= TRAILING_DATE_URL_MAX_NODES_TO_SCAN) return false
    visited.add(current)

    if (current.type === 'link' || current.type === 'autolink') hasLink = true
    if (typeof current.text === 'string') textParts.push(current.text)

    if (current.children === undefined) return true
    if (!Array.isArray(current.children)) return false

    for (const child of current.children) {
      if (!walk(child, depth + 1)) return false
    }

    return true
  }

  // Joined with a space (not '') between sibling text fragments: adjacent text nodes may not be
  // separated by literal whitespace (e.g. prose text immediately followed by an autolink's own
  // display text), which would otherwise fuse into one word and break the date pattern's `\b`
  // boundaries. Extra whitespace inserted mid-date is harmless since the pattern already uses
  // `\s+`/`\s*` around date components.
  if (!walk(node, 0)) return null
  return { hasLink, text: textParts.join(' ') }
}

/**
 * Advisory-only check: does the post's final top-level node look like a manually-typed event
 * date with a link (e.g. "4. Juli 2026, Yamagata [link]")? If so, the admin editor should be
 * reminded to use the `EventDates` block instead.
 *
 * Standalone export. Does NOT participate in `validatePostContent`, `validatePostContentErrors`,
 * or `PostContentValidationError` — it must never affect the publish-blocking validator in
 * `Posts.ts`. Called only from the client-side advisory banner
 * (`src/features/postContentWarning/feature.client.tsx`).
 *
 * Only the single last top-level node is inspected (same scope as `emptyTrailingParagraph`). A
 * date/link paragraph followed by another non-empty paragraph, or by an `EventDates` block, will
 * NOT trigger this — see the design spec's Known Limitation section.
 *
 * False positives are accepted: this is a reminder, not a rejection.
 */
export function hasTrailingDateUrl(value: unknown): boolean {
  if (!hasRoot(value) || !isNode(value.root)) return false

  const { children } = value.root
  if (!Array.isArray(children) || children.length === 0) return false

  const last = children.at(-1)
  if (!isNode(last) || last.type !== 'paragraph') return false

  const scan = scanParagraphForDateUrl(last)
  if (!scan || !scan.hasLink) return false

  return TRAILING_DATE_PATTERN.test(scan.text)
}
