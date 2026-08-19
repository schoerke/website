# Artist Bilingual Bio PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Convert the artist's single non-localized `biographyPDF` upload into a localized `biographyPdf`
upload (de/en) without losing any existing data, wiring the frontend to the renamed field.

**Architecture:** Make `downloads.biographyPdf` localized in the `artists` collection. The frontend
(`ArtistLinksDownloads`) reads the already locale-resolved `biographyPdf` (service `getArtistBySlug` keeps its
`fallbackLocale: 'de'`, so English falls back to the German PDF). A hand-authored idempotent Payload migration
moves existing `artists.downloads_biography_p_d_f_id` values into `artists_locales` `de` rows (via upsert),
verifies counts, then removes the old column by **table-recreate** (SQLite forbids `DROP COLUMN` on an
FK-participating column).

**Tech Stack:** Payload CMS 3.88 + SQLite (Turso), Next.js 16 App Router, Vitest, TypeScript. `@payloadcms/db-sqlite`
migrations, `turso db export` for snapshot verification.

**Spec:** `docs/superpowers/specs/2026-08-19-artist-bilangual-bio-pdf-design.md`

---

## Preconditions & Guardrails (read first)

- **DB protection policy (AGENTS.md):** Tasks tagged **[GATED: DB APPROVAL]** must NOT run without explicit user
  confirmation. These are the schema-push to dev and the prod migration application. Everything else is
  pure code/tests.
- **Nobody re-runs the WP import scripts** (`scripts/wordpress/*`) against the renamed field — they reference
  `biographyPDF` and are historical/out of scope (see spec "Out-of-scope").
- The `Artists` collection has **no versions/draft** tables — no `_artists_v` migration needed.

### File structure

| File | Responsibility | Change |
|------|----------------|--------|
| `src/collections/Artists.ts` | Artist schema | `biographyPDF` → `biographyPdf` + `localized: true` |
| `src/migrations/<new>.ts` | Idempotent data migration | Create (hand-written) |
| `src/migrations/index.ts` | Register migration | Modify |
| `src/payload-types.ts` | Generated types | Regenerate |
| `src/payload-generated-schema.ts` | Generated DB schema | Regenerate (read-only reference for migration) |
| `src/components/ArtistLinks/ArtistLinksDownloads.tsx` | Download links | `biographyPDF` → `biographyPdf` |
| `src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx` | Tests | fixtures rename + new fallback test |
| `src/components/ArtistLinks/index.tsx` | Downloads container | prop type rename |
| `src/services/artist.ts` | Data fetching | No code change (verify depth) |

---

### Task 1: Update the artist schema (rename + localize `biographyPdf`)

**Files:**
- Modify: `src/collections/Artists.ts:228-251` (the `downloads` group)

- [ ] **Step 1: Edit the `downloads` group field**

In `src/collections/Artists.ts`, inside the `downloads` group, change the `biographyPDF` field to:

```ts
{
  name: 'biographyPdf',
  type: 'upload',
  localized: true,
  label: {
    en: 'Biography PDF Download',
    de: 'Biographie PDF Download',
  },
  relationTo: 'documents',
},
```

Leave `galleryZIP` exactly as-is. Result — the whole `downloads` group block:

```ts
{
  name: 'downloads',
  type: 'group',
  fields: [
    {
      name: 'biographyPdf',
      type: 'upload',
      localized: true,
      label: {
        en: 'Biography PDF Download',
        de: 'Biographie PDF Download',
      },
      relationTo: 'documents',
    },
    {
      name: 'galleryZIP',
      type: 'upload',
      label: {
        en: 'Gallery ZIP Download',
        de: 'Galerie ZIP Download',
      },
      relationTo: 'documents',
    },
  ],
},
```

- [ ] **Step 2: Verify no other live code references `biographyPDF`**

Run: `rg -rn "biographyPDF" src/ --glob '!migrations/**' --glob '!payload-generated-schema.ts'`

Expected: the only remaining hits are `src/components/ArtistLinks/ArtistLinksDownloads.tsx`,
`src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx`, `src/components/ArtistLinks/index.tsx` (the three
files Tasks 2–4 modify), plus historical files under `scripts/` (out of scope, leave them).

- [ ] **Step 3: Commit**

```bash
git add src/collections/Artists.ts
git commit -m "feat(artists): localize biographyPdf download field"
```

---

### Task 2: Update `ArtistLinksDownloads`

**Files:**
- Modify: `src/components/ArtistLinks/ArtistLinksDownloads.tsx:7-10, 27`
- Test: `src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx`

- [ ] **Step 1: Rename the prop field**

In `src/components/ArtistLinks/ArtistLinksDownloads.tsx` update the props interface and usage:

```ts
interface ArtistLinksDownloadsProps {
  downloads?: {
    biographyPdf?: Document | number | null
    galleryZIP?: Document | number | null
  }
}
```

and line 27:

```ts
const biographyURL = getDocumentURL(downloads.biographyPdf)
```

- [ ] **Step 2: Update the existing test fixtures and props**

In `src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx`, replace every occurrence of `biographyPDF` with
`biographyPdf` (fixture objects and the props passed to `<ArtistLinksDownloads downloads=...>`). Use
`replaceAll` for the string `biographyPDF` → `biographyPdf`.

- [ ] **Step 3: SKIPPED — do NOT add a "fallback regression" test here**

~~Append this test...~~ **Decision (post-review): skip this test.** `ArtistLinksDownloads` is a pure render
component with **no locale/fallback logic** — it renders whatever `downloads.biographyPdf` it receives. A
"de-fallback" test here would only duplicate the existing "renders only biography link when biographyPdf
exists" test (same assertion body, different fixture values) and falsely imply the component performs fallback.
Fallback actually lives in the service layer (`getArtistBySlug` → `fallbackLocale: 'de'`), which is already
covered by `src/services/artist.spec.ts`. The existing 10 render tests in
`ArtistLinksDownloads.spec.tsx` fully cover the component. Do not add a redundant/mislabeled test.

- [ ] **Step 4: Run the download-links tests**

Run: `pnpm vitest run src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx`
Expected: ALL PASS (including the new fallback test and the renamed fixtures).

- [ ] **Step 5: Commit**

```bash
git add src/components/ArtistLinks/ArtistLinksDownloads.tsx src/components/ArtistLinks/ArtistLinksDownloads.spec.tsx
git commit -m "feat(artists): rename biographyPdf in download links"
```

---

### Task 3: Update `ArtistLinks` container prop type

**Files:**
- Modify: `src/components/ArtistLinks/index.tsx:14-17, 36`

- [ ] **Step 1: Rename the prop type**

In `src/components/ArtistLinks/index.tsx`:

```ts
downloads?: {
  biographyPdf?: Document | number | null
  galleryZIP?: Document | number | null
}
```

and line 36:

```ts
const hasDownloads = Boolean(downloads?.biographyPdf || downloads?.galleryZIP)
```

- [ ] **Step 2: Verify the artist page compiles against the new type**

The page (`src/app/(frontend)/[locale]/artists/[slug]/page.tsx`) just passes `downloads` through — it has no
direct reference to `biographyPDF`, so it type-checks automatically once `payload-types.ts` regenerates
(Task 4).

- [ ] **Step 3: Run typecheck**

Run: `pnpm tsc --noEmit` (or the project's typecheck script)
Expected: no errors referencing `biographyPdf`/`biographyPDF`.

- [ ] **Step 4: Commit**

```bash
git add src/components/ArtistLinks/index.tsx
git commit -m "refactor(artists): rename biographyPdf prop type"
```

---

### Task 4: Generate payload types

**Files:**
- Regenerate: `src/payload-types.ts`
- Regenerate (reference only): `src/payload-generated-schema.ts`

- [ ] **Step 1: Regenerate types and schema**

Run: `pnpm payload generate:types && pnpm payload generate:db-schema`
Expected: `src/payload-types.ts` `Artist.downloads` now has `biographyPdf` (no `biographyPDF`); the regenerated
`src/payload-generated-schema.ts` contains the `artists_locales` localized upload column.

- [ ] **Step 2: Capture the exact generated names for the migration**

Run: `rg -n "biography_pdf|biography_p_d_f" src/payload-generated-schema.ts`
Expected: report the exact **column**, **index**, and **FK** names Payload will create for the localized field
(e.g. `downloads_biography_pdf_id`). Record these — the migration in Task 5 must use these exact names.

- [ ] **Step 3: Re-run typecheck**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Run full test suite**

Run: `pnpm test`
Expected: PASS. (Any test fixtures now stale fail here — fix `biographyPDF` → `biographyPdf` in them if the
earlier tasks missed any.)

- [ ] **Step 5: Commit**

```bash
git add src/payload-types.ts src/payload-generated-schema.ts
git commit -m "chore(artists): regenerate payload types for localized biographyPdf"
```

---

### Task 5: Author the idempotent migration

**Files:**
- Create: `src/migrations/<timestamp>_localize_artist_biography_pdf.ts`
- Create: `src/migrations/<timestamp>_localize_artist_biography_pdf.json`
- Modify: `src/migrations/index.ts`

> This task generates + rewrites the migration. It does **not** apply it. Applying is Task 6 (gated).

- [ ] **Step 1: Generate the starter migration**

Run: `pnpm payload migrate:create localize-artist-biography-pdf`
This creates a `.ts` + `.json` pair in `src/migrations/`. Do NOT apply it (it would be a dev schema-push).

- [ ] **Step 2: Inspect the generated output**

Run: `git status` and read the new `.ts` + `.json`. Identify the exact target column name for the localized
field in `artists_locales` (cross-check against Task 4 Step 2). Note whether the generated `up()` is
destructive (drops the old column / table) — we replace it entirely.

- [ ] **Step 3: Replace the `up()`/`down()` with the hand-written idempotent version**

Overwrite the `.ts` file. The `<TARGET_COL>`, `<TARGET_IDX>`, `<TARGET_FK>`, and `<OLD_COL>` tokens below must
be replaced with the exact names captured in Task 4 Step 2 (and the old column
`downloads_biography_p_d_f_id`). Fill `<coalesced biography>` with the same expression Payload uses for a de
artist biography (a `SELECT biography FROM artists_locales WHERE _locale='de'` — see note after the code):

```ts
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

// NOTE (Option A): The migrator is NOT transactional (sqliteAdapter has no transactionOptions — statements
// autocommit; PRAGMA foreign_keys toggling works because there is no transaction). We deliberately ship a
// PLAIN "column exists" idempotency guard (below), matching the 20260815_125014_artist_repertoire_ordering
// idiom, NOT a resumption state machine. This was a conscious decision after code review: a state machine
// would not survive the DROP->RENAME table gap anyway, and recovery relies on the pre-migration prod snapshot
// (data/dumps/pre-bio-pdf.db) + re-run. See spec "Non-transactional + residual-risk note".
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_locales') WHERE name = '<TARGET_COL>'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  if (await alreadyApplied(db)) return

  const sourceCount = await db.run(sql`SELECT COUNT(*) AS c FROM artists WHERE <OLD_COL> IS NOT NULL`)
  const before = (sourceCount.rows[0] as unknown as { c: number }).c

  await db.run(sql`ALTER TABLE artists_locales ADD COLUMN <TARGET_COL> integer REFERENCES documents(id) ON DELETE set null`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`<TARGET_IDX>\` ON \`artists_locales\` (\`<TARGET_COL>\`,\`_locale\`);`)

  await db.run(sql`INSERT INTO artists_locales (_parent_id, _locale, <TARGET_COL>, biography)
    SELECT a.id, 'de', a.<OLD_COL>, COALESCE(l.biography, '')
    FROM artists a LEFT JOIN artists_locales l ON l._parent_id = a.id AND l._locale = 'de'
    WHERE a.<OLD_COL> IS NOT NULL
    ON CONFLICT (_locale, _parent_id) DO UPDATE SET <TARGET_COL> = excluded.<TARGET_COL>`)

  const copied = await db.run(sql`SELECT COUNT(*) AS c FROM artists_locales WHERE _locale='de' AND <TARGET_COL> IS NOT NULL`)
  const after = (copied.rows[0] as unknown as { c: number }).c
  if (before !== after) {
    throw new Error(`bio PDF migration count mismatch: ${before} source vs ${after} copied`)
  }

  // Table-recreate the artists table to drop the FK-participating old column. Use the __new_artists
  // create->insert->drop->rename idiom (NOT `LIKE`), preserving the FULL column set, indexes, and FKs of
  // payload-generated-schema.ts (see the real migration).
  await db.run(sql`CREATE TABLE IF NOT EXISTS \`__new_artists\` (...full column set, indexes, FKs WITHOUT <OLD_COL>...)`)
  await db.run(sql`INSERT INTO \`__new_artists\` (...) SELECT ... FROM \`artists\`;`)
  await db.run(sql`DROP TABLE IF EXISTS \`artists\`;`)
  await db.run(sql`ALTER TABLE \`__new_artists\` RENAME TO \`artists\`;`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_name_idx\` ON \`artists\` (\`name\`);`)
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS \`artists_slug_idx\` ON \`artists\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_image_idx\` ON \`artists\` (\`image_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_downloads_downloads_gallery_z_i_p_idx\` ON \`artists\` (\`downloads_gallery_z_i_p_id\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_updated_at_idx\` ON \`artists\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX IF NOT EXISTS \`artists_created_at_idx\` ON \`artists\` (\`created_at\`);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  if (!(await alreadyApplied(db))) return
  // Mirror up(): recreate artists re-adding <OLD_COL> + its index + FK, copy de locale values back,
  // verify counts, then recreate artists_locales WITHOUT <TARGET_COL>.
}
```

> **CRITICAL — do not trust the snippet blindly.** This is a **structural skeleton**, not final SQL. The
> engineer MUST reconcile it against the project's ACTUAL column list. Follow the exact pattern of the working
> reference migration `src/migrations/20260815_125014_artist_repertoire_ordering.ts` (its `up()` uses the
> `__new_artists_rels` create→insert→drop→rename idiom and `SELECT` with the real full column list). Payload's
> `migrate:create` generated `.json` contains the authoritative complete column list for the `artists` table —
> copy EVERY non-bio-PDF column (including `image_id`, `slug`, `downloads_gallery_z_i_p_id`, all URL columns,
> `updated_at`, `created_at`) and every index (`artists_name_idx`, `artists_slug_idx`, `artists_image_idx`,
> `artists_downloads_downloads_gallery_z_i_p_idx`, ...) into the recreated table. For the `<coalesced
> biography>` expression, derive how de biographies are stored (the `artists_locales.biography` column is
> `NOT NULL`; if every artist already has a de `artists_locales` row the `COALESCE(..., '')` guard is enough).
> Verify the exact column for instrument (`instrument` is `hasMany` → stored in `artists_instrument`, NOT on
> `artists`; confirm whether the original columns include an instrument column or a `_rels` entry — read the
> generated `.json` before writing the `SELECT`).

- [ ] **Step 4: Register the migration in the index**

In `src/migrations/index.ts`, add the import and entry mirroring the existing entries (use the real timestamp
filename):

```ts
import * as migration_<TIMESTAMP>_localize_artist_biography_pdf from './<TIMESTAMP>_localize_artist_biography_pdf'

export const migrations = [
  // ...existing entries...
  {
    up: migration_<TIMESTAMP>_localize_artist_biography_pdf.up,
    down: migration_<TIMESTAMP>_localize_artist_biography_pdf.down,
    name: '<TIMESTAMP>_localize_artist_biography_pdf',
  },
]
```

- [ ] **Step 5: Validate the migration compiles / builds**

Run: `pnpm tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/migrations
git commit -m "feat(db): idempotent migration to localize artist biographyPdf"
```

---

### Task 6: [GATED: DB APPROVAL] Dry-run migration on a prod snapshot

**Files:**
- Uses: exported snapshot in `data/dumps/`

> Requires explicit user approval (AGENTS.md). Dry-run on an **exported prod snapshot** only — never apply to a
> live DB yet.

- [ ] **Step 1: Export a prod snapshot**

```bash
turso db export ksschoerke-production --output-file data/dumps/pre-bio-pdf.db
```
(Approval required per `opencode.json` — every `turso` command is gated.)

- [ ] **Step 2: Pre-migration reference counts**

Run (on the snapshot, read-only):
```bash
sqlite3 data/dumps/pre-bio-pdf.db \
  "SELECT COUNT(*) FROM artists WHERE downloads_biography_p_d_f_id IS NOT NULL; \
   SELECT id, name, downloads_biography_p_d_f_id FROM artists WHERE downloads_biography_p_d_f_id IS NOT NULL ORDER BY id;"
```
Record every artist id → document id mapping for later 1:1 verification.

- [ ] **Step 3: Apply the migration up() to a throwaway copy of the snapshot**

Copy the snapshot to a scratch file, apply the `up()` SQL, then verify:
```bash
cp data/dumps/pre-bio-pdf.db /tmp/bio-pdf-test.db
# (apply up() SQL to /tmp/bio-pdf-test.db)
sqlite3 /tmp/bio-pdf-test.db "SELECT _parent_id, downloads_biography_p_d_f_id /* or <TARGET_COL> */ FROM artists_locales WHERE _locale='de' ORDER BY _parent_id;"
```
Expected: every artist id from Step 2 appears with its original document id in the `de` rows. **Count and
per-id must match exactly** (not just totals).

- [ ] **Step 4: Report results and STOP**

Present the before/after mappings to the user. Do **not** proceed to Task 7 until the user confirms the dry-run
is correct.

---

### Task 7: [GATED: DB APPROVAL] Apply migration to prod + deploy

> Requires explicit user approval. Run only after Task 6 dry-run is confirmed.

- [ ] **Step 1: Apply migrations to prod**

```bash
pnpm migrate
```
This runs all pending migrations (including the new one) against the DB configured in `.env`. Confirm with the
user the target DB is prod (`ksschoerke-production`) before running.

- [ ] **Step 2: Post-migration verification**

Query prod read-only (via `pnpm dump artists` or a `tsx` read script per AGENTS.md) and confirm each artist's
`downloads.biographyPdf` resolves for `de`, and on `en` falls back to `de` correctly; confirm `galleryZIP`
untouched. Verify artist admin list loads.

- [ ] **Step 3: Deploy via normal flow**

Push + let Vercel `build:ci` run `pnpm migrate && pnpm build`. Confirm the migration is idempotent (second run
is a no-op).

- [ ] **Step 4: Note the DB-protection wrap-up**

Acknowledge to the user: no DB credentials generated; snapshot retained in `data/dumps/pre-bio-pdf.db`.

---

## Self-Review

**Spec coverage:**
- Localized `biographyPdf` field → Task 1.
- `blogPdf` fallback behavior on en → Task 2 Step 3 test + no service change (documented).
- `galleryZIP` unchanged → Task 1 (deliberately not edited).
- Frontend rename in all consumers → Tasks 2–3.
- Types/schema regeneration → Task 4.
- Idempotent zero-loss migration, table-recreate for FK drop, upsert w/ `biography` NOT NULL, rowid not bound,
  down() index/FK note → Task 5.
- Zero-loss verification via prod snapshot dry-run → Task 6.

**Placeholder scan:** `<TARGET_COL>`/`<TARGET_IDX>`/`<TARGET_FK>`/`<OLD_COL>` are intentional resolved-at-runtime
tokens (names come from Task 4 Step 2 / the generated migration — they cannot be known until generation). They
are explicitly flagged as "capture exact names" steps, not vague TODO. The Task 5 snippet is explicitly labeled
a structural skeleton because the real column list must mirror `payload-generated-schema.ts` / the generated
`.json` — the reference migration and Step 3 note show exactly how. This is necessary since Payload's exact
column naming is read, not assumed (per spec).

**Type consistency:** `biographyPdf` used consistently across Tasks 1–5; `biographyPDF` appears in Task 5's
migration only as the old column name `downloads_biography_p_d_f_id` (correct). `downloads_biography_pdf_id` /
`<TARGET_COL>` naming consistent.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-08-19-artist-bilingual-bio-pdf.md`.

**Two execution options:**
1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast
   iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with
   checkpoints.

Which approach?
