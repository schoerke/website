# Artist Repertoire Ordering Design

**Date:** 2026-08-15
**Status:** Approved
**Context:** Client request for per-artist ordering of repertoire sections on artist detail pages, using
drag-and-drop in the Payload admin. Also introduces this project's first Payload migration workflow —
schema changes flow through `migrate:create` migration files, applied to prod automatically in the build
pipeline (`build:ci` script).

## Overview

Enable content editors to control the order of repertoire sections shown on individual artist pages using
drag-and-drop in the Payload admin UI. Repertoire content stays managed through the Repertoire collection, but
artists gain a relationship field (`repertoire`) whose array order is the display order.

This mirrors the already-shipped "Artist Projects Ordering" feature
([2025-12-13-artist-projects-ordering-design.md](../../plans/2025-12-13-artist-projects-ordering-design.md)).

## Requirements

- Per-artist ordering of repertoire sections (each artist orders independently)
- Drag-and-drop reordering in Payload admin
- Max 5 repertoire sections per artist (kept from the existing array field constraint)
- Repertoire collection remains the source of truth for content
- Automatic sync when repertoire docs are linked/unlinked from artists
- No pagination or search needed (small dataset, ≤5 per artist)

## Current State

- Artist detail page → Repertoire tab shows sections as a toggle group (e.g., "Solo", "Chamber Music") plus the
  selected section's content (`RepertoireTab` in `src/components/Artist/ArtistTabContent.tsx`).
- Sections come from the **Repertoire collection** (23 docs in dev), linked to artists via the `artists`
  relationship field (`hasMany`). A doc can link multiple artists (duos/ensembles).
- Frontend fetches them lazily via the `fetchRepertoiresByArtist` server action
  (`src/actions/repertoires.ts`), which has **no sort** — display order is arbitrary.
- The existing `artist.repertoire` **array field** (inline `title` + `content` rich text) is unused by the
  frontend and **empty in the database** (verified 0 rows in `artists_repertoire` and
  `artists_repertoire_locales`). It is safe to repurpose.

## Architecture Decision

**Approach:** Artist-side relationship field (mirror of `artist.projects`).

- `artist.repertoire` changes from `array` to `relationship` → `repertoire` collection (`hasMany`)
- Repertoire collection remains source of truth
- `afterChange` / `afterDelete` hooks on Repertoire auto-sync artist arrays
- Native Payload drag-and-drop ordering on the relationship field
- Frontend reads pre-populated `artist.repertoire` (order preserved from array)

**Why this approach:**

- Per-artist ordering works for shared docs: each artist's array is independent, so a duo doc can sit at
  position 1 for Artist A and position 3 for Artist B
- Reuses the proven projects-ordering pattern (hooks, batching, filter options, manual population)
- Native drag-drop from Payload — no custom admin UI
- The empty legacy array field is repurposed, so no data migration of its contents is needed

**Rejected alternatives:**

- **`order` number field on Repertoire collection:** one order per doc, breaks for duo/ensemble docs shared
  across artists — cannot express per-artist order.
- **Custom admin drag-drop UI writing to an order array:** overkill, fragile, duplicates native behavior.

## Database Migration Workflow

**Decision: Follow the Payload-documented workflow.** Keep `push: true` in dev (Payload's intended sandbox
workflow), generate migration files with `migrate:create`, and apply them to prod automatically in the build
pipeline. Do **not** disable push in dev, and do **not** use `.env` swaps to apply migrations to prod (the build
pipeline handles those). `.env` swaps remain the correct mechanism for one-off **data scripts** (backfill, the
`batch:-1` cleanup) that run outside the pipeline.

### Why this is the right approach

Payload's official docs (https://payloadcms.com/docs/database/migrations) state:

> *"We suggest that you leave `push` as its default setting and treat your local dev database as a sandbox."*

> *"Do not mix 'push' and migrations with your local development database. If you use 'push' locally, and then try
> to migrate, Payload will throw a warning."*

Key facts confirmed from source (`node_modules/@payloadcms/db-sqlite/dist/connect.js`) and docs:

- **Dev auto-push never touches prod.** The schema push only runs when `process.env.NODE_ENV !== 'production'`.
  Vercel builds run with `NODE_ENV=production`, so prod is never auto-migrated.
- **Migrations run in transactions** — a failed migration rolls back and fails the deploy, leaving prod DB
  untouched.
- `payload migrate` sets `PAYLOAD_MIGRATING=true`, so it never triggers a schema push.
- `payload_migrations` table tracks which migration files have run; `migrate` is idempotent and skips applied ones.

### Migration files in this project today

- `src/migrations/index.ts` exports an empty `migrations` array — no migration workflow has been used yet.
- `src/migrations/20260310_203659.json` is a **stale** schema snapshot (March 2026): it still contains `issues`,
  `images`, `home_page`, `artists_discography`, `artists_youtube_links`. The current schema has since renamed
  collections/tables (e.g., `images` → `media`, `youtubeLinks` → `videoLinks`). The generated schema file
  `src/payload-generated-schema.ts` is also stale (its `artists_rels` only lists `employeesID`, but the live DB
  also has `posts_id`).
- Because the snapshot is stale, `pnpm payload migrate:create` would diff March's schema against the current
  config and generate a **giant, unrelated migration**. A fresh baseline snapshot must be established first.

### Establishing a fresh baseline

1. Delete the stale `src/migrations/20260310_203659.json` snapshot.
2. Run `pnpm payload migrate:create baseline` — with no snapshot present, Payload diffs against the empty
   default snapshot and generates a full CREATE-schema migration (the baseline) plus a fresh `.json` snapshot of
   the current schema.
3. **Delete the generated baseline `.ts` file** (it must never run — the dev DB already matches the current
   schema; running it against prod would fail since tables exist). **Keep the fresh `.json` snapshot** it wrote —
   that becomes the reference point for all future `migrate:create` diffs.
4. Verify with `pnpm payload migrate:status` (no pending migrations).

### Generating and applying the repertoire migration

1. After the schema change, run `pnpm payload migrate:create artist-repertoire-ordering` — now diffs the fresh
   baseline snapshot against the new config and generates **exactly** the repertoire change (drizzle-kit
   auto-generates the SQL, guaranteeing it matches what Payload expects).
2. Review the generated SQL in `src/migrations/<timestamp>-artist-repertoire-ordering.ts` (see expected changes
   below) and commit it.
3. Dev DB: already updated by push — no action needed.
4. Prod DB: applied automatically by the build pipeline (below).

### Applying migrations to prod — build pipeline (no `.env` swaps)

Use a dedicated `build:ci` script, not `migrate` inside `build`. This keeps local builds migration-free.

**Warning:** `pnpm ci` is a **reserved pnpm built-in** (clean install). A custom script named `ci` would never
run via `pnpm ci` (pnpm 10.33.2 verified: `pnpm ci --help` prints the clean-install usage). The script must be
named differently — use `build:ci` and invoke it with `pnpm run build:ci`.

**Add a `build:ci` script to `package.json`:**

```json
"scripts": {
  "build": "pnpm generate:search-index && cross-env NODE_OPTIONS=--no-deprecation next build --webpack",
  "build:ci": "pnpm migrate && pnpm build"
}
```

**Point Vercel at `build:ci` via `vercel.json`** (git-tracked, explicit — Vercel currently auto-detects Next.js
and defaults to `pnpm build`):

```json
{
  "buildCommand": "pnpm run build:ci"
}
```

On every Vercel deploy:

- `pnpm migrate` connects to prod (Vercel sets prod env vars), runs pending `src/migrations/*.ts` against prod
  DB, records them in `payload_migrations`.
- `pnpm build` then runs `generate:search-index` (reindexes against the new schema — safe, migration already
  applied) and `next build`.

**Why `build:ci` and not `migrate` inside `build`:** a local `pnpm build` would otherwise run `migrate` against
the dev DB, where the `batch:-1` row triggers the interactive data-loss warning (hangs/fails the build) and where
re-applying `up()` to the already-pushed schema errors. `build` stays clean; only Vercel runs `build:ci`.

**Why safe on Vercel:** `NODE_ENV=production` means Payload never auto-pushes during build; `migrate` sets
`PAYLOAD_MIGRATING=true`; failures abort the deploy inside a transaction.

**Vercel preview deploys also run `build:ci`:** preview (PR/branch) builds use the same `build:ci` command, so a
preview deploy will also run `migrate` against prod. This is idempotent and safe (`payload_migrations` tracks
applied migrations; the repertoire migration is non-destructive), but be aware: **a preview build can apply the
migration to prod before the production deploy.** The migration is committed before the deploy, so this is
acceptable — but the prod `batch:-1` cleanup (below) must happen before any preview build is triggered.

**CRITICAL prerequisite — prod `batch:-1` cleanup (verified 2026-08-15):**

A read-only query of prod confirmed `payload_migrations` contains `[{ name: 'dev', batch: -1 }]`. This row was
created by past `npx tsx` prod operations (AGENTS.md's old `.env` swap workflow runs scripts with
`NODE_ENV` unset, so `pushDevSchema` pushed to prod and recorded the dev marker).

If it remains, the `build:ci` migrate step breaks:

- `migrate.js` (drizzle) detects the `batch:-1` row and shows the interactive *"data loss will occur"* prompt
  (lines 30-45)
- The prompt is only filtered **in-memory**; the row is never deleted, so **every deploy prompts again**
- In Vercel's non-TTY build, `prompts` cancels → `process.exit(0)` → **migrate silently exits without running**,
  the build continues on the old schema, and the deploy ships without the schema change

**One-time prod cleanup before the first `build:ci` deploy:**

1. **MANDATORY full backup first, before any `.env` change** — `turso db export ksschoerke-production` writes a
   complete SQLite snapshot (`data/dumps/ksschoerke-production-<timestamp>.db`) covering every table including
   `payload_migrations`. Uses Turso CLI credentials (not `.env`), so no swap is needed and a `.env`
   misconfiguration cannot affect it. Verify the file is non-empty and readable (`sqlite3 ... SELECT COUNT(*) FROM
   payload_migrations` → 1) **before** any write. If it fails, STOP.
2. **Test the migration against a local copy first** — copy the export to `data/dumps/test-migration.db`, run
   `payload migrate` against it (via a `file:` DB URI with a dummy token), verify `artists_rels.repertoire_id`
   added, array tables dropped, and artist/repertoire/rels row counts unchanged; test `migrate:down` reverses it;
   then re-run up and delete the test copy. If anything fails, prod is untouched and the pristine export remains.
3. `.env` swap to prod (AGENTS.md approval flow)
4. Delete the metadata row: `payload.delete` on the `payload-migrations` collection where `name: 'dev'` (or
   equivalent Local API call) — this is a metadata row, zero content data affected. The script prints the full
   row contents to stdout before deleting
5. Verify with a read-only query that `payload_migrations` is now empty
6. Restore `.env` to dev; keep the Turso snapshot as the restore point

After cleanup, `payload migrate` runs the repertoire migration with no prompt, and prod now tracks migrations
correctly. This cleanup is a **prod DB modification** and requires explicit user approval per AGENTS.md. If the
backup cannot be produced or verified, the cleanup must not proceed. Restore path (destructive, separate approval
required): `turso db import data/dumps/ksschoerke-production-<timestamp>.db --database ksschoerke-production`.

**Rejected alternative — `.env` swap for migrations:** manually flipping dev/prod DB lines in `.env` and running
`pnpm payload migrate` locally is error-prone (risk of leaving `.env` pointed at prod) and unnecessary. The build
pipeline already has prod credentials. Note: the `.env` swap remains the correct mechanism for **data scripts**
(backfill) that run outside the build pipeline — see "Data Backfill".

**Manual Drizzle access:** drizzle-kit 0.31.7 is installed (transitive via `@payloadcms/drizzle`) and usable
manually (`drizzle-kit generate/push/pull`) if finer control is ever needed, but it requires a `drizzle.config.ts`
and does not maintain Payload's `payload_migrations` table. Prefer Payload's own `migrate:create` / `migrate`
CLI, which wraps drizzle-kit.

### Expected SQL in the migration (auto-generated by drizzle-kit)

Verified against the live dev DB (`PRAGMA` + schema reads). The auto-generated `up()` should contain:

**Up:**

- Add `repertoire_id` column to `artists_rels` (relationships store one FK column per related collection in the
  shared `_rels` table). SQLite cannot add an FK column via `ALTER TABLE`, so drizzle-kit generates a table
  recreation: create `artists_rels_new`, `INSERT ... SELECT` existing rows (preserving contactPersons/projects
  data), drop old, rename, rebuild indexes, add FK `repertoire_id → repertoire.id ON DELETE CASCADE`.
- Drop the two empty array tables (zero data — verified 0 rows in dev):
  ```sql
  DROP TABLE artists_repertoire_locales;
  DROP TABLE artists_repertoire;
  ```

**Down:**

- Recreate `artists_repertoire` and `artists_repertoire_locales` (schema verified from live DB)
- Drop `repertoire_id` from `artists_rels` (reverse table recreation)

## Schema Changes

### Artists Collection (`src/collections/Artists.ts`)

Repurpose the `repertoire` field (currently `array`, line ~156) into a relationship field:

```typescript
{
  name: 'repertoire',
  type: 'relationship',
  relationTo: 'repertoire',
  hasMany: true,
  maxRows: 5,
  label: {
    en: 'Repertoire',
    de: 'Repertoire',
  },
  admin: {
    description: {
      en: "Repertoire sections shown on this artist's page. Drag to reorder. Maximum 5 sections.",
      de: 'Repertoire-Abschnitte auf der Seite dieses Künstlers. Ziehen zum Sortieren. Maximal 5 Abschnitte.',
    },
  },
  validate: (value: unknown) => {
    if (Array.isArray(value) && value.length > 5) {
      return 'Maximum 5 repertoire sections per artist. Please remove some before adding more.'
    }
    return true
  },
  filterOptions: ({ id }) =>
    ({
      and: [{ artists: { contains: id } }],
    }) as const,
}
```

Key features:

- Native drag-and-drop reordering (relationship `hasMany`)
- `filterOptions` shows only repertoire docs already linked to this artist
- `maxRows: 5` + server-side `validate` enforce the limit
- Run `pnpm payload generate:types` to refresh `payload-types.ts`
- **Delete** the now-orphaned `src/collections/components/RepertoireRowLabel.tsx` (array-field row label, unused
  by the relationship field) and run `pnpm payload generate:importmap` to refresh the admin import map

## Sync Hooks

### New file: `src/collections/hooks/syncArtistRepertoire.ts`

Mirrors `syncArtistProjects.ts`. Wired into Repertoire collection `afterChange` and `afterDelete`.

Behavior:

- **`afterChange`:** diff `artists` (previous vs current). For each added artist, append this repertoire doc's
  ID to the artist's `repertoire` array (if not present). For each removed artist, remove the ID.
- **`afterDelete`:** remove this doc's ID from every artist that still references it.
- Context flag `req.context.syncingRepertoire` prevents infinite loops.
- **Drafts:** Repertoire collection has no versions/drafts, so no `_status` draft-skip is needed (unlike the
  projects hook). No draft handling required.
- Batched `find` + `Promise.all` updates (per projects implementation learnings) to avoid N+1.
- Reuse `extractIds()` helper for ID/object relationship handling.
- Errors logged, never block the repertoire save/delete.

## Frontend Changes

### `src/services/artist.ts`

Add manual repertoire population to `getArtistBySlug`, mirroring the existing projects population (lines 60-78):

- Collect `artist.repertoire` IDs (handling `number` vs populated-object refs)
- Query the `repertoire` collection with `where: { id: { in: ids } }`, `depth: 1`
- Rebuild `artist.repertoire` in the original array order via a Map (Payload does not preserve `id in [...]`
  query order)
- Document the performance trade-off in JSDoc (2 queries vs 1)

### `src/components/Artist/ArtistTabs.tsx`

- Remove the `fetchRepertoiresByArtist` server-action import, the repertoire state, and the lazy-fetch effect
- Pass `artist.repertoire` (populated `Repertoire[]`) directly to `RepertoireTab` with `loading={false}` (data is
  pre-loaded, so it renders immediately)

### `src/components/Artist/ArtistTabContent.tsx`

`RepertoireTab` UI unchanged — toggle group + content. Order now derives from the CMS array order. No code
change needed beyond prop typing.

### `src/actions/repertoires.ts`

Delete `fetchRepertoiresByArtist` and its spec — only caller is `ArtistTabs`, which no longer uses it.

## Data Backfill

### Script: `scripts/db/backfillArtistRepertoire.ts` (permanent, JSDoc'd)

Idempotent Local API script, run after the migration:

1. `payload.find` all repertoire docs (`limit: 1000`)
2. Build a map of `artistId → repertoire IDs` from each doc's `artists` relationship
3. For each artist, update `repertoire` to the current array ∪ new IDs (append, no duplicates)
4. Log progress; exit 0

Run against dev first, then prod via the `.env` swap workflow (data script, not a migration — the swap is
appropriate here). Initial order is arbitrary; editors reorder afterward via drag-and-drop.

## Edge Cases & Error Handling

- **Shared docs / duos:** each artist's array is independent → per-artist order works
- **Empty array:** artist with no repertoire → existing empty-state message shows
- **Repertoire deleted:** `afterDelete` removes its ID from all artists' arrays
- **Order preservation:** manual map-based reorder in `getArtistBySlug` (Payload does not preserve `id in`
  query order)
- **Duplicate prevention:** check before appending in both hook and backfill
- **Loop prevention:** context flag on sync hook
- **Rollback:** revert collection configs, run migration `down`; arrays rebuildable from collection docs

## Testing

### Unit tests (mirror the projects suite, ~26 tests)

- `src/collections/hooks/syncArtistRepertoire.spec.ts`:
  - added artist → append; removed artist → remove; batch query behavior; parallel updates; loop prevention;
    error handling; null/empty arrays; duplicates; missing previousDoc; **afterDelete** removes doc from all
    artists referencing it; afterDelete loop-prevention; afterDelete error handling
- `src/services/artist.spec.ts`: repertoire population preserves order; handles ID vs object refs
- `src/components/Artist/ArtistTabs.spec.tsx`: remove `fetchRepertoiresByArtist` mock; verify repertoire
  renders from `artist.repertoire` prop

### Manual checklist

- Create new repertoire doc, link artist → verify auto-added to artist's repertoire array
- Reorder via drag-and-drop → verify order persists on detail page
- Unlink artist from repertoire → verify removed from array
- Link same repertoire to 2 artists → verify each can have different order
- Try adding 6th section → verify validation error
- Delete repertoire doc → verify removed from all artists' arrays
- Run backfill script → verify existing relationships populated
- Verify frontend shows sections in custom order

## Verification Commands

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm format`

## Deployment Steps

1. Delete stale snapshot `20260310_203659.json`; run `pnpm payload migrate:create baseline`; delete the generated
   baseline `.ts` but keep the fresh `.json` — **must run before any schema edit** so the baseline captures the
   current schema
2. Edit `Artists.ts` (repertoire → relationship), delete `RepertoireRowLabel.tsx`, and add `syncArtistRepertoire`
   to Repertoire collection
3. `pnpm payload generate:types` + `pnpm payload generate:importmap` to refresh types and admin import map
4. Start dev server, accept dev schema push (dev DB only), verify repertoire relationship field in admin
5. Run `pnpm payload migrate:create artist-repertoire-ordering` (diffs fresh baseline snapshot vs new config)
6. Review generated migration SQL (expected changes above); commit the migration file
7. Run backfill on dev: `pnpm tsx scripts/db/backfillArtistRepertoire.ts --apply`
8. Update frontend (`getArtistBySlug`, `ArtistTabs`, delete `actions/repertoires.ts`)
9. Add `build:ci` script to `package.json` (`pnpm migrate && pnpm build`) and `vercel.json`
   (`buildCommand: pnpm run build:ci`) — **note:** `pnpm ci` is a reserved pnpm built-in (clean install); a custom
   script named `ci` would never run
10. Tests, lint, build, format
11. One-time prod prep: **Turso CLI full backup first** (`turso db export ksschoerke-production`, before any
    `.env` change), then **test the migration against a local copy of the snapshot** (up + down + verify data
    preserved), then delete the `dev` marker row from prod `payload_migrations` (`.env` swap + approval) so
    `build:ci` migrate runs non-interactively — see "CRITICAL prerequisite" above
12. Deploy to prod — Vercel build runs `pnpm migrate` against prod first, then builds
13. Run backfill against prod via Local API script (after deploy, once prod schema migrated)


## Future Enhancements

- Wire `prodMigrations` into the sqlite adapter as an alternative to the `build:ci` script (only for long-running
  servers; docs warn it slows serverless cold starts, so not recommended for Vercel)
- Show section count badge in admin list view

---

**Implementation:** Next step is the writing-plans skill to produce the implementation plan.
