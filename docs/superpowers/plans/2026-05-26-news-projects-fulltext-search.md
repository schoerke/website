# News/Projects Full-text Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the inline search on `/news` and `/projects` to match post body text in addition to titles.

**Architecture:** Add a denormalized `normalizedContent` field to the Posts collection, auto-populated via `beforeChange` hook using `extractLexicalText` + `normalizeText`. Extend the service-layer `where.or` clause in both `getPaginatedPosts` and `getFilteredPosts` to include this field. Backfill existing posts once.

**Tech Stack:** Payload CMS, TypeScript, SQLite/libsql (Turso), Vitest

---

## File Map

| File | Change |
|---|---|
| `src/collections/Posts.ts` | Add `normalizedContent` field + `extractLexicalText` import |
| `src/services/post.ts` | Extend `where.or` in `getFilteredPosts` (L268) and `getPaginatedPosts` (L365) |
| `src/collections/Posts.test.ts` | New — unit tests for `normalizedContent` hook |
| `src/services/post.test.ts` | New — unit tests for search `where` clause |
| `tmp/backfillNormalizedContent.ts` | New — one-time backfill script (delete after use) |

---

## Task 1: Add `normalizedContent` field to Posts collection

**Files:**
- Modify: `src/collections/Posts.ts`

- [ ] **Step 1: Add `extractLexicalText` import**

In `src/collections/Posts.ts`, after line 8 (`import { normalizeText } ...`), add:

```typescript
import { extractLexicalText } from '@/utils/search/extractLexicalText'
```

- [ ] **Step 2: Add `normalizedContent` field**

In `src/collections/Posts.ts`, after the `normalizedTitle` field block (after L51 closing `},`), insert:

```typescript
    {
      name: 'normalizedContent',
      type: 'text',
      localized: true,
      index: true,
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ siblingData }: { siblingData: { content?: unknown } }) => {
            return siblingData.content ? normalizeText(extractLexicalText(siblingData.content as Parameters<typeof extractLexicalText>[0])) : ''
          },
        ],
      },
    },
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors related to Posts.ts

- [ ] **Step 4: Commit**

```bash
git add src/collections/Posts.ts
git commit -m "feat(posts): add normalizedContent field for full-text search"
```

---

## Task 2: Write unit tests for `normalizedContent` hook

**Files:**
- Create: `src/collections/Posts.test.ts`

- [ ] **Step 1: Create test file**

```typescript
// @vitest-environment node

import { describe, expect, it } from 'vitest'

// Test the normalizedContent hook logic directly (extracted for testability)
import { extractLexicalText } from '@/utils/search/extractLexicalText'
import { normalizeText } from '@/utils/search/normalizeText'

function runNormalizedContentHook(siblingData: { content?: unknown }): string {
  return siblingData.content
    ? normalizeText(extractLexicalText(siblingData.content as Parameters<typeof extractLexicalText>[0]))
    : ''
}

describe('normalizedContent hook', () => {
  it('returns empty string when content is undefined', () => {
    expect(runNormalizedContentHook({})).toBe('')
  })

  it('returns empty string when content is null', () => {
    expect(runNormalizedContentHook({ content: null })).toBe('')
  })

  it('extracts and normalizes plain text from Lexical JSON', () => {
    const lexicalContent = {
      root: {
        children: [
          {
            children: [{ text: 'Müller spielt Violine', type: 'text', version: 1 }],
            direction: 'ltr',
            format: '',
            indent: 0,
            type: 'paragraph',
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }

    const result = runNormalizedContentHook({ content: lexicalContent })
    // normalizeText strips diacritics and lowercases
    expect(result).toBe('muller spielt violine')
  })

  it('handles empty Lexical document', () => {
    const emptyContent = {
      root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    }

    const result = runNormalizedContentHook({ content: emptyContent })
    expect(result).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm test src/collections/Posts.test.ts
```

Expected: 4 tests pass

- [ ] **Step 3: Commit**

```bash
git add src/collections/Posts.test.ts
git commit -m "test(posts): add unit tests for normalizedContent hook"
```

---

## Task 3: Extend service-layer search to include `normalizedContent`

**Files:**
- Modify: `src/services/post.ts` (two locations)

- [ ] **Step 1: Update `getFilteredPosts` search clause (around L268)**

Find this block in `getFilteredPosts`:

```typescript
  if (options.search && options.search.trim().length >= 3) {
    where.or = [
      {
        normalizedTitle: {
          contains: normalizeText(options.search.trim()),
        },
      },
    ]
  }
```

Replace with:

```typescript
  if (options.search && options.search.trim().length >= 3) {
    where.or = [
      {
        normalizedTitle: {
          contains: normalizeText(options.search.trim()),
        },
      },
      {
        normalizedContent: {
          contains: normalizeText(options.search.trim()),
        },
      },
    ]
  }
```

- [ ] **Step 2: Update `getPaginatedPosts` search clause (around L365)**

Find this identical block in `getPaginatedPosts` and replace with:

```typescript
  if (options.search && options.search.trim().length >= 3) {
    where.or = [
      {
        normalizedTitle: {
          contains: normalizeText(options.search.trim()),
        },
      },
      {
        normalizedContent: {
          contains: normalizeText(options.search.trim()),
        },
      },
    ]
  }
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/services/post.ts
git commit -m "feat(search): extend post search to include body content"
```

---

## Task 4: Write unit tests for updated service search clause

**Files:**
- Create: `src/services/post.test.ts`

- [ ] **Step 1: Create test file**

```typescript
// @vitest-environment node

import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock Payload and config before importing the service
vi.mock('@/payload.config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(),
}))
vi.mock('@/utils/search/normalizeText', () => ({
  normalizeText: (text: string) => text.toLowerCase(),
}))

import { getPayload } from 'payload'

describe('getFilteredPosts search clause', () => {
  let mockFind: ReturnType<typeof vi.fn>
  let mockPayload: { find: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    mockFind = vi.fn().mockResolvedValue({ docs: [], totalDocs: 0, totalPages: 1, page: 1, hasNextPage: false, hasPrevPage: false })
    mockPayload = { find: mockFind }
    vi.mocked(getPayload).mockResolvedValue(mockPayload as never)
  })

  it('searches normalizedTitle and normalizedContent when search >= 3 chars', async () => {
    const { getFilteredPosts } = await import('@/services/post')

    await getFilteredPosts({ search: 'violine', locale: 'de' })

    const callArgs = mockFind.mock.calls[0][0]
    expect(callArgs.where.or).toHaveLength(2)
    expect(callArgs.where.or[0]).toEqual({ normalizedTitle: { contains: 'violine' } })
    expect(callArgs.where.or[1]).toEqual({ normalizedContent: { contains: 'violine' } })
  })

  it('does not add or clause when search < 3 chars', async () => {
    // Reset module to get fresh instance
    vi.resetModules()
    const { getFilteredPosts } = await import('@/services/post')

    await getFilteredPosts({ search: 'ab', locale: 'de' })

    const callArgs = mockFind.mock.calls[0][0]
    expect(callArgs.where.or).toBeUndefined()
  })

  it('does not add or clause when search is empty', async () => {
    vi.resetModules()
    const { getFilteredPosts } = await import('@/services/post')

    await getFilteredPosts({ search: '', locale: 'de' })

    const callArgs = mockFind.mock.calls[0][0]
    expect(callArgs.where.or).toBeUndefined()
  })
})
```

> **Note:** If `getFilteredPosts` imports are difficult to mock due to module caching, move the `where.or` construction into a pure helper function `buildSearchWhere(search: string)` in `post.ts` and test that directly instead.

- [ ] **Step 2: Run tests**

```bash
pnpm test src/services/post.test.ts
```

Expected: 3 tests pass. If mocking is brittle, extract `buildSearchWhere` helper and test that instead.

- [ ] **Step 3: Commit**

```bash
git add src/services/post.test.ts
git commit -m "test(search): add unit tests for post content search clause"
```

---

## Task 5: Write backfill script

**Files:**
- Create: `tmp/backfillNormalizedContent.ts`

- [ ] **Step 1: Create script**

```typescript
/**
 * One-time backfill script: populates normalizedContent for all existing posts.
 *
 * Triggers the Posts beforeChange hook by re-saving each post via Payload Local API.
 * Run once after deploying the normalizedContent field to production.
 *
 * Usage: npx tsx tmp/backfillNormalizedContent.ts
 *
 * IMPORTANT: Verify DATABASE_URI in .env points to the correct database before running.
 * Requires explicit user approval per database protection policy.
 */

import 'dotenv/config'

import config from '@/payload.config'
import { getPayload } from 'payload'

const BATCH_SIZE = 50

async function main() {
  const payload = await getPayload({ config })

  const locales: Array<'de' | 'en'> = ['de', 'en']

  for (const locale of locales) {
    console.log(`\nProcessing locale: ${locale}`)

    let page = 1
    let hasMore = true

    while (hasMore) {
      const result = await payload.find({
        collection: 'posts',
        limit: BATCH_SIZE,
        page,
        depth: 0,
        locale,
      })

      console.log(`  Page ${page}/${result.totalPages} — ${result.docs.length} posts`)

      for (const post of result.docs) {
        try {
          await payload.update({
            collection: 'posts',
            id: post.id,
            data: {
              // Re-saving existing data triggers beforeChange hooks including normalizedContent
              content: post.content,
            },
            locale,
          })
          process.stdout.write('.')
        } catch (err) {
          console.error(`\n  ERROR updating post ${post.id} (${post.title}):`, err)
        }
      }

      process.stdout.write('\n')
      hasMore = result.hasNextPage
      page++
    }
  }

  console.log('\nBackfill complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
```

- [ ] **Step 2: Verify script compiles**

```bash
pnpm tsc --noEmit tmp/backfillNormalizedContent.ts 2>&1 || npx tsx --dry-run tmp/backfillNormalizedContent.ts
```

Expected: no fatal type errors (minor module resolution warnings acceptable)

- [ ] **Step 3: Commit**

```bash
git add tmp/backfillNormalizedContent.ts
git commit -m "chore: add backfill script for normalizedContent field"
```

---

## Task 6: Run backfill against correct database

> **STOP — Database protection policy applies.**
>
> Before running the backfill:
> 1. Run `grep DATABASE_URI .env` and confirm which database (local vs remote) is targeted
> 2. Present the DATABASE_URI to the user and ask: "This will re-save all posts in both DE and EN locales on `<database>`. Proceed?"
> 3. Wait for explicit "yes, go ahead" before executing.

- [ ] **Step 1: Check database target**

```bash
grep DATABASE_URI .env
```

Show result to user. Wait for approval.

- [ ] **Step 2: Run backfill (after approval only)**

```bash
npx tsx tmp/backfillNormalizedContent.ts
```

Expected: progress dots per post, "Backfill complete." at end, no ERRORs.

- [ ] **Step 3: Verify spot-check**

Manually search on `/news` for a word that appears only in post body text (not in title). Confirm a result appears.

- [ ] **Step 4: Delete backfill script**

```bash
rm tmp/backfillNormalizedContent.ts
git add tmp/backfillNormalizedContent.ts
git commit -m "chore: remove one-time backfill script after use"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run full lint**

```bash
pnpm lint
```

Expected: no errors

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: all tests pass including the two new test files

- [ ] **Step 3: Run type check**

```bash
pnpm tsc --noEmit
```

Expected: no errors
