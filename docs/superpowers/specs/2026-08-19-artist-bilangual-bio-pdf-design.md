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
3. No fallback: if a locale has no PDF, that locale shows no bio-PDF link.
4. Gallery ZIP download is unchanged (single, non-localized).
5. **No data loss in the migration.** Existing `biographyPDF` values must be preserved.

## Decisions

### Field model: localized field (not two fields)

Use a single localized upload field `downloads.biographyPdf`, `localized: true`. Rationale:

- The bio PDF is content varying by language. Payload's localization model is the semantically correct fit.
- Site config already `locales: ['de','en']`, `defaultLocale: 'de'`, `fallback: false`. With `fallback: false`,
  a locale with no value returns `null` — this satisfies the "no fallback" requirement for free.
- Matches how `biography` (richText) and `quote` already work in the same Biography tab: one field, edited
  per-locale via the admin locale switcher.
- No manual `if (locale)` branching in the frontend; `getArtistBySlug(slug, locale)` already returns
  locale-resolved data, so `downloads.biographyPdf` is already the correct locale's PDF.

### Naming

Rename field `biographyPDF` → `biographyPdf`. Note: Payload's snake_case differs (`biographyPDF` →
`..._biography_p_d_f_id` vs `biographyPdf` → `..._biography_pdf_id`), but because this becomes a **localized**
field living in `artists_locales`, the migration **moves** data (not renames in place), so exact column names
are read, not assumed — see Migration.

## Artifacts Changed

### Schema

`src/collections/Artists.ts` — in the `downloads` group:

- `biographyPDF` → `biographyPdf`, add `localized: true`, keep `type: 'upload'`, `relationTo: 'documents'`.
- `galleryZIP` unchanged (remains non-localized).

### Generated files (keep in sync per `docs/patterns/payload.md`)

- `src/payload-types.ts` — `pnpm payload generate:types`
- `src/payload-generated-schema.ts` — `pnpm payload generate:db-schema`
- `src/app/(payload)/admin/importMap.js` — only if admin components change (not expected)

### Frontend

`src/components/ArtistLinks/ArtistLinksDownloads.tsx`:

- Currently reads `downloads.biographyPDF` and renders a single "Biography PDF" link.
- After change: reads `downloads.biographyPdf`. Value is already locale-resolved; no manual locale branch.
- Field name update in the typed `downloads` interface and the `getDocumentURL` call.
- Link label unchanged (i18n `downloads.biography`).

`src/components/ArtistLinks/index.tsx`:

- `downloads` prop type: `biographyPDF` → `biographyPdf`. `hasDownloads` references the new name.

`src/app/(frontend)/[locale]/artists/[slug]/page.tsx`:

- Destructures `downloads` and passes through; frontend field name flows from payload-types. No logic change
  expected beyond type propagation.

`src/payload-types.ts` consumers / test fixtures:

- `src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx` — update fixtures and props from `biographyPDF` →
  `biographyPdf`.
- `src/components/ArtistLinks/index.spec.tsx` (if present) and `artist` page tests — update fixture keys.
- `src/components/Artist/ArtistGrid.spec.tsx` — `downloads: undefined` fixture unaffected.
- `src/i18n/{en,de}.ts` — no change needed (label `downloads.biography` reused).

### Service layer

`src/services/artist.ts` — `getArtistBySlug` uses Payload Local API with `depth`; `downloads` group returns
locale-resolved `biographyPdf`. Verify `depth` populates the upload relationship (should not change — same
`depth` as today). No logic change expected.

## Migration (zero data loss)

### Context

`biographyPDF` is currently a **non-localized** simple upload stored as a column on the `artists` parent table
(`artists.downloads_biography_p_d_f_id`, FK to `documents`).

Making it **localized** moves its storage into the `artists_locales` table as a per-locale column
(`_locale`, `_parent_id`), per Payload's SQLite storage model. Existing values live on the parent `artists`
table column and must be copied to the `de` locale rows in `artists_locales` before the old column is dropped.

Per Payload docs, converting an existing field to localized changes its data structure and can lose data unless
handled — this is exactly why the migration is authored carefully below.

### Steps to build the migration

1. **Make the schema change** in `Artists.ts` (field rename + `localized: true`).
2. **Run `pnpm payload migrate:create add-bilingual-bio-pdf`** against **dev** to generate a starter migration.
   Do NOT apply it.
3. **Inspect** the generated `up()`/`down()`. Determine the exact target column Payload expects for the
   localized field in `artists_locales` (e.g. `downloads_biography_pdf_id` vs `downloads_biography_p_d_f_id`).
   Also confirm the generated migration does NOT silently drop data.
4. **Rewrite the migration** as a hand-authored idempotent migration (mirroring
   `20260815_125014_artist_repertoire_ordering.ts`), with explicit guards and verification.

### Migration `up()`

Idempotency guard: if the localized column already exists in `artists_locales`, no-op (use
`pragma_table_info('artists_locales')`).

1. **Snapshot totals** for assertion: count artists where `artists.downloads_biography_p_d_f_id IS NOT NULL`.
2. **Add** the localized column to `artists_locales`:
   `ALTER TABLE artists_locales ADD COLUMN <target_col> integer` (if not present).
3. **Copy** each artist's existing value into its `de` locale row:
   - For artists that already have an `artists_locales` row with `_locale='de'`, `UPDATE` that row's
     `<target_col>` from `artists.downloads_biography_p_d_f_id`.
   - For artists with no `_locale='de'` row, `INSERT` a row `(_parent_id, _locale='de', <target_col>)`.
   - Only copy rows where the source value is `NOT NULL`.
4. **Verify**: assert copied count equals snapshot count from step 1. On mismatch, throw — abort before any
   destructive step.
5. **Drop** the old parent column: `ALTER TABLE artists DROP COLUMN downloads_biography_p_d_f_id`.
6. Recreate the FK from `artists_locales.<target_col>` → `documents(id)` if Payload's schema requires it
   (verify against `payload-generated-schema.ts`).

### Migration `down()`

Idempotency guard on the inverted condition.

1. **Add** `artists.downloads_biography_p_d_f_id` column back (if absent).
2. **Copy** `de` locale values back: for each `artists_locales` row with `_locale='de'` and
   `<target_col> NOT NULL`, set `artists.downloads_biography_p_d_f_id`.
3. **Verify** count, then **drop** the localized column from `artists_locales`.

### Zero-data-loss verification procedure

1. **Export a prod snapshot**: `turso db export ksschoerke-production --output-file data/dumps/pre-bio-pdf.db`
   (approval required per `opencode.json`).
2. **Dry-run the migration on the snapshot** locally with `sqlite3` or a scratch script: apply `up()`, then
   assert every artist's original `biographyPDF` document id appears for the `de` locale in
   `artists_locales`, and that no rows went missing.
3. Confirm the migrated counts match the pre-migration snapshot counts exactly.
4. Only after the dry-run passes and is user-approved, run `pnpm migrate` to apply to prod
   (requires explicit approval per AGENTS.md).

## Error Handling

- Migration is idempotent (safe to re-run on every Vercel build, including previews).
- Verification steps throw on count mismatch before any destructive column drop, so a bad migration fails
  closed rather than losing data.

## Testing

- Update `ArtistLinksDownloads.spec.tsx` fixtures: `biographyPdf` instead of `biographyPDF`; assert the link
  renders from the locale-resolved value.
- Update serialized artist fixtures / page tests for the renamed field.
- Verify `biographyPdf` returns `null` when a locale has no value (no-fallback).
- Run `pnpm lint`, `pnpm build` (verify migration idempotency via build:ci path), `pnpm test`.

## Out of Scope

- Changing gallery ZIP behavior.
- Adding localization to other download fields.
- Frontend locale-switching UI (the locale is already the page locale; data resolves via Payload locale).
