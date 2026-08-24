# Migrations

Operational workflows for deploy/migration/array-rename operations. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §5, §6, §12.

---

## Deploy & Migration Workflow (Current, Working)

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
3. Review the generated `up()`/`down()` SQL carefully (see "Migration Idempotency" below for the FK/ALTER trap).
4. Pre-flight against a local copy of a prod snapshot before relying on it (see `docs/memory/incidents/2026-08-15-prod-half-migrated.md` for how).
5. Commit. Deploy applies it to prod via `build:ci`.

**Verified end-to-end dry-run (authoritative zero-loss proof):** run the REAL `payload migrate` against a scratch
copy of a prod snapshot, then read the data back via the **Payload Local API**. Only this proves data survives
1:1 — never re-verify with a raw-SQL re-implementation of the migration (it can't prove what Payload actually does).

```bash
turso db export ksschoerke-production --output-file data/dumps/scratch.db
# against the scratch copy, NOT prod:
DATABASE_URI=file:data/dumps/scratch.db NODE_ENV=production pnpm payload migrate
# then read back via Local API: NODE_ENV=production DATABASE_URI=file:data/dumps/scratch.db pnpm tsx <read script>
```

`NODE_ENV=production` + `file:` URI keeps it off prod entirely (no `pushDevSchema`, no `dev|-1`).

### Migration snapshot/baseline

- `src/migrations/*.json` files are schema snapshots used for diffing. The original
  `20260310_203659.json` was **stale** and replaced with a fresh baseline (`20260815_124301_baseline.json`).
- `migrate:create` diffs against the latest `.json`. If snapshots get out of sync, delete the stale one and
  regenerate a baseline (keep the `.json`, delete the generated baseline `.ts`).

---

## Migration Idempotency — MANDATORY (this crashed prod — see `docs/memory/incidents/2026-08-15-prod-half-migrated.md`)

Because `build:ci` runs migrations on every build (previews included), a migration can be re-run against an
already-migrated DB. It MUST be a safe no-op if already applied.

**The Payload/SQLite migrator is NOT transactional.** `sqliteAdapter` exposes no `transactionOptions` —
every statement autocommits, there is no rollback. So a partial failure leaves a half-migrated DB. Guard every
`up()`/`down()` with BOTH: an idempotent `alreadyApplied()` check (below) AND a **verify-but-fail-closed** step —
e.g. `SELECT COUNT(*)` and bail/abort before a destructive step if the count isn't what you expect.

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

**SQLite forbids `DROP COLUMN` on an FK-participating column** — the same way the FK issue above forces
table-recreate, a column removal that's part of an FK must be done via full table-recreate
(`__new_...`, `INSERT ... SELECT`, drop, rename) too. Schema-push / dev-path ALTER can't remove it.

**Dev push vs migration mismatch:** dev uses `pushDevSchema` (no FK via ALTER path); the migration file creates
the FK properly. So dev DB and prod DB can legitimately differ in FK presence. Verify against
`payload-generated-schema.ts`, not against dev's live schema.

---

## Array Field Renames (Payload + SQLite)

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

**Localized conversion is a CROSS-TABLE data move, not a rename.** Making a field localized moves its values out of
the parent collection table into a `{collection}_locales` table. Dev **schema push never copies data** — dev loses
existing values on any schema change. Prod migrations are the only data-moving path, so a
non-localized→localized conversion MUST be a hand-written migration (`INSERT`/`UPDATE` into `_locales`), not a
field rename. Remember: migrations run on prod only via `build:ci`; dev gets schema push and drops values.
