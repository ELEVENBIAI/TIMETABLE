-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0010 — DSGVO Hard-Delete-Markierung (ELE-187)
-- ────────────────────────────────────────────────────────────────────────────
-- Fügt eine `hard_delete_at`-Spalte zur users-Tabelle hinzu. Wird vom DSGVO-
-- Löschungs-Workflow gesetzt (Phase 1 Soft-Delete) und vom Retention-Cron
-- nach Ablauf der Frist (DSGVO_RETENTION.EMPLOYEE_DATA_AFTER_LEAVING_DAYS)
-- für Phase 2 Hard-Delete ausgewertet.
--
-- Idempotenz: IF NOT EXISTS auf ADD COLUMN.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS hard_delete_at TIMESTAMPTZ;

COMMENT ON COLUMN users.hard_delete_at IS
    'DSGVO Art. 17: Zeitpunkt für Hard-Delete (nach Soft-Delete-Frist). Retention-Cron prüft hard_delete_at < NOW().';

CREATE INDEX IF NOT EXISTS idx_users_hard_delete_at
    ON users (hard_delete_at)
    WHERE hard_delete_at IS NOT NULL;
