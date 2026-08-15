# Turso Database Operations — Dump, Restore, Inspection

**Verified 2026-08-15 against a throwaway DB.** Follow these EXACT steps. The 2026-08-15 prod incident was
caused by deviating from the official restore path (using `sqlite3 .dump`, which emits `unistr()` calls that
Turso's server SQLite can't execute). The methods below are Turso-native and verified.

**Databases:** `ksschoerke-development` (sandbox, cloned from prod), `ksschoerke-production` (live). All commands
use Turso CLI credentials — **no `.env` swap needed.**

---

## 1. Full backup (snapshot) — READ-ONLY, always safe

```bash
mkdir -p data/dumps
turso db export ksschoerke-production --output-file data/dumps/ksschoerke-production-$(date +%Y%m%d-%H%M%S).db
```

- Produces a complete SQLite snapshot (`.db`) + optional `.db-wal` file.
- **This is the ONLY safe pre-write backup.** Take one before ANY prod mutation and keep it until verified.
- Inspect it locally: `sqlite3 data/dumps/NAME.db "SELECT COUNT(*) FROM artists"`.

---

## 2. Dump to SQL (portable) — READ-ONLY

Use **Turso's own shell** `.dump`, NOT `sqlite3 .dump` (the latter emits `unistr()` and breaks).

```bash
turso db shell ksschoerke-production .dump > data/dumps/ksschoerke-production-$(date +%Y%m%d-%H%M%S).sql
```

Output is clean SQL (`CREATE TABLE IF NOT EXISTS`, `INSERT`, `COMMIT`) that Turso can reload directly.

---

## 3. Restore a database from a dump — DESTRUCTIVE

> **Requires explicit user approval.** This replaces prod contents.

### 3a. Restore into the SAME database (overwrite)

1. **Back up current state first** (§1) so the pre-restore state is recoverable.
2. **Dump the target** (§2) — you need the source dump and a clean target.
3. **Wipe all tables** from the target (FK checks off first):

   ```bash
   turso db shell ksschoerke-production "PRAGMA foreign_keys=OFF;"
   for t in $(turso db shell ksschoerke-production "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>&1 | tail -n +2); do
     echo "DROP TABLE IF EXISTS \"$t\";" | turso db shell ksschoerke-production >/dev/null 2>&1
   done
   turso db shell ksschoerke-production "PRAGMA foreign_keys=ON;"
   ```

4. **Load the dump**:

   ```bash
   turso db shell ksschoerke-production < data/dumps/NAME.sql
   ```

5. **Verify** against the dump source:

   ```bash
   # compare key counts (source vs restored)
   sqlite3 data/dumps/SOURCE.db "SELECT COUNT(*) FROM artists;"
   turso db shell ksschoerke-production "SELECT COUNT(*) FROM artists;"
   ```

### 3b. Restore into a NEW database (simplest, non-destructive)

```bash
# From a point in time (Turso PITR)
turso db create ksschoerke-restored --from-db ksschoerke-production --timestamp 2026-08-15T00:00:00Z
```

Creates a new DB you can inspect before any prod impact. **Note:** `turso db import` and `turso db create
--from-file` also create NEW databases — they never overwrite an existing one. `--from-file` is unreliable for
`turso db export` output (fails with "token too long"); prefer the `.dump`/restore method (§3a) for overwrites.

---

## 3c. Clone prod → dev (standard workflow — with data)

**This is the normal way to refresh dev from prod.** Dev is a sandbox; no GDPR concern here (small team, public
content). Clone with data so dev matches prod for realistic testing.

```bash
# 1. (optional but recommended) backup current dev first
turso db export ksschoerke-development --output-file data/dumps/ksschoerke-development-$(date +%Y%m%d-%H%M%S).db

# 2. dump prod to SQL
turso db shell ksschoerke-production .dump > data/dumps/prod-clone.sql

# 3. wipe dev
turso db shell ksschoerke-development "PRAGMA foreign_keys=OFF;"
for t in $(turso db shell ksschoerke-development "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" 2>&1 | tail -n +2); do
  echo "DROP TABLE IF EXISTS \"$t\";" | turso db shell ksschoerke-development >/dev/null 2>&1
done
turso db shell ksschoerke-development "PRAGMA foreign_keys=ON;"

# 4. restore prod dump into dev
turso db shell ksschoerke-development < data/dumps/prod-clone.sql

# 5. verify counts match prod
turso db shell ksschoerke-production  "SELECT COUNT(*) FROM artists;"
turso db shell ksschoerke-development "SELECT COUNT(*) FROM artists;"
```

**Notes:**
- Dev inherits prod's `payload_migrations` (no `dev|-1`). First `pnpm dev` re-adds `dev|-1` — harmless in dev.
- If you only need schema parity (e.g. after a migration), see §5 below.

---

## 4. Schema parity reset (schema only, no data)

Use when dev's schema has drifted from prod (e.g. dev was schema-pushed without FKs while prod has migrations).
Copy prod's schema (tables + FKs + indexes) to dev WITHOUT data:

```bash
# 1. dump prod schema only
turso db shell ksschoerke-production .schema > data/dumps/prod-schema.sql

# 2. wipe dev tables (see §3c step 3)

# 3. apply prod schema to dev
turso db shell ksschoerke-development < data/dumps/prod-schema.sql

# 4. verify FKs + indexes match
turso db shell ksschoerke-production  "PRAGMA foreign_key_list(artists_rels);"
turso db shell ksschoerke-development "PRAGMA foreign_key_list(artists_rels);"
```

**Prevention beats correction:** dev/prod diverge because dev uses `pushDevSchema` (ALTER, no FKs) while prod
uses migrations (table-recreation, FKs). Always generate + review a migration for schema changes, and use the
schema-parity reset when drift is detected.

---

## 5. Read-only inspection (no write risk)

```bash
turso db shell ksschoerke-production "SELECT name, batch FROM payload_migrations;"
turso db shell ksschoerke-production "PRAGMA foreign_key_list(artists_rels);"
sqlite3 data/dumps/NAME.db "SELECT COUNT(*) FROM artists;"   # inspect a local snapshot
```

---

## 6. Critical guardrails (learned the hard way)

1. **Never use `sqlite3 .dump` to restore Turso** — it emits `unistr()` (and needs empty tables). Use
   `turso db shell <db> .dump` + `< dump.sql`.
2. **`turso db import` and `turso db create --from-file` create NEW databases** — they never overwrite an
   existing one. For overwrites use `.dump` + wipe + restore (§3a/§3c).
3. **Take a fresh export BEFORE any prod write**, and keep it until the restore is verified.
4. **Verify after restore** — compare every table `COUNT(*)` and the index list against the source.
5. **prod scripts require `NODE_ENV=production`** (prevents `pushDevSchema` re-adding the `dev|-1` migration
   marker). See `MEMORY.md` §4.3.
6. **`dev|-1` in `payload_migrations` breaks CI migrations** (interactive prompt silently cancels). Delete it if
   present: `echo "DELETE FROM payload_migrations WHERE name='dev';" | turso db shell ksschoerke-production`

---

See `MEMORY.md` §4.2 for the full incident narrative and why these steps exist.
