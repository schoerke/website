# Incident 2026-08-15: Prod DB Left Half-Migrated

Operational incident write-up. Extracted from the old single-file `MEMORY.md`.
Source: repo-root `MEMORY.md` — extracted from §4.

---

## What Happened / Root Causes

This incident damaged prod and took hours to recover. Every lesson below is why the current safeguards exist.

**What happened:** A feature branch push triggered a Vercel preview build. `build:ci` runs `migrate && build` on
**every** build including previews, so the preview mutated the **prod** DB. The migration's `up()` ran partially
via a dev-mode schema push (not via `payload migrate`), leaving prod with `repertoire_id` column but **no CASCADE
FK**, array tables dropped, `payload_migrations` empty. A later build's `migrate` then failed with
`no such table: artists_repertoire`.

**Root causes:**

1. `build:ci` runs migrations on all deployments (previews included) — this is **by design**, so migrations MUST
   be idempotent (see docs/memory/migrations.md).
2. Any `tsx` script connecting to prod with `NODE_ENV` unset runs `pushDevSchema`, which mutates schema AND
   re-adds the `dev|-1` marker (see "The dev|-1 Marker Trap" below). This is what half-applied the schema in the
   first place.

**Safeguards added:** migration is idempotent (see docs/memory/migrations.md); backfill script guards prod access
(see docs/memory/scripts.md).

## Restoring Prod From a Snapshot

`turso db import <file> --database <db>` **does not overwrite an existing database** — it CREATES A NEW database
(older AGENTS.md text was wrong). What we learned during the restore:

1. `turso db export ksschoerke-production` → snapshot (this works).
2. `sqlite3 snapshot.db ".dump" | turso db shell ksschoerke-production` **fails**: (a) dump needs empty tables,
   (b) sqlite3 emits `unistr()` calls that Turso's SQLite build doesn't support.
3. **The correct, verified method:** `turso db shell <db> .dump > file.sql`, wipe all target tables
   (`DROP TABLE IF EXISTS` one-at-a-time, `PRAGMA foreign_keys=OFF`), then
   `turso db shell <db> < file.sql`. FKs and indexes are preserved.
4. Verify: compare every table's `COUNT(*)` and index set snapshot vs restored.

**The full verified procedures (backup, dump, restore) live in
`docs/memory/db-operations.md` — use that file, not ad-hoc attempts.** When wiping a DB for a restore
(`docs/memory/db-operations.md` §3a; §3c clone deprecated), the per-table `DROP` loop can **silently skip tables**
(FK ordering) — verify `0 tables remain` (`sqlite_master` count) BEFORE importing the restore, or the wipe is
incomplete and the clone is contaminated.

**Lesson:** never `turso db import` expecting an overwrite. Take a fresh export of the current (even broken) state
first as a second safety net.

## The `dev|-1` Marker Trap

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

## Related Facts

Plain `Error` in hooks → generic toast; admin relationship-chip removal is optimistic (client-only until Save): see docs/memory/gotchas.md.

