# Architectural Decision Record: Database Backup Strategy

**Date:** 2025-11-23  
**Last Updated:** 2026-04-22  
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

**Implementation:** (Planned — not yet implemented)

- GitHub Action runs nightly (e.g. 02:00 UTC)
- Dumps `ksschoerke-production` using `turso db shell ... .dump`
- Compresses dump with gzip
- Uploads to Cloudflare R2: `backups/ksschoerke-production-YYYY-MM-DD.sql.gz`
- Deletes backups older than 30 days from R2
- Restores latest dump into `ksschoerke-development`

**Cadence:** Nightly (automated)

**Storage estimate:**

- Current dump size: ~3.1 MB uncompressed, ~0.3 MB gzipped
- 30 days × ~0.3 MB = ~9 MB total — well within R2's free tier (10 GB)
- Even at 10× database growth: ~90 MB, still negligible

**Storage location:** Cloudflare R2 (already used for documents — same credentials)

**Retention:** 30 days

**Rationale:**

- Development always reflects real production data
- No manual effort to keep dev in sync
- R2 already integrated — no new infrastructure or credentials needed
- Unlimited egress means recovery downloads are free
- Compressed dumps are tiny — 30-day retention costs nothing

### 2. Production Disaster Recovery (Turso Built-in Backups)

**Purpose:** Recover from catastrophic data loss or corruption

**Implementation:**

- Rely on Turso's built-in point-in-time recovery (24 hours)
- Periodic manual snapshots for major milestones: `turso db shell ksschoerke-production ".backup backup-YYYY-MM-DD.db"`
- Store snapshots in secure location (not git) - consider S3 or similar

**Cadence:**

- Automatic (Turso's continuous backups)
- Manual snapshots: Before major deployments or schema migrations

**Rationale:**

- Turso handles backup infrastructure and reliability
- Point-in-time recovery sufficient for recent data loss
- Manual snapshots provide milestone rollback points
- No maintenance overhead or custom scripts needed

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

- **Nightly sync not yet implemented** - Currently manual
- **Git repo size grows** - Dumps add ~150KB+ (acceptable for now, monitor over time)
- **Not continuous** - Git dumps are point-in-time, not real-time

### Monitoring

- **Git repo size** - If `data/dumps/` exceeds 1MB, consider gitignoring and using external storage
- **Dump freshness** - Review dump dates quarterly to ensure they're reasonably current
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

- **Implement nightly GitHub Action** — automate production backup to R2 and dev sync (next priority)
- If repo size becomes an issue, migrate dumps to Git LFS or external storage
- Consider adding more collections to dump script as data model grows
- Evaluate Turso's backup features as they evolve (versioning, longer retention, etc.)

## Related Documents

- [Database Selection ADR](2025-10-26-database-selection.md)
- [ADR: Storage Migration to Vercel Blob](2025-11-29-storage-migration-vercel-blob.md)
- [ADR: Dual Storage R2 + Vercel Blob](2025-12-10-dual-storage-r2-vercel-blob.md)
