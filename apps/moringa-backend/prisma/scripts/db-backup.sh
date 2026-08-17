#!/bin/bash
set -e

echo "Creating database backup..."
BACKUP_DIR="prisma/backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

echo "Backup created: $BACKUP_FILE"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/backup_*.sql | tail -n +8 | xargs -r rm

echo "Old backups cleaned up"
