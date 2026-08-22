# Architectural Decision Record: Database Backup Strategy

**Date:** 2025-11-23  
**Last Updated:** 2026-08-22  
**Status:** ACTIVE

## Context

We need a reliable backup strategy for our Turso database that balances:

- **Developer convenience** - Easy access to production-like data for local development
- **Disaster recovery** - Ability to restore data in case of catastrophic failure
- **Cost efficiency** - Minimize storage and maintenance costs
- **Simplicity** - Avoid over-engineering for a small-to-medium project

### Current State

- **Databases:**
  - `ksschoerke-production` (`libsql://ksschoerke-production-zeitchef.aws-eu-west-1.turso.io`) — live client database
  - `ksschoerke-development` (`libsql://ksschoerke-development-zeitchef.aws-eu-west-1.turso.io`) — development database, kept in sync with production via nightly backup
- **Collections:** Artists, Employees, Images, Documents, Posts, Recordings, Search

### Backup Methods Considered

1. **JSON dumps via Payload API** (current approach)
   - Human-readable, version-controllable JSON
   - Works across any database (portable)
   - Uses Payload's validation and transformation
   - Can be stored in git or external storage

2. **Turso native backups**
   - Built-in point-in-time recovery (24 hours on paid plans)
   - Manual snapshots via CLI: `turso db shell your-db ".backup backup.db"`
   - SQLite-native format (binary)
   - Faster restore for complete database

3. **Automated GitHub Actions**
   - Scheduled dumps committed to git
   - Automatic, hands-off backups
   - Full git history of data changes

## Decision

We will use a **hybrid backup strategy** combining multiple approaches for different purposes:

### 1. Nightly Production Backup + Development Sync

**Purpose:** Back up production data to Cloudflare R2 and keep development database in sync

Design (2026-08-22, Approach A; supersedes the earlier draft; hardened 2026-08-22 after code-review pass —
see "Review findings incorporated" below): implemented as a single GitHub Actions workflow
`.github/workflows/db-backup.yml`.

- GitHub Action runs nightly (02:00 UTC) + manual `workflow_dispatch`. GH Actions `schedule` cron is known
  to slip 10-40+ min under runner load — acceptable for a nightly job, unlike Vercel Hobby's ±59 min
  precision cap which ruled out that path (see below).
- Uses Turso CLI (installed in workflow): `turso db export ksschoerke-production --output-file
  ksschoerke-production-<timestamp>.db` (full binary SQLite snapshot — the only artifact that satisfies
  the full-snapshot requirement)
- **Sanity-check the export before trusting it:** assert file size above a floor (e.g. >100 KB) and run
  `sqlite3 <file> "PRAGMA integrity_check"` before proceeding. A 0-byte or truncated export must fail the
  job loudly, not silently propagate.
- Compresses with gzip, uploads to a dedicated Cloudflare R2 bucket under `backups/` using a **scoped R2
  credential** (Object Read & Write on that bucket only, not the Documents collection's credential) —
  confirm after upload with `aws s3api head-object` before treating the backup as complete.
- Retention cleanup runs **only if the backup step succeeded** (`if: success()`), and always retains at
  least the single most recent successful backup regardless of age — deletes R2 objects under `backups/`
  older than 30 days otherwise.
- **Dev sync uses in-place wipe with hardened safeguards, not build-fresh-then-swap** (implementation
  decision, 2026-08-22): a true swap would require repointing `ksschoerke-development`'s connection details
  for every local developer's `.env` — there's no Vercel-hosted consumer of dev to repoint programmatically,
  and Turso's free tier doesn't cleanly support a throwaway-DB-plus-DNS/rename workflow without extra
  tokens. Disproportionate for a nightly job on a 3MB sandbox database. Implemented instead: pre-wipe
  rollback snapshot + single-session wipe (PRAGMA OFF + all DROPs + PRAGMA ON as one `turso db shell`
  invocation, avoiding any cross-connection PRAGMA-persistence question entirely — the empirical test this
  ADR originally called for is moot given this design) + mandatory post-wipe assertion before any load.
- The wipe loop asserts `SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE 'payload_mcp%'` equals `0` **before** running the load step, aborting the job otherwise
  — per the incident lesson in `MEMORY.md` §4.2 that FK-ordering can silently skip DROPs.
- **Verification must cover every restored table, not a sample:** loop over all tables in `sqlite_master`
  (excluding `payload_mcp_api_keys`) comparing `COUNT(*)` prod vs. the restored copy; fail the job loudly
  on any mismatch. Do not hardcode a single-table check (e.g. `artists` only, as the manual docs
  illustrate) — junction/rels and versions tables (`_posts_v`, `artists_rels`, etc.) are the likely blind
  spot for silent drift.
- **`payload_mcp_api_keys` exclusion is dynamic, not hardcoded to one name** — exclude any table matching
  `payload_mcp%` (`SELECT name FROM sqlite_master WHERE name LIKE 'payload_mcp%'`) so a future MCP plugin
  upgrade that adds auxiliary tables (e.g. a rels/join table) doesn't get silently wiped. dev-only (MCP
  plugin is disabled in production); prod dump has no such tables so the restore cannot touch them. Note:
  if a plugin upgrade changes this table's schema, the stale preserved copy could conflict with
  `pushDevSchema` on the next `pnpm dev` — accepted risk, documented here rather than solved.
- Failure notification: GitHub native failed-run email (zero config). Because step names are distinct
  (export / sanity-check / upload / retention / dev-sync / verify), the failed-step name in the email
  signals which failure mode occurred — critically, if the swap pattern above is used, "job failed" never
  means "dev is currently empty," since the swap only happens after full verification.

**Review findings incorporated (code-reviewer pass, 2026-08-22):** post-wipe verification gate; swap
instead of in-place wipe; PRAGMA persistence caveat; dynamic MCP-table exclusion; all-table verification
instead of a sample; export sanity checks (size floor + integrity check + post-upload HEAD); retention
cleanup gated on backup success and never deleting the last good backup; scoped R2 credential instead of
reusing the Documents collection's full credential; GH Actions schedule-drift caveat. Full findings are in
session history; not duplicated verbatim here to keep the ADR readable — re-review before writing the
workflow YAML if any of the above is unclear.

**Why GitHub Actions, not Payload scheduled jobs** (evaluated 2026-08-22):

- Full binary `.db` snapshot requires the Turso CLI — unavailable inside a Vercel serverless function.
  Payload jobs on serverless can only produce the portable SQL via the Turso HTTP `GET /dump` endpoint,
  not a binary snapshot (Turso Platform API has no snapshot/export endpoint).
- Payload `jobs.autoRun` is explicitly unsupported on serverless platforms — schedules must be triggered
  externally (Vercel Cron / GH Actions) regardless. So Payload jobs does not remove the external cron; it
  sits behind it.
- Vercel Hobby cron: once/day max + ±59 min precision — usable, but adds a second scheduler and still
  cannot produce the snapshot artifact.
- Repo is public → GitHub Actions minutes free/unlimited.
- Payload MCP plugin (`@payloadcms/plugin-mcp`, src/payload.config.ts:98) is an AI-agent API surface
  (`find`-only, dev-only), **not** a job scheduler — no cron, no background execution, cannot run CLI
  exports. Not applicable to backup automation; its `payload_mcp_api_keys` table is the one dev-only table
  that must be preserved across dev syncs.

**Required secrets** (all set as GitHub repo secrets, 2026-08-22): `TURSO_PROD_TOKEN` and `TURSO_DEV_TOKEN`
— **two per-database tokens, not one shared/org-wide token** (resolved: least-privilege over convenience —
a leaked or rotated token affects only one database, not both). R2 target: a **new, scoped** credential
(`BACKUP_R2_BUCKET`/`BACKUP_R2_ACCESS_KEY`/`BACKUP_R2_SECRET`/`BACKUP_R2_ENDPOINT`) limited to bucket
`schoerke-website-backup` (Cloudflare R2 tokens scope to a bucket, not a prefix — a dedicated bucket was
created instead of trying to scope to `backups/` within the shared Documents-collection bucket). Granted
permission is Cloudflare's "Object Read & Write" tier (read+write+list — Cloudflare doesn't offer a
PUT/DELETE-only granular tier; the script's `list-objects-v2`/`head-object` calls need list+read anyway) —
does not reuse `CLOUDFLARE_S3_ACCESS_KEY`/`CLOUDFLARE_SECRET` from the Documents collection.

**Cadence:** Nightly (automated)

**Storage estimate:**

- Current dump size: ~3.1 MB uncompressed, ~0.3 MB gzipped
- 30 days × ~0.3 MB = ~9 MB total — well within R2's free tier (10 GB)
- Even at 10× database growth: ~90 MB, still negligible

**Storage location:** Cloudflare R2, dedicated bucket `schoerke-website-backup` (separate from the
Documents collection's bucket/credential — see "Required secrets" above)

**Retention:** 30 days — chosen deliberately, not just because storage is cheap. See §2: on Turso's free
tier, PITR only covers the last 24 hours, so this is the primary recovery window past that point, not a
redundant extra.

**Rationale:**

- Development always reflects real production data (except deliberately dev-only tables)
- No manual effort to keep dev in sync
- R2 already integrated — no new infrastructure or credentials needed
- Unlimited egress means recovery downloads are free
- Compressed dumps are tiny — 30-day retention costs nothing, but retention length was chosen for recovery
  value (see §2), not storage cost

### 2. Production Disaster Recovery (Turso Built-in Backups)

**Purpose:** Recover from catastrophic data loss or corruption

**Project is on Turso's free tier: PITR window is 24 hours, not the 10/30/90 days available on paid plans**
(Developer/Scaler/Pro). This means Turso's own recovery only covers "something broke in the last day" —
anything older is entirely dependent on §1's R2 nightly snapshots, which are therefore not a belt-and-
suspenders extra but the **primary recovery mechanism past the 24h mark**. Note also that even within the
24h window, `turso db create --from-db --timestamp` restores into a **new** database, not in-place — same
repoint/swap step as restoring from an R2 snapshot.

**Implementation:**

- Rely on Turso's built-in point-in-time recovery (24 hours on the free tier)
- Periodic manual snapshots for major milestones: `turso db shell ksschoerke-production ".backup backup-YYYY-MM-DD.db"`
- Store snapshots in secure location (not git) - consider S3 or similar

**Cadence:**

- Automatic (Turso's continuous backups, 24h window on free tier)
- Manual snapshots: Before major deployments or schema migrations

**Rationale:**

- Turso handles backup infrastructure and reliability for the last 24 hours
- Beyond 24 hours, §1's nightly R2 snapshot is load-bearing — this is why 30-day retention there matters
  more than its trivial storage cost would suggest
- Manual snapshots provide milestone rollback points
- No maintenance overhead or custom scripts needed for the 24h window; upgrading the Turso plan would
  extend it but isn't necessary given §1 covers the same need at negligible cost

### 3. JSON Dumps in Git

**Purpose:** Portable, human-readable snapshots for onboarding and debugging

**Implementation:**

- Keep JSON dumps in `data/dumps/` tracked in git
- Manual updates when data structure changes significantly
- Used for: Onboarding, testing migrations, reproducing bugs

**Cadence:** Manual (as needed, typically after significant data changes)

**Collections to dump:**

- `artists-dump.json` - Core artist data with all relationships
- `employees-dump.json` - Team member data

**Rationale:**

- Files are small and compress well in git
- Version control shows data evolution over time
- Immediate access for any developer cloning the repo
- No external dependencies or credentials needed

## Consequences

### Positive

- **No additional infrastructure** - Uses existing tools (Payload, Turso, git)
- **Developer-friendly** - Easy access to up-to-date production data
- **Cost-effective** - No backup storage costs beyond git/Turso
- **Simple mental model** - Each backup type has clear purpose
- **Flexibility** - JSON dumps are portable across database systems

### Negative

- **Nightly workflow designed, not yet written** — `.github/workflows/db-backup.yml` does not exist yet;
  §1 above is the design to implement
- **JSON dumps in git** (§3) — git repo size grows as dumps are added (~150KB+, acceptable for now,
  monitor over time); this is separate from and unaffected by the R2-based nightly snapshot in §1
- **Not continuous** - snapshots (both git JSON dumps and nightly R2 backups) are point-in-time, not
  real-time

### Monitoring

- **Git repo size** (§3 JSON dumps only) — if `data/dumps/` exceeds 1MB, consider gitignoring and using
  external storage. Not applicable to §1's R2-based nightly snapshots, which never touch git.
- **Dump freshness** - Review §3 JSON dump dates quarterly to ensure they're reasonably current
- **Nightly workflow health** (§1) - GitHub Actions run history + native failure email; also spot-check R2
  `backups/` prefix periodically for the expected 30-day rolling set of objects
- **Turso backup usage** - Verify Turso backups are functioning via dashboard

## Implementation Notes

### Current Scripts

```bash
# Export collection to JSON
pnpm dump artists      # → data/dumps/artists-dump.json
pnpm dump employees    # → data/dumps/employees-dump.json

# Restore from dump
pnpm restore:artists-dump
```

### Manual Production → Development Sync

```bash
# Dump production to local file
turso db shell ksschoerke-production .dump > /tmp/ksschoerke-prod-dump.sql

# Restore into development
turso db shell ksschoerke-development < /tmp/ksschoerke-prod-dump.sql

# Clean up
rm /tmp/ksschoerke-prod-dump.sql
```

### Restoring Production from R2 Backup

```bash
# 1. Download backup from R2
aws s3 cp s3://your-r2-bucket/backups/ksschoerke-production-YYYY-MM-DD.sql.gz /tmp/backup.sql.gz \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# 2. Decompress
gunzip /tmp/backup.sql.gz

# 3. Restore into a fresh database (recommended - avoids conflicts)
#    Create a new Turso database, restore, then update DNS/env vars
turso db shell ksschoerke-production < /tmp/backup.sql

# 4. Clean up
rm /tmp/backup.sql
```

> **Note:** If restoring to an existing database with data, drop all tables first or create a new database and swap `DATABASE_URI` in Vercel environment variables.

### Before Major Schema Migrations

```bash
# Create Turso snapshot of production
turso db shell ksschoerke-production ".backup backup-$(date +%Y-%m-%d).db"

# Store securely (example)
aws s3 cp backup-$(date +%Y-%m-%d).db s3://your-bucket/backups/
```

### New Developer Onboarding

```bash
git clone repo
pnpm install
pnpm restore:artists-dump  # Loads sample production data
pnpm dev
```

## Future Considerations

- **Implement nightly GitHub Action** (designed 2026-08-22 — see §1 above; pending secrets + workflow)
- If repo size becomes an issue, migrate dumps to Git LFS or external storage
- Consider adding more collections to dump script as data model grows
- Evaluate Turso's backup features as they evolve (versioning, longer retention, etc.)

## Related Documents

- [Database Selection ADR](2025-10-26-database-selection.md)
- [ADR: Storage Migration to Vercel Blob](2025-11-29-storage-migration-vercel-blob.md)
- [ADR: Dual Storage R2 + Vercel Blob](2025-12-10-dual-storage-r2-vercel-blob.md)
