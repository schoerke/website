# Artist Bilingual Bio PDF — Design

Date: 2026-08-19

## Goal

Support both a German and an English biography PDF download per artist. Currently the artist has a single
non-localized `biographyPDF` upload inside the `downloads` group. We need de/en PDFs while keeping the
gallery ZIP download unchanged.

## Requirements

1. Artists can upload an English bio PDF and a German bio PDF.
2. The public artist page shows the bio PDF matching the visitor's locale: German site → German PDF, English
   site → English PDF.
3. **Fallback to German.** If a locale has no PDF, fall back to `de` (site config `defaultLocale: 'de'`,
   `fallback: false`, but the service explicitly passes `fallbackLocale: 'de'`). If no locale has a PDF, show
   no bio-PDF link. (User decision: keep the existing `fallbackLocale: 'de'` behavior — see "Fallback" below.)
4. Gallery ZIP download is unchanged (single, non-localized).
5. **No data loss in the migration.** Existing `biographyPDF` values must be preserved.

## Decisions

### Field model: localized field (not two fields)

Use a single localized upload field `downloads.biographyPdf`, `localized: true`. Rationale:

- The bio PDF is content varying by language. Payload's localization model is the semantically correct fit.
- Matches how `biography` (richText) and `quote` already work in the same Biography tab: one field, edited
  per-locale via the admin locale switcher.
- No manual `if (locale)` branching in the frontend; `getArtistBySlug(slug, locale)` already returns
  locale-resolved data, so `downloads.biographyPdf` is already the correct locale's PDF (subject to fallback
  below).

### Fallback (resolved product decision — REVISED from earlier draft)

The spec originally claimed `fallback: false` gives "no fallback" for free. **That is incorrect.** While the
config sets `fallback: false`, the artist service `src/services/artist.ts` passes `fallbackLocale: 'de'` on
every `payload.find`/`findByID` call (GetArtistBySlug, GetArtistListData). In Payload's `afterRead`, a
localized field with no value in the requested locale hoists the `fallbackLocale` value (including `upload`
fields). Therefore:

- English page, no English PDF → `downloads.biographyPdf` resolves to the **German** PDF id (not `null`).
- English page, no PDF at all (no de OR en) → `null` (no link).

**Decision (user-approved): keep the existing `fallbackLocale: 'de'`.** This is Option B — the German PDF acts
as the fallback for English visitors. No change to `getArtistBySlug`. The single-link UI therefore needs no
de/en-disambiguated labels (only one link ever renders).

**Consequences to note:**
- Gallery ZIP unchanged (non-localized, always shows).
- Because the en fallback shows the de PDF, there is **no en-site link regression** for the existing data
  (the old single PDF becomes the de PDF and is still reachable on both locales via fallback).

### Naming

Rename field `biographyPDF` → `biographyPdf`. Note: Payload's snake_case differs (`biographyPDF` →
`..._biography_p_d_f_id` vs `biographyPdf` → `..._biography_pdf_id`), but because this becomes a **localized**
field living in `artists_locales`, the migration **moves** data (not renames in place), so exact column names
are read from the regenerated schema, not assumed — see Migration.

## Artifacts Changed

### Schema

`src/collections/Artists.ts` — in the `downloads` group:

- `biographyPDF` → `biographyPdf`, add `localized: true`, keep `type: 'upload'`, `relationTo: 'documents'`.
- `galleryZIP` unchanged (remains non-localized).

Note: the `Artists` collection has **no versions/draft block** → there are no `_artists_v` /
`_artists_v_locales` tables to migrate. Versions are out of scope (confirmed in `payload-generated-schema.ts`).

### Generated files (keep in sync per `docs/patterns/payload.md`)

- `src/payload-types.ts` — `pnpm payload generate:types`
- `src/payload-generated-schema.ts` — `pnpm payload generate:db-schema`
- `src/app/(payload)/admin/importMap.js` — only if admin components change (not expected)

### Frontend

`src/components/ArtistLinks/ArtistLinksDownloads.tsx`:

- Reads `downloads.biographyPdf` (was `biographyPDF`). Value is already locale-resolved by the service
  (including fallback); no manual locale branch. Single link label unchanged (i18n `downloads.biography`).

`src/components/ArtistLinks/index.tsx`:

- `downloads` prop type: `biographyPDF` → `biographyPdf`. `hasDownloads` references the new name.

`src/app/(frontend)/[locale]/artists/[slug]/page.tsx`:

- Passes `downloads` through; field name flows from `payload-types`. No logic change beyond type propagation.

Test fixtures / payload-types consumers:

- `src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx` — fixtures and props `biographyPDF` →
  `biographyPdf`.
- `src/components/Artist/ArtistGrid.spec.tsx` — `downloads: undefined` fixture unaffected.
- `src/i18n/{en,de}.ts` — no change (label `downloads.biography` reused).

### Services

`src/services/artist.ts` — no logic change. `getArtistBySlug` already returns `downloads` with `depth`
(relationship populated) and `fallbackLocale: 'de'`; the renamed field flows through types. **Verify** `depth`
still populates the upload relationship for `biographyPdf` (same `depth` as today).

### Out-of-scope / historical references to `biographyPDF` (do NOT update)

These reference the removed field name but are one-time/historical tooling, out of scope for this change:

- `scripts/wordpress/migrateArtists.ts`, `scripts/wordpress/utils/extractMediaUrls.ts`,
  `scripts/wordpress/data/media-urls.json` (one-time WP import).
- `scripts/db/json/artists.json` (fixture dump).

If the WP import is ever re-run against the new schema it would target a removed field — flag in the plan to
prevent a future surprise, but do not migrate these here.

## Migration (zero data loss)

### Context

`biographyPDF` is currently a **non-localized** simple upload stored as a column on the `artists` parent table
(`artists.downloads_biography_p_d_f_id`, FK to `documents`).

Making it **localized** moves its storage into the `artists_locales` table as a per-locale column
(`_locale`, `_parent_id`). Existing values are copied from `artists` into the `de` locale rows before the old
column is dropped. Per Payload docs, converting an existing field to localized changes its data structure and
can lose data unless handled — the migration below handles it.

**Storage location of the actual PDF files:** PDFs/ZIPs live in **Cloudflare R2** (Documents collection uses
`s3Storage`; DB stores only document metadata + R2 object key). The migration moves **references (ids)**
between DB tables and never touches R2 objects, so the file chain (artist → document id → R2 key) is preserved
intact. A DB backup is sufficient to verify reference integrity; backing up R2 objects is not required for this
migration's safety (they are never modified/deleted/re-pointed).

### Steps to build the migration

1. Make the schema change in `Artists.ts` (field rename + `localized: true`).
2. Run `pnpm payload migrate:create add-bilingual-bio-pdf` against **dev** to generate a starter migration. Do
   NOT apply it.
3. Run `pnpm payload generate:db-schema` and **diff** the `artists_locales` definition to capture the exact
   target column name, index name, and FK name Payload expects for the localized field (e.g.
   `downloads_biography_pdf_id` vs `..._p_d_f_id`). Use these **exact names** in the hand migration.
4. **Rewrite** the generated migration as a hand-authored idempotent migration (mirroring
   `20260815_125014_artist_repertoire_ordering.ts`) with explicit guards and verification. Do NOT leave the
   auto-generated migration in place to also run.

### Migration `up()`

Idempotency guard: key on the **concrete target column** existing in `artists_locales` (via
`pragma_table_info('artists_locales')`), not on generic existence. If present, no-op. This is the plain
"column exists" guard (Option A), matching the established `20260815_125014_artist_repertoire_ordering.ts`
idiom.

### Non-transactional + residual-risk note (Option A)

The migration is **NOT transactional** — `sqliteAdapter` has no `transactionOptions`, so statements autocommit
(`PRAGMA foreign_keys` toggling works precisely because there is no transaction). We deliberately ship a **plain
"column exists" idempotency guard** (not a resumption state machine). This is a conscious trade: a mid-flight
failure could leave the migration stuck (localized column present but copy/recreate incomplete, or a `DROP
artists` without the subsequent `RENAME`). Residual failure-window risk is accepted because:

- The SQL was verified line-by-line against `payload-generated-schema.ts` and validated end-to-end via a **real
  Payload dry-run** (`payload migrate`) against a copy of the prod snapshot (23 bio PDFs preserved 1:1,
  gallery kept, de/en fallback correct) before this spec was finalized.
- A pre-migration prod snapshot (`data/dumps/pre-bio-pdf.db`) is retained; a stuck/failed migration is
  recoverable from it (re-run or manual fix), not unrecoverable.
- The success path is what ships to prod; failure windows are exceptional.

The count-verification throws before any destructive step regardless of the guard.

1. **Snapshot totals** for assertion: count artists where `artists.downloads_biography_p_d_f_id IS NOT NULL`.
2. **Add** the localized column to `artists_locales` (if not present):
   `ALTER TABLE artists_locales ADD COLUMN <target_col> integer`.
3. **Copy** each artist's existing value into its `de` locale row using an **atomic upsert** (do not hand-roll
   UPDATE/INSERT — `artists_locales.biography` is `NOT NULL`, so an INSERT branch must also supply `biography`;
   the unique `(_locale, _parent_id)` constraint makes `ON CONFLICT` correct):
   ```sql
   INSERT INTO artists_locales (_parent_id, _locale, <target_col>, biography)
   SELECT id, 'de', downloads_biography_p_d_f_id, <coalesced biography>
   FROM artists
   WHERE downloads_biography_p_d_f_id IS NOT NULL
   ON CONFLICT (_locale, _parent_id) DO UPDATE SET <target_col> = excluded.<target_col>;
   ```
   Do NOT bind `artists.id` into `artists_locales.id` — leave `id` to SQLite rowid auto-assign (the locales
   `id` is its own `integer PRIMARY KEY`).
4. **Verify**: assert copied count equals snapshot count from step 1. On mismatch, throw — abort before any
   destructive step.
5. **Drop** the old column **by table-recreate**, NOT `DROP COLUMN`. SQLite forbids `ALTER TABLE ... DROP
   COLUMN` when the column participates in a foreign key (`error: unknown column in foreign key definition`),
   and `PRAGMA foreign_keys=OFF` is a no-op inside the migrator transaction. Mirror the reference migration:
   create `__new_artists`, `INSERT ... SELECT` preserving every other column (`image`, `slug`,
   `downloads_gallery_z_i_p_id`, all URL columns, `updated_at`, `created_at`), drop old table, rename. Preserve
   all indexes (`artists_image_idx`, `artists_downloads_downloads_gallery_z_i_p_idx`, name/slug unique
   indexes) and the remaining FKs (`image_id_images_id_fk`, `downloads_gallery_z_i_p_id_documents_id_fk`)
   minus the removed bio PDF FK.
6. Recreate the FK from `artists_locales.<target_col>` → `documents(id)` if `payload-generated-schema.ts`
   requires it (use the exact generated FK name).

### Migration `down()`

Idempotency guard on the inverted condition.

1. Add `artists.downloads_biography_p_d_f_id` column back (via table-recreate if needed).
2. For each `artists_locales` row with `_locale='de'` and `<target_col> NOT NULL`, set
   `artists.downloads_biography_p_d_f_id`.
3. Verify count, then drop the localized column from `artists_locales`.
4. **Recreate the dropped index** `artists_downloads_downloads_biography_p_d_f_idx` and **FK**
   `..._documents_id_fk` so the rolled-back schema matches `payload-generated-schema.ts` (prevents drift
   errors on the next dev schema-push / migration drift-check).
5. **Accepted rollback data-loss note:** if an artist gained a separate English PDF after migration, `down()`
   copies only `de` back into the single parent column; the `en` id is dropped (inherent single-column
   rollback). State this as accepted so it is not a surprise during an incident.

### Zero-data-loss verification procedure

1. **Export a prod snapshot**: `turso db export ksschoerke-production --output-file data/dumps/pre-bio-pdf.db`
   (approval required per `opencode.json`).
2. **Dry-run the migration on the snapshot** locally (via `sqlite3` on the exported `.db`): apply the schema
   change + `up()`, then assert every artist's original `biographyPDF` document id appears for the `de` locale
   in `artists_locales`, and that no rows went missing.
3. Confirm migrated counts match the pre-migration snapshot counts exactly (including matching every document
   id 1:1 — not just count equality).
4. Only after the dry-run passes and is user-approved, run `pnpm migrate` to apply to prod (requires explicit
   approval per AGENTS.md).

## Error Handling

- Migration is idempotent via a plain "localized column exists" guard (Option A — safe to re-run on every
  Vercel build; a completed migration is a no-op). A mid-flight failure could leave a partial/stuck state, but
  that is accepted and recoverable from the pre-migration prod snapshot; see "Non-transactional + residual-risk
  note" above.
- Verification throws on count/id mismatch before any destructive step.
- **No transaction rollback** (SQLite adapter has no `transactionOptions`) — correctness relies on the
  count-verification + the pre-migration prod snapshot for recovery, not on atomic rollback.
- `PRAGMA foreign_keys=OFF` toggling is permitted here (no active transaction, matching the reference
  migration), but the table-recreate preserves FK integrity structurally regardless of the pragma.

## Testing

- Update `ArtistLinksDownloads.spec.tsx` fixtures: `biographyPdf` instead of `biographyPDF`; assert the link
  renders from the locale-resolved value. (No component-level fallback test is added — the component has no
  locale/fallback logic; fallback resolution lives in the service and is covered by `src/services/artist.spec.ts`.)
- Verify fallback via the service (already covered): an English artist with only a `de` PDF resolves
  `biographyPdf` to the German document; an artist with no PDF at all → no link.
- Run `pnpm lint`, `pnpm build` (verify migration idempotency via the build:ci path), `pnpm test`.

## Out of Scope

- Changing gallery ZIP behavior or localizing other download fields.
- Frontend locale-switching UI (data resolves via the service + fallback).
- Updating historical WP-import scripts / fixture dumps that reference `biographyPDF` (documented above).
- Backing up R2 objects (not required; migration never touches files).
