#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="prisma/backups"
mkdir -p "$BACKUP_DIR"

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
elif [ -f ".env.development" ]; then
  set -a
  source .env.development
  set +a
fi

DATABASE_URL="${DATABASE_URL:-}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set in .env or .env.development" >&2
  exit 1
fi

TS=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/prisma-backup_${TS}.sql.gz"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "ERROR: pg_dump is not installed or not in PATH" >&2
  echo "Install PostgreSQL client tools first" >&2
  exit 1
fi

echo "Creating database backup: $BACKUP_FILE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup complete: $BACKUP_FILE ($SIZE)"
