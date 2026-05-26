# Design: Full-text Body Search for News/Projects

**Date:** 2026-05-26  
**Status:** Approved  
**Scope:** Inline search on `/news` and `/projects` pages only

---

## Problem

The inline search filter on `/news` and `/projects` only matches against `normalizedTitle`. Users cannot find posts by searching for words that appear in the post body.

---

## Solution

Add a denormalized `normalizedContent` field to the `posts` collection, populated via `beforeChange` hook using the existing `extractLexicalText` + `normalizeText` pipeline. Extend the service-layer `where.or` clause to also match against this field.

---

## Data Layer — `normalizedContent` field

**File:** `src/collections/Posts.ts`

Add a new field alongside the existing `normalizedTitle` field:

```typescript
{
  name: 'normalizedContent',
  type: 'text',
  localized: true,
  index: true,
  admin: { hidden: true },
  hooks: {
    beforeChange: [
      ({ siblingData }) => {
        return siblingData.content
          ? normalizeText(extractLexicalText(siblingData.content))
          : ''
      },
    ],
  },
}
```

- `localized: true` — DE and EN content indexed separately
- `index: true` — SQLite index for substring match performance
- `admin: { hidden: true }` — not shown in Payload admin UI
- Hook uses `extractLexicalText` (extracts plain text from Lexical richText JSON) and `normalizeText` (strips diacritics, lowercases) — both already imported in Posts.ts

---

## Service Layer — extend search `or` clause

**File:** `src/services/post.ts`

Two functions contain the search `where` clause — both must be updated:

1. `getPaginatedPosts` (around L366)
2. `getFilteredPosts` (around L268)

**Before:**
```typescript
where.or = [
  { normalizedTitle: { contains: normalizeText(options.search.trim()) } },
]
```

**After:**
```typescript
where.or = [
  { normalizedTitle: { contains: normalizeText(options.search.trim()) } },
  { normalizedContent: { contains: normalizeText(options.search.trim()) } },
]
```

No changes to the UI layer, URL param handling, debounce, or pagination.

---

## Backfill

`normalizedContent` will be empty for all existing posts after the schema change. A backfill script (`tmp/backfillNormalizedContent.ts`) must be run once to re-save every post via Payload Local API, triggering the `beforeChange` hook.

The script will:
1. Fetch all posts (all locales, paginated)
2. Call `payload.update()` on each post with its existing data (hook fires automatically)
3. Log progress and any errors

**This script requires explicit user approval before execution** per the database protection policy.

---

## Out of Scope

- Global cmd-k search palette (KBar) — posts remain excluded
- SQLite FTS5 — over-engineered for current scale
- Excerpt/summary field — not needed; full body indexed
- Search result highlighting — UI unchanged

---

## Files Changed

| File | Change |
|---|---|
| `src/collections/Posts.ts` | Add `normalizedContent` field |
| `src/services/post.ts` | Extend `where.or` in `getPaginatedPosts` and `getFilteredPosts` |
| `tmp/backfillNormalizedContent.ts` | New one-time backfill script (deleted after use) |
