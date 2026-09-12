# Post Date Override Design

## Context

Client requested ability to backdate posts. Currently posts have no explicit date field; the
displayed date and list ordering both derive from Payload's immutable `createdAt`. Backdating
requires a new editable field that becomes the source of truth for display and ordering.

## Decision

- New optional `publishedDate` date field on the Posts collection.
- `publishedDate` controls **both** displayed date and list ordering.
- Backdating only: future dates rejected by validation.
- Existing behavior preserved: when no override is set, `publishedDate` defaults to `createdAt`.
- Non-localized field (avoids locale/fallback complexity; falls back to `createdAt` uniformly).

## Architecture

### Field

New field on Posts collection (`src/collections/Posts.ts`), sidebar position:

```typescript
{
  name: 'publishedDate',
  type: 'date',
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
  validate: publishedDateValidation,
}
```

### Default behavior hook

`beforeChange` on the field. Critical semantics (verified against Payload 3.89 source):

- `createdAt` is injected by the DB adapter **after** field hooks run on create — it is
  `undefined` inside any create-path hook. Never default from `siblingData.createdAt` alone.
- Update hooks receive the **incoming patch** only (no merge with the existing doc) —
  absence (`undefined`) must be treated as "no change", not "clear".
- Version restore runs hooks with `operation: 'update'` and `req.context.isRestoringVersion`
  set; the patch is the historical version (pre-field versions lack `publishedDate`). Restore
  delivers an explicit `null` for a legacy version's NULL `version_published_date` (not
  `undefined`) — the restore-preserve branch must run BEFORE the explicit-clear branch.

```typescript
beforeChange: ({ value, siblingData, operation, originalDoc, req }) => {
  if (value !== null && value !== undefined) return value // set or unchanged — pass through
  if (value === null && req?.context?.isRestoringVersion) {
    // Legacy-version restore: preserve the current backdate, not the old era's createdAt.
    return originalDoc?.publishedDate ?? originalDoc?.createdAt ?? siblingData?.createdAt ?? new Date().toISOString()
  }
  if (value === null) {
    // Explicit admin clear. originalDoc carries the stored createdAt (patch-only siblingData does not)
    return originalDoc?.createdAt ?? siblingData?.createdAt ?? new Date().toISOString()
  }
  if (operation === 'create') return siblingData?.createdAt ?? new Date().toISOString()
  // Defensive: restore delivers null (handled above), not undefined — kept for future Payload changes.
  if (req.context?.isRestoringVersion && originalDoc?.publishedDate) return originalDoc.publishedDate
  return undefined // absent — leave stored value untouched
}
```

Behavior matrix:

- **Create**: value unset → `siblingData.createdAt ?? now` (preserves current behavior; millisecond
  drift vs adapter-set `createdAt` is irrelevant).
- **Update, value set/unchanged**: pass through.
- **Update, absent** (partial update like publish-status, unrelated field): no-op — stored value
  kept. Prevents wiping backdates on any unrelated save.
- **Update, explicit null** (admin clears): reset to `originalDoc.createdAt` — the stored
  `createdAt`, since update patches never carry `siblingData.createdAt`.
- **Version restore**: preserve `originalDoc.publishedDate`.

### Validation

Reject future dates. Compare date-parts in `Europe/Berlin` (site audience) — convert both the
stored value and "today" to that timezone, then compare date parts only. A date that is *tomorrow*
in Berlin must be rejected even if it stores as "today" in UTC.

Payload's date `validate` receives `Date | string | null`. Handle all three explicitly:

- `Date` object: `Date.parse(value.toString())` (rely on coercion explicitly, not implicitly).
- ISO string: `Date.parse(value)`.
- Empty string `''`: **reject/coerce** — the built-in date validate passes `''` through, and a
  stored `''` renders as `Invalid Date`. Coerce to `null` or reject.
- `null`/`undefined`: allowed (field optional).

**Draft saves**: `versions.drafts.validate: true` means field validation runs on draft create AND
update, not just publish. A future date therefore blocks *draft* saving too — matches the
backdate-only requirement, but is intended behavior to document and test.

Error message localized per `options.req?.locale` (same pattern as
`validatePublishedPostContent`).

### Sorting

Change to a **tie-broken** sort in both list entry points:

- `src/services/post.ts:295` (`getFilteredPosts`): `sort: ['-publishedDate', '-createdAt']`
- `src/services/post.ts:390` (`getPaginatedPosts`): `sort: ['-publishedDate', '-createdAt']`

Tie-breaker needed: backdating to the same day (likely) or identical auto-defaults produces equal
`publishedDate` values → undefined SQLite order → duplicated/skipped posts across pagination.
`-createdAt` as secondary key preserves current ordering for equal dates.

**Every caller of `getPaginatedPosts` reorders** — news, projects, and homepage slider
(`src/app/(frontend)/[locale]/page.tsx` uses `getPaginatedPosts({ category: 'home' })`). Homepage
reorder is intended (a backdated 'home' post jumps to slide 1). Confirmed with client.

`getAllPosts` and category-specific helpers have no explicit sort (Payload default `-createdAt`);
they are dead code per `docs/todo.md` — note for resurrection, no change now.

### Display

Use `publishedDate ?? createdAt` fallback at render sites:

- `src/components/NewsFeed/NewsFeedList.tsx:141`
- `src/components/Post/PostDetailContent.tsx:62` (keep prop name `createdAt`; resolve
  `publishedDate ?? createdAt` at callers and pass the resolved value)
- Callers to update: news page, projects page (PostDetailContent), `PostPreviewClient.tsx:44`

Add `publishedDate: true` to `POST_LIST_SELECT` (`src/constants/postList.ts:16`) so list queries
return the field. Note: Payload forces sort columns into the select anyway, so the field would
come back regardless — the explicit entry is for readability. Update the file's header comment
listing rendered fields.

Timezone note: Payload's datepicker stores midnight in the admin browser's timezone (UTC instant).
The Berlin date-parts comparison is self-consistent with Berlin display. An admin in an extreme
timezone picking a calendar date can shift ±1 day in Berlin — harmless for validation-vs-display
consistency; midnight-in-Berlin assumption documented.

### Admin list

Align admin list with site ordering so backdating is not confusing (`Posts.ts` `admin` config):

- `sort: '-publishedDate'`
- `defaultColumns: ['title', 'categories', 'artists', 'publishedDate', '_status', 'updatedAt']`

### Migration

Add **two** columns (drafts are enabled → non-localized fields also get a `version_*` column on
the versions table):

1. `posts.published_date` + index + backfill
   `UPDATE posts SET published_date = created_at WHERE published_date IS NULL;`
2. `_posts_v.version_published_date` + index + **latest-row backfill**
   `UPDATE _posts_v SET version_published_date = (SELECT p.published_date FROM posts p WHERE p.id = _posts_v.parent_id) WHERE _posts_v.latest = 1 AND version_published_date IS NULL;`

Idempotency guard per `docs/patterns/payload.md`: check column existence via `pragma_table_info`
and skip the whole block on re-run. `UPDATE ... WHERE published_date IS NULL` is naturally
idempotent. Use `DROP TABLE IF EXISTS`-style guards; verify against `payload-generated-schema.ts`,
not dev's live schema.

**Versions backfill — latest rows only.** With drafts enabled, the site list sort reads the
VERSION table (`queryDrafts` routes published reads through `_posts_v` latest rows), not
`posts.published_date`. If only the base table is backfilled, every legacy post's current version
has NULL `version_published_date` → a backdated post (non-NULL) sorts ABOVE the entire legacy
tail regardless of its date — breaking the ordering feature for all existing posts. Backfilling
the `latest = 1` row per post from `posts.published_date` fixes slotting.

Historical rows (`latest = 0`) stay NULL on purpose. `version_created_at` is version-save time,
not the post's createdAt; backfilling historical rows would make a legacy-version restore deliver
a non-NULL value → the hook's pass-through branch stamps the old era's date and drops a current
backdate. Leaving them NULL means a legacy-version restore delivers `value: null`, and the hook's
`isRestoringVersion` branch (checked BEFORE the explicit-clear branch) preserves the current
backdate. Verified: 251 latest rows backfilled, 968 historical rows NULL on a prod-snapshot dry run.

**Hook restore ordering**: `restoreVersion` delivers an explicit `null` for a legacy version's
NULL `version_published_date` (not `undefined`). The hook MUST check `isRestoringVersion` before
the explicit-clear branch, else a legacy restore resets the backdate to `createdAt`.

**Admin list ordering caveat (accepted)**: drafts list sorts by the latest version's
`version.published_date`; the latest-row backfill aligns admin with the site for current posts.
(Historical versions remain NULL, so sorting by an old version's date is not expected.)

**Duplicate behavior (accepted)**: Payload `duplicate` copies the source's `publishedDate` into
the new post. New duplicate shows the source date; admin can clear it (null-branch now works via
`originalDoc`). Documented, no special handling.

Prod application gated by AGENTS.md database policy (requires explicit user confirmation).
Prod-targeting migration must run with `NODE_ENV=production`; delete the `dev|-1` marker from
`payload_migrations` before CI applies, else `build:ci` silently skips.

Column stays nullable. The create-path hook + backfill guarantee values; a stray NULL is sorted
last in SQLite DESC (buried, never promoted).

## Unaffected areas

- **Sitemap**: uses `updatedAt` (`src/app/sitemap.ts:87`). Verified.
- **Search plugin**: posts are not indexed at all
  (`searchPlugin({ collections: ['artists', 'employees', 'pages', 'repertoire'] })`); no impact.
- **Revalidation hooks** (`revalidatePost`, `revalidateHomePage`), duplicate-slug/title hooks:
  collection-level `beforeChange` runs before field hooks — unaffected. Homepage reorder needs no
  new revalidation (already wired via `revalidateHomePageOnPostChange`).
- **`createdBy`, drafts**: logic untouched. Versions *storage* is touched via the `_posts_v`
  column (Blocker 2 above).
- **Recordings / artists**: out of scope.

## Tests

- Update `post.spec.ts` sort assertions (lines ~207-531) to expect
  `['-publishedDate', '-createdAt']`.
- Update `post.spec.ts` `POST_LIST_SELECT` coverage (lines ~657-666): literal object now includes
  `publishedDate: true`.
- Hook branch tests (each matrix row): create-default, set-pass-through, absent-noop,
  explicit-null reset (fixture must include `originalDoc.createdAt`), version-restore preserve
  with `value: null` (legacy restore) AND `value: undefined`.
- Validation tests: future date rejected (incl. Berlin boundary case), today/past accepted,
  empty allowed, invalid string rejected, empty-string `''` rejected/coerced, draft-save with a
  future date blocked, restore-with-validation passes.
- Component fallback tests: `NewsFeedList` renders `publishedDate` when set, `createdAt` when
  null/absent; `PostPreviewClient` resolves `publishedDate ?? createdAt`.
- Migration test/verification: column + index exist on both tables; `posts` backfill correct;
  `_posts_v` latest rows backfilled, historical rows NULL.

## Generated files

- `src/payload-types.ts` via `pnpm payload generate:types`
- `src/payload-generated-schema.ts` via `pnpm payload generate:db-schema`
  (`generate:importmap` not needed — no admin components added)