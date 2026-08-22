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
# Dependencies: turso CLI, aws CLI, sqlite3, gzip, python3 (all preinstalled on
#   GitHub Actions ubuntu-latest except turso/aws, which the workflow installs explicitly)
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

cleanup_old_backups() {
  local just_uploaded_key="$1"
  log "Pruning backups older than ${RETENTION_DAYS} days (keeping $just_uploaded_key)"

  local cutoff_epoch
  cutoff_epoch="$(date -u -d "-${RETENTION_DAYS} days" +%s 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d +%s)"

  AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
    aws s3api list-objects-v2 --bucket "$BACKUP_R2_BUCKET" --prefix "backups/" --endpoint-url "$BACKUP_R2_ENDPOINT" \
    --query 'Contents[].{Key:Key,Modified:LastModified}' --output json > "$WORKDIR/objects.json"

  # NOTE: intentionally list-only. This function only reports what WOULD be deleted;
  # actual deletion is wired into main() (Task 5) after dry-run/apply gating and backup-
  # success ordering are centralized there. Do not add `aws s3 rm` here.
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

backup_dev_before_wipe() {
  local out="$WORKDIR/ksschoerke-development-prewipe-${TIMESTAMP}.db"
  log "Snapshotting $DEV_DB before wipe (rollback point) -> $out"
  turso db export "$DEV_DB" --output-file "$out" --token "$TURSO_DEV_TOKEN"
  echo "$out"
}

list_dev_tables_to_wipe() {
  local out
  if ! out="$(turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" \
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'payload_mcp%';")"; then
    echo "❌ Failed to query $DEV_DB table list (turso db shell exited non-zero). Aborting." >&2
    exit 1
  fi
  echo "$out" | tail -n +2 | sed '/^$/d'
}

# NOTE: main() logs backup_dev_before_wipe's returned snapshot path via `log`, but that
# snapshot is NOT durable — it lives in $WORKDIR, deleted by the EXIT trap the instant
# the script exits (and a GH Actions runner's disk is destroyed on job end regardless).
# The error messages below correctly point at Turso's point-in-time recovery as the
# actual durable recovery path, not at this ephemeral snapshot file.
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
      if [[ ! "$t" =~ ^[a-zA-Z0-9_]+$ ]]; then
        echo "❌ Unexpected table name '$t' (not alphanumeric/underscore). Refusing to build wipe SQL." >&2
        exit 1
      fi
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
  if ! turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" < "$wipe_sql"; then
    echo "❌ Wipe SQL execution failed against $DEV_DB (possibly network/auth error, possibly partway through the batch). dev may be left half-wiped. The pre-wipe snapshot this run created is NOT durable (deleted with the job's workspace on exit) — recover instead via Turso's point-in-time recovery: 'turso db create ksschoerke-development-restored --from-db ksschoerke-development --timestamp <ISO-8601 time before this run>' (free tier covers the last 24h; see docs/adr/2025-11-23-database-backup-strategy.md §2), then repoint or rename as needed." >&2
    exit 1
  fi

  # Post-wipe assertion (ADR Finding 1): FK-ordering can silently skip a DROP.
  # Refuse to proceed to the load step unless the wipe is verifiably complete.
  local remaining
  remaining="$(turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" \
    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'payload_mcp%';" \
    | tail -n +2 | tr -d '[:space:]')"
  if [ "$remaining" != "0" ]; then
    echo "❌ Wipe verification failed: $remaining non-excluded tables still remain in $DEV_DB after the wipe loop. Aborting BEFORE loading the prod dump — dev is left in its wiped-but-not-loaded state. The pre-wipe snapshot this run created is NOT durable (deleted with the job's workspace on exit) — recover via Turso's point-in-time recovery (free tier covers the last 24h; see docs/adr/2025-11-23-database-backup-strategy.md §2) if dev needs to be usable again before this is fixed." >&2
    exit 1
  fi
  log "Wipe verified: 0 non-excluded tables remain"
}

dump_prod_sql() {
  local out="$WORKDIR/prod-${TIMESTAMP}.sql"
  log "Dumping $PROD_DB to portable SQL -> $out"
  if ! turso db shell "$PROD_DB" --token "$TURSO_PROD_TOKEN" .dump > "$out"; then
    echo "❌ Failed to dump $PROD_DB to SQL. Aborting." >&2
    exit 1
  fi

  local size
  size="$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")"
  if [ "$size" -lt 1024 ]; then
    echo "❌ Prod SQL dump sanity check failed: file is ${size} bytes, expected at least 1KB. Aborting — refusing to load a truncated/empty dump into dev." >&2
    exit 1
  fi
  log "Dump size check passed: ${size} bytes"

  echo "$out"
}

load_dev_from_sql() {
  local sql_file="$1"
  if [ "$DRY_RUN" = true ]; then
    log "[dry-run] would load $sql_file into $DEV_DB"
    return
  fi
  log "Loading $sql_file into $DEV_DB"
  if ! turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" < "$sql_file"; then
    echo "❌ Failed to load $sql_file into $DEV_DB. dev may be left partially loaded (wiped, then load failed mid-way). The pre-wipe snapshot this run created is NOT durable (deleted with the job's workspace on exit) — recover via Turso's point-in-time recovery (free tier covers the last 24h; see docs/adr/2025-11-23-database-backup-strategy.md §2) before further use." >&2
    exit 1
  fi
}

# NOTE: this compares dev against a freshly-queried LIVE prod state, not the exact
# data captured in dump_prod_sql's dump. A prod write landing between the dump and
# this verification could cause a spurious mismatch on an otherwise-successful sync.
# Accepted risk given this runs nightly on a low-traffic site — not worth the added
# complexity of capturing/comparing dump-time counts instead of live counts.
verify_all_tables() {
  local mismatches=0
  if [ "$DRY_RUN" = true ]; then
    log "[dry-run] skipping table-count verification (dev was not modified this run)"
    return
  fi
  local prod_tables
  if ! prod_tables="$(turso db shell "$PROD_DB" --token "$TURSO_PROD_TOKEN" \
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'payload_mcp%';")"; then
    echo "❌ Failed to query $PROD_DB table list for verification. Aborting." >&2
    exit 1
  fi
  prod_tables="$(echo "$prod_tables" | tail -n +2 | sed '/^$/d')"

  while IFS= read -r t; do
    [ -z "$t" ] && continue
    if [[ ! "$t" =~ ^[a-zA-Z0-9_]+$ ]]; then
      echo "❌ Unexpected table name '$t' (not alphanumeric/underscore) during verification. Aborting." >&2
      exit 1
    fi
    local prod_count dev_count
    if ! prod_count="$(turso db shell "$PROD_DB" --token "$TURSO_PROD_TOKEN" "SELECT COUNT(*) FROM \"$t\";" | tail -n +2 | tr -d '[:space:]')"; then
      echo "❌ Failed to count rows in $PROD_DB.\"$t\" during verification. Aborting." >&2
      exit 1
    fi
    if ! dev_count="$(turso db shell "$DEV_DB" --token "$TURSO_DEV_TOKEN" "SELECT COUNT(*) FROM \"$t\";" | tail -n +2 | tr -d '[:space:]')"; then
      echo "❌ Failed to count rows in $DEV_DB.\"$t\" during verification. Aborting." >&2
      exit 1
    fi
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

main() {
  local snapshot key
  snapshot="$(export_prod)"
  key="$(upload_backup "$snapshot")"

  local cleanup_output
  cleanup_output="$(cleanup_old_backups "$key")"
  echo "$cleanup_output"
  if [ "$DRY_RUN" = false ]; then
    while IFS= read -r line; do
      old_key="$(echo "$line" | awk '{print $2}')"
      log "Deleting expired backup: $old_key"
      AWS_ACCESS_KEY_ID="$BACKUP_R2_ACCESS_KEY" AWS_SECRET_ACCESS_KEY="$BACKUP_R2_SECRET" \
        aws s3 rm "s3://$BACKUP_R2_BUCKET/$old_key" --endpoint-url "$BACKUP_R2_ENDPOINT"
    done < <(echo "$cleanup_output" | grep '^deleting ' || true)
  fi

  if [ "$SKIP_DEV_SYNC" = true ]; then
    log "Skipping dev sync (--skip-dev-sync)"
    return
  fi

  local prewipe_snapshot
  prewipe_snapshot="$(backup_dev_before_wipe)"
  log "Pre-wipe dev rollback point: $prewipe_snapshot"

  wipe_dev_except_mcp

  local prod_sql
  prod_sql="$(dump_prod_sql)"
  load_dev_from_sql "$prod_sql"
  verify_all_tables

  log "Backup + dev sync complete."
}

main "$@"
