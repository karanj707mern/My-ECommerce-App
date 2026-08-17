#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

echo "=== Pre-migration backup ==="
bash "$SCRIPT_DIR/db-backup.sh"

echo ""
echo "=== Running prisma migrate dev ==="
npx prisma migrate dev "$@"
