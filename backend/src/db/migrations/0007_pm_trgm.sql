-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0007 — pg_trgm GIN-Indexe für Schnellsuche (ELE-175)
-- ────────────────────────────────────────────────────────────────────────────
-- Property-Manager-Schnellsuche soll laut Spec <100ms bei 1000+ Records liefern.
-- Voraussetzung: pg_trgm-Extension ist via 01-extensions.sql aktiv.
--
-- Indexe nutzen GIN + gin_trgm_ops für ILIKE und % (trigram-similarity).
-- Sie greifen automatisch bei `name ILIKE '%foo%'` und `email % 'foo'`.
-- ────────────────────────────────────────────────────────────────────────────

CREATE INDEX idx_pm_name_trgm
  ON property_managers USING gin (name gin_trgm_ops)
  WHERE is_deleted = FALSE;

CREATE INDEX idx_pm_email_trgm
  ON property_managers USING gin (email gin_trgm_ops)
  WHERE is_deleted = FALSE AND email IS NOT NULL;

CREATE INDEX idx_pm_contact_trgm
  ON property_managers USING gin (contact_name gin_trgm_ops)
  WHERE is_deleted = FALSE AND contact_name IS NOT NULL;
