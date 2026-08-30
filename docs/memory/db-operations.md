# DB Operations — Backup, Restore, Inspection (Turso)

Verified Turso-native procedures (dump, restore, clone prod→dev, schema parity). **Verified 2026-08-15 against a
throwaway DB.** The 2026-08-15 prod incident was caused by deviating from the official restore path (using
`sqlite3 .dump`, which emits `unistr()` calls Turso's server SQLite can't execute).

> ⚠️ **Command locations (since 2026-08-27):** the common-task commands (full backup, read-only inspection,
> refresh local `dev.db`) live in **`docs/memory/checklists.md`** (§1–§3). This file keeps internals, rationale,
> and the destructive/procedure-specific commands (§2 dump-to-SQL, §3 restore, §3c/§4 deprecated). If a command
> you need is missing here, check checklists.md first.

**Databases:** local `dev.db` (canonical dev) and `ksschoerke-production` (live). `ksschoerke-development` does
NOT exist — sections referencing it are deprecated. Turso CLI commands use CLI credentials — **no `.env` swap
needed.** Every `turso` command requires approval per `opencode.json`.

> ⚠️ For reading **content** data (artists, repertoires, posts…), prefer the Payload Local API
> (`pnpm dump <collection>`, `tsx` read script, service/action) — see docs/memory/data-operations.md. Turso CLI is
> for DB/SQL-specific work (backup/restore/clone, schema inspection, counts, env identity).

---

## 1. Production backup (snapshot) — ⚠️ COMMANDS MOVED

> **AUTHORITATIVE STEPS: `docs/memory/checklists.md` §2.**
> This section keeps Turso-specific internals only. The standard production backup is the nightly R2 snapshot in
> `docs/memory/checklists.md` §1.
> No commands here.

- Download and integrity-check the nightly R2 snapshot before a production mutation; keep it until verified.
- Do not use `turso db export` unless the user explicitly requests it.

---

## 2. Dump to SQL (portable) — READ-ONLY

Use **Turso's own shell** `.dump`, NOT `sqlite3 .dump` (the latter emits `unistr()` and breaks).

```bash
turso db shell ksschoerke-production .dump > data/dumps/ksschoerke-production-$(date +%Y%m%d-%H%M%S).sql
```

Output is clean SQL (`CREATE TABLE IF NOT EXISTS`, `INSERT`, `COMMIT`) Turso can reload directly.

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

4. **Load the dump:**

   ```bash
   turso db shell ksschoerke-production < data/dumps/NAME.sql
   ```

5. **Verify** against the dump source:

   ```bash
   sqlite3 data/dumps/SOURCE.db "SELECT COUNT(*) FROM artists;"
   turso db shell ksschoerke-production "SELECT COUNT(*) FROM artists;"
   ```

**⚠️ The per-table `DROP` loop can silently skip tables (FK ordering).** Verify `0 tables remain`
(`sqlite_master` count) BEFORE importing the restore, or the wipe is incomplete and the clone/restore is
contaminated.

### 3b. Restore into a NEW database (simplest, non-destructive)

```bash
# From a point in time (Turso PITR)
turso db create ksschoerke-restored --from-db ksschoerke-production --timestamp 2026-08-15T00:00:00Z
```

Creates a new DB you can inspect before any prod impact. **Note:** `turso db import` and `turso db create
--from-file` also create NEW databases — they never overwrite an existing one. `--from-file` is unreliable for
`turso db export` output (fails with "token too long"); prefer the `.dump`/restore method (§3a) for overwrites.

---

## 3c. Clone prod → dev — ⚠️ STALE (targets deleted `ksschoerke-development`)

> **DEPRECATED.** `ksschoerke-development` no longer exists. To refresh dev, use §3d (local `dev.db` from the
> nightly R2 backup). Kept only as historical reference — do NOT run.

**This is the normal way to refresh dev from prod.** Dev is a sandbox; no GDPR concern (small team, public
content). Clone with data so dev matches prod for realistic testing.

```bash
# 1. (optional but recommended) backup current dev first
turso db export ksschoerke-development --output-file data/dumps/ksschoerke-development-$(date +%Y%m%d-%H%M%S).db

# 2. dump prod to SQL
turso db shell ksschoerke-production .dump > data/dumps/prod-clone.sql

# 3. wipe dev (verify 0 tables remain after — see §3a warning)
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
- If you only need schema parity (e.g. after a migration), see §4 below.

---

## 3d. Refresh local `dev.db` — ⚠️ COMMANDS MOVED

> **AUTHORITATIVE STEPS: `docs/memory/checklists.md` §3.**
> This section keeps internals only (`dev|-1` mechanism, MCP auth, atomic-replace rationale). No commands here.
> Source lineage: `docs/superpowers/plans/2026-08-23-local-sqlite-dev.md` Task 4; commands moved to
> checklists.md 2026-08-27.

**Use this to seed/refresh the LOCAL dev SQLite file (`file:./dev.db`, canonical dev) from the nightly prod
backup.** This is the ONLY sanctioned way to refresh local dev — do NOT invent a different procedure.

- **Atomic replace** (decompress to a `.db.new` temp file, then rename over `dev.db`) avoids partial-file
  corruption; deleting stale WAL/SHM companions completes the swap.
- **`dev|-1` mechanism:** the first dev-mode connection (`pushDevSchema`) writes a `dev|-1` migration marker. It
  makes `payload migrate` show the interactive "data loss" prompt, which silently cancels in CI. The checklist
  deletes it before migrating. Prod-targeting scripts run with `NODE_ENV=production` so the marker is never
  written to prod.
- **`NODE_ENV=production` on the local migrate is NOT about prod** — it prevents `pushDevSchema` from re-adding
  `dev|-1` while migrating the local file. Do not "fix" it away.
- **MCP key handling (policy since 2026-08-26):** the prod backup has NO `payload_mcp_api_keys` table (MCP is
  `NODE_ENV !== 'production'` gated; prod disables it). **We PRESERVE the table across the swap** — dump schema +
  rows from the old `dev.db` before the swap, recreate + insert into the new `dev.db` after (checklists.md §3).
  Preserved rows keep working because `api_key_index` is an HMAC that stays valid as long as `PAYLOAD_SECRET` is
  unchanged. **Fallback:** if a `payload_find*` tool returns 401 after the swap, re-key via the admin UI (old
  documented path — plan Task 5). A future Payload bump that changes the `payload_mcp_api_keys` schema breaks
  preserved rows → re-key.

---

## 4. Schema parity reset — ⚠️ STALE (targets deleted `ksschoerke-development`)

> **DEPRECATED.** `ksschoerke-development` no longer exists, so the commands below fail. Dev is the local
> `dev.db` file. To get prod's schema+data into local dev, refresh `dev.db` from the nightly R2 backup —
> **AUTHORITATIVE STEPS: `docs/memory/checklists.md` §3.** Kept only as historical reference — do NOT run.

The schema-only parity idea (copy tables + FKs + indexes without data) is superseded by the full dev.db refresh,
which is simpler and verified. The underlying drift cause still stands: dev uses `pushDevSchema` (ALTER, no FKs)
while prod uses migrations (table-recreation, FKs). Always generate + review a migration for schema changes (see
docs/memory/migrations.md).

---

## 5. Read-only inspection — ⚠️ COMMANDS MOVED

> **AUTHORITATIVE STEPS: `docs/memory/checklists.md` §1.**
> This section keeps rationale only. The R2-read commands live in checklists.md.

**PREFERRED: read the nightly R2 backup locally — zero prod reads, no turso approval needed.** The nightly
`ksschoerke-production-<TIMESTAMP>.db.gz` is the previous night's full snapshot. Good enough for audits, counts,
schema inspection, and "what is live" questions. For true-latest data (newer than last night), fall back to
`turso db shell` (§1) or the Local API. **Never write the download over `dev.db` unless refreshing it — see
checklists.md §3.**

Legacy fallbacks: `turso db shell ksschoerke-production "SELECT ..."` (live read, requires approval per
opencode.json) or `sqlite3 data/dumps/NAME.db "..."` (inspect an existing local snapshot).

---

## 6. Critical guardrails (learned the hard way)

1. **Never use `sqlite3 .dump` to restore Turso** — it emits `unistr()` (and needs empty tables). Use
   `turso db shell <db> .dump` + `< dump.sql`.
2. **`turso db import` and `turso db create --from-file` create NEW databases** — they never overwrite an
   existing one. For overwrites use `.dump` + wipe + restore (§3a).
3. **Take a fresh export BEFORE any prod write**, and keep it until the restore is verified.
4. **Verify after restore** — compare every table `COUNT(*)` and the index list against the source, and confirm
   the wipe left `0 tables remain`.
5. **prod scripts require `NODE_ENV=production`** (prevents `pushDevSchema` re-adding the `dev|-1` migration
   marker). See docs/memory/migrations.md.
6. **`dev|-1` in `payload_migrations` breaks CI migrations** (interactive prompt silently cancels). Delete it if
   present: `echo "DELETE FROM payload_migrations WHERE name='dev';" | turso db shell ksschoerke-production`

---

See docs/memory/incidents/2026-08-15-prod-half-migrated.md for the full incident narrative and why these steps exist.
