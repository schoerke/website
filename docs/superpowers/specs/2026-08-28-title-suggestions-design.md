# Post Title Duplicate Suggestions + Block Hook — Design

**Date:** 2026-08-28
**Status:** Approved (rev 2 — folded second code review)
**Goal:** Give content creators immediate feedback about already-used Post titles (to avoid duplicates) with minimal performance impact.

## Problem

Post titles are localized and freely editable. Exact-same-title duplicates are only caught indirectly via the slug unique constraint, surfacing a confusing "Dieser Slug wird bereits verwendet" error. Near-duplicates ("Quartett" vs "Quartet") pass silently. Worse: a **published** post edited to an already-used title keeps its old slug (slug only regenerates on create / empty slug / unpublished-draft edit — verified `src/utils/slug.ts:126`), so the duplicate saves silently today with no error at all.

Goal is **immediate feedback while typing** + a **save-time safety net**, with **zero per-keystroke DB queries**.

## Approach (approved)

Two layers:

1. **Auto-suggest dropdown** (proactive) — custom admin field component on the Post `title` field.
2. **Exact-match block hook** (safety net) — collection `beforeChange` hook blocking exact normalized-title duplicates with a clear localized error.

A field-level `validate` alternative was weighed and rejected: same query + same skip/id-exclusion/locale logic, inline error instead of toast (UX regression for a save-time net), diverges from the established `blockDuplicateSlug` pattern (loses mirror-testing leverage). Hook approach is the right call.

## Component 1 — `src/components/admin/TitleSuggestField.tsx`

Custom admin field component wrapping Payload's `TextField`. Client component: **first line `'use client'`** (react-components.md pattern).

### Registration

Mounted on the `title` field via:
```typescript
admin: {
  components: {
    Field: '/components/admin/TitleSuggestField',
  },
}
```
Then `pnpm payload generate:importmap` (generated `src/app/(payload)/admin/importMap.js` is committed).

### Props interface

Component receives Payload field props; the **`path`** prop is the required piece for pass-through to `useField`/`useFormFields`/`TextField`. Render `<TextField {...props} />` unchanged, decorate with suggestions below it.

### Behavior

- **Fetch** (effect keyed on `useLocale().code` — the field does NOT remount on locale toggle):
  `GET /api/posts?limit=0&depth=0&select[title]=true&select[categories]=true&sort=title&locale=<locale>`
  - `limit=0` returns all docs (Drizzle omits LIMIT — verified). `select` param supported (verified). `locale` scopes the localized title (verified). `categories` is a plain `hasMany` select → `string[]` at depth 0 (verified).
  - **Race guard (locale switch):** capture the requested locale at fetch start, cache under **that** key, ignore the response if a newer fetch has started. Optional `AbortController`. Without this, an in-flight 'de' response can land in the 'en' cache bucket.
  - **Error handling:** catch → `console.error`, disable suggestions silently for the rest of the session; never throw into the admin render tree.
- **Cache:** module-level `Map<locale, { id: number; title: string; categories?: string[] }[]>` for the whole JS context (per **tab**, per dev-session; Fast Refresh resets it — acceptable). Re-edit page navigations reuse it (0 refetches). Cache entry **includes `id`** so current-doc exclusion works.
- **Filter** (on title input change, trimmed length ≥ 3): in-memory, pure — zero network per keystroke:
  `normalizeText(entry.title).includes(normalizeText(value)) && entry.id !== currentId`
  - `currentId` = `useDocumentInfo().id` (undefined on create → nothing excluded).
  - Diacritic-insensitive via `normalizeText` (pure, client-safe — verified zero imports).
- **Dropdown vehicle:** `Popup` from `@payloadcms/ui` wrapping the TextField as trigger (or an absolutely-positioned div using Payload CSS vars `--theme-elevation-*`, `--style-radius-*`). List matching titles with `categories` as secondary text.
- **Advisory-only:** items are **non-interactive** — click = no-op (does NOT autofill). Escape / blur dismisses (Popup handles, or manual state).
- **Save-refresh:** on a COMPLETED successful save (detected via `useFormProcessing` transitioning true→false with `useFormSubmitted` false — note Payload sets `submitted` TRUE on failure, so the success condition is `!processing && !submitted`), force a cache refresh for the active locale (one slim REST fetch). This makes a just-created title show as used on the next post without an id-guard hack. Verified against `@payloadcms/ui/dist/forms/Form/index.js`: `submitted` is set true only on failure paths and false on success — the initially-planned "push on submitted" was inverted and would have polluted the cache with rejected titles; replaced by refresh. `useFormProcessing` + `useFormSubmitted` exported from `@payloadcms/ui` (verified).

### Notes

- `normalizeText` client-safe: pure, zero imports, `String.normalize` + regex (verified).
- `@/` alias in the admin bundle: `AccountAvatar.tsx` is a server-rendered admin graphic (not proof of client-bundle alias resolution); `LocaleSwitcherHider.tsx` uses no `@/` import. Payload 3 resolves tsconfig `paths` in the admin webpack (likely works) — **verify at `pnpm build`**. Prefer `@payloadcms/ui` imports + relative imports in the component regardless.
- Draft-status posts (never-published, `_status='draft'` main-table rows) ARE included in the REST result — desired: draft titles are worth avoiding. No `_status` filter.

## Component 2 — `src/collections/hooks/blockDuplicateTitle.ts`

Collection `beforeChange` hook, mirroring `blockDuplicateSlug.ts`. Registered **first** in `Posts.ts` `hooks.beforeChange` so the clear title message fires before the slug error (hooks run in array order).

### Behavior

- **Skip** when `data.title` is missing/empty/whitespace-only (trim).
- **Skip when title unchanged:** if `originalDoc.title === data.title` → return without query (content-only edits = 0 extra queries). `data.title` is the active-locale **string**; `originalDoc.title` is a string when `req.locale` is set but a `{de,en}` **object** when not. Naive `===` comparison breaks (object never equals string → skip never fires → every save pays the query). Reimplement the `extractSourceValue` pattern locally — **it is NOT exported** (`src/utils/slug.ts:91`, private). Must handle both shapes; test both.
- Otherwise **re-normalize** via `normalizeText(data.title)` — do NOT read `data.normalizedTitle`: collection-level `beforeChange` runs BEFORE field-level hooks (verified `create.js:121-138`), so `normalizedTitle` is stale/absent at block-hook time.
- Query:
  `payload.find({ collection: 'posts', where: { and: [{ normalizedTitle: { equals: normalized } }, { id: { not_equals: currentId } }] }, locale: req.locale ?? 'de', limit: 1, depth: 0 })`
  - `currentId` = `Number(originalDoc.id)` when finite (SQLite numeric ids — copy `blockDuplicateSlug.ts:30`). `originalDoc` is undefined on create.
  - **Locale guard `req.locale ?? 'de'`** (mirror `blockDuplicateSlug.ts:44`): with `req.locale` undefined (programmatic update, REST without `?locale=`), `payload.find` locale=undefined spans all locales → a title existing only in the other locale would false-positive block. The guard keeps it active-locale-only.
- If `totalDocs > 0` → throw `APIError`, localized:
  - de: `"Dieser Titel wird bereits verwendet"`
  - en: `"This title is already being used"`
- On query failure (non-APIError), fall through (same as `blockDuplicateSlug`).

### Why it's needed (not redundant with slug block)

Slug only regenerates on create / empty slug / unpublished-draft edit (`slug.ts:126`). A **published** post edited to an already-used title keeps its old slug → today that duplicate saves silently. The title hook is the only thing that catches it. Plus it gives a title-focused message instead of the confusing slug error.

### Draft semantics (accurate)

The hook queries the main `posts` table (no `draft: true`). Coverage:
- **Caught:** never-published drafts (main-table rows with `_status='draft'`) and live/published rows — same table, no `_status` filter.
- **NOT caught:** drafts of previously-published docs live only in `_posts_v` (draft saves never touch the main table — verified `updateDocument`), invisible to both the suggestion query AND the hook. Inconsistency with `blockDuplicateSlug`, which has the same limitation. Document this precisely in the hook's JSDoc; do NOT claim "draft-vs-draft collisions all caught".

## Perf summary

- Keystrokes: **0** DB queries (in-memory filter).
- Context: **1** slim REST call per locale per **tab/session** (`limit=0`, titles+categories+id, depth 0).
- Save: **1** indexed query, only when the title changed (skip on unchanged).
- `sort=title` on a localized column is an unindexed full-table sort — negligible at ~240 docs; note the caveat if the table grows large.
- Memory: 2 locales × ~240 docs × small strings — trivial.

## Trade-off (accepted)

Module-level cache goes stale if another editor adds/changes titles mid-session. Advisory dropdown + authoritative block hook make this acceptable. Cache staleness refresh policy deferred (YAGNI).

## Legacy data note

Posts created before the `normalizedTitle` hook existed could have empty `normalizedTitle` → exact-match title check evades them. Evidence (dev.db, prod mirror refreshed 2026-08-28): **0 empty of 477 locale rows** — the field hook self-populates on every save and the WP import ran through Local API hooks, so risk is theoretical. Decision: **accept + document**; no `or: [{title:{equals:raw}}]` fallback. Implementation verification: one-line prod sanity check via `pnpm dump posts` (count rows with empty `normalizedTitle`).

## Files

- `src/components/admin/TitleSuggestField.tsx` (new)
- `src/collections/hooks/blockDuplicateTitle.ts` (new)
- `src/collections/hooks/blockDuplicateTitle.spec.ts` (new)
- `src/collections/Posts.ts` (wire: title field `admin.components.Field` + hook FIRST in beforeChange)
- `src/payload.config.ts` importMap — regenerate via `pnpm payload generate:importmap` (commit the generated file)
- Opportunistic fix: stale comment in `src/collections/hooks/blockDuplicateSlug.ts:16-18` (claims `payload.find` with `draft: true` queries the LIVE table; actually `draft: true` queries `_posts_v` — verified `find.js:103-145`)

No schema/DB change. No new dependencies.

## Testing

### `blockDuplicateTitle.spec.ts` — full mirror of `blockDuplicateSlug.spec.ts` plus:

1. Throws on create when duplicate exists (de + en messages).
2. Throws on update when title changed to an existing one.
3. **Passes on update when title unchanged — assert `find` NOT called. TWO variants:** `originalDoc.title` as string AND as `{de,en}` object (the object variant is the one `extractSourceValue` defends; most likely to regress).
4. **Cross-locale pass-through:** title exists only in the other locale → no block; assert the query received `locale: req.locale`.
5. Passes when the only match is the current doc — **assert the `where` clause contains `id: { not_equals: currentId }`** (mock shape alone can't distinguish exclusion from a buggy query).
6. Passes when no match.
7. Passes when title missing/empty/**whitespace-only** (trimmed to empty → skip).
8. Falls through on payload query failure.
9. Diacritics: assert `where.normalizedTitle` equals the **normalized** input (e.g. "Müller" → "muller").
10. Locale scoping: assert query called with `req.locale`.
11. Draft-status doc in results → still throws (documents corrected draft semantics).
12. Mock `req` via the `createMockRequest` shape in `blockDuplicateSlug.spec.ts:5-16` (covers `payload.find` + `locale`).

### In-memory filter unit test (cheap)

Extract the filter as a pure function for testability: ≥3-char threshold, normalize contains match, current-doc id exclusion (`id !== currentId`). Note: **locale-key switching is NOT testable at the pure-function level** — locale separation lives in the component's module-level `titleCache` Map, not the filter. Component-level tests were deferred (heavy `@payloadcms/ui` hook mocking); the locale boundary is documented here instead.

## Out of scope (YAGNI)

- Soft-warning / non-blocking save styling.
- Click-to-autofill suggestions.
- Fuzzy/startsWith scoring beyond contains.
- Cache staleness refresh policy.
- Cross-locale suggestions.
- `or: [{title: {equals: raw}}]` legacy fallback (evidence says unnecessary).