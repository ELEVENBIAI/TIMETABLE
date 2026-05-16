-- Rollback Migration 0007 — entfernt die Trigram-Indexe.

DROP INDEX IF EXISTS idx_pm_name_trgm;
DROP INDEX IF EXISTS idx_pm_email_trgm;
DROP INDEX IF EXISTS idx_pm_contact_trgm;
