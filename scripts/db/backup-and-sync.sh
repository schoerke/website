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
