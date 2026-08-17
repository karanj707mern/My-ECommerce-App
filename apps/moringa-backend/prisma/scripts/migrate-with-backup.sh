#!/bin/bash
set -e

echo "Running migration with backup..."
pnpm prisma:backup

echo "Running migration..."
pnpm prisma migrate dev

echo "Migration completed"
