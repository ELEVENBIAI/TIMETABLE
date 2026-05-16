-- Rollback Migration 0006 — entfernt users.locale
-- Vorsicht: DATENVERLUST der Locale-Einstellungen.

ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_locale;
ALTER TABLE users DROP COLUMN IF EXISTS locale;
