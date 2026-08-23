# Local SQLite for Dev — Design Spec

**Date:** 2026-08-23
**Status:** Proposed (revised after code-review pass — findings incorporated, see "Review Findings Incorporated")
**Related:** `docs/adr/2025-11-23-database-backup-strategy.md` §1

---

## Problem

Development currently runs against the remote Turso `ksschoerke-development` database
(`libsql://` URI in dev `.env`). This accounts for ~77M rows-read/month on the Turso
free-tier quota (measured via `/usage`, Aug 2026: dev = 76,984,692 rows read).
The site is not yet live; these reads come from the solo developer's local `pnpm dev`
server and local scripts (reindex, backfills) querying the remote dev DB on every
operation.

Quota is currently at ~76% of the 500M free-tier read allowance (prod 302.8M + dev
77M). Moving the dev server to a local file removes its remote reads — freeing most of
dev's 77M and **delaying but not eliminating** the risk of hitting the free-tier
`BLOCKED` state (see Quota Math).

## Goal

Run local development against a **plain local SQLite file** (`file:./dev.db`) instead of
the remote `ksschoerke-development`. Seed and refresh it from the existing nightly R2
prod backup. Eliminate all remote dev reads.

## Non-Goals

- Do NOT delete `ksschoerke-development` yet — keep as rollback path until local dev is
  proven over a few days of use. **Transition-window caveat:** the on-demand dev-sync
  half of `scripts/db/backup-and-sync.sh` still targets remote dev and is NOT changed
  here. Running plain `bash scripts/db/backup-and-sync.sh --apply` (its documented
  default) during the transition will still wipe+reload remote dev — either always pass
  `--skip-dev-sync`, or invert the script flag to `--sync-dev` opt-in as part of this
  work (recommended).
- Do NOT change prod DB, prod env, or the nightly backup workflow. (The WAL concern
  raised in review was empirically resolved as a non-issue — the backup pipeline is
  healthy and requires no change; see Review Findings #1.)
- Do NOT change test suite behavior. (Tests keep their own `file:./test.db` — see
  Testing; the earlier "no test references DATABASE_URI" claim was WRONG — `vitest.setup.ts`
  does set a default, but nothing loads `.env` into tests, so tests are unaffected.)
- Do NOT address the on-demand dev-sync half of `scripts/db/backup-and-sync.sh`
  (follow-up, beyond the flag-inversion noted above).

## Architecture

```
Local dev machine
  .env.local                       # overrides .env; shared .env (prod pair) untouched
    DATABASE_URI="file:./dev.db"
    DATABASE_AUTH_TOKEN="local"    # placeholder; value ignored for file: URIs

  Payload (pnpm dev)
    └── sqliteAdapter client.url = "file:./dev.db"   # local file, zero network
        └── pushDevSchema / migrations / MCP plugin  # all hit local file only

Seed/refresh (on-demand, manual):
  R2 nightly backup (.db.gz)
    → download via aws s3 cp
    → gunzip
    → stop pnpm dev  →  replace ./dev.db  →  pnpm payload migrate  →  pnpm dev
```

Key property: a `file:` DB is **not connected to Turso at all** — no remote reads, no
quota, no possibility of accidentally touching prod. `pushDevSchema`, migrations, MCP
plugin, and edits all operate solely on the local file. (Feasibility precedent exists:
`MEMORY.md` §5 documents `DATABASE_URI=file:data/dumps/scratch.db` + `payload migrate`
verified end-to-end.)

## Components & Data Flow

### 1. Dev environment (`.env.local` override — NOT `.env`)

Create/update `.env.local` (gitignored, verified) so the shared `.env` — which holds
both the active dev pair and the commented prod pair — is never modified:

```
DATABASE_URI="file:./dev.db"
DATABASE_AUTH_TOKEN="local"
```

- **Why `.env.local`, not `.env`:** Next.js loads `.env.<mode>.local` → `.env.local` →
  `.env.<mode>` → `.env`, first-file-wins, so `.env.local` overrides `.env`. This keeps
  prod-safe: Vercel deploys use Vercel's own env vars (never your local `.env`), and
  any local tool running under `NODE_ENV=production` (or a `tsx` script using
  `dotenv/config`) keeps the original `.env` `DATABASE_URI` — no silent targeting of
  the local file. The local-file scope applies to `pnpm dev` and all `payload ...`
  commands when `NODE_ENV` is not `production` (both use the `@next/env` loader). See
  Behavior Changes for the exact split.
- `DATABASE_AUTH_TOKEN` placeholder: required by `src/payload.config.ts:45` which
  throws if absent; value is ignored for `file:` URIs. Verified: no storage/email
  adapter reads this var at dev time (Blob uses `BLOB_READ_WRITE_TOKEN`, R2/Cloudflare
  use their own, Resend uses `RESEND_API_KEY`).
- All other vars (`PAYLOAD_SECRET`, `BLOB_READ_WRITE_TOKEN`, R2/Cloudflare, etc.)
  remain in `.env` unchanged — media/storage still uses cloud creds, which is fine
  (storage is not the quota concern).
- **R2 seed credentials are NOT in `.env` or `.env.local` today.** The
  `BACKUP_R2_ACCESS_KEY`/`BACKUP_R2_SECRET`/`BACKUP_R2_ENDPOINT` used by the nightly
  workflow live only in GitHub Actions secrets. The local `.env` has
  `CLOUDFLARE_S3_*` (Documents-bucket scope) which CANNOT read
  `schoerke-website-backup`. For local seeding, copy the three `BACKUP_R2_*` values
  from GitHub secrets into your local shell/env.

### 2. Payload config

No code change required. `src/payload.config.ts:69` already passes `DATABASE_URI`
straight to `sqliteAdapter`'s `client.url`, and libsql accepts `file:path` local-file
URLs (Payload's own docs show `sqliteAdapter({ client: { url: 'file:./payload.db' } })`).

### 3. Seed / refresh procedure (manual, on-demand)

**Stop `pnpm dev` first.** Replacing `dev.db` while a WAL-mode dev server holds it open
causes split-brain (the running server keeps the old inode + its WAL; the new file
diverges silently). Order is mandatory: stop → replace → migrate → start.

```bash
# 0. stop pnpm dev if running

# 1. find the latest backup object — <LATEST> below is a fill-in from this listing
#    (creds from GH secrets, see §1; export BACKUP_R2_* in your shell, not inline, so
#    they don't land in shell history; aws CLI must be installed)
BACKUP_R2_ACCESS_KEY=... BACKUP_R2_SECRET=... BACKUP_R2_ENDPOINT=... \
  aws s3 ls s3://schoerke-website-backup/backups/ --endpoint-url "$BACKUP_R2_ENDPOINT"

# 2. download + decompress it as the local dev DB (atomic replace — no partial file,
#    and removes stale -wal/-shm companions from any prior dev session)
BACKUP_R2_ACCESS_KEY=... BACKUP_R2_SECRET=... BACKUP_R2_ENDPOINT=... \
  aws s3 cp s3://schoerke-website-backup/backups/ksschoerke-production-<LATEST>.db.gz \
  --endpoint-url "$BACKUP_R2_ENDPOINT" ./dev.db.gz
gunzip -c dev.db.gz > dev.db.new && mv dev.db.new dev.db
rm -f dev.db-wal dev.db-shm dev.db.gz

# 3. sanity check — integrity + several key tables, not a single-table sample
sqlite3 dev.db "PRAGMA integrity_check;"
sqlite3 dev.db "SELECT 'artists', COUNT(*) FROM artists UNION ALL
                SELECT 'posts', COUNT(*) FROM posts UNION ALL
                SELECT 'search', COUNT(*) FROM search UNION ALL
                SELECT 'payload_migrations', COUNT(*) FROM payload_migrations;"

# 3.3. GUARD — prod exports can carry only `dev|-1` in payload_migrations (verified on
#      the Aug-15 prod export), which makes `payload migrate` show the interactive
#      "data loss" prompt → silent cancel in non-TTY. Check and clear it, then confirm
#      the real migrations are present.
sqlite3 dev.db "SELECT name, batch FROM payload_migrations;"
sqlite3 dev.db "DELETE FROM payload_migrations WHERE name='dev';"
sqlite3 dev.db "SELECT name FROM payload_migrations ORDER BY name;"
#      expected: the 4 repo migrations (20260815_artist_repertoire_ordering,
#      20260816_ensure_employee_email_unique, 20260819_localize_artist_biography_pdf,
#      20260820_localize_video_link_label). If missing, the next step re-runs them.

# 3.5. apply any repo migrations the seeded file may lack (pushDevSchema is ALTER-only
#      and cannot do FK table-recreation — use the real migration path). MUST run from
#      the repo root so file:./dev.db resolves correctly.
cd <repo-root>
DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production \
  pnpm payload migrate

# 4. run dev
pnpm dev
```

(All commands assume repo-root cwd so `file:./dev.db` resolves correctly. From any
other directory it would connect to a different, empty file.)

This is a zero-Turso-read refresh: the nightly workflow already exported prod to R2;
we only download that artifact.

**Staleness caveat:** seed data is as fresh as the last nightly backup. Empirically
confirmed the exported `.db` alone is a complete, consistent snapshot (identical counts
with/without the `.db-wal` companion) — so no data-loss caveat beyond "one day stale by
design."

### 4. `.gitignore` (MUST fix — current `*.db` rule is insufficient)

`*.db` (`.gitignore:48`) matches only paths ENDING in `.db`. libsql opens `file:` DBs
in WAL mode by default, producing `dev.db-wal` and `dev.db-shm` **which are NOT
ignored** (verified with `git check-ignore`). Repo is public — `git add -A` would
commit live content data publicly. Required additions (globally, to cover future local
SQLite files too):

```
*.db-wal
*.db-shm
*.db-journal
dev.db*
test.db*
```

(`*.db` at line 48 already covers `dev.db`/`test.db`; the globals cover every WAL/SHM/
journal companion and the `dev.db.gz` seed intermediate.)

## Behavior Changes (named explicitly)

- **Env loading split (verified against `@next/env` + payload CLI source, 2026-08-23):**
  what hits the local file vs remote dev depends on the loader AND `NODE_ENV`:
  - `pnpm dev` — loads `.env.local` → **local file**.
  - `payload run ...` / `payload migrate` / `payload generate:*` — use the `@next/env`
    loader with `dev = NODE_ENV !== 'production'`; locally (NODE_ENV unset) → loads
    `.env.local` → **local file**. This covers `generate:search-index`
    (`reindexSearch.ts`), `migrate:artists`, `migrate:employees`, `migrate:media`.
  - `tsx scripts/db/*.ts` / `tsx scripts/*.ts` — `dotenv/config` only, no `.env.local`
    → **keeps the `.env` remote dev value**.
  - Any process with `NODE_ENV=production` in the shell — excludes `.env.local` →
    **remote/.env**.
  So the "local file" applies to the dev server AND the payload-CLI surface; only
  `tsx`-run scripts and `NODE_ENV=production` contexts keep targeting remote dev.
- **MCP plugin breaks after the switch — mandatory 4-step re-key, not "may need":**
  prod backup has NO `payload_mcp_api_keys` table (MCP is `NODE_ENV !== 'production'`
  gated; prod disables it). First local `pnpm dev` schema-push creates the table
  **empty**, and the collection has no auto-create hook. `opencode.json:9` sends
  `Authorization: Bearer {file:...payload-mcp.key}` → empty table → **401 on every MCP
  tool**. Remediation chain:
  1. Login to local admin as a seeded prod user (Users collection is plain
     `auth: true`, password hashes port over — login works); create a new API key for
     the MCP collection.
  2. **Enable tools on the key** — every permission checkbox (find per collection +
     home-page global) defaults to OFF (verified in plugin source). A newly created key
     authenticates but has ZERO tools until you expand each of the 8 collection
     collapsibles + the home-page global and tick `find`. The key is bound to the
     creating user.
  3. Write the new key to `~/.config/opencode/secrets/payload-mcp.key`.
  4. Restart the opencode MCP client (connection is cached per session).
- Local dev data is as fresh as the last refresh (one nightly backup ago, by design;
  the exported `.db` is complete — see Review Findings #1). It will go stale relative
  to prod between refreshes (acceptable — refresh on demand before a dev session).

## Error Handling / Edge Cases

- **Corrupt local DB:** delete `dev.db` + re-download from R2. Self-healing. (The seed
  procedure's atomic `gunzip -c > dev.db.new && mv` avoids partial-file corruption.)
- **Stale `dev.db-wal`/`dev.db-shm` after a killed session:** the seed procedure's
  `rm -f dev.db-wal dev.db-shm` clears them on refresh. SQLite also discards
  salt-mismatched WALs, but clean removal is explicit.
- **`dev|-1` marker / `payload_migrations` mismatch:** prod exports can carry only
  `dev|-1` (verified on the Aug-15 prod export). If not cleared, `payload migrate`
  shows the interactive "data loss" prompt → silent cancel in non-TTY (MEMORY §4.3
  incident class). Step 3.3 deletes it and asserts the 4 real migrations are present
  before step 3.5 runs. All 4 repo migrations have idempotent `alreadyApplied()`
  guards, so even a full re-run is schema-safe.
- **Schema drift after refresh:** `pnpm payload migrate` (step 3.5) reconciles using
  the migration path (not `pushDevSchema`, which is ALTER-only and cannot do FK
  table-recreation). If it fails, delete + re-seed (local file, no prod risk).
- **Rollback:** delete `.env.local` (or remove its two lines) → dev falls back to
  `.env`'s original remote dev pair. `ksschoerke-development` is retained for exactly
  this.
- **First `pnpm dev` on an empty DB:** bootstrap only works via `pushDevSchema` (the
  baseline migration is snapshot-only; `payload migrate` cannot bootstrap an empty
  DB). `pushDevSchema` writes a local `dev|-1` marker unconditionally — harmless
  locally, but it will re-trigger the migrate prompt if you later run step 3.5 after a
  dev session (reinforces the step-3.3 ordering). A warning-bearing drift on first dev
  prompts or silently exits in non-TTY (MEMORY §6 class). Refresh first to avoid the
  empty-DB bootstrap entirely.
- **Local `pnpm build` on an empty/unseeded DB** produces an empty search index
  (`generate:search-index` writes 0 records → empty `public/search-index-*.json`, which
  is gitignored so no commit risk, but the locally-served site has empty search). Seed
  before building, or pass prod inline env for local builds.
- **Wrong-cwd execution:** `file:./dev.db` is relative to the repo root. Running any
  step from a subdir connects to a different/empty file. Always `cd` to repo root
  first.
- **`.env` is agent-gated and should NOT be edited:** the `.env` file is denied to
  agents per `opencode.json` (`".env": "deny"`). This design uses `.env.local` instead
  (also agent-gated for writing, but no prod pair lives there — a mis-write only
  affects local dev). The human creates `.env.local`; if an agent implements this, it
  writes `.env.local` only after explicit approval.

## Testing

1. Create `.env.local` with `DATABASE_URI="file:./dev.db"` + `DATABASE_AUTH_TOKEN="local"`.
   Confirm `.env` (prod pair) is untouched and `pnpm dev` loads `.env.local`.
2. Run `pnpm dev`; confirm admin loads (empty schema first time, or prod data if seeded).
3. Seed from last night's R2 backup (full procedure §3); confirm `PRAGMA integrity_check`
   = ok and artists/posts/search/migrations counts are sane; admin shows prod data.
4. **Assert the headline risks are actually closed:**
   a. `git check-ignore dev.db dev.db-wal dev.db-shm dev.db.gz` — ALL must match
      (proves the public-repo leak is prevented).
   b. `sqlite3 dev.db "SELECT name,batch FROM payload_migrations;"` — must show the 4
      repo migrations and NO `dev|-1` (proves the migrate prompt/silent-cancel trap is
      closed).
5. Confirm the MCP re-key chain (§ Behavior Changes) — opencode MCP tools work again
   with tools enabled.
6. Confirm remote dev reads drop: monitor `turso db /usage` (dashboard) for
   `ksschoerke-development` over the following days — expect near-zero.
7. Run `pnpm test` — 1297 tests. Tests use their own `file:./test.db` (vitest.setup.ts
   defaults; nothing loads `.env` into tests). Assertion "unchanged pass" must be
   confirmed by actually running the suite, not assumed.

## Rollback Plan

1. Delete `.env.local` (or remove its two lines) — dev reverts to `.env`'s original
   remote dev pair automatically.
2. `pnpm dev` → back to remote dev behavior. Nothing else changes; `.env` (prod pair)
   was never touched.

## Follow-ups (explicitly out of scope for this change)

- Repoint or remove the on-demand dev-sync half of `scripts/db/backup-and-sync.sh`
  (currently wipes+reloads **remote** dev; obsolete once dev is local). During the
  transition, prefer `--skip-dev-sync` or invert the flag to `--sync-dev` opt-in.
- Once local dev is proven, optionally delete `ksschoerke-development` to reclaim the
  org-side quota surface entirely.
- Client-org migration (prod → client-owned Turso account) proceeds independently; this
  change reduces the migration's blast radius by making dev non-remote.

## Review Findings Incorporated (code-review pass, 2026-08-23)

Findings from the review that changed this spec:

1. **HIGH — WAL gap in the R2 backup (raised, then empirically resolved as a non-issue).**
   `turso db export` can emit a `.db-wal` companion; the nightly `upload_backup()`
   gzips only the `.db`. Concern: the main file may be behind its WAL. **Resolved
   2026-08-23** by two independent tests: (a) copying only the `.db` from an existing
   export pair yields identical row counts and passes `PRAGMA integrity_check`;
   (b) `export_prod()` already runs `sqlite3 "$out" "PRAGMA integrity_check;"` BEFORE
   gzip (backup-and-sync.sh:94) — that read-write open checkpoints any WAL into the
   main file, which is why the R2 artifact is complete. **No backup-script change
   required.** The non-actionable caveat ("check the WAL frame count on the R2
   artifact") was dropped — the WAL is never uploaded; completeness is guaranteed by
   the pre-gzip integrity-check step.
2. **HIGH — `.gitignore` `*.db` does not cover `dev.db-wal`/`dev.db-shm`.** Fixed above
   (§4): add `dev.db*` + `test.db*`.
3. **HIGH — MCP re-key is mandatory, not optional.** Fixed above (Behavior Changes §).
4. **MEDIUM — seed must stop `pnpm dev`, run `payload migrate` before `dev`.** Fixed (§3).
5. **MEDIUM — quota framing overstated.** ~60.6% after change, not "prevents BLOCKED"
   (preview builds also read prod). Fixed in Problem/Quota Math.
6. **MEDIUM — R2 creds not locally resolvable.** Fixed (§1: name `BACKUP_R2_*`, copy
   from GH secrets).
7. **MEDIUM — dev-sync footgun during transition.** Fixed (Non-Goals + Follow-ups:
   `--skip-dev-sync` or invert flag).
8. **LOW — "no test references DATABASE_URI" was false** (`vitest.setup.ts` sets a
   default). Fixed (Non-Goals + Testing).

## Quota math (basis)

- Free tier: 500M rows read / month. Aug usage: prod 302.8M + dev 77M = 379.8M (76%).
- This change removes the **dev server** reads (the dominant dev consumer) AND the
  `payload run`/`payload migrate` surface (reindex, wordpress migrations) via
  `.env.local` → the local file. Residual remote-dev reads are limited to `tsx`-run
  `scripts/db/*.ts` and any `NODE_ENV=production` contexts — deliberately kept remote
  to avoid prod-intent ambiguity; pass `DATABASE_URI="file:./dev.db"` inline to
  convert those too. Expect a significant reduction of the 77M → **~60-70% total**
  (estimate; confirm with per-DB `/usage` after the switch — the actual win may exceed
  this if `reindexSearch` was a notable consumer).
- This **delays** the `BLOCKED` ceiling; it does not eliminate it — prod reads
  (build-time static rendering, preview deploys, and post-launch traffic) continue
  against the 500M cap. Monitor per-DB `/usage` after the Sept 1 launch; a Turso paid
  tier may still be needed. The client-org migration (prod → its own quota) is the
  structural fix.