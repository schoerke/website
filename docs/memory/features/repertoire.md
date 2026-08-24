# Repertoire Feature

Feature fact sheet: what was built for the Repertoire feature. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §3.

---

## What Was Built (2026-08-15)

- `artist.repertoire`: changed from an **unused array field** to a **relationship** → `repertoire` collection
  (`hasMany`, `maxRows: 5`). Drag-and-drop ordering in admin.
- `artist.repertoire` is **order-only**: reorder allowed; add/remove from the artist side is **blocked
  server-side** (`src/collections/hooks/enforceRepertoireOrderOnly.ts`) with a clear error toast. Link/unlink
  happens on the **Repertoire doc's `artists` field** (source of truth).
- Sync hooks on Repertoire (`syncArtistRepertoire`, `syncArtistRepertoireOnDelete`) mirror links into each
  artist's array. They pass `context: { syncingRepertoire: true }` to nested updates so the order-only guard
  doesn't block legitimate sync removals.
- `Repertoire.artists` field has a `validate` that rejects linking an artist already at 5 lists (message:
  `"{name}" already has 5 repertoire lists. Remove a list before adding more.`).
- Migration: `src/migrations/20260815_125014_artist_repertoire_ordering.ts` (idempotent — see docs/memory/migrations.md).
- Backfill script: `scripts/db/backfillArtistRepertoire.ts` (dry-run default; `--apply` to write; guarded).
