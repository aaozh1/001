#!/usr/bin/env bash
# MatList database backup (Phase 4.3).
#
# Usage:   DATABASE_URL=postgresql://... ./scripts/backup.sh [backup-dir]
# Cron:    0 3 * * *  cd /srv/matlist && DATABASE_URL=... ./scripts/backup.sh /srv/backups
#
# Produces a compressed custom-format dump (restorable with pg_restore) and
# prunes dumps older than RETENTION_DAYS (default 14).
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/matlist-$STAMP.dump"

pg_dump --format=custom --compress=6 --no-owner --file="$OUT" "$DATABASE_URL"
echo "backup written: $OUT ($(du -h "$OUT" | cut -f1))"

# Prune old dumps.
find "$BACKUP_DIR" -name "matlist-*.dump" -type f -mtime "+$RETENTION_DAYS" -delete
echo "pruned dumps older than $RETENTION_DAYS days"

# Restore (reference):
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" <file>.dump
