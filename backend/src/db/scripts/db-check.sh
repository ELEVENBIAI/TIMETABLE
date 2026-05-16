#!/bin/bash
# db-check.sh — Health-Check für Schicht 1 + RLS + AUDIT_LOG Append-Only
# Verwendung: bash backend/src/db/scripts/db-check.sh

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-timetable}"
DB_USER="${DB_USER:-hmservice_owner}"
DB_PASSWORD="${POSTGRES_PASSWORD:-owner_dev_pw}"

PSQL() {
  PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" \
    -tAc "$1"
}

echo "[db-check] Schicht-1-Tabellen…"
TABLES=$(PSQL "SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename IN (
  'tenants','users','employees','properties','property_zones','property_managers',
  'contracts','regions','service_types','audit_log'
);")
echo "  10 erwartet, gefunden: ${TABLES}"
[ "${TABLES}" = "10" ] || { echo "  ❌ Fehlende Tabellen!"; exit 1; }

echo "[db-check] RLS-Status…"
RLS=$(PSQL "SELECT count(*) FROM pg_tables t JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND t.tablename IN ('tenants','users','employees','properties','property_zones',
                         'property_managers','contracts','regions','service_types','audit_log')
    AND c.relrowsecurity = true;")
echo "  10 erwartet, gefunden: ${RLS}"
[ "${RLS}" = "10" ] || { echo "  ❌ RLS nicht auf allen Tabellen!"; exit 1; }

echo "[db-check] DB-Rollen…"
ROLES=$(PSQL "SELECT count(*) FROM pg_roles WHERE rolname IN ('hmservice_owner','hmservice_app');")
echo "  2 erwartet, gefunden: ${ROLES}"
[ "${ROLES}" = "2" ] || { echo "  ❌ Rollen fehlen!"; exit 1; }

OWNER_BYPASS=$(PSQL "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'hmservice_owner';")
APP_BYPASS=$(PSQL "SELECT rolbypassrls FROM pg_roles WHERE rolname = 'hmservice_app';")
[ "${OWNER_BYPASS}" = "t" ] || { echo "  ❌ hmservice_owner ist nicht BYPASSRLS"; exit 1; }
[ "${APP_BYPASS}" = "f" ] || { echo "  ❌ hmservice_app sollte NOBYPASSRLS sein"; exit 1; }
echo "  ✓ hmservice_owner=BYPASSRLS, hmservice_app=NOBYPASSRLS"

echo "[db-check] AUDIT_LOG Append-Only (kein UPDATE/DELETE für hmservice_app)…"
UPDATE_PERM=$(PSQL "SELECT count(*) FROM information_schema.role_table_grants
  WHERE grantee = 'hmservice_app' AND table_name = 'audit_log' AND privilege_type = 'UPDATE';")
DELETE_PERM=$(PSQL "SELECT count(*) FROM information_schema.role_table_grants
  WHERE grantee = 'hmservice_app' AND table_name = 'audit_log' AND privilege_type = 'DELETE';")
[ "${UPDATE_PERM}" = "0" ] || { echo "  ❌ hmservice_app hat UPDATE auf audit_log!"; exit 1; }
[ "${DELETE_PERM}" = "0" ] || { echo "  ❌ hmservice_app hat DELETE auf audit_log!"; exit 1; }
echo "  ✓ Append-Only enforced"

echo "[db-check] Extensions…"
EXT=$(PSQL "SELECT count(*) FROM pg_extension WHERE extname IN ('pgcrypto','pg_trgm','cube','earthdistance');")
echo "  4 erwartet, gefunden: ${EXT}"
[ "${EXT}" = "4" ] || { echo "  ❌ Extensions fehlen"; exit 1; }

echo ""
echo "[db-check] Alle Checks ✓"
