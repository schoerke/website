# Artist Repertoire Ordering Design

**Date:** 2026-08-15
**Status:** Approved
**Context:** Client request for per-artist ordering of repertoire sections on artist detail pages, using
drag-and-drop in the Payload admin.

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

**Concern:** Changing the schema in dev auto-pushes to whatever DB `.env` points at. Prod never auto-pushes
(Payload only runs migrations in prod when `prodMigrations` is wired into the adapter — it is not configured in
this project). The migration-file workflow is not yet used in this project.

**Chosen workflow — Payload migration files:**

1. Edit `src/collections/Artists.ts` (`repertoire` array → relationship). Do **not** start the dev server
   (that would auto-push).
2. Generate a migration file (reads config, diffs against last snapshot, writes `.ts` + `.json`, **no DB
   writes**):
   ```bash
   pnpm payload migrate:create artist-repertoire-ordering
   ```
3. Review the generated SQL in `src/migrations/<timestamp>.ts`. Expected changes:
   - Drop `artists_repertoire` and `artists_repertoire_locales` (empty tables — zero data affected)
   - Create the relationship rows (`artists_rels` path `repertoire`) mechanism
   - `down()` must reverse the changes
4. Apply to **dev** (`.env` already points at remote dev DB):
   ```bash
   pnpm payload migrate
   ```
5. Run the backfill script (Local API, idempotent — reverses `repertoire.artists` → `artist.repertoire`
   arrays). See "Data Backfill" below.
6. For **prod**: follow the `.env` swap workflow (comment dev DB values, uncomment prod values), run
   `pnpm payload migrate`, then restore `.env` to dev. Never leave `.env` pointed at prod.

**Why low risk:**

- The array tables being dropped are empty (verified)
- Backfill reads existing data, transforms nothing destructively, and is idempotent
- Repertoire collection stays untouched and remains source of truth; `artist.repertoire` arrays are pure
  presentation ordering and can be rebuilt at any time
- Rollback = revert config + `payload migrate` down

**DB protection policy:** migration creation is read-only; applying migrations and backfill require explicit
user confirmation and DB environment verification per AGENTS.md.

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

1. Edit `Artists.ts` (repertoire → relationship) and add `syncArtistRepertoire` to Repertoire collection
2. `pnpm payload generate:types` to refresh types
3. `pnpm payload migrate:create artist-repertoire-ordering`
4. Review generated SQL
5. Apply to dev: `pnpm payload migrate` (`.env` → dev)
6. Run backfill on dev: `pnpm tsx scripts/db/backfillArtistRepertoire.ts`
7. Update frontend (`getArtistBySlug`, `ArtistTabs`, delete `actions/repertoires.ts`)
8. Tests, lint, build, format
9. Deploy to staging/prod; run migration + backfill against prod via `.env` swap
10. Restore `.env` to dev; verify with `grep DATABASE_URI .env`

## Future Enhancements

- Wire `prodMigrations` into the sqlite adapter so prod deploys auto-run migrations
- Show section count badge in admin list view

---

**Implementation:** Next step is the writing-plans skill to produce the implementation plan.
