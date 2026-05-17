-- Rollback Migration 0010 (ELE-187)
DROP INDEX IF EXISTS idx_users_hard_delete_at;
ALTER TABLE users DROP COLUMN IF EXISTS hard_delete_at;
