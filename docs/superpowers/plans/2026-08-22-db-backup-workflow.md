# Nightly Database Backup + Dev Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nightly GitHub Actions workflow that snapshots `ksschoerke-production` (full binary SQLite via
`turso db export`) to Cloudflare R2 with 30-day retention, then refreshes `ksschoerke-development` from that
snapshot — safely, with verification gates and a rollback artifact, unattended.

**Architecture:** One bash script (`scripts/db/backup-and-sync.sh`) holding all logic, invoked by one GitHub
Actions workflow (`.github/workflows/db-backup.yml`) on a nightly cron + manual dispatch. The script is
callable locally for dry-run testing against dev before the cron is ever enabled.

**Tech Stack:** Turso CLI, `aws` CLI (S3-compatible, pointed at R2), `sqlite3` (integrity check), bash,
GitHub Actions.

**Reference:** `docs/adr/2025-11-23-database-backup-strategy.md` §1 — read this first, it documents every
design decision and the code-review findings this plan implements fixes for.

---

## Task 0: Manual prerequisites (human action required — cannot be automated)

These credentials must exist before Task 5's workflow can run. Per this repo's policy, credentials are
never agent-generated — the human operator creates them and adds them as GitHub repo secrets.

- [ ] **Step 1: Create two scoped Turso tokens (not one broad org token)**

Per ADR Finding 7: least-privilege means one token per database, not a single org-wide token.

```bash
turso db tokens create ksschoerke-production   # -> TURSO_PROD_TOKEN
turso db tokens create ksschoerke-development   # -> TURSO_DEV_TOKEN
```

- [ ] **Step 2: Create a scoped Cloudflare R2 API token**

In the Cloudflare dashboard, create a new R2 API token limited to the existing bucket's `backups/` prefix,
with `PUT` + `DELETE` + `GET`/`HEAD` only (not the full-bucket credential the Documents collection uses).
Record: access key ID, secret, endpoint, bucket name.

- [ ] **Step 3: Add GitHub repository secrets**

Settings → Secrets and variables → Actions → New repository secret. Add all of:

| Secret name | Value |
| --- | --- |
| `TURSO_PROD_TOKEN` | from Step 1 |
| `TURSO_DEV_TOKEN` | from Step 1 |
| `BACKUP_R2_BUCKET` | from Step 2 |
| `BACKUP_R2_ACCESS_KEY` | from Step 2 |
| `BACKUP_R2_SECRET` | from Step 2 |
| `BACKUP_R2_ENDPOINT` | from Step 2 |

Deliberately named `BACKUP_R2_*` (not `CLOUDFLARE_S3_*`) so it's obvious in the workflow file that this is
a separate, scoped credential from the app's Documents-collection storage config.

- [ ] **Step 4: Confirm with the user before continuing**

Do not proceed to Task 1 until the user confirms all six secrets are set. The script in Task 1 onward
assumes they exist.

---

## Task 1: Script skeleton + prod export + sanity checks

**Files:**
- Create: `scripts/db/backup-and-sync.sh`

- [ ] **Step 1: Write the script skeleton with strict mode and argument parsing**

```bash
#!/bin/bash
# scripts/db/backup-and-sync.sh
#
# Nightly production backup + development sync.
# Exports ksschoerke-production to a binary SQLite snapshot, uploads it (gzipped) to
# Cloudflare R2, prunes backups older than RETENTION_DAYS (always keeping the most
# recent success), then refreshes ksschoerke-development from the same snapshot.
#
# Usage:
#   scripts/db/backup-and-sync.sh --dry-run          # report what would happen, no writes
#   scripts/db/backup-and-sync.sh --apply             # do it for real (backup + dev sync)
#   scripts/db/backup-and-sync.sh --apply --skip-dev-sync   # backup only
#
# Required env vars: TURSO_PROD_TOKEN, TURSO_DEV_TOKEN, BACKUP_R2_BUCKET,
#   BACKUP_R2_ACCESS_KEY, BACKUP_R2_SECRET, BACKUP_R2_ENDPOINT
# Optional env vars: RETENTION_DAYS (default 30)
#
# See docs/adr/2025-11-23-database-backup-strategy.md §1 for the full design.

set -euo pipefail

PROD_DB="ksschoerke-production"
DEV_DB="ksschoerke-development"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

DRY_RUN=true
SKIP_DEV_SYNC=false
for arg in "$@"; do
  case "$arg" in
    --apply) DRY_RUN=false ;;
    --dry-run) DRY_RUN=true ;;
    --skip-dev-sync) SKIP_DEV_SYNC=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

log() { echo "[$(date -u +%H:%M:%S)] $*"; }

require_env() {
  local missing=()
  for var in TURSO_PROD_TOKEN TURSO_DEV_TOKEN BACKUP_R2_BUCKET BACKUP_R2_ACCESS_KEY BACKUP_R2_SECRET BACKUP_R2_ENDPOINT; do
    if [ -z "${!var:-}" ]; then
      missing+=("$var")
    fi
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "❌ Missing required env vars: ${missing[*]}" >&2
    exit 1
  fi
}

require_env
log "mode=$([ "$DRY_RUN" = true ] && echo DRY-RUN || echo APPLY) skip_dev_sync=$SKIP_DEV_SYNC workdir=$WORKDIR"
```

- [ ] **Step 2: Add the prod export + sanity-check function**

Append to the same file:

```bash
export_prod() {
  local out="$WORKDIR/ksschoerke-production-${TIMESTAMP}.db"
  log "Exporting $PROD_DB -> $out"
  turso db export "$PROD_DB" --output-file "$out" --token "$TURSO_PROD_TOKEN"

  local size
  size="$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")"
  if [ "$size" -lt 102400 ]; then
    echo "❌ Export sanity check failed: file is ${size} bytes, expected at least 100KB. Aborting — refusing to trust a truncated/empty snapshot." >&2
    exit 1
  fi
  log "Export size check passed: ${size} bytes"

  if ! sqlite3 "$out" "PRAGMA integrity_check;" | grep -q "^ok$"; then
    echo "❌ Export integrity check failed for $out. Aborting." >&2
    exit 1
  fi
  log "Integrity check passed"

  echo "$out"
}
```

- [ ] **Step 3: Manual smoke test (read-only, safe against prod)**

Run locally with real prod credentials (do not commit them):

```bash
chmod +x scripts/db/backup-and-sync.sh
TURSO_PROD_TOKEN="<token>" TURSO_DEV_TOKEN="<token>" \
BACKUP_R2_BUCKET=x BACKUP_R2_ACCESS_KEY=x BACKUP_R2_SECRET=x BACKUP_R2_ENDPOINT=x \
bash -c 'source scripts/db/backup-and-sync.sh --dry-run; export_prod'
```

Expected: prints size + "Integrity check passed", and prints a path to a real `.db` file in a temp dir.
Verify manually with `sqlite3 <path> "SELECT COUNT(*) FROM artists;"` that it returns a sane number.

- [ ] **Step 4: Commit**

```bash
git add scripts/db/backup-and-sync.sh
git commit -m "feat(db): add backup script skeleton with prod export + sanity checks"
```

---

## Task 2: R2 upload, head-object verification, retention cleanup

**Files:**
- Modify: `scripts/db/backup-and-sync.sh`

- [ ] **Step 1: Add the upload + verify function**

```bash
upload_backup() {
  local db_file="$1"
  local gz_file="${db_file}.gz"
  gzip -c "$db_file" > "$gz_file"

  local key="backups/$(basename "$gz_file")"
  log "Uploading $gz_file -> s3://$BACKUP_R2_BUCKET/$key"

  if [ "$DRY_RUN" = true ]; then
    log "[dry-run] would upload to $key"
    echo "$key"
    return
  fi

  AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
    aws s3 cp "$gz_file" "s3://$BACKUP_R2_BUCKET/$key" --endpoint-url "$BACKUP_R2_ENDPOINT"

  # Confirm it actually landed before treating the backup as complete.
  if ! AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
    aws s3api head-object --bucket "$BACKUP_R2_BUCKET" --key "$key" --endpoint-url "$BACKUP_R2_ENDPOINT" >/dev/null 2>&1; then
    echo "❌ Upload verification failed: $key not found in bucket after cp. Aborting before retention cleanup." >&2
    exit 1
  fi
  log "Upload verified: $key"
  echo "$key"
}
```

- [ ] **Step 2: Add the retention cleanup function**

Cleanup only runs when called explicitly *after* a verified upload (see Task 5's call order), and always
keeps the object just uploaded plus is bounded to the `backups/` prefix only.

```bash
cleanup_old_backups() {
  local just_uploaded_key="$1"
  log "Pruning backups older than ${RETENTION_DAYS} days (keeping $just_uploaded_key)"

  local cutoff_epoch
  cutoff_epoch="$(date -u -d "-${RETENTION_DAYS} days" +%s 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d +%s)"

  AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
    aws s3api list-objects-v2 --bucket "$BACKUP_R2_BUCKET" --prefix "backups/" --endpoint-url "$BACKUP_R2_ENDPOINT" \
    --query 'Contents[].{Key:Key,Modified:LastModified}' --output json > "$WORKDIR/objects.json"

  python3 - "$WORKDIR/objects.json" "$cutoff_epoch" "$just_uploaded_key" "$DRY_RUN" <<'PYEOF'
import json, sys, datetime

objects_file, cutoff_epoch, keep_key, dry_run = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4] == "true"
with open(objects_file) as f:
    objects = json.load(f) or []

for obj in objects:
    key = obj["Key"]
    if key == keep_key:
        continue
    modified = datetime.datetime.fromisoformat(obj["Modified"].replace("Z", "+00:00"))
    if modified.timestamp() < cutoff_epoch:
        print(f"{'[dry-run] would delete' if dry_run else 'deleting'} {key} (modified {modified.isoformat()})")
PYEOF
}
```

Note: the Python helper only *prints* what it would delete in this step. Wire the actual `aws s3 rm` call
in Task 5 so the deletion path is exercised only in the full integration test, keeping this function
side-effect-free and easy to verify in isolation first.

- [ ] **Step 3: Manual smoke test — dry-run against real bucket listing**

```bash
BACKUP_R2_BUCKET=<real bucket> BACKUP_R2_ACCESS_KEY=<real> BACKUP_R2_SECRET=<real> BACKUP_R2_ENDPOINT=<real> \
TURSO_PROD_TOKEN=x TURSO_DEV_TOKEN=x \
bash -c 'source scripts/db/backup-and-sync.sh --dry-run; cleanup_old_backups "backups/nonexistent-test-key.db.gz"'
```

Expected: lists any existing `backups/` objects older than 30 days as "would delete" lines, prints nothing
if the bucket has no `backups/` objects yet (first run).

- [ ] **Step 4: Commit**

```bash
git add scripts/db/backup-and-sync.sh
git commit -m "feat(db): add R2 upload verification and retention cleanup"
```

---

## Task 3: Dev pre-wipe backup + dynamic MCP-safe wipe (single-invocation PRAGMA)

**Files:**
- Modify: `scripts/db/backup-and-sync.sh`

This task implements ADR Finding 1 (post-wipe verification gate), Finding 3 (PRAGMA persistence — fixed by
combining PRAGMA + all DROPs into one `turso db shell` invocation instead of three separate ones), and
Finding 4 (dynamic `payload_mcp%` exclusion instead of a hardcoded table name).

- [ ] **Step 1: Add the pre-wipe rollback snapshot function**

```bash
backup_dev_before_wipe() {
  local out="$WORKDIR/ksschoerke-development-prewipe-${TIMESTAMP}.db"
  log "Snapshotting $DEV_DB before wipe (rollback point) -> $out"
  turso db export "$DEV_DB" --output-file "$out" --token "$TURSO_DEV_TOKEN"
  echo "$out"
}
```

- [ ] **Step 2: Add the dynamic table-list helper**

```bash
list_dev_tables_to_wipe() {
  turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'payload_mcp%';" \
    | tail -n +2 | sed '/^$/d' | tr -d '[:space:]' | grep -v '^$' || true
}
```

Note: `tail -n +2` drops the `NAME` header row that `turso db shell` prints (matches the actual output
format observed against this project's dev database).

- [ ] **Step 3: Add the single-invocation wipe function with post-wipe assertion**

```bash
wipe_dev_except_mcp() {
  local tables
  tables="$(list_dev_tables_to_wipe)"
  if [ -z "$tables" ]; then
    log "No tables to wipe (dev already empty apart from payload_mcp* tables)"
    return
  fi

  local wipe_sql="$WORKDIR/wipe.sql"
  {
    echo "PRAGMA foreign_keys=OFF;"
    while IFS= read -r t; do
      echo "DROP TABLE IF EXISTS \"$t\";"
    done <<< "$tables"
    echo "PRAGMA foreign_keys=ON;"
  } > "$wipe_sql"

  if [ "$DRY_RUN" = true ]; then
    log "[dry-run] would wipe $(echo "$tables" | wc -l | tr -d ' ') tables:"
    echo "$tables"
    return
  fi

  log "Wiping $(echo "$tables" | wc -l | tr -d ' ') tables from $DEV_DB in one session (single connection, so PRAGMA foreign_keys persists for the whole batch)"
  turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" < "$wipe_sql"

  # Post-wipe assertion (ADR Finding 1): FK-ordering can silently skip a DROP.
  # Refuse to proceed to the load step unless the wipe is verifiably complete.
  local remaining
  remaining="$(turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" \
    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'payload_mcp%';" \
    | tail -n +2 | tr -d '[:space:]')"
  if [ "$remaining" != "0" ]; then
    echo "❌ Wipe verification failed: $remaining non-excluded tables still remain in $DEV_DB after the wipe loop. Aborting BEFORE loading the prod dump — dev is left in its wiped-but-not-loaded state. Restore from the pre-wipe snapshot (see backup_dev_before_wipe output) if dev needs to be usable again before this is fixed." >&2
    exit 1
  fi
  log "Wipe verified: 0 non-excluded tables remain"
}
```

- [ ] **Step 4: Manual smoke test against dev (dry-run first, mandatory)**

```bash
TURSO_PROD_TOKEN=x TURSO_DEV_TOKEN="<real dev token>" \
BACKUP_R2_BUCKET=x BACKUP_R2_ACCESS_KEY=x BACKUP_R2_SECRET=x BACKUP_R2_ENDPOINT=x \
bash -c 'source scripts/db/backup-and-sync.sh --dry-run; list_dev_tables_to_wipe; echo ---; wipe_dev_except_mcp'
```

Expected: lists every table in dev except `payload_mcp_api_keys`, `sqlite_*`. Confirm `payload_mcp_api_keys`
is NOT in the list (grep it out and confirm zero matches) before ever running with `--apply`.

- [ ] **Step 5: Commit**

```bash
git add scripts/db/backup-and-sync.sh
git commit -m "feat(db): add dev pre-wipe snapshot and MCP-safe wipe with post-wipe verification"
```

---

## Task 4: Load prod dump into dev + all-table count verification

**Files:**
- Modify: `scripts/db/backup-and-sync.sh`

This implements ADR Finding 11 (verify every table, not a sample).

- [ ] **Step 1: Add the dump + load functions**

```bash
dump_prod_sql() {
  local out="$WORKDIR/prod-${TIMESTAMP}.sql"
  log "Dumping $PROD_DB to portable SQL -> $out"
  turso db shell "$PROD_DB" --token "$TURSO_PROD_TOKEN" .dump > "$out"
  echo "$out"
}

load_dev_from_sql() {
  local sql_file="$1"
  if [ "$DRY_RUN" = true ]; then
    log "[dry-run] would load $sql_file into $DEV_DB"
    return
  fi
  log "Loading $sql_file into $DEV_DB"
  turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" < "$sql_file"
}
```

- [ ] **Step 2: Add the all-table verification function**

```bash
verify_all_tables() {
  local mismatches=0
  local prod_tables
  prod_tables="$(turso db shell "$PROD_DB" --token "$TURSO_PROD_TOKEN" \
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';" | tail -n +2 | sed '/^$/d')"

  while IFS= read -r t; do
    [ -z "$t" ] && continue
    local prod_count dev_count
    prod_count="$(turso db shell "$PROD_DB" --token "$TURSO_PROD_TOKEN" "SELECT COUNT(*) FROM \"$t\";" | tail -n +2 | tr -d '[:space:]')"
    dev_count="$(turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" "SELECT COUNT(*) FROM \"$t\";" | tail -n +2 | tr -d '[:space:]')"
    if [ "$prod_count" != "$dev_count" ]; then
      echo "  MISMATCH: $t — prod=$prod_count dev=$dev_count"
      mismatches=$((mismatches + 1))
    else
      log "  ok: $t ($prod_count rows)"
    fi
  done <<< "$prod_tables"

  if [ "$mismatches" -gt 0 ]; then
    echo "❌ Verification failed: $mismatches table(s) mismatched between prod and dev after sync." >&2
    exit 1
  fi
  log "Verification passed: all prod tables match dev row counts"
}
```

- [ ] **Step 3: Manual smoke test (dry-run, read-only against both DBs)**

```bash
TURSO_PROD_TOKEN="<real>" TURSO_DEV_TOKEN="<real>" \
BACKUP_R2_BUCKET=x BACKUP_R2_ACCESS_KEY=x BACKUP_R2_SECRET=x BACKUP_R2_ENDPOINT=x \
bash -c 'source scripts/db/backup-and-sync.sh --dry-run; verify_all_tables'
```

Expected: prints one `ok:` or `MISMATCH:` line per table currently in prod. Since dev and prod already
have different data at this point (no wipe/load has happened yet in dry-run), mismatches here are expected
and fine — this step only proves the function correctly iterates every table and compares counts, not that
they currently match.

- [ ] **Step 4: Commit**

```bash
git add scripts/db/backup-and-sync.sh
git commit -m "feat(db): add prod dump load and all-table verification"
```

---

## Task 5: Wire the full pipeline + GitHub Actions workflow

**Files:**
- Modify: `scripts/db/backup-and-sync.sh`
- Create: `.github/workflows/db-backup.yml`

- [ ] **Step 1: Add the `main` orchestration function at the bottom of the script**

```bash
main() {
  local snapshot key
  snapshot="$(export_prod)"
  key="$(upload_backup "$snapshot")"
  cleanup_old_backups "$key"
  if [ "$DRY_RUN" = false ]; then
    # Actually delete what cleanup_old_backups printed as "would delete" — re-run
    # the same listing logic and issue real deletes now that we know it's safe
    # (backup step above succeeded and was verified).
    AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
      aws s3api list-objects-v2 --bucket "$BACKUP_R2_BUCKET" --prefix "backups/" --endpoint-url "$BACKUP_R2_ENDPOINT" \
      --query "Contents[?LastModified<='$(date -u -d "-${RETENTION_DAYS} days" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d +%Y-%m-%dT%H:%M:%S)' && Key!='$key'].Key" \
      --output text | tr '\t' '\n' | sed '/^$/d' | while IFS= read -r old_key; do
        log "Deleting expired backup: $old_key"
        AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
          aws s3 rm "s3://$BACKUP_R2_BUCKET/$old_key" --endpoint-url "$BACKUP_R2_ENDPOINT"
      done
  fi

  if [ "$SKIP_DEV_SYNC" = true ]; then
    log "Skipping dev sync (--skip-dev-sync)"
    return
  fi

  local prewipe_snapshot
  prewipe_snapshot="$(backup_dev_before_wipe)"
  log "Pre-wipe dev rollback point: $prewipe_snapshot (upload as workflow artifact in CI)"

  wipe_dev_except_mcp

  local prod_sql
  prod_sql="$(dump_prod_sql)"
  load_dev_from_sql "$prod_sql"
  verify_all_tables

  log "Backup + dev sync complete."
}

main "$@"
```

- [ ] **Step 2: Run shellcheck locally**

```bash
shellcheck scripts/db/backup-and-sync.sh
```

Expected: no errors. Fix any warnings shellcheck raises (common ones: quote variables, check `local` usage
in loops) before continuing.

- [ ] **Step 3: Create the GitHub Actions workflow**

```yaml
# .github/workflows/db-backup.yml
name: Nightly DB Backup + Dev Sync

on:
  schedule:
    - cron: '0 2 * * *' # 02:00 UTC nightly. GH Actions schedule can slip 10-40min under load — acceptable for this job.
  workflow_dispatch:
    inputs:
      skip_dev_sync:
        description: 'Backup only, skip dev sync'
        type: boolean
        default: false

jobs:
  backup:
    name: Backup prod + sync dev
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install Turso CLI
        run: curl -sSfL https://get.turso.tech/install.sh | sh

      - name: Add Turso CLI to PATH
        run: echo "$HOME/.turso" >> "$GITHUB_PATH"

      - name: Install aws CLI
        run: |
          curl -sSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscliv2.zip
          unzip -q awscliv2.zip
          sudo ./aws/install --update

      - name: Run backup + dev sync
        env:
          TURSO_PROD_TOKEN: ${{ secrets.TURSO_PROD_TOKEN }}
          TURSO_DEV_TOKEN: ${{ secrets.TURSO_DEV_TOKEN }}
          BACKUP_R2_BUCKET: ${{ secrets.BACKUP_R2_BUCKET }}
          BACKUP_R2_ACCESS_KEY: ${{ secrets.BACKUP_R2_ACCESS_KEY }}
          BACKUP_R2_SECRET: ${{ secrets.BACKUP_R2_SECRET }}
          BACKUP_R2_ENDPOINT: ${{ secrets.BACKUP_R2_ENDPOINT }}
        run: |
          ARGS="--apply"
          if [ "${{ github.event.inputs.skip_dev_sync }}" = "true" ]; then
            ARGS="$ARGS --skip-dev-sync"
          fi
          chmod +x scripts/db/backup-and-sync.sh
          bash scripts/db/backup-and-sync.sh $ARGS
```

Note: this workflow currently has no step to upload the pre-wipe dev snapshot as a GH Actions artifact
(kept out of scope for this task — the script prints its temp path but the workflow doesn't retain it past
the job, since `$RUNNER_TEMP`/`mktemp -d` files vanish when the job ends). If a rollback is ever needed
after a failed run, restore dev manually from the most recent R2 backup instead — same recovery mechanism
already documented in the ADR's "Restoring Production from R2 Backup" section, just targeting dev instead
of prod. Document this explicitly in Task 6.

- [ ] **Step 4: Commit**

```bash
git add scripts/db/backup-and-sync.sh .github/workflows/db-backup.yml
git commit -m "feat(db): wire nightly backup + dev sync GitHub Actions workflow"
```

---

## Task 6: End-to-end dry run, then enable for real

**Files:** none (verification only)

- [ ] **Step 1: Trigger a dry-run via `workflow_dispatch` before the cron is live**

Push the branch, go to Actions tab → "Nightly DB Backup + Dev Sync" → "Run workflow". Since the workflow
always passes `--apply` currently, first **temporarily** edit the workflow to pass `--dry-run` instead, push,
run it once via dispatch, inspect the Action log output for:
- Export size + integrity check both pass
- Upload step logs a would-be R2 key
- Retention cleanup lists 0 or a small number of "would delete" entries
- Table wipe list does NOT include `payload_mcp_api_keys`
- Verification lists per-table counts (mismatches expected in dry-run since nothing was actually loaded)

- [ ] **Step 2: Revert the temporary dry-run edit, keep `--apply`, commit**

```bash
git add .github/workflows/db-backup.yml
git commit -m "chore(db): confirm dry-run passed, restore --apply for nightly workflow"
```

- [ ] **Step 3: Manually trigger one real `--apply` run via `workflow_dispatch`**

Watch the Action log end-to-end. Confirm the final line is `Backup + dev sync complete.` with no errors.
Spot-check: `turso db shell ksschoerke-development "SELECT COUNT(*) FROM payload_mcp_api_keys;"` still
returns your existing MCP key row (not wiped), and `turso db shell ksschoerke-development "SELECT COUNT(*)
FROM artists;"` matches prod.

- [ ] **Step 4: Confirm the nightly cron is live**

No action needed — `schedule` triggers activate automatically once the workflow file is on the default
branch. Just confirm in the Actions tab that the workflow shows "Scheduled" as an available trigger.

- [ ] **Step 5: Update the ADR to mark this implemented**

Edit `docs/adr/2025-11-23-database-backup-strategy.md` §1: change "Design (2026-08-22...)" framing to note
the workflow is now live, with a link/reference to `.github/workflows/db-backup.yml` and
`scripts/db/backup-and-sync.sh`. Also note the recovery path if a nightly dev-sync run fails
mid-way (Step 3 of Task 5's note): restore dev manually from the latest verified R2 backup using the
existing "Restoring Production from R2 Backup" procedure, targeting `ksschoerke-development` instead of
`ksschoerke-production`.

```bash
git add docs/adr/2025-11-23-database-backup-strategy.md
git commit -m "docs(db): mark nightly backup workflow as implemented in ADR"
```

---

## Plan Self-Review Notes

- **Spec coverage:** every ADR §1 bullet has a corresponding task — export sanity checks (Task 1), scoped
  R2 upload + head-object verify + gated retention (Task 2), pre-wipe rollback + dynamic MCP exclusion +
  post-wipe assertion + single-invocation PRAGMA (Task 3), all-table verification (Task 4), workflow wiring
  + GH Actions schedule-drift note (Task 5), dry-run-before-enabling (Task 6).
- **Deviation from ADR's "preferred" swap pattern:** the ADR listed build-fresh-then-swap as preferred with
  in-place-wipe-plus-verification as an accepted fallback "if swap proves impractical." This plan
  implements the fallback directly — a full swap would require repointing `DATABASE_URI` for every local
  developer's `.env` (dev has no Vercel-hosted consumer to repoint programmatically), which is out of
  proportion to a nightly job for a 3MB sandbox database. The pre-wipe rollback snapshot + post-wipe
  assertion + single-invocation PRAGMA together address the specific failure modes (Findings 1, 2, 3) the
  swap pattern was meant to guard against, at much lower implementation cost.
- **Secret scope (Finding 7):** resolved by using two per-database Turso tokens instead of one org token —
  reflected in Task 0 and throughout the script.
