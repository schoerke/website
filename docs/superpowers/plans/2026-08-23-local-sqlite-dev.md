# Local SQLite Dev Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **This plan is unusual: it is mostly a manual runbook, not code.** The only code change is a `.gitignore` addition. Most steps are human-executed commands against local files, `.env.local`, the R2 bucket, and the local Payload admin. Mark "HUMAN" steps as done only after the human confirms the observed output matches Expected.

**Goal:** Run local dev against a plain local SQLite file (`file:./dev.db`) seeded from the nightly R2 prod backup, eliminating remote-dev reads on the Turso free-tier quota.

**Architecture:** A `.env.local` override (loaded by `pnpm dev` and all `payload ...` commands when `NODE_ENV !== 'production'`) points `DATABASE_URI` at `file:./dev.db`, keeping the shared `.env` (with its prod pair) untouched. Seed/refresh downloads last night's verified prod backup from R2, replaces `dev.db`, clears the `dev|-1` migration marker, applies any pending migrations, then starts dev. Remote `ksschoerke-development` is retained for rollback.

**Tech Stack:** Payload CMS 3.88 sqlite adapter, `@libsql/client` (file: URLs), Turso CLI, aws CLI (R2), sqlite3, Next.js env loading (`@next/env`).

**Spec:** `docs/superpowers/specs/2026-08-23-local-sqlite-dev-design.md` — read it first; every task below implements a section of it.

**Worktree rule:** implement on a branch (e.g. `feat/local-sqlite-dev`), never directly on `main`. Do not commit or push anything without explicit user approval.

---

### Task 0: Branch + baseline verification

**Files:** none

- [ ] **Step 1: Create the work branch**

```bash
git checkout -b feat/local-sqlite-dev
```

- [ ] **Step 2: Confirm baseline state**

```bash
git status --short
```
Expected: only the untracked spec file (`?? docs/superpowers/specs/2026-08-23-local-sqlite-dev-design.md`). No other changes.

- [ ] **Step 3: Confirm the spec is present**

```bash
test -f docs/superpowers/specs/2026-08-23-local-sqlite-dev-design.md && echo "spec present"
```
Expected: `spec present`.

---

### Task 1: `.gitignore` — prevent public leak of local SQLite artifacts

**Files:**
- Modify: `.gitignore`

**Why:** libsql opens `file:` DBs in WAL mode, producing `dev.db-wal`/`dev.db-shm` which `*.db` (line 48) does NOT cover. Repo is public — `git add -A` would commit live content data. Verified: `git check-ignore dev.db dev.db-wal dev.db-shm dev.db.gz` currently returns only `dev.db`.

- [ ] **Step 1: Add the patterns**

Append to `.gitignore`:

```
# Local SQLite dev DB + WAL/SHM/journal companions (libsql opens file: DBs in WAL mode)
*.db-wal
*.db-shm
*.db-journal
dev.db*
test.db*
```

- [ ] **Step 2: Verify every artifact is now ignored**

```bash
git check-ignore dev.db dev.db-wal dev.db-shm dev.db.gz test.db test.db-wal
```
Expected: ALL paths listed (exit 0 for every one). If any is missing, the pattern is wrong — fix before continuing.

- [ ] **Step 3: Confirm no tracked file is accidentally ignored**

```bash
git ls-files | grep -E "\.(db|db-wal|db-shm|db-journal)$" | head
```
Expected: no output (nothing tracked matches the new patterns).

- [ ] **Step 4: Run the test suite to confirm no collateral**

```bash
pnpm test
```
Expected: 1297 tests pass (tests use their own `file:./test.db`, unaffected).

- [ ] **Step 5: Commit (requires user approval per repo policy)**

```bash
git add .gitignore
git commit -m "chore(db): gitignore local SQLite dev artifacts (WAL/SHM/journal)"
```

---

### Task 2: Create `.env.local` (HUMAN — agent-gated file)

**Files:**
- Create: `.env.local` (gitignored, agent-permission denied per `opencode.json` `".env": "deny"`)

**Why this mechanism:** `.env.local` overrides `.env` (verified `@next/env` load order: `.env.<mode>.local` → `.env.local` → `.env.<mode>` → `.env`, first-wins). The shared `.env` (active remote-dev pair + commented prod pair) is NEVER touched, so local prod-intent tooling under `NODE_ENV=production` keeps the remote value.

- [ ] **Step 1: Create the file (HUMAN — type this yourself, or explicitly approve an agent doing it)**

Create `.env.local` in the repo root with exactly:

```
DATABASE_URI="file:./dev.db"
DATABASE_AUTH_TOKEN="local"
```

(`"local"` is a placeholder — `payload.config.ts:45` requires the var to exist; the value is ignored for `file:` URIs. Verified: no storage/email adapter reads it at dev time.)

- [ ] **Step 2: Verify `.env` was NOT modified (prod pair intact)**

```bash
grep -n "DATABASE_URI\|DATABASE_AUTH_TOKEN" .env | sed 's/=.*/=<redacted>/'
```
Expected: exactly two pairs — one active (line ~2-3), one commented prod pair (line ~6-7). The active value should still be the REMOTE dev `libsql://` URI. If the active value changed, restore it.

- [ ] **Step 3: Verify `.env.local` is gitignored and untracked**

```bash
git check-ignore .env.local && git status --short .env.local
```
Expected: `git check-ignore` lists `.env.local`; `git status` shows no tracked change for it.

---

### Task 3: First-run bootstrap test (HUMAN)

**Files:** none (creates `dev.db` locally, gitignored)

**Why:** validates the mechanism end-to-end on an empty DB before seeding real data.

- [ ] **Step 1: Start dev against the empty local file**

```bash
pnpm dev
```
Expected (first run): Payload schema-pushes to the new `dev.db`, admin loads at `http://localhost:3000/admin`. Note: bootstrap only works via pushDevSchema (the baseline migration is snapshot-only; `payload migrate` cannot bootstrap an empty DB). A warning-bearing drift prompts or silently exits in non-TTY — if that happens, delete `dev.db` and retry.

- [ ] **Step 2: Confirm the local file exists and WAL companions are ignored**

```bash
ls -la dev.db* 2>&1
git check-ignore dev.db dev.db-wal dev.db-shm
```
Expected: `dev.db` (and possibly `dev.db-wal`/`dev.db-shm`) present locally; all ignored by git.

- [ ] **Step 3: Stop dev**

```bash
# Ctrl-C the pnpm dev process
```

- [ ] **Step 4: Confirm `payload_migrations` now has a local `dev|-1` marker (expected, harmless)**

```bash
sqlite3 dev.db "SELECT name, batch FROM payload_migrations;" | grep dev
```
Expected: a `dev` row (batch -1). This is pushDevSchema's marker — harmless locally, but it will re-trigger the migrate prompt later unless cleared (Task 5 step 3.3 handles it).

---

### Task 4: Seed from the nightly R2 prod backup (HUMAN)

**Files:** creates `dev.db.gz` → `dev.db` (gitignored)

**Why:** replaces the empty bootstrap DB with last night's verified prod snapshot, giving real data for local dev.

**Prereq:** R2 creds. `BACKUP_R2_ACCESS_KEY`/`BACKUP_R2_SECRET`/`BACKUP_R2_ENDPOINT` live only in GitHub Actions secrets (not `.env`/`.env.local` — the local `CLOUDFLARE_S3_*` creds are for the Documents bucket and CANNOT read `schoerke-website-backup`). Copy the three values from GH secrets into your shell. **Export them in the shell, not inline per command** (avoids shell history).

- [ ] **Step 1: Stop dev (must be stopped before replacing dev.db — split-brain otherwise)**

```bash
# Ctrl-C pnpm dev if running
```

- [ ] **Step 2: Export R2 creds and list the latest backup**

```bash
export BACKUP_R2_ACCESS_KEY="<from GH secrets>"
export BACKUP_R2_SECRET="<from GH secrets>"
export BACKUP_R2_ENDPOINT="<from GH secrets>"
aws s3 ls s3://schoerke-website-backup/backups/ --endpoint-url "$BACKUP_R2_ENDPOINT"
```
Expected: one or more `ksschoerke-production-<TIMESTAMP>.db.gz` objects. Note the LATEST name — it's `<LATEST>` below.

- [ ] **Step 3: Download + decompress atomically, clear stale companions**

```bash
aws s3 cp s3://schoerke-website-backup/backups/ksschoerke-production-<LATEST>.db.gz \
  --endpoint-url "$BACKUP_R2_ENDPOINT" ./dev.db.gz
gunzip -c dev.db.gz > dev.db.new && mv dev.db.new dev.db
rm -f dev.db-wal dev.db-shm dev.db.gz
```
(Atomic replace: `gunzip -c > dev.db.new && mv` avoids a partial-file `dev.db`; the `rm` clears stale WAL/SHM from any prior session.)

- [ ] **Step 4: Sanity check — integrity + several key tables (not a single-sample)**

```bash
sqlite3 dev.db "PRAGMA integrity_check;"
sqlite3 dev.db "SELECT 'artists', COUNT(*) FROM artists UNION ALL
                SELECT 'posts', COUNT(*) FROM posts UNION ALL
                SELECT 'search', COUNT(*) FROM search UNION ALL
                SELECT 'payload_migrations', COUNT(*) FROM payload_migrations;"
```
Expected: `integrity_check` = `ok`; artists/posts/search return sane nonzero counts; `payload_migrations` count present. If integrity fails, delete `dev.db` and re-download (self-healing).

- [ ] **Step 5: Guard — clear `dev|-1`, assert real migrations present**

```bash
sqlite3 dev.db "SELECT name, batch FROM payload_migrations;"
sqlite3 dev.db "DELETE FROM payload_migrations WHERE name='dev';"
sqlite3 dev.db "SELECT name FROM payload_migrations ORDER BY name;"
```
Expected: BEFORE delete — may show only `dev|-1` (verified: the Aug-15 prod export carried only `dev|-1`; this is the MEMORY §4.3 trap). AFTER delete — the 4 repo migrations listed: `20260815_artist_repertoire_ordering`, `20260816_ensure_employee_email_unique`, `20260819_localize_artist_biography_pdf`, `20260820_localize_video_link_label`. If they're missing, the next step re-runs them.

- [ ] **Step 6: Apply any pending repo migrations (repo-root cwd required)**

```bash
cd <repo-root>
DATABASE_URI="file:./dev.db" DATABASE_AUTH_TOKEN="local" NODE_ENV=production \
  pnpm payload migrate
```
Expected: applies any migrations the seeded file lacks; exits 0. If it prompts interactively ("data loss will occur"), the `dev|-1` delete in step 5 failed — stop and re-check.

---

### Task 5: MCP re-key (HUMAN — admin UI)

**Files:** `~/.config/opencode/secrets/payload-mcp.key` (outside repo)

**Why:** the seeded prod DB has NO `payload_mcp_api_keys` table (MCP is `NODE_ENV !== 'production'` gated; prod disables it). First dev schema-push created it EMPTY; `opencode.json:9` sends `Authorization: Bearer {file:...payload-mcp.key}` → empty table → 401 on every MCP tool until re-keyed. NEW keys grant ZERO tools by default — must enable `find` per collection.

- [ ] **Step 1: Start dev and log into local admin**

```bash
pnpm dev
# browse http://localhost:3000/admin, log in as a seeded prod user
# (Users collection is plain auth; prod password hashes port over — login works)
```

- [ ] **Step 2: Create the MCP API key (HUMAN — admin UI)**

Go to admin → the MCP API keys collection (system group) → Create. Give it a name.

- [ ] **Step 3: Enable tools on the key (CRITICAL — defaults are all OFF)**

Expand each of the 8 collection collapsibles (artists, employees, pages, posts, recordings, repertoire, images, documents) AND the home-page global; tick the `find` checkbox on each. A key without this authenticates but has ZERO tools. Save.

- [ ] **Step 4: Write the key to the opencode secret file**

```bash
# HUMAN — paste the key value into the file (not through chat)
# e.g. via a password manager + editor; the file path is:
ls ~/.config/opencode/secrets/payload-mcp.key
# overwrite its contents with the new key value
```

- [ ] **Step 5: Restart opencode MCP client (HUMAN)**

The MCP connection is cached per session — restart opencode (or reconnect MCP) so it re-reads the key file.

- [ ] **Step 6: Verify MCP tools work**

In opencode, call one of the `payload_find*` tools (e.g. `payload_findArtists`). Expected: returns data (reads the LOCAL dev.db now). If 401, the key file or enabled-tools step was wrong — re-check steps 2-4.

---

### Task 6: Verify the quota win + tests (HUMAN observation)

**Files:** none

- [ ] **Step 1: Confirm remote dev reads drop over time**

Monitor the Turso dashboard `/usage` for `ksschoerke-development`. Expected: reads trend toward near-zero (dev server + payload-run surface now hit local; only `tsx`-run `scripts/db/*.ts` and `NODE_ENV=production` contexts still hit remote dev). Give it a few days.

- [ ] **Step 2: Confirm the two headline risks are closed**

```bash
git check-ignore dev.db dev.db-wal dev.db-shm dev.db.gz   # all must match
sqlite3 dev.db "SELECT name,batch FROM payload_migrations;"  # 4 repo migrations, no dev|-1
```
Expected: all four git-check-ignore paths match; migrations show the 4 repo migrations and no `dev|-1` row.

- [ ] **Step 3: Full test suite**

```bash
pnpm test
```
Expected: 1297 pass. Tests use their own `file:./test.db`, unaffected by `.env.local`.

---

### Task 7: Rollback drill (optional, low-effort insurance)

**Files:** `.env.local`

- [ ] **Step 1: Temporarily disable the local override**

```bash
mv .env.local /tmp/.env.local.bak
```

- [ ] **Step 2: Confirm dev reverts to remote**

```bash
pnpm dev
```
Expected: connects to remote `ksschoerke-development` (admin loads, reads come from remote). Restore:

```bash
mv /tmp/.env.local.bak .env.local
```

---

### Task 8: Follow-up decision — dev-sync flag inversion (deferred, NOT part of this change)

**Why:** the on-demand dev-sync half of `scripts/db/backup-and-sync.sh` still targets REMOTE dev. During the transition, plain `bash scripts/db/backup-and-sync.sh --apply` (its documented default) wipes+reloads remote dev — a footgun. The spec defers this as follow-up; recommend either always `--skip-dev-sync` during transition, or invert the flag to `--sync-dev` opt-in. **Not implemented in this plan.**

---

## Plan Self-Review

**Spec coverage:** every spec section maps to a task — `.gitignore` (§4) → Task 1; `.env.local` (§1) → Task 2; bootstrap (§3/Error Handling) → Task 3; seed procedure (§3 full: atomic replace, dev|-1 guard, migrate) → Task 4; MCP re-key (Behavior Changes) → Task 5; Testing + quota verification → Task 6; Rollback (§Rollback) → Task 7; Follow-ups → Task 8. The WAL finding (resolved non-issue) requires no task — correctly absent.

**Placeholder scan:** `<LATEST>` in Task 4 is explicitly "from the listing in Step 2" — a fill-in-at-execution value, not a plan gap. No TBD/TODO.

**Human-gated steps:** Tasks 2-6 are marked HUMAN — they touch `.env.local` (agent-denied), the admin UI, the opencode secret file, and require observation. This is intentional and matches the repo's `.env`-deny policy; an agent can execute Task 1 (gitignore) and assist with verification commands in the human tasks.

**Sequencing:** Task 4 (seed) must come after Task 3 (bootstrap) and Task 5 (MCP) after Task 4 — data must exist for MCP re-key login. Rollback (Task 7) is last.