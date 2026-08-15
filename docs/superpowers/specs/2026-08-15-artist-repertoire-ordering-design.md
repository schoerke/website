# Artist Repertoire Ordering Design

**Date:** 2026-08-15
**Status:** Approved
**Context:** Client request for per-artist ordering of repertoire sections on artist detail pages, using
drag-and-drop in the Payload admin. Also introduces a migrations-only database workflow (`push: false`) —
schema changes flow through migration files instead of Payload's dev auto-push.

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

**Decision: Migrations-only everywhere.** Disable Payload's dev auto-push so all schema changes flow through
migration files, in dev and prod alike.

### Why this is safe and documented

Payload's sqlite adapter supports `push: false` to disable the dev schema push
(`node_modules/@payloadcms/db-sqlite/dist/connect.js` skips `pushDevSchema` when `this.push !== false`).
Payload docs recommend this for SQLite: *"You can disable `db push` and rely solely on migrations to keep your
local database in sync with your Payload Config. In SQLite, migrations are a fundamental aspect of working with
Payload."* The prod behavior is unchanged (Payload never auto-pushes in production regardless).

### Config change: `src/payload.config.ts`

```typescript
db: sqliteAdapter({
  client: {
    url: process.env.DATABASE_URI,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
  push: false, // Schema changes only via migrations, dev and prod alike
}),
```

**Effects:**

- Dev server no longer auto-migrates. Every schema change requires: `migrate:create` → review SQL → `migrate`
- The `dev` `batch:-1` row (recorded by past auto-pushes in `payload_migrations`) stops being created, so the
  "data loss will occur" warning no longer appears on future `migrate` runs. The existing `batch:-1` row
  remains in the dev DB (harmless — warning shows once on first `migrate` run).
- **Caveat:** a schema change you forget to migrate surfaces as a runtime DB error on dev server start until you
  run `pnpm payload migrate`.

### Migration files in this project today

- `src/migrations/index.ts` exports an empty `migrations` array — no migration workflow has been used.
- `src/migrations/20260310_203659.json` is a **stale** schema snapshot (March 2026): it still contains `issues`,
  `images`, `home_page`, `artists_discography`, `artists_youtube_links`. The current schema has since renamed
  collections/tables (e.g., `images` → `media`, `youtubeLinks` → `videoLinks`). The generated schema file
  `src/payload-generated-schema.ts` is also stale (its `artists_rels` only lists `employeesID`, but the live DB
  also has `posts_id`).
- Because the snapshot is stale, `pnpm payload migrate:create` would diff March's schema against the current
  config and generate a **giant, unrelated migration**. **Do not use `migrate:create` for this change.**

### Chosen workflow — hand-written migration file

1. Write the migration file by hand in `src/migrations/<timestamp>-artist-repertoire-ordering.ts` using the
   `up()`/`down()` SQL pattern documented in AGENTS.md ("Payload CMS + SQLite: How Array Field Renames Work").
   No DB writes during authoring.
2. Review the SQL (below).
3. Apply to **dev** (`.env` already points at remote dev DB):
   ```bash
   pnpm payload migrate
   ```
4. Run the backfill script (Local API, idempotent — reverses `repertoire.artists` → `artist.repertoire`
   arrays). See "Data Backfill" below.
5. For **prod**: follow the `.env` swap workflow (comment dev DB values, uncomment prod values), run
   `pnpm payload migrate`, then restore `.env` to dev. Never leave `.env` pointed at prod.
6. Replace the stale `20260310_203659.json` snapshot with a fresh one generated from the current schema so
   future `migrate:create` calls diff correctly (see Task in plan).

### Expected SQL in the migration

Verified against the live dev DB (`PRAGMA` + schema reads):

**Up:**

- Add `repertoire_id` column to `artists_rels` (relationships store one FK column per related collection in
  the shared `_rels` table):
  ```sql
  ALTER TABLE artists_rels ADD COLUMN repertoire_id integer;
  CREATE INDEX artists_rels_repertoire_id_idx ON artists_rels (repertoire_id);
  ```
  Foreign key addition on SQLite requires table recreation — instead, rely on Payload's own FK management on
  next connection, OR recreate the `artists_rels` table with the FK. **Plan step will detail the exact SQL**
  (the adapter's generated migration for `projects`/`employees` shows the FK pattern: `repertoire_id` →
  `repertoire.id`, `ON DELETE CASCADE`).
- Drop the two empty array tables (zero data — verified 0 rows in dev):
  ```sql
  DROP TABLE artists_repertoire_locales;
  DROP TABLE artists_repertoire;
  ```

**Down:**

- Recreate `artists_repertoire` and `artists_repertoire_locales` (schema copied from
  `src/payload-generated-schema.ts` lines 53-88)
- Drop `repertoire_id` from `artists_rels`

### Why low risk

- The array tables being dropped are empty (verified 0 rows)
- Backfill reads existing data, transforms nothing destructively, and is idempotent
- Repertoire collection stays untouched and remains source of truth; `artist.repertoire` arrays are pure
  presentation ordering and can be rebuilt at any time
- Rollback = revert config + `payload migrate` down
- No more surprise auto-pushes in dev — migrations are explicit and reviewed

**DB protection policy:** authoring migration files is read-only; applying migrations and running the backfill
require explicit user confirmation and DB environment verification per AGENTS.md.

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

## Sync Hooks

### New file: `src/collections/hooks/syncArtistRepertoire.ts`

Mirrors `syncArtistProjects.ts`. Wired into Repertoire collection `afterChange` and `afterDelete`.

Behavior:

- **`afterChange`:** diff `artists` (previous vs current). For each added artist, append this repertoire doc's
  ID to the artist's `repertoire` array (if not present). For each removed artist, remove the ID.
- **`afterDelete`:** remove this doc's ID from every artist that still references it.
- Context flag `req.context.syncingRepertoire` prevents infinite loops.
- Skip drafts (defense-in-depth; Repertoire currently has no drafts).
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
- Pass `artist.repertoire` (populated `Repertoire[]`) directly to `RepertoireTab`
- Keep the loading prop path as a fallback (already has data, so it renders immediately)

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

Run against dev first, then prod via the `.env` swap workflow. Initial order is arbitrary; editors reorder
afterward via drag-and-drop.

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

### Unit tests (mirror the projects suite, ~24 tests)

- `src/collections/hooks/syncArtistRepertoire.spec.ts`:
  - added artist → append; removed artist → remove; batch query behavior; parallel updates; loop prevention;
    draft handling; error handling; null/empty arrays; duplicates; afterDelete behavior
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

1. Add `push: false` to the sqlite adapter in `src/payload.config.ts` (migrations-only workflow)
2. Edit `Artists.ts` (repertoire → relationship) and add `syncArtistRepertoire` to Repertoire collection
3. `pnpm payload generate:types` to refresh types
4. Write the hand-crafted migration file (see "Expected SQL in the migration" above) — **not** `migrate:create`
   (stale snapshot would generate unrelated changes)
5. Review migration SQL; run `pnpm payload migrate` against dev (`.env` → dev)
6. Run backfill on dev: `pnpm tsx scripts/db/backfillArtistRepertoire.ts`
7. Replace stale snapshot `20260310_203659.json` with fresh one so future `migrate:create` diffs correctly
8. Update frontend (`getArtistBySlug`, `ArtistTabs`, delete `actions/repertoires.ts`)
9. Tests, lint, build, format
10. Deploy to staging/prod; run migration + backfill against prod via `.env` swap
11. Restore `.env` to dev; verify with `grep DATABASE_URI .env`

## Future Enhancements

- Wire `prodMigrations` into the sqlite adapter so prod deploys auto-run migrations
- Show section count badge in admin list view

---

**Implementation:** Next step is the writing-plans skill to produce the implementation plan.
