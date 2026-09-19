# Post Content Trailing Date/URL Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an advisory-only reminder in the Posts admin editor when a post's final paragraph looks like a manually-typed event date + link (e.g. "4. Juli 2026, Yamagata [link]"), nudging the editor toward the existing `EventDates` block instead.

**Architecture:** A new pure function `hasTrailingDateUrl` in `src/validators/postContent.ts` inspects only the last top-level Lexical node. It is a standalone export, never merged into `validatePostContentErrors` or `PostContentValidationError`, so it cannot affect the blocking publish validator (`validatePublishedPostContent` in `Posts.ts`). The existing client-side `PostContentWarningPlugin` (`src/features/postContentWarning/feature.client.tsx`) calls this new function alongside its existing `validatePostContentErrors` call and renders one additional advisory `<li>` in the same `Banner` when true.

**Tech Stack:** TypeScript, Payload CMS 3 (`richtext-lexical`), Vitest + Testing Library (`happy-dom`), Next.js App Router.

**Spec:** `docs/superpowers/specs/2026-09-19-post-content-trailing-date-url-design.md`

---

## Reference: Design Constraints (read before starting)

These are load-bearing decisions from the spec review process — do not "improve" them mid-implementation:

1. **`hasTrailingDateUrl` must be a standalone export.** It must NOT be added to `PostContentValidationError`'s union or returned from `validatePostContentErrors`. It has its own return type (`boolean`) and is called only from the client plugin.
2. **The text-join traversal must preserve document order.** Do not copy `hasText`'s `Array.prototype.pop()` stack traversal verbatim — that visits children in reverse and would scramble text split across siblings (e.g. a link node in the middle of a date). Use a recursive, left-to-right, order-preserving walk instead.
3. **The traversal must embed its own cycle/size guard** (structurally like `hasValidDescendants`'s `MAX_NODES_TO_SCAN` counter + `visited: Set` pattern), inline in the same pass — do not call `hasValidDescendants` as a separate gate. One traversal, one guard, embedded.
4. **Regex literals must be single unbroken strings in the actual code** (no line-wrapping).
5. **The client plugin must track the advisory flag as a separate boolean**, never folded into the `errors` array, with its own fixed `<li key="trailingDateUrl">`.

---

## File Structure

- **Modify:** `src/validators/postContent.ts` — add `hasTrailingDateUrl` (exported function) and `postContentAdvisoryMessages` (exported dict). No changes to any existing exports' behavior.
- **Modify:** `src/validators/postContent.spec.ts` — add a new `describe('hasTrailingDateUrl', ...)` block and a `postContentAdvisoryMessages` locale-completeness test.
- **Modify:** `src/features/postContentWarning/feature.client.tsx` — add the second boolean check and render path.
- **Modify:** `src/features/postContentWarning/feature.client.spec.tsx` — add advisory-only and co-occurrence test cases.

No new files. No changes to `Posts.ts`, `Posts.test.ts`, `Posts.lexical-validation.spec.ts`, or any migration/schema file.

---

### Task 1: `hasTrailingDateUrl` — link+date detection on the last node

**Files:**
- Modify: `src/validators/postContent.ts`
- Test: `src/validators/postContent.spec.ts`

- [ ] **Step 1: Write the failing tests**

Add this new `describe` block to the end of `src/validators/postContent.spec.ts`, just before the closing of the file (after the existing `postContentMessages` describe block). First, add the new import at the top of the file — replace the existing import line:

```typescript
import { postContentMessages, validatePostContent, validatePostContentErrors } from './postContent'
```

with:

```typescript
import {
  hasTrailingDateUrl,
  postContentAdvisoryMessages,
  postContentMessages,
  validatePostContent,
  validatePostContentErrors,
} from './postContent'
```

Then append this block at the end of the file:

```typescript

describe('hasTrailingDateUrl', () => {
  it('returns false for missing, empty, or malformed editor state', () => {
    expect(hasTrailingDateUrl(undefined)).toBe(false)
    expect(hasTrailingDateUrl(null)).toBe(false)
    expect(hasTrailingDateUrl({})).toBe(false)
    expect(hasTrailingDateUrl({ root: null })).toBe(false)
    expect(hasTrailingDateUrl({ root: { children: [] } })).toBe(false)
    expect(hasTrailingDateUrl({ root: { children: 'bad' } })).toBe(false)
  })

  it('returns true for a final paragraph with a link and a numeric DE date', () => {
    expect(
      hasTrailingDateUrl(
        content(
          paragraph('Opening'),
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: 'Save the date: ' },
              { type: 'link', children: [{ type: 'text', text: '04.07.2026' }] },
            ],
          }
        )
      )
    ).toBe(true)
  })

  it('returns true for a final paragraph with a link and an ISO date', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [
            { type: 'text', text: '2026-07-04, Yamagata' },
            { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
          ],
        })
      )
    ).toBe(true)
  })

  it('returns true for a final paragraph with a link and a written DE date', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [
            { type: 'text', text: '4. Juli 2026, Yamagata' },
            { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
          ],
        })
      )
    ).toBe(true)
  })

  it('returns true for a final paragraph with a link and a written EN date', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'July 4, 2026, Yamagata' },
            { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
          ],
        })
      )
    ).toBe(true)
  })

  it('returns true for an autolink node instead of a link node', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [
            { type: 'text', text: '4. Juli 2026' },
            { type: 'autolink', children: [{ type: 'text', text: 'https://example.com' }] },
          ],
        })
      )
    ).toBe(true)
  })

  it('joins text in document order even when a link sits between date fragments', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [
            { type: 'text', text: '4. ' },
            { type: 'link', children: [{ type: 'text', text: 'Juli' }] },
            { type: 'text', text: ' 2026' },
          ],
        })
      )
    ).toBe(true)
  })

  it('returns false when there is a date but no link', () => {
    expect(hasTrailingDateUrl(content(paragraph('Opening'), paragraph('4. Juli 2026, Yamagata')))).toBe(false)
  })

  it('returns false when there is a link but no date', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'paragraph',
          children: [{ type: 'link', children: [{ type: 'text', text: 'Tickets' }] }],
        })
      )
    ).toBe(false)
  })

  it('returns false when the last node is not a paragraph (EventDates block already used)', () => {
    expect(
      hasTrailingDateUrl(
        content(paragraph('Opening'), {
          type: 'block',
          fields: { blockType: 'eventDates', events: [{ date: '2026-07-04', location: 'Yamagata' }] },
        })
      )
    ).toBe(false)
  })

  it('returns false when a date/link paragraph is followed by a trailing EventDates block', () => {
    expect(
      hasTrailingDateUrl(
        content(
          paragraph('Opening'),
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '4. Juli 2026' },
              { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
            ],
          },
          { type: 'block', fields: { blockType: 'eventDates' } }
        )
      )
    ).toBe(false)
  })

  it('returns false when the date/link paragraph is followed by an empty trailing paragraph', () => {
    expect(
      hasTrailingDateUrl(
        content(
          paragraph('Opening'),
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '4. Juli 2026' },
              { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
            ],
          },
          paragraph('  ')
        )
      )
    ).toBe(false)
  })

  it('returns false when the date/link paragraph is followed by non-empty closing prose (Known Limitation)', () => {
    expect(
      hasTrailingDateUrl(
        content(
          paragraph('Opening'),
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '4. Juli 2026' },
              { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
            ],
          },
          paragraph('Wir freuen uns auf Sie.')
        )
      )
    ).toBe(false)
  })

  it('returns false without hanging on a self-referential last node', () => {
    const node: { type: string; children: unknown[] } = { type: 'link', children: [] }
    node.children.push(node)

    expect(hasTrailingDateUrl(content(paragraph('Opening'), { type: 'paragraph', children: [node] }))).toBe(false)
  })

  it('returns false without hanging on excessively deep last-node content', () => {
    let node: unknown = { type: 'text', text: '4. Juli 2026' }
    for (let depth = 0; depth < 100_001; depth += 1) {
      node = { type: 'link', children: [node] }
    }

    expect(hasTrailingDateUrl(content(paragraph('Opening'), { type: 'paragraph', children: [node] }))).toBe(false)
  })
})

describe('postContentAdvisoryMessages', () => {
  it('defines German and English text', () => {
    expect(postContentAdvisoryMessages.de).toBeTruthy()
    expect(postContentAdvisoryMessages.en).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/validators/postContent.spec.ts`
Expected: FAIL — `hasTrailingDateUrl` and `postContentAdvisoryMessages` are not exported from `./postContent` (TypeScript/import error, or `undefined is not a function` at runtime).

- [ ] **Step 3: Write the implementation**

Add this to `src/validators/postContent.ts`. First, add the two new message-shape and node interfaces near the top of the file, right after the existing `postContentMessages` block (after line 32, before the `interface LexicalNode` block):

```typescript
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
  de: 'Das sieht nach einem manuell eingegebenen Termin mit Link aus. Bitte stattdessen den Termine-Block (Event Dates) verwenden.',
  en: 'This looks like a manually typed event date with a link. Consider using the Event Dates block instead.',
}
```

Now add the detection function at the end of the file (after `validatePostContentErrors`):

```typescript

const TRAILING_DATE_URL_MAX_NODES_TO_SCAN = 100_000

const TRAILING_DATE_PATTERN = new RegExp(
  [
    '\\b\\d{1,2}\\.\\d{1,2}\\.\\d{2,4}\\b',
    '\\b\\d{4}-\\d{2}-\\d{2}\\b',
    '\\d{1,2}\\.?\\s*(Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December)\\s+\\d{4}\\b',
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
  let visitedCount = 0
  let hasLink = false
  const textParts: string[] = []

  function walk(current: unknown): boolean {
    if (!isNode(current)) return false
    if (visited.has(current)) return false
    visitedCount += 1
    if (visitedCount > TRAILING_DATE_URL_MAX_NODES_TO_SCAN) return false
    visited.add(current)

    if (current.type === 'link' || current.type === 'autolink') hasLink = true
    if (typeof current.text === 'string') textParts.push(current.text)

    if (current.children === undefined) return true
    if (!Array.isArray(current.children)) return false

    for (const child of current.children) {
      if (!walk(child)) return false
    }

    return true
  }

  if (!walk(node)) return null
  return { hasLink, text: textParts.join('') }
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/validators/postContent.spec.ts`
Expected: PASS — all existing tests plus the new `hasTrailingDateUrl` and `postContentAdvisoryMessages` blocks.

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors (fix any oxlint findings in the new code before proceeding).

- [ ] **Step 6: Commit**

```bash
git add src/validators/postContent.ts src/validators/postContent.spec.ts
git commit -m "feat: add hasTrailingDateUrl advisory check for post content"
```

---

### Task 2: Wire the advisory reminder into the admin banner

**Files:**
- Modify: `src/features/postContentWarning/feature.client.tsx`
- Test: `src/features/postContentWarning/feature.client.spec.tsx`

- [ ] **Step 1: Write the failing tests**

Add these two test cases inside the existing `describe('PostContentWarningFeatureClient', ...)` block in `src/features/postContentWarning/feature.client.spec.tsx`, right after the existing `it('shows a localized warning list...')` test (before the closing `})` of the `describe` block):

```typescript

  it('shows the advisory message when only the trailing date/URL condition is true', async () => {
    const field = document.createElement('div')
    field.className = 'field-type rich-text-lexical'
    field.append(harness.root)
    document.body.append(field)
    const advisoryOnlyContent = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Opening' }] },
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '4. Juli 2026, Yamagata' },
              { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
            ],
          },
        ],
      },
    }
    harness.editor = {
      getEditorState: () => ({ toJSON: () => advisoryOnlyContent }),
      getRootElement: () => harness.root,
      registerUpdateListener: (listener) => {
        harness.listener = listener
        return () => {
          harness.listener = undefined
        }
      },
    }
    const feature = PostContentWarningFeatureClient as unknown as { plugins: [{ Component: React.FC }] }
    const Plugin = feature.plugins[0].Component
    render(<Plugin />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(
      'Das sieht nach einem manuell eingegebenen Termin mit Link aus. Bitte stattdessen den Termine-Block (Event Dates) verwenden.'
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(field).toHaveClass('post-content-warning')
  })

  it('shows a structural error and the advisory message together', async () => {
    const field = document.createElement('div')
    field.className = 'field-type rich-text-lexical'
    field.append(harness.root)
    document.body.append(field)
    const bothContent = {
      root: {
        children: [
          { type: 'block' },
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '4. Juli 2026, Yamagata' },
              { type: 'link', children: [{ type: 'text', text: 'Tickets' }] },
            ],
          },
        ],
      },
    }
    harness.editor = {
      getEditorState: () => ({ toJSON: () => bothContent }),
      getRootElement: () => harness.root,
      registerUpdateListener: (listener) => {
        harness.listener = listener
        return () => {
          harness.listener = undefined
        }
      },
    }
    const feature = PostContentWarningFeatureClient as unknown as { plugins: [{ Component: React.FC }] }
    const Plugin = feature.plugins[0].Component
    render(<Plugin />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Der Beitrag muss mit Text beginnen, nicht mit einem Einbettungsblock.')
    expect(alert).toHaveTextContent(
      'Das sieht nach einem manuell eingegebenen Termin mit Link aus. Bitte stattdessen den Termine-Block (Event Dates) verwenden.'
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(field).toHaveClass('post-content-warning')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/features/postContentWarning/feature.client.spec.tsx`
Expected: FAIL — the advisory-only case currently renders no banner at all (`errors.length === 0` short-circuits to `null`), so `screen.getByRole('alert')` throws "Unable to find role='alert'".

- [ ] **Step 3: Write the implementation**

Replace the full contents of `src/features/postContentWarning/feature.client.tsx` with:

```typescript
'use client'

import { Banner, useLocale } from '@payloadcms/ui'
import { createClientFeature } from '@payloadcms/richtext-lexical/client'
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext'
import React from 'react'

import {
  hasTrailingDateUrl,
  type PostContentValidationError,
  postContentAdvisoryMessages,
  postContentMessages,
  validatePostContentErrors,
} from '@/validators/postContent'

import './PostContentWarningBanner.scss'

const PostContentWarningPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext()
  const locale = useLocale()?.code === 'de' ? 'de' : 'en'
  const [errors, setErrors] = React.useState<PostContentValidationError[]>([])
  const [hasDateUrlAdvisory, setHasDateUrlAdvisory] = React.useState(false)

  React.useEffect(() => {
    const field = editor.getRootElement()?.closest('.field-type.rich-text-lexical')
    function validate(value: unknown): void {
      const result = validatePostContentErrors(value)
      const advisory = hasTrailingDateUrl(value)
      field?.classList.toggle('post-content-warning', result.length > 0 || advisory)
      setErrors(result)
      setHasDateUrlAdvisory(advisory)
    }

    validate(editor.getEditorState().toJSON())
    const unregister = editor.registerUpdateListener(({ editorState }) => validate(editorState.toJSON()))

    return () => {
      unregister()
      field?.classList.remove('post-content-warning')
    }
  }, [editor])

  if (errors.length === 0 && !hasDateUrlAdvisory) return null

  return (
    <div role="alert">
      <Banner className="post-content-warning-banner" type="error">
        <ul>
          {errors.map((error) => (
            <li key={error}>{postContentMessages[locale][error]}</li>
          ))}
          {hasDateUrlAdvisory && <li key="trailingDateUrl">{postContentAdvisoryMessages[locale]}</li>}
        </ul>
      </Banner>
    </div>
  )
}

export const PostContentWarningFeatureClient = createClientFeature({
  plugins: [{ Component: PostContentWarningPlugin, position: 'normal' }],
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/features/postContentWarning/feature.client.spec.tsx`
Expected: PASS — all three tests (existing + two new).

- [ ] **Step 5: Run typecheck and lint**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/postContentWarning/feature.client.tsx src/features/postContentWarning/feature.client.spec.tsx
git commit -m "feat: show advisory reminder for trailing date/URL post content"
```

---

### Task 3: Full-suite verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, including `src/collections/Posts.test.ts` and
`src/collections/Posts.lexical-validation.spec.ts` unchanged (confirming publish-blocking
validation was not affected).

- [ ] **Step 2: Run typecheck and lint on the whole project**

Run: `pnpm typecheck`
Expected: no errors.

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: build succeeds (confirms no import/bundling issues between the client feature and the
shared validator module).

- [ ] **Step 4: Manual smoke check (optional, not committed)**

Start the dev server (`pnpm dev`), open a Post's content field in the admin, and type a final
paragraph like "4. Juli 2026, Yamagata" followed by a link. Confirm the advisory banner appears
with the new reminder text, and that removing the link or date makes it disappear. Stop the dev
server when done.

- [ ] **Step 5: No commit needed for this task** — verification only, nothing to stage.

---

## Post-Implementation Notes

- No schema/migration changes were needed or made — this feature is entirely client + shared
  validator code with no persisted field.
- No changes to `Posts.ts`, `validatePostContent`, `validatePostContentErrors`, or
  `validatePublishedPostContent` — confirmed by Task 3's full-suite run staying green with zero
  diffs to those files.
- Known Limitation (documented in the spec, not fixed here): a date/link paragraph followed by
  further non-empty prose, or by an `EventDates` block, will not trigger the reminder, since only
  the single last top-level node is inspected.
</content>
