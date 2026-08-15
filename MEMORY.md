# MEMORY.md — Project Operational Memory

This file is the authoritative record of operational lessons, environment facts, and hard-won workflows for this
project. **Read it fully before any database, migration, or deployment work.** AGENTS.md covers policy and
conventions; this file covers *what actually happened* and *what must not happen again*.

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

| Name | Turso db name | URI host |
|---|---|---|
| Dev | `ksschoerke-development` | `ksschoerke-development-zeitchef.aws-eu-west-1.turso.io` |
| Prod | `ksschoerke-production` | `ksschoerke-production-zeitchef.aws-eu-west-1.turso.io` |

`.env` always holds BOTH pairs; dev is active (uncommented), prod is commented. **Do not swap `.env` to run
operations — use Turso CLI or inline env vars instead** (see §5).

**Reliable prod access without `.env` swap:**
```bash
turso db shell ksschoerke-production "SELECT ..."          # read/write via CLI credentials
turso db export ksschoerke-production --output-file data/dumps/NAME.db   # full snapshot backup
```

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
(AGENTS.md's old documentation was wrong). To fully restore prod:

1. `turso db export ksschoerke-production` → snapshot (this works).
2. `sqlite3 snapshot.db ".dump" | turso db shell ksschoerke-production` **fails**: (a) dump needs empty tables,
   (b) sqlite3 emits `unistr()` calls that Turso's SQLite build doesn't support.
3. Working approach: drop all tables one-at-a-time (`DROP TABLE IF EXISTS`), then bulk-insert rows via
   `@libsql/client` with **batched multi-row inserts** (row-by-row over HTTP is too slow and times out), with
   `PRAGMA foreign_keys=OFF` during insert, then recreate all indexes.
4. Verify: compare every table's `COUNT(*)` and index set snapshot vs restored.

**Lesson:** never `turso db import` expecting an overwrite. Full restore is a multi-step, high-risk operation —
take a fresh export of the current (even broken) state first as a second safety net.

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

Throwing `new Error('msg')` from a Payload hook surfaces only *"Something went wrong"* in the admin (messages
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

| Task | Command |
|---|---|
| Full prod backup | `turso db export ksschoerke-production --output-file data/dumps/NAME.db` |
| Inspect prod (read/write) | `turso db shell ksschoerke-production "SQL"` |
| Inspect an exported `.db` | `sqlite3 data/dumps/NAME.db "SQL"` |
| Delete `dev|-1` marker | `echo "DELETE FROM payload_migrations WHERE name='dev';" \| turso db shell ksschoerke-production` |
| Check migration status | `pnpm payload migrate:status` |
| Create migration file | `pnpm payload migrate:create <name>` |
| Run pending migrations | `pnpm payload migrate` |
| Rollback last batch | `pnpm payload migrate:down` |
| Regenerate types | `pnpm payload generate:types` |
| Regenerate importmap | `pnpm payload generate:importmap` |
| Regenerate DB schema file | `pnpm payload generate:db-schema` |

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
