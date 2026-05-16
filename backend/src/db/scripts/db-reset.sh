#!/bin/bash
# db-reset.sh — Drop + Re-Create der timetable-DB + alle Migrations
# Verwendung: bash backend/src/db/scripts/db-reset.sh
# Voraussetzung: docker-compose up läuft, hmservice_owner ist Connect-fähig

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-timetable}"
DB_USER="${DB_USER:-hmservice_owner}"
DB_PASSWORD="${POSTGRES_PASSWORD:-owner_dev_pw}"

echo "[db-reset] Dropping database ${DB_NAME}…"
PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d postgres \
  -c "DROP DATABASE IF EXISTS ${DB_NAME} WITH (FORCE);" \
  -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" \
  >/dev/null

echo "[db-reset] Re-applying init scripts (extensions + roles + functions)…"
for f in backend/src/db/init/*.sql; do
  PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -v ON_ERROR_STOP=1 -f "$f" >/dev/null
  echo "  ✓ $f"
done

echo "[db-reset] Running migrations via drizzle-orm…"
cd backend && npm run db:migrate

echo "[db-reset] Done ✓"
