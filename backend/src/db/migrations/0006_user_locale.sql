-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0006 — USERS.locale (Internationalisierung, ADR-16)
-- ────────────────────────────────────────────────────────────────────────────
-- Fügt der USERS-Tabelle eine Locale-Spalte hinzu, die im JWT mitgesendet wird
-- und vom Frontend als Default-Sprache verwendet wird.
--
-- ADR-16: Default-Sprache `en`, erste aktiv übersetzte Sprache `de`.
-- Locale-Quelle (Priorität): users.locale → JWT → Accept-Language → 'en'.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE users
    ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'en';

ALTER TABLE users
    ADD CONSTRAINT ck_users_locale CHECK (locale IN ('en', 'de'));

COMMENT ON COLUMN users.locale IS
  'BCP 47 Locale-Code (z.B. en, de). Wird im JWT mitgesendet und vom Frontend als Default-Sprache verwendet. ADR-16.';
