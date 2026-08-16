# MEMORY.md — Project Operational Memory

This file is the authoritative record of operational lessons, environment facts, and hard-won workflows for this
project. **Read it fully before any database, migration, or deployment work.** AGENTS.md covers policy and
conventions; this file covers _what actually happened_ and _what must not happen again_.

---

## 1. Project At a Glance

- **Stack:** Next.js 16 (App Router), Payload CMS 3.88, SQLite via Turso (libSQL), drizzle-kit (transitive),
  Tailwind, next-intl (de/en), Vitest.
- **Deployed to:** Vercel. Git remote: `https://github.com/schoerke/website.git`.
- **Core entities:** Artists, Repertoire, Recordings, Posts, Employees, Pages, Images, Documents, Users,
  NewsletterContacts. Globals: HomePage.
- **Search:** `@payloadcms/plugin-search` (localized), reindexed at build via `generate:search-index`.

---

## 2. Databases & Environments (CRITICAL)

Two Turso databases, both in `eu-west`. **`ksschoerke-development` is the sandbox; `ksschoerke-production` is
live.** There is no local SQLite in normal use.

| Name | Turso db name            | URI host                                                 |
| ---- | ------------------------ | -------------------------------------------------------- |
| Dev  | `ksschoerke-development` | `ksschoerke-development-zeitchef.aws-eu-west-1.turso.io` |
| Prod | `ksschoerke-production`  | `ksschoerke-production-zeitchef.aws-eu-west-1.turso.io`  |

`.env` always holds BOTH pairs; dev is active (uncommented), prod is commented. **Do not swap `.env` to run
operations — use Turso CLI or inline env vars instead** (see §5).

**Reliable prod access without `.env` swap:**

```bash
turso db shell ksschoerke-production "SELECT ..."          # read/write via CLI credentials (approval required per opencode.json)
turso db export ksschoerke-production --output-file data/dumps/NAME.db   # full snapshot backup
```

**Prefer the Payload Local API for reading content data** — see §11.

---

## 3. The Repertoire Feature — What Was Built (2026-08-15)

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
- Migration: `src/migrations/20260815_125014_artist_repertoire_ordering.ts` (idempotent — see §6).
- Backfill script: `scripts/db/backfillArtistRepertoire.ts` (dry-run default; `--apply` to write; guarded).

---

## 4. INCIDENT LOG — 2026-08-15 (read this before touching migrations or prod)

This incident damaged prod and took hours to recover. Every lesson below is why the current safeguards exist.

### 4.1 Prod DB left half-migrated after preview deploy

**What happened:** A feature branch push triggered a Vercel preview build. `build:ci` runs `migrate && build` on
**every** build including previews, so the preview mutated the **prod** DB. The migration's `up()` ran partially
via a dev-mode schema push (not via `payload migrate`), leaving prod with `repertoire_id` column but **no CASCADE
FK**, array tables dropped, `payload_migrations` empty. A later build's `migrate` then failed with
`no such table: artists_repertoire`.

**Root causes:**

1. `build:ci` runs migrations on all deployments (previews included) — this is **by design**, so migrations MUST
   be idempotent (see §6).
2. Any `tsx` script connecting to prod with `NODE_ENV` unset runs `pushDevSchema`, which mutates schema AND
   re-adds the `dev|-1` marker (see 4.3). This is what half-applied the schema in the first place.

**Safeguards added:** migration is idempotent (§6); backfill script guards prod access (§7).

### 4.2 Restoring prod from a snapshot was chaotic

`turso db import <file> --database <db>` **does not overwrite an existing database** — it CREATES A NEW database
(older AGENTS.md text was wrong). What we learned during the restore:

1. `turso db export ksschoerke-production` → snapshot (this works).
2. `sqlite3 snapshot.db ".dump" | turso db shell ksschoerke-production` **fails**: (a) dump needs empty tables,
   (b) sqlite3 emits `unistr()` calls that Turso's SQLite build doesn't support.
3. **The correct, verified method:** `turso db shell <db> .dump > file.sql`, wipe all target tables
   (`DROP TABLE IF EXISTS` one-at-a-time, `PRAGMA foreign_keys=OFF`), then
   `turso db shell <db> < file.sql`. FKs and indexes are preserved.
4. Verify: compare every table's `COUNT(*)` and index set snapshot vs restored.

**The full verified procedures (backup, dump, restore, clone prod→dev, schema parity) live in
`docs/turso-operations.md` — use that file, not ad-hoc attempts.**

**Lesson:** never `turso db import` expecting an overwrite. Take a fresh export of the current (even broken) state
first as a second safety net.

### 4.3 `dev|-1` marker in `payload_migrations` re-adds itself and breaks CI migrations

The `dev|-1` row (batch -1, name `dev`) is written by `pushDevSchema`. Its presence makes `payload migrate` show
the interactive **"data loss will occur"** prompt. In Vercel's non-TTY build this prompt **cancels silently** →
`migrate` exits 0 WITHOUT running → deploy continues on un-migrated schema. **It was deleted from prod at least
three times** and kept coming back because any dev-mode connection (e.g. `tsx` script, inline-env script without
`NODE_ENV=production`) re-adds it.

**Rules to prevent recurrence:**

- NEVER run a `tsx`/script against prod with `NODE_ENV` unset. Always `NODE_ENV=production` for prod-targeting
  scripts (prevents `pushDevSchema`).
- If you ever see `payload_migrations` contain `dev|-1`, delete it BEFORE the next deploy:
  `echo "DELETE FROM payload_migrations WHERE name='dev';" | turso db shell ksschoerke-production`
- Verify after any script run against prod: `turso db shell ksschoerke-production "SELECT name,batch FROM payload_migrations;"`

### 4.4 Plain `Error` in a hook → generic "Something went wrong" toast

Throwing `new Error('msg')` from a Payload hook surfaces only _"Something went wrong"_ in the admin (messages
are sanitized). To show the real message use:

```ts
import { APIError } from 'payload'
throw new APIError('Your real message', 400, undefined, true) // isPublic: true
```

### 4.5 Admin relationship-field removal is optimistic UI

Clicking ✕ on a relationship chip removes it **client-side immediately**; no API call happens until **Save**.
`beforeChange` hooks fire only on Save. Don't expect a toast at chip-removal time.

---

## 5. Deploy & Migration Workflow (Current, Working)

### Build pipeline

- `vercel.json`: `"buildCommand": "pnpm run build:ci"` → `build:ci` = `pnpm migrate && pnpm build`.
- `pnpm migrate` runs on EVERY Vercel build (production AND preview). It applies pending migrations from
  `src/migrations/*.ts` against prod and records them in `payload_migrations`.
- `pnpm build` = `generate:search-index` (reindexes search) then `next build`.
- **`pnpm ci` is a reserved pnpm built-in** (clean install) — do NOT name a custom script `ci`.

### Making a schema change (the safe path)

1. Edit collection config; run `pnpm dev`, accept the dev schema push (dev DB only).
2. `pnpm payload migrate:create <name>` — generates `.ts` + `.json`. It does NOT connect to the DB
   (`disableDBConnect`), it only diffs snapshots and writes files.
3. Review the generated `up()`/`down()` SQL carefully (see §6 for the FK/ALTER trap).
4. Pre-flight against a local copy of a prod snapshot before relying on it (see 4.2 for how).
5. Commit. Deploy applies it to prod via `build:ci`.

### Migration snapshot/baseline

- `src/migrations/*.json` files are schema snapshots used for diffing. The original
  `20260310_203659.json` was **stale** and replaced with a fresh baseline (`20260815_124301_baseline.json`).
- `migrate:create` diffs against the latest `.json`. If snapshots get out of sync, delete the stale one and
  regenerate a baseline (keep the `.json`, delete the generated baseline `.ts`).

---

## 6. Migration Idempotency — MANDATORY (this crashed prod)

Because `build:ci` runs migrations on every build (previews included), a migration can be re-run against an
already-migrated DB. It MUST be a safe no-op if already applied.

**Pattern used (copy from `20260815_125014_artist_repertoire_ordering.ts`):**

```ts
async function alreadyApplied(db: MigrateUpArgs['db']): Promise<boolean> {
  const { rows } = await db.run(
    sql`SELECT COUNT(*) AS c FROM pragma_table_info('artists_rels') WHERE name = 'repertoire_id'`
  )
  const first = rows[0] as unknown as { c: number } | undefined
  return (first?.c ?? 0) > 0
}
// in up(): if (await alreadyApplied(db)) return
// in down(): if (!(await alreadyApplied(db))) return
```

Use `DROP TABLE IF EXISTS`, `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS` everywhere.

**The SQLite FK/ALTER trap:** `ALTER TABLE ... ADD COLUMN ... REFERENCES x(id)` creates an FK with **NO ACTION**
(no cascade), or Payload's schema push may add the column with **no FK at all** while `payload-generated-schema.ts`
expects `ON DELETE CASCADE`. If the migration must add a column with a CASCADE FK, you cannot use `ALTER` — you
must **recreate the table** (create `__new_artists_rels`, `INSERT ... SELECT`, drop, rename) as this migration
does. Always verify the resulting `PRAGMA foreign_key_list` includes the CASCADE FK.

**Dev push vs migration mismatch:** dev uses `pushDevSchema` (no FK via ALTER path); the migration file creates
the FK properly. So dev DB and prod DB can legitimately differ in FK presence. Verify against
`payload-generated-schema.ts`, not against dev's live schema.

---

## 7. Scripts — Prod-Safe Conventions

### Backfill / data scripts

- `scripts/db/backfillArtistRepertoire.ts` has a **guard**: it aborts if `DATABASE_URI` contains
  `ksschoerke-production` and `NODE_ENV !== 'production'`. Keep this guard pattern in all prod-targeting scripts.
- **Run against prod WITHOUT touching `.env`:**
  ```bash
  NODE_ENV=production DATABASE_URI=libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io \
  DATABASE_AUTH_TOKEN=<prod token from .env commented line> \
  pnpm tsx scripts/db/backfillArtistRepertoire.ts --apply
  ```
  `NODE_ENV=production` is what prevents `pushDevSchema` (and thus the `dev|-1` marker) on connect.
- Inline env vars override `.env` (verified: `@next/env` only fills unset vars).

### Revalidation hooks vs scripts

Artist `afterChange` runs `revalidateArtistOnChange`, which calls `revalidatePath` — **this throws outside a
Next.js server context**. Scripts that `payload.update` artists must pass
`context: { syncingRepertoire: true, skipRevalidation: true }` (the revalidate hook checks
`req.context?.skipRevalidation`).

---

## 8. Tooling Reference (verified working)

| Task                      | Command                                                                  |
| ------------------------- | ------------------------------------------------------------------------ |
| Full prod backup          | `turso db export ksschoerke-production --output-file data/dumps/NAME.db` |
| Inspect prod (read/write) | `turso db shell ksschoerke-production "SQL"`                             |
| Inspect an exported `.db` | `sqlite3 data/dumps/NAME.db "SQL"`                                       |
| Delete `dev               | -1` marker                                                               | `echo "DELETE FROM payload_migrations WHERE name='dev';" \| turso db shell ksschoerke-production` |
| Check migration status    | `pnpm payload migrate:status`                                            |
| Create migration file     | `pnpm payload migrate:create <name>`                                     |
| Run pending migrations    | `pnpm payload migrate`                                                   |
| Rollback last batch       | `pnpm payload migrate:down`                                              |
| Regenerate types          | `pnpm payload generate:types`                                            |
| Regenerate importmap      | `pnpm payload generate:importmap`                                        |
| Regenerate DB schema file | `pnpm payload generate:db-schema`                                        |

**Vercel CLI caveat:** the `vercel` CLI is scoped to the `zeitweb` team and does NOT show the real `schoerke`
project's deployments or env vars (`vercel env ls` returns empty; `vercel ls` shows only old failed builds).
**Do not rely on Vercel CLI for deploy status or env inspection** — ask the user or use Turso for DB truth.

---

## 9. Gotchas & Hard-Won Facts

- **`turso db import` creates a NEW database; it cannot overwrite an existing one.** (Contradicts older AGENTS.md
  text.)
- **`sqlite3 .dump` emits `unistr()`** — unsupported by Turso's server SQLite build. Don't pipe dumps into
  `turso db shell`.
- **`tsx` does not set `NODE_ENV`.** Scripts default to dev-mode connections → `pushDevSchema` on connect.
  Always set `NODE_ENV=production` for prod-targeting scripts.
- **`dev|-1` in `payload_migrations` = interactive prompt in `migrate` = silent skip in CI.** Keep it deleted.
- **Preview builds run migrations on prod** (by design). This is safe ONLY if migrations are idempotent.
- **`pnpm ci` is reserved** (clean install). Use `build:ci`, invoked as `pnpm run build:ci`.
- **Admin relationship chips remove optimistically** — client-only until Save. Hooks fire on Save.
- **Plain `Error` from hooks → generic toast.** Use `APIError(msg, 400, undefined, true)`.
- **Admin submits non-polymorphic hasMany relationship values as plain ID arrays** (`number[]`), NOT
  `{relationTo, value}`. The `{relationTo, value}` form is for polymorphic relationships only.
- **`getArtistBySlug` does manual project + repertoire population** (second/third queries) to preserve
  relationship-array order — Payload does not preserve `id in [...]` query order.

---

## 10. Recurring Themes / What To Never Do Again

1. **Never act on ambiguous intent.** "I would push" is NOT "push it." Only act on explicit, imperative
   instructions for pushes, merges, deploys, or any prod write.
2. **Never run a script against prod without `NODE_ENV=production`.** This single mistake caused the `dev|-1`
   recurrence twice.
3. **Never trust that a migration ran correctly from a deploy log alone.** Verify prod directly via Turso:
   check `payload_migrations`, `PRAGMA foreign_key_list`, and data counts.
4. **Never `turso db import` expecting an overwrite.** It creates a new DB.
5. **Always make migrations idempotent.** Previews re-run them.
6. **Don't guess Payload/drizzle behavior** — check `payload-generated-schema.ts`, the migration `.ts`+`.json`,
   and the live `PRAGMA` output. Dev push ≠ migration output; trust the migration + generated schema.
7. **Take a fresh backup before ANY prod write**, and keep it until verified.
8. **Confirm the database before operating** — `ksschoerke-development` vs `ksschoerke-production` are one
   character different; verify with `turso db shell <name> "SELECT 1"` or the URI host.

---

## 11. Payload Local API vs Raw SQL for Prod Data Operations

**The rule (kept in AGENTS.md):** NEVER use raw SQL or `@libsql/client` to copy or write data to production.
Use Payload's Local API. For **reading content data** (artists, repertoires, posts, etc.), prefer what the Local
API returns (small `tsx` read script, `pnpm dump <collection>`, or an existing service/action). Turso CLI remains
appropriate for DB/SQL-specific work — schema inspection, migration verification, row-count checks,
backup/restore/clone, env identity, and queries the Local API can't easily express. Every `turso` command requires
approval per `opencode.json`.

### Why raw SQL is dangerous

Payload CMS is not just a database — it's a system with hooks, lifecycle events, and internal tables that must
all stay in sync. Bypassing the Local API to write SQLite directly means:

- Versions tables (`_posts_v`, `_recordings_v`, etc.) are **never populated** — the admin list view shows nothing
  or ghost entries (this happened 2026-04-27: all 168 posts vanished from admin after a raw-SQL copy).
- The search index (`search` collection) is **never updated**.
- `afterChange` hooks **never run** (search sync, slug generation, etc.).
- Relationship integrity is fragile — foreign key mismatches cause silent failures.

### Correct pattern: migrate data to prod via Local API

```bash
# Run the import/seed script — uses Payload Local API, which runs all hooks
npx tsx scripts/wordpress/importPostsDataset.ts
npx tsx scripts/wordpress/importRecordingsDataset.ts
```

### Correct pattern: delete data from prod via Local API

```typescript
import 'dotenv/config'
import config from '@/payload.config'
import { getPayload } from 'payload'

const payload = await getPayload({ config })

// Find records to delete
const results = await payload.find({
  collection: 'recordings',
  where: { artists: { contains: artistId } },
  depth: 0,
  limit: 100,
})

// Delete each one via Local API
for (const doc of results.docs) {
  await payload.delete({ collection: 'recordings', id: doc.id })
}
```

### When raw SQL IS acceptable

- **DB/SQL-specific work where the Local API is the wrong tool:** schema inspection (`PRAGMA table_info(...)`),
  migration verification, row-count checks (`SELECT COUNT(*)`), backup/restore/clone, env identity — with user
  approval (`opencode.json` gates every `turso` command)
- **Deleting orphaned rows** Payload itself cannot see (e.g., `parent_id IS NULL`) — only after verifying they are
  truly orphaned and not real data

**Content data reads (artists, repertoires, posts, etc.) are NOT raw-SQL work** — use the Local API (a `tsx` read
script or `pnpm dump <collection>`), which returns the same shape the app consumes; raw SQL returns storage format.

### Related incidents

- **2026-04-27:** prod admin showed 137 ghost posts (`id: null`), then "No Results" after deleting orphaned
  `_posts_v` rows. Posts had been copied to prod via raw SQL, so Payload hooks never ran and `_posts_v` was never
  populated. Fixed by wiping posts from prod tables and re-importing via Local API (`importPostsDataset.ts`).
  **Always use the Local API for prod data operations.**

---

## 12. Payload CMS + SQLite: How Array Field Renames Work

**Read this before renaming any array/block/relationship field in a Payload collection.**

Each Payload `array` field is stored in its **own table**, named after the collection and field:

- `artists` collection + `youtubeLinks` field → table `artists_youtube_links`
- `artists` collection + `videoLinks` field → table `artists_video_links`

Renaming the field in the collection config does NOT rename the table — Payload sees the old table as belonging to
a deleted field and the new table as belonging to a new (empty) field.

### What happens on a naive rename + schema push

Start the dev server after renaming → Payload shows a schema diff prompt. If accepted:

1. Payload **drops** the old table (treated as deleted)
2. Payload **creates** the new table (treated as new — empty)

**Any data written to the new table before the schema push is also lost** (Payload drops and recreates it). This is
exactly what happened 2026-04-18 when renaming `youtubeLinks` → `videoLinks` — Olga Scheps' 2 videos were lost.

### Correct way: use a Payload migration file, not a pre-migration script

A migration file's `up()`/`down()` run **atomically as part of** the schema change, not before or after it.

```bash
pnpm payload migrate:create rename-youtube-links-to-video-links
```

```typescript
import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Create the new table with the same schema as the old one
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS artists_video_links (
      _order integer NOT NULL,
      _parent_id integer NOT NULL REFERENCES artists(id),
      id text PRIMARY KEY,
      url text,
      CONSTRAINT artists_video_links_parent_id_fk
        FOREIGN KEY (_parent_id) REFERENCES artists(id) ON DELETE CASCADE
    )
  `)
  // 2. Create the locales table if the field is localized
  // 3. Copy data from old table to new table
  await db.run(sql`
    INSERT INTO artists_video_links SELECT * FROM artists_youtube_links
  `)
  // 4. Drop the old table
  await db.run(sql`DROP TABLE IF EXISTS artists_youtube_links`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS artists_youtube_links AS SELECT * FROM artists_video_links
  `)
  await db.run(sql`DROP TABLE IF EXISTS artists_video_links`)
}
```

```bash
# Run the migration BEFORE starting the dev server
pnpm payload migrate
# Then rename the field in the collection config
# Then start dev — schema push sees the table exists and accepts it without data loss
```

### Summary

| Approach                                   | Data safe? | Why                                                             |
| ------------------------------------------ | ---------- | --------------------------------------------------------------- |
| Script writes data → schema push           | ❌         | Schema push drops and recreates the table, wiping script output |
| Payload migration file (SQL) → schema push | ✅         | Migration runs atomically before schema push sees the table     |
| Schema push first → script writes data     | ✅         | Table already exists, script writes to live table               |

---

## 13. Library-Specific Knowledge

### 13.1 Payload Search Plugin with Localization

- `localize: true` makes the SEARCH collection itself localized (not the source collections).
- The plugin's `afterChange` hook fires once per API request, using `req.locale`.
- Each search record is created with a specific `locale`; to index multiple locales, make separate API calls per
  locale (create EN, then update DE — this yields two search records).
- **When confused about plugin behavior:** DO NOT guess. Check the plugin source on GitHub
  (`packages/plugin-search/src/`) or official template examples. Read the implementation, not just types.

### 13.2 WordPress Migration Data Integrity

**Preserve the original data structure unless explicitly told otherwise.** Never make broad assumptions about data
cleanup during migrations. Example (2025-11-25): an agent tried to globally filter "Chamber Music" from artists'
instruments, affecting ALL artists — the correct approach is to fix only specific artists when explicitly
requested.

- Migrate data as-is; fix specific records with targeted scripts; ask before cleanup; document exceptions in the
  migration script.

### 13.3 WordPress Migration File Uploads

**Verify media files are uploaded to Payload BEFORE running migrations that reference them.** Common failure
(2025-11-30): "FOREIGN KEY constraint failed" when linking to images that don't exist, because
`media-id-map.json` held stale IDs, files weren't uploaded to storage, or WordPress attachment IDs didn't resolve.

Resolution: check existing uploads (`payload.count({ collection: 'images' })`), verify mapped IDs exist, upload
missing files via `payload.create({ collection: 'images', data, filePath })`, update `media-id-map.json`, re-run.

### 13.4 WordPress Filename Timestamp Postfixes

WordPress appends `-e[timestamp]` to edited filenames (e.g.
`Mario-Venzago-1_c-Alberto-Venzago-e1762933634869.jpg`). Migration scripts MUST clean these via
`cleanWordPressFilename()` from `scripts/wordpress/utils/fieldMappers.ts`, or the DB accumulates clutter.

### 13.5 Vercel Blob Storage and Bandwidth

Vercel Blob free tier: 10 GB/month bandwidth. Large files (ZIPs 40-60 MB) exhaust it fast. Prefer Cloudflare R2
(unlimited egress) for large downloads; keep small images/PDFs in Vercel Blob. Audit with
`tmp/analyzeBlobUsage.ts`. See `docs/todo.md` for the migration plan.

---

## 14. Historical Incident Log (pre-2026-08)

### 2025-11-30: Unauthorized Database Token Generation

Agent ran `turso db tokens create` without permission after accidentally removing `DATABASE_AUTH_TOKEN` from
`.env` during R2 cleanup. Resolution: user supplied the original token. **NEVER generate credentials without
explicit permission; ask the user for missing values.**

### 2025-11-30: Foreign Key Errors During Employee Migration

Migration failed with "FOREIGN KEY constraint failed" because `media-id-map.json` held Payload image IDs that
didn't exist. **Always verify foreign key references exist before running migrations that create relationships.**

### 2025-11-24: Remote Database Modified Without Verification

Made DB changes on a remote Turso DB without verifying `.env` config. **Always verify the database environment
before operating.**

### 2025-11-30: Vercel Blob Bandwidth

See §13.5.

### 2025-12: Artist Projects Ordering

Per-artist ordering via a relationship field + auto-sync `afterChange` hook on Posts. This was the reference
pattern for the Repertoire ordering feature. Full design:
`docs/plans/2025-12-13-artist-projects-ordering-design.md`.
