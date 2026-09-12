# Post Date Override Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional `publishedDate` field to posts so editors can backdate posts, controlling both displayed date and list ordering.

**Architecture:** New optional non-localized `publishedDate` date field (sidebar) with a beforeChange hook (defaults to `createdAt`, resets on explicit clear, preserves on version restore) and backdate-only validation in `Europe/Berlin`. List services sort by `['-publishedDate', '-createdAt']`; renderers show `publishedDate ?? createdAt`. Migration adds the column to `posts` and `_posts_v`, backfills `posts` and the `latest` `_posts_v` rows only (historical version rows stay NULL so legacy restores preserve the current backdate).

**Tech Stack:** Payload CMS 3 (SQLite/Turso), Next.js App Router, TypeScript, Vitest, oxlint, oxfmt.

**AGENTS.md compliance notes for the executor:**
- NEVER commit without explicit user confirmation — the `git commit` steps below are pending user approval.
- NEVER apply migrations or touch the database without explicit user confirmation. Task 7 only WRITES the migration file; it does NOT execute it.
- Do NOT start the dev server while working on the collection config (avoids a dev schema push racing the migration).

---

## File map

- Create: `src/validators/publishedDate.ts` — validation + messages + pure future-check
- Create: `src/validators/publishedDate.spec.ts` — tests
- Create: `src/collections/hooks/setPublishedDate.ts` — beforeChange hook
- Create: `src/collections/hooks/setPublishedDate.spec.ts` — tests
- Modify: `src/collections/Posts.ts` — add field + admin sort/defaultColumns
- Modify: `src/collections/Posts.test.ts` — field presence test
- Modify: `src/constants/postList.ts` — add `publishedDate` to select
- Modify: `src/services/post.ts` — sort arrays
- Modify: `src/services/post.spec.ts` — sort + select assertions
- Modify: `src/components/NewsFeed/NewsFeedList.tsx` — display fallback
- Modify: `src/components/NewsFeed/NewsFeedList.spec.tsx` — fallback tests
- Modify: `src/components/Post/PostPreviewClient.tsx` — resolve fallback
- Modify: `src/components/Post/PostPreviewClient.spec.tsx` — resolve test
- Modify: `src/app/(frontend)/[locale]/news/[slug]/page.tsx` — resolve fallback
- Modify: `src/app/(frontend)/[locale]/projects/[slug]/page.tsx` — resolve fallback
- Create: `src/migrations/<timestamp>_add_post_published_date.ts` + `.json` (generated, then edited)
- Modify: `src/migrations/index.ts` (updated by `migrate:create`)
- Regenerated: `src/payload-types.ts`, `src/payload-generated-schema.ts`

---

## Task 1: Validation module

**Files:**
- Create: `src/validators/publishedDate.ts`
- Test: `src/validators/publishedDate.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/validators/publishedDate.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { isFuturePublishedDate, validatePublishedDate } from './publishedDate'

// DateFieldValidation options require req/path/siblingData etc.; the validator only reads
// req.locale, so tests cast a minimal object.
const makeOptions = (locale?: string) => ({ req: { locale } }) as never

describe('isFuturePublishedDate', () => {
  // 2026-09-12T12:00:00Z = 2026-09-12 14:00 Europe/Berlin (CEST, UTC+2)
  const berlinNoon = new Date('2026-09-12T12:00:00.000Z')

  it('returns false for a past date', () => {
    expect(isFuturePublishedDate(new Date('2026-09-01T00:00:00.000Z'), berlinNoon)).toBe(false)
  })

  it('returns false for today in Berlin', () => {
    expect(isFuturePublishedDate(new Date('2026-09-12T00:00:00.000Z'), berlinNoon)).toBe(false)
  })

  it('returns true when UTC says today but Berlin says tomorrow', () => {
    // 2026-09-12T23:00:00Z = 2026-09-13 01:00 Berlin -> tomorrow in Berlin, today in UTC
    expect(isFuturePublishedDate(new Date('2026-09-12T23:00:00.000Z'), berlinNoon)).toBe(true)
  })

  it('returns false when both are the same Berlin day across a midnight boundary', () => {
    // now = Berlin Sept 13 01:00, value = Berlin Sept 13 00:30 -> same day, not future
    const berlinAfterMidnight = new Date('2026-09-12T23:00:00.000Z')
    const valueSameBerlinDay = new Date('2026-09-12T22:30:00.000Z')
    expect(isFuturePublishedDate(valueSameBerlinDay, berlinAfterMidnight)).toBe(false)
  })
})

describe('validatePublishedDate', () => {
  it('accepts null/undefined (field optional)', () => {
    expect(validatePublishedDate(undefined, makeOptions())).toBe(true)
    expect(validatePublishedDate(null, makeOptions())).toBe(true)
  })

  it('rejects an empty string (would store Invalid Date and crash reads)', () => {
    expect(validatePublishedDate('', makeOptions())).toBe('Invalid date.')
  })

  it('rejects an invalid string', () => {
    expect(validatePublishedDate('not-a-date', makeOptions())).toBe('Invalid date.')
  })

  it('rejects a far-future date (en)', () => {
    expect(validatePublishedDate('2999-01-01T00:00:00.000Z', makeOptions())).toBe('Date cannot be in the future.')
  })

  it('rejects a far-future date (de)', () => {
    expect(validatePublishedDate('2999-01-01T00:00:00.000Z', makeOptions('de'))).toBe(
      'Das Datum darf nicht in der Zukunft liegen.'
    )
  })

  it('accepts a past date', () => {
    expect(validatePublishedDate('2020-01-01T00:00:00.000Z', makeOptions())).toBe(true)
  })

  it('accepts a Date object in the past', () => {
    expect(validatePublishedDate(new Date('2020-01-01T00:00:00.000Z'), makeOptions())).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/validators/publishedDate.spec.ts`
Expected: FAIL — module `./publishedDate` not found (or functions undefined).

- [ ] **Step 3: Write minimal implementation**

Create `src/validators/publishedDate.ts`:

```typescript
import type { DateFieldValidation } from 'payload'

export const publishedDateMessages: Record<'de' | 'en', { future: string; invalid: string }> = {
  de: {
    future: 'Das Datum darf nicht in der Zukunft liegen.',
    invalid: 'Ungültiges Datum.',
  },
  en: {
    future: 'Date cannot be in the future.',
    invalid: 'Invalid date.',
  },
}

function datePartInBerlin(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/**
 * True when the value's calendar date (Europe/Berlin) is after `now`'s calendar date.
 * Compares date-parts only, so "today" always passes regardless of time-of-day.
 *
 * @param value - The date to check
 * @param now - Reference instant (defaults to current time)
 * @returns True when the value is a future Berlin calendar day
 *
 * @example
 * isFuturePublishedDate(new Date('2026-09-12T23:00:00.000Z'), new Date('2026-09-12T12:00:00.000Z'))
 * // => true (Berlin says Sept 13 vs Sept 12)
 */
export function isFuturePublishedDate(value: Date, now: Date = new Date()): boolean {
  return datePartInBerlin(value) > datePartInBerlin(now)
}

/**
 * Field validation for Posts.publishedDate. Allows empty (optional field), rejects
 * invalid values and future Berlin calendar days. Runs on draft AND publish saves.
 *
 * @param value - Payload field value (Date | string | null | undefined)
 * @param options - Payload validation options; only req.locale is read
 * @returns true when valid, localized error string otherwise
 *
 * @example
 * validatePublishedDate('2026-09-12T10:00:00.000Z', { req: { locale: 'de' } })
 */
export const validatePublishedDate: DateFieldValidation = (value, options) => {
  if (value === null || value === undefined || value === '') return true

  const locale = options.req?.locale === 'de' ? 'de' : 'en'

  if (typeof value !== 'string' && !(value instanceof Date)) {
    return publishedDateMessages[locale].invalid
  }

  const parsed = value instanceof Date ? value.getTime() : Date.parse(value)
  if (Number.isNaN(parsed)) return publishedDateMessages[locale].invalid

  return isFuturePublishedDate(new Date(parsed)) ? publishedDateMessages[locale].future : true
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/validators/publishedDate.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit (await user approval per AGENTS.md)**

```bash
git add src/validators/publishedDate.ts src/validators/publishedDate.spec.ts
git commit -m "feat: add publishedDate validation for backdated posts"
```

---

## Task 2: Default-value hook

**Files:**
- Create: `src/collections/hooks/setPublishedDate.ts`
- Test: `src/collections/hooks/setPublishedDate.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/collections/hooks/setPublishedDate.spec.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setPublishedDate } from './setPublishedDate'

type HookArgs = Parameters<typeof setPublishedDate>[0]

describe('setPublishedDate', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-12T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('passes through a set value (create)', () => {
    const args = { value: '2026-09-01T00:00:00.000Z', operation: 'create', siblingData: {} } as HookArgs
    expect(setPublishedDate(args)).toBe('2026-09-01T00:00:00.000Z')
  })

  it('defaults to siblingData.createdAt on create when unset', () => {
    const args = {
      value: undefined,
      operation: 'create',
      siblingData: { createdAt: '2026-09-05T00:00:00.000Z' },
    } as HookArgs
    expect(setPublishedDate(args)).toBe('2026-09-05T00:00:00.000Z')
  })

  it('falls back to now on create when createdAt is absent', () => {
    const args = { value: undefined, operation: 'create', siblingData: {} } as HookArgs
    expect(setPublishedDate(args)).toBe('2026-09-12T00:00:00.000Z')
  })

  it('resets to originalDoc.createdAt on explicit null (admin clear)', () => {
    const args = {
      value: null,
      operation: 'update',
      siblingData: {},
      originalDoc: { createdAt: '2026-01-01T00:00:00.000Z' },
    } as HookArgs
    expect(setPublishedDate(args)).toBe('2026-01-01T00:00:00.000Z')
  })

  it('no-ops when absent on update (partial save keeps stored value)', () => {
    const args = {
      value: undefined,
      operation: 'update',
      siblingData: { title: 'changed' },
      originalDoc: { publishedDate: '2026-03-03T00:00:00.000Z' },
    } as HookArgs
    expect(setPublishedDate(args)).toBeUndefined()
  })

  it('preserves the current backdate during version restore', () => {
    const args = {
      value: undefined,
      operation: 'update',
      req: { context: { isRestoringVersion: true } },
      originalDoc: { publishedDate: '2026-02-02T00:00:00.000Z' },
    } as HookArgs
    expect(setPublishedDate(args)).toBe('2026-02-02T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/collections/hooks/setPublishedDate.spec.ts`
Expected: FAIL — module `./setPublishedDate` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/collections/hooks/setPublishedDate.ts`:

```typescript
import type { FieldHook } from 'payload'

/**
 * Defaults and guards Posts.publishedDate on every write.
 *
 * Payload semantics relied upon (verified against Payload 3.89):
 * - `createdAt` is injected by the DB adapter AFTER field hooks run on create, so
 *   `siblingData.createdAt` is undefined in create-path field hooks.
 * - Update hooks receive the incoming patch only (no merge with the stored doc);
 *   absence (`undefined`) must be treated as "no change", not "clear".
 * - Version restore runs hooks with `operation: 'update'` and
 *   `req.context.isRestoringVersion` set; the patch is the historical version
 *   (pre-field versions lack `publishedDate`). Restore delivers an explicit `null` for a legacy
 *   version's NULL `version_published_date` (not `undefined`) — the restore-preserve branch must
 *   run BEFORE the explicit-clear branch.
 *
 * @param args - Payload field hook args
 * @returns The value to store, or undefined to leave the stored value untouched
 *
 * @example
 * hooks: { beforeChange: [setPublishedDate] }
 */
export const setPublishedDate: FieldHook = ({ value, siblingData, operation, originalDoc, req }) => {
  if (value !== null && value !== undefined) return value

  if (value === null && req?.context?.isRestoringVersion) {
    // Legacy-version restore: preserve the current backdate, not the old era's createdAt.
    return originalDoc?.publishedDate ?? originalDoc?.createdAt ?? siblingData?.createdAt ?? new Date().toISOString()
  }

  if (value === null) {
    // Explicit admin clear. originalDoc carries the stored createdAt; the update
    // patch (siblingData) does not.
    return originalDoc?.createdAt ?? siblingData?.createdAt ?? new Date().toISOString()
  }

  if (operation === 'create') return siblingData?.createdAt ?? new Date().toISOString()

  // Defensive: restore delivers null (handled above), not undefined — kept for future Payload changes.
  if (req?.context?.isRestoringVersion && originalDoc?.publishedDate) return originalDoc.publishedDate

  return undefined
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/collections/hooks/setPublishedDate.spec.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit (await user approval per AGENTS.md)**

```bash
git add src/collections/hooks/setPublishedDate.ts src/collections/hooks/setPublishedDate.spec.ts
git commit -m "feat: add publishedDate defaulting hook for posts"
```

---

## Task 3: Wire field + admin config into Posts collection

**Files:**
- Modify: `src/collections/Posts.ts`
- Modify: `src/collections/Posts.test.ts`
- Regenerated: `src/payload-types.ts`, `src/payload-generated-schema.ts`

**IMPORTANT:** Do NOT start the dev server during or after this task — a dev schema push would race the migration in Task 7.

- [ ] **Step 1: Write the failing test**

Add to `src/collections/Posts.test.ts` (follow the existing `find` helper pattern used there):

```typescript
it('configures a publishedDate date field with validation and defaulting hook', () => {
  const field = Posts.fields?.find((candidate) => 'name' in candidate && candidate.name === 'publishedDate')

  expect(field).toBeDefined()
  if (!field || !('type' in field)) throw new Error('publishedDate field missing or not typed')

  expect(field.type).toBe('date')
  expect(field.index).toBe(true)
  expect(typeof field.validate).toBe('function')
  expect(field.hooks).toBeDefined()
  expect(field.hooks?.beforeChange).toHaveLength(1)
})

it('sorts and lists the admin view by publishedDate to match the live site', () => {
  expect(Posts.admin.sort).toBe('-publishedDate')
  expect(Posts.admin.defaultColumns).toContain('publishedDate')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/collections/Posts.test.ts`
Expected: FAIL — no `publishedDate` field, no admin sort.

- [ ] **Step 3: Implement field + admin config**

In `src/collections/Posts.ts`:

1. Add imports at the top (alphabetical with the other `@/collections/hooks` imports):

```typescript
import { setPublishedDate } from '@/collections/hooks/setPublishedDate'
import { validatePublishedDate } from '@/validators/publishedDate'
```

2. Add the field inside `fields` — insert after the `createdBy` field (the last field, line ~316, before the closing `]` of `fields`):

```typescript
    {
      name: 'publishedDate',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        description: {
          de: 'Datum überschreiben (nur in der Vergangenheit). Standard: Erstellungsdatum.',
          en: 'Override the shown date (past dates only). Defaults to creation date.',
        },
      },
      label: {
        de: 'Erscheinungsdatum',
        en: 'Publication date',
      },
      validate: validatePublishedDate,
      hooks: {
        beforeChange: [setPublishedDate],
      },
    },
```

3. Update the `admin` block (`Posts.ts:131-144`) to add sort + defaultColumns:

```typescript
  admin: {
    group: 'Content Management',
    useAsTitle: 'title',
    listSearchableFields: ['title', 'normalizedTitle', 'artists.name'],
    sort: '-publishedDate',
    defaultColumns: ['title', 'categories', 'artists', 'publishedDate', '_status', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => generatePostPreviewPath({ data, req, collection: 'posts' }) ?? null,
    },
    preview: (data, { req }) => generatePostPreviewPath({ data, req, collection: 'posts' }) ?? null,
    components: {
      edit: {
        beforeDocumentControls: ['/components/admin/FormatDocumentButton'],
      },
    },
  },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/collections/Posts.test.ts`
Expected: PASS.

- [ ] **Step 5: Regenerate types and schema snapshot**

Run:

```bash
pnpm generate:types
pnpm payload generate:db-schema
```

Expected: `src/payload-types.ts` gains `publishedDate?: string | null` on `Post`; `src/payload-generated-schema.ts` gains `publishedDate` (`posts` + `version_published_date` on `_posts_v`).

- [ ] **Step 6: Commit (await user approval per AGENTS.md)**

```bash
git add src/collections/Posts.ts src/collections/Posts.test.ts src/payload-types.ts src/payload-generated-schema.ts
git commit -m "feat: add publishedDate field and admin sort to posts"
```

---

## Task 4: List service sorting

**Files:**
- Modify: `src/services/post.ts`
- Modify: `src/services/post.spec.ts`

- [ ] **Step 1: Write the failing tests**

Update the sort assertions in `src/services/post.spec.ts`. Replace `sort: '-createdAt'` with `sort: ['-publishedDate', '-createdAt']` at these locations:

- `getFilteredPosts` describe: lines 207, 226, 244, 262, 281, 320
- `getFilteredPosts` "should sort by createdAt descending" (line 324-334) — rename + new expectation:

```typescript
    it('should sort by publishedDate with createdAt tie-breaker', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getFilteredPosts({})

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: ['-publishedDate', '-createdAt'],
        })
      )
    })
```

- `getPaginatedPosts` "should sort by createdAt descending" (line 523-533):

```typescript
    it('should sort by publishedDate with createdAt tie-breaker', async () => {
      vi.mocked(mockPayload.find).mockResolvedValue(createMockPaginatedDocs([]))

      await getPaginatedPosts({ category: 'news' })

      expect(mockPayload.find).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: ['-publishedDate', '-createdAt'],
        })
      )
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/post.spec.ts`
Expected: FAIL — sort assertions expect `'-createdAt'`, implementation still returns it.

- [ ] **Step 3: Implement sort change**

In `src/services/post.ts`:

1. `getFilteredPosts` (line ~295): change

```typescript
    sort: '-createdAt', // Most recent first
```

to

```typescript
    sort: ['-publishedDate', '-createdAt'], // Most recent by published date, createdAt as tie-breaker
```

2. `getPaginatedPosts` (line ~390): same change.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/post.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit (await user approval per AGENTS.md)**

```bash
git add src/services/post.ts src/services/post.spec.ts
git commit -m "feat: sort posts by publishedDate with createdAt tie-breaker"
```

---

## Task 5: POST_LIST_SELECT

**Files:**
- Modify: `src/constants/postList.ts`
- Modify: `src/services/post.spec.ts`

- [ ] **Step 1: Write the failing test**

In `src/services/post.spec.ts`, `describe('post list constants')` (line ~657), update the literal to include `publishedDate`:

```typescript
    it('POST_LIST_SELECT covers every field the list renderers use', () => {
      expect(POST_LIST_SELECT).toEqual({
        title: true,
        slug: true,
        image: true,
        content: true,
        categories: true,
        publishedDate: true,
        createdAt: true,
      })
    })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/services/post.spec.ts`
Expected: FAIL — `POST_LIST_SELECT` lacks `publishedDate`.

- [ ] **Step 3: Implement**

In `src/constants/postList.ts`:

1. Update the header comment ("Lists render only title, image, preview, date, and category path") to mention published date.
2. Add `publishedDate: true` after `categories: true`:

```typescript
export const POST_LIST_SELECT: SelectType = {
  title: true,
  slug: true,
  image: true,
  content: true,
  categories: true,
  publishedDate: true,
  createdAt: true,
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/services/post.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit (await user approval per AGENTS.md)**

```bash
git add src/constants/postList.ts src/services/post.spec.ts
git commit -m "feat: include publishedDate in post list select"
```

---

## Task 6: Display fallback (`publishedDate ?? createdAt`)

**Files:**
- Modify: `src/components/NewsFeed/NewsFeedList.tsx`
- Modify: `src/components/NewsFeed/NewsFeedList.spec.tsx`
- Modify: `src/components/Post/PostPreviewClient.tsx`
- Modify: `src/components/Post/PostPreviewClient.spec.tsx`
- Modify: `src/app/(frontend)/[locale]/news/[slug]/page.tsx`
- Modify: `src/app/(frontend)/[locale]/projects/[slug]/page.tsx`

- [ ] **Step 1: Write the failing tests**

1. In `src/components/NewsFeed/NewsFeedList.spec.tsx`, add after the existing "should format date correctly" test (~line 95):

```typescript
  it('renders publishedDate when set', () => {
    const post = createMockPost({
      title: 'Backdated Post',
      createdAt: '2024-01-15T10:00:00.000Z',
      publishedDate: '2023-06-01T00:00:00.000Z',
    })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" category="news" showDate={true} />)

    expect(screen.getAllByText('June 1, 2023').length).toBeGreaterThan(0)
  })

  it('falls back to createdAt when publishedDate is absent', () => {
    const post = createMockPost({
      title: 'No Override Post',
      createdAt: '2024-01-15T10:00:00.000Z',
      publishedDate: null,
    })

    renderWithIntl(<NewsFeedList posts={[post]} emptyMessage="No posts" category="news" showDate={true} />)

    expect(screen.getAllByText('January 15, 2024').length).toBeGreaterThan(0)
  })
```

2. In `src/components/Post/PostPreviewClient.spec.tsx`, add after "passes every translated prop to PostDetailContent" (~line 101):

```typescript
  it('resolves publishedDate over createdAt when both are present', () => {
    liveData = { ...baseLiveData, publishedDate: '2025-05-05T00:00:00.000Z' }
    render(<PostPreviewClient {...baseProps} />)
    const props = mockPostDetailContent.mock.calls[0][0] as Record<string, unknown>
    expect(props.createdAt).toBe('2025-05-05T00:00:00.000Z')
  })
```

Note: if `createMockPost` in `NewsFeedList.spec.tsx` is typed `as Post`, `publishedDate` must be added to the mock type or passed as `null`/cast. Add `publishedDate` support to the mock helper if the type requires it.

- [ ] **Step 2: Run tests to verify they fail**

Run:
```bash
pnpm vitest run src/components/NewsFeed/NewsFeedList.spec.tsx
pnpm vitest run src/components/Post/PostPreviewClient.spec.tsx
```
Expected: FAIL — components render `createdAt`, not the fallback.

- [ ] **Step 3: Implement**

1. `src/components/NewsFeed/NewsFeedList.tsx` line 141 — replace:

```tsx
                    <time dateTime={new Date(post.createdAt).toISOString()}>{formatDate(post.createdAt, locale)}</time>
```

with:

```tsx
                    <time dateTime={new Date(post.publishedDate ?? post.createdAt).toISOString()}>
                      {formatDate(post.publishedDate ?? post.createdAt, locale)}
                    </time>
```

2. `src/components/Post/PostPreviewClient.tsx` line 44 — replace:

```tsx
      createdAt={data.createdAt}
```

with:

```tsx
      createdAt={data.publishedDate ?? data.createdAt}
```

3. `src/app/(frontend)/[locale]/news/[slug]/page.tsx` line 50 + 56 — replace:

```typescript
  const { title, content, createdAt, image, artists } = post
```

with:

```typescript
  const { title, content, createdAt, publishedDate, image, artists } = post
```

and:

```tsx
      createdAt={createdAt}
```

with:

```tsx
      createdAt={publishedDate ?? createdAt}
```

4. `src/app/(frontend)/[locale]/projects/[slug]/page.tsx` — same two edits (lines 50, 56). The page renders `showDate={false}`, but resolving keeps behavior consistent if that flag ever changes.

- [ ] **Step 4: Run tests to verify they pass**

Run:
```bash
pnpm vitest run src/components/NewsFeed/NewsFeedList.spec.tsx
pnpm vitest run src/components/Post/PostPreviewClient.spec.tsx
pnpm vitest run src/components/Post/PostDetailContent.spec.tsx
```
Expected: PASS.

- [ ] **Step 5: Commit (await user approval per AGENTS.md)**

```bash
git add src/components/NewsFeed/NewsFeedList.tsx src/components/NewsFeed/NewsFeedList.spec.tsx \
  src/components/Post/PostPreviewClient.tsx src/components/Post/PostPreviewClient.spec.tsx \
  'src/app/(frontend)/[locale]/news/[slug]/page.tsx' 'src/app/(frontend)/[locale]/projects/[slug]/page.tsx'
git commit -m "feat: display publishedDate with createdAt fallback for posts"
```

---

## Task 7: Migration file (WRITE ONLY — do NOT execute)

**Files:**
- Create: `src/migrations/<timestamp>_add_post_published_date.ts` + `.json`
- Modify: `src/migrations/index.ts`

**Compliance:** This task only WRITES the migration. Applying it to any database requires explicit user confirmation per AGENTS.md and is a separate, gated step.

- [ ] **Step 1: Generate the migration scaffold**

Run: `pnpm payload migrate:create add_post_published_date`

Expected: creates `src/migrations/<timestamp>_add_post_published_date.ts` + `.json` and appends the entry to `src/migrations/index.ts`.

Note: if the command reports an empty diff (snapshot already current), write the migration by hand using the full file content in Step 3 and manually add the `index.ts` entry following the existing pattern (see `src/migrations/index.ts:45-50`).

- [ ] **Step 2: Inspect the generated file**

Verify it adds BOTH:
- `posts.published_date` (+ index)
- `_posts_v.version_published_date` (+ index)

If the `_posts_v` column is missing, it must be added manually (see Step 3 full version).

- [ ] **Step 3: Edit the generated file**

Replace the file body with (keep the generated timestamp filename):

```typescript
import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-sqlite'

/**
 * True when the posts.published_date column already exists. Guards both directions
 * so re-runs during repeated CI builds are safe (build:ci runs migrations on every build).
 */
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('posts') WHERE name = 'published_date'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) {
    return
  }

  await db.run(sql`ALTER TABLE posts ADD COLUMN published_date text`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS posts_published_date_idx ON posts (published_date)`)
  // Backfill existing posts so ordering/display is unchanged until an editor overrides.
  await db.run(sql`UPDATE posts SET published_date = created_at WHERE published_date IS NULL`)

  await db.run(sql`ALTER TABLE _posts_v ADD COLUMN version_published_date text`)
  await db.run(
    sql`CREATE INDEX IF NOT EXISTS _posts_v_version_version_published_date_idx ON _posts_v (version_published_date)`
  )
  // Backfill the CURRENT version row per post (latest = 1) so the drafts-path site sort reads a
  // non-NULL date for every post. Historical rows (latest = 0) stay NULL on purpose: restoring a
  // legacy version then delivers value=null, and the setPublishedDate hook's isRestoringVersion
  // branch preserves the current backdate instead of resetting it. Backfilling historical rows
  // would make legacy restores stamp the old era's createdAt and drop a current backdate.
  await db.run(
    sql`UPDATE _posts_v SET version_published_date = (SELECT p.published_date FROM posts p WHERE p.id = _posts_v.parent_id) WHERE _posts_v.latest = 1 AND version_published_date IS NULL`
  )
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) {
    return
  }

  // SQLite rejects DROP COLUMN on an indexed column — drop the indexes first.
  await db.run(sql`DROP INDEX IF EXISTS posts_published_date_idx`)
  await db.run(sql`ALTER TABLE posts DROP COLUMN published_date`)

  await db.run(sql`DROP INDEX IF EXISTS _posts_v_version_version_published_date_idx`)
  await db.run(sql`ALTER TABLE _posts_v DROP COLUMN version_published_date`)
}
```

Match the generated file's index names if they differ (inspect the generated `.ts`/`.json` — `migrate:create` emits the canonical Payload index names; prefer those over the examples above).

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 5: Commit (await user approval per AGENTS.md)**

```bash
git add src/migrations/
git commit -m "feat: add post publishedDate migration"
```

**Note (verified 2026-09-12 by dry-run on a prod R2 snapshot):** the latest-row backfill was added after the first dry run — the site list reads `_posts_v` (drafts mode), and without it every legacy post's current version sorts NULL-tail, pushing backdated posts above the entire legacy list. Re-verified on prod-snapshot copy + dev.db: 251 latest rows non-NULL, 968 historical NULL, `posts` backfill clean, down() clean. See design spec §Migration.

---

## Task 8: Full verification

- [ ] **Step 1: Run all tests**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: no errors.

- [ ] **Step 3: Format check**

Run: `pnpm exec oxfmt --check src/validators/publishedDate.ts src/collections/hooks/setPublishedDate.ts src/collections/Posts.ts src/constants/postList.ts src/services/post.ts src/components/NewsFeed/NewsFeedList.tsx src/components/Post/PostPreviewClient.tsx`
Expected: all formatted (run `pnpm format` if any file needs formatting, then re-run).

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

---

## Post-plan manual steps (gated, require user)

1. **Apply migration to prod** — requires explicit user confirmation. Recommended path:
   - Review `src/migrations/<timestamp>_add_post_published_date.ts`
   - Verify `NODE_ENV=production` and delete any `dev|-1` marker from `payload_migrations` (per `docs/patterns/payload.md`)
   - Apply via `build:ci` deploy (migrations run on every Vercel build) or manual `payload migrate`
2. **Verify on prod** — `published_date` column on `posts` + `version_published_date` on `_posts_v`; existing posts backfilled with `created_at`.
3. **Test backdating in admin** — create a post with an override, confirm list order + displayed date; confirm clear resets to createdAt; confirm no future dates accepted.