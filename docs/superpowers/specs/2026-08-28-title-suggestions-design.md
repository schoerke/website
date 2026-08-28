# Post Title Duplicate Suggestions + Block Hook — Design

**Date:** 2026-08-28
**Status:** Approved
**Goal:** Give content creators immediate feedback about already-used Post titles (to avoid duplicates) with minimal performance impact.

## Problem

Post titles are localized and freely editable. Exact-same-title duplicates are only caught indirectly via the slug unique constraint, surfacing a confusing "Dieser Slug wird bereits verwendet" error. Near-duplicates ("Quartett" vs "Quartet") pass silently. Worse: a **published** post edited to an already-used title keeps its old slug (slug only regenerates on create / empty slug / unpublished-draft edit), so the duplicate slips through today with no error at all.

Goal is **immediate feedback while typing** + a **save-time safety net**, with **zero per-keystroke DB queries**.

## Approach (approved)

Two layers, both advisory/blocking per the agreed design:

1. **Auto-suggest dropdown** (proactive) — custom admin field component on the Post `title` field.
2. **Exact-match block hook** (safety net) — collection `beforeChange` hook blocking exact normalized-title duplicates with a clear localized error.

## Component 1 — `src/components/admin/TitleSuggestField.tsx`

Custom admin field component wrapping Payload's `TextField`.

### Behavior

- On mount **and on active-locale change** (effect keyed on `useLocale().code` — the field does NOT remount on locale toggle), if there is no module-level session cache for that locale, fetch once:
  `GET /api/posts?limit=0&depth=0&select[title]=true&select[categories]=true&sort=title&locale=<locale>`
  - `limit=0` returns all docs (verified: Drizzle find omits LIMIT when limit === 0).
  - `select[title]=true` + `select[categories]=true` returns slim docs (verified: REST `select` param supported).
  - `categories` is a plain `hasMany` select — returns `string[]` at depth 0 (verified).
- Cache: module-level `Map<locale, { title: string; categories?: string[] }[]>` for the whole browser session. Re-edit page navigations reuse it (0 refetches).
- Typing ≥3 chars (trimmed): filter cached titles in-memory using `normalizeText` **contains** match (diacritic-insensitive). Pure in-memory — zero network per keystroke.
- Exclude the doc currently being edited via `useDocumentInfo().id` (undefined on create → nothing excluded).
- Advisory-only dropdown — clicking a suggestion does NOT autofill. Escape / blur dismisses.
- Show `categories` as secondary text for disambiguation.
- After a successful save, push the new title into the local cache so the next post edit sees it immediately.

### Notes

- `normalizeText` is client-safe: pure, zero imports, only `String.normalize` + regex (verified).
- `@/` alias already works in admin client components (`AccountAvatar.tsx`, `LocaleSwitcherHider.tsx`).
- `useDocumentInfo`, `useLocale`, `TextField` all exported from `@payloadcms/ui` client exports (verified).
- Draft-status posts ARE included in the REST find result (main table holds draft rows; `find` with `draft=false` applies no `_status` filter — verified on dev.db: 6 draft / 233 published). This is desired: draft titles are also worth avoiding. No `_status` filter.

## Component 2 — `src/collections/hooks/blockDuplicateTitle.ts`

Collection `beforeChange` hook, mirroring `blockDuplicateSlug.ts`.

### Behavior

- Skip when `data.title` missing/empty.
- **Skip when title unchanged:** if `originalDoc.title === data.title` → return without query. This keeps content-only edits at 0 extra queries. Handle the localized `originalDoc.title` shape (object `{de,en}` vs string) by reusing the `extractSourceValue` pattern from `src/utils/slug.ts` (defends both shapes — do NOT compare naively).
- Otherwise normalize via `normalizeText(data.title)` and query:
  `payload.find({ collection: 'posts', where: { and: [{ normalizedTitle: { equals: normalized } }, { id: { not_equals: currentId } }] }, locale: req.locale, limit: 1, depth: 0 })`
  - `currentId` = `Number(originalDoc.id)` when finite (SQLite numeric ids — copy `blockDuplicateSlug.ts:30`).
  - `locale: req.locale` scopes the check to the active locale (localized field).
- If `totalDocs > 0` → throw `APIError` with localized message:
  - de: `"Dieser Titel wird bereits verwendet"`
  - en: `"This title is already being used"`
- On query failure (non-APIError), fall through and let Payload handle it (same as `blockDuplicateSlug`).

### Why it's needed (not redundant with slug block)

Slug only regenerates on create / empty slug / unpublished-draft edit. A **published** post edited to an already-used title keeps its old slug → today that duplicate saves silently. The title hook is the only thing that catches it. Plus it gives a title-focused message instead of the confusing slug error.

Registered **first** in `Posts.ts` `hooks.beforeChange` so the clear title message fires before `blockDuplicateSlug`'s slug error.

### Draft semantics

The hook queries the main `posts` table (no `draft: true`). Draft-status rows live in the main table too, so draft-vs-draft and draft-vs-live collisions are both caught — consistent with the suggestions component (same table). Behavior is consistent; document intent in the hook's JSDoc.

## Perf summary

- Keystrokes: **0** DB queries (in-memory filter).
- Session: **1** slim REST call per locale (`limit=0`, titles + categories, depth 0).
- Save: **1** indexed query, only when the title changed (skip on unchanged).
- Memory: 2 locales × ~240 docs × small strings — trivial.

## Trade-off (accepted)

Module-level session cache goes stale if another editor adds/changes titles mid-session. Advisory dropdown + authoritative block hook make this acceptable. Mitigation deferred (YAGNI); optionally refetch on edit-view open if cache age > N minutes — not in scope.

## Legacy data note

Posts created before the `normalizedTitle` hook existed may have empty `normalizedTitle` → exact-match title check evades them. Slug hook still catches at create (deterministic slug). Decision: **accept + document** (check prod count via `pnpm dump posts` if concerned). No code fallback.

## Files

- `src/components/admin/TitleSuggestField.tsx` (new)
- `src/collections/hooks/blockDuplicateTitle.ts` (new)
- `src/collections/hooks/blockDuplicateTitle.spec.ts` (new)
- `src/collections/Posts.ts` (wire both: field component + hook first in beforeChange)
- `src/payload.config.ts` importMap — regenerate via `pnpm payload generate:importmap` (commit the generated file)
- Opportunistic fix: stale comment in `src/collections/hooks/blockDuplicateSlug.ts:16-18` (claims `payload.find` with `draft: true` queries the LIVE table; actually `draft: true` queries `_posts_v`)

No schema/DB change. No new dependencies.

## Testing

### `blockDuplicateTitle.spec.ts` — full mirror of `blockDuplicateSlug.spec.ts` plus:

1. Throws on create when duplicate exists (de + en messages).
2. Throws on update when title changed to an existing one.
3. **Passes on update when title unchanged — assert `find` NOT called.**
4. Passes when the only match is the current doc (id exclusion).
5. Passes when no match.
6. Passes when title missing/empty.
7. Falls through on payload query failure.
8. Diacritics: asserts `where.normalizedTitle` equals the **normalized** input (e.g. "Müller" → "muller").
9. Locale scoping: asserts query called with `req.locale`.
10. Draft-status doc in results → still throws (documents the corrected draft semantics).

### In-memory filter unit test (cheap)

Extract the filter as a pure function for testability: ≥3-char threshold, normalize contains match, current-doc id exclusion, locale key switching.

## Out of scope (YAGNI)

- Soft-warning / non-blocking save styling.
- Click-to-autofill suggestions.
- Fuzzy/startsWith scoring beyond contains.
- Cache staleness refresh policy.
- Cross-locale suggestions.