# Architectural Decision Record: Database Backup Strategy

**Date:** 2025-11-23  
**Status:** PROPOSED

## Context

We need a reliable backup strategy for our Turso database that balances:

- **Developer convenience** - Easy access to production-like data for local development
- **Disaster recovery** - Ability to restore data in case of catastrophic failure
- **Cost efficiency** - Minimize storage and maintenance costs
- **Simplicity** - Avoid over-engineering for a small-to-medium project

### Current State

- **Database:** Turso (distributed SQLite)
- **Manual backup tools:** JSON dump scripts via Payload API (`pnpm dump <collection>`)
- **Current dumps:** Stored in `data/dumps/` and tracked in git (~152KB total)
- **Collections:** Artists, Employees, Posts, Media, Recordings, etc.

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

### 1. Development Data (JSON Dumps in Git)

**Purpose:** Provide developers with sample production data for local testing

**Implementation:**

- Keep JSON dumps in `data/dumps/` tracked in git
- Manual updates when data structure changes significantly
- Used for: Onboarding new developers, testing migrations, reproducing bugs

**Cadence:** Manual (as needed, typically monthly or when schema changes)

**Collections to dump:**

- `artists-dump.json` - Core artist data with all relationships
- `employees-dump.json` - Team member data

**Rationale:**

- Files are small (~150KB) and compress well in git
- Version control shows data evolution over time
- Immediate access for any developer cloning the repo
- No external dependencies or credentials needed

### 2. Production Disaster Recovery (Turso Built-in Backups)

**Purpose:** Recover from catastrophic data loss or corruption

**Implementation:**

- Rely on Turso's built-in point-in-time recovery (24 hours)
- Periodic manual snapshots for major milestones: `turso db shell your-db ".backup backup-YYYY-MM-DD.db"`
- Store snapshots in secure location (not git) - consider S3 or similar

**Cadence:**

- Automatic (Turso's continuous backups)
- Manual snapshots: Before major deployments or schema migrations

**Rationale:**

- Turso handles backup infrastructure and reliability
- Point-in-time recovery sufficient for recent data loss
- Manual snapshots provide milestone rollback points
- No maintenance overhead or custom scripts needed

### 3. Optional: Automated JSON Backups (Future Enhancement)

**Purpose:** Regular snapshots of production data for audit trail

**Implementation:** (If needed in the future)

- GitHub Action runs monthly to dump all collections
- Commits to separate branch or external storage (not main)
- Provides historical record of data changes

**Rationale for deferring:**

- Not critical for current scale
- Manual dumps sufficient for development needs
- Turso backups handle disaster recovery
- Can implement if audit requirements emerge

## Consequences

### Positive

- **No additional infrastructure** - Uses existing tools (Payload, Turso, git)
- **Developer-friendly** - Easy access to production-like data
- **Cost-effective** - No backup storage costs beyond git/Turso
- **Simple mental model** - Each backup type has clear purpose
- **Flexibility** - JSON dumps are portable across database systems

### Negative

- **Manual effort required** - Developer must remember to update dumps periodically
- **Git repo size grows** - Dumps add ~150KB+ (acceptable for now, monitor over time)
- **Not continuous** - Git dumps are point-in-time, not real-time
- **Potential staleness** - Development dumps may lag behind production

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

### Recommended Workflow

1. **After significant data changes:**

   ```bash
   pnpm dump artists
   pnpm dump employees
   git add data/dumps/
   git commit -m "Update database dumps with latest production data"
   ```

2. **Before major schema migrations:**

   ```bash
   # Create Turso snapshot
   turso db shell your-db ".backup backup-$(date +%Y-%m-%d).db"

   # Store securely (example)
   aws s3 cp backup-2025-11-23.db s3://your-bucket/backups/
   ```

3. **New developer onboarding:**
   ```bash
   git clone repo
   pnpm install
   pnpm restore:artists-dump  # Loads sample production data
   pnpm dev
   ```

## Future Considerations

- If repo size becomes an issue, migrate dumps to Git LFS or external storage
- If compliance/audit requirements emerge, implement automated GitHub Action backups
- Consider adding more collections to dump script as data model grows
- Evaluate Turso's backup features as they evolve (versioning, longer retention, etc.)

## Related Documents

- [Database Selection ADR](2025-10-26-database-selection.md)
- [Cloudflare R2 Image Storage & Backup Design](../plans/2025-10-26-cloudflare-r2-image-storage-design.md) (similar
  pattern for media files)
