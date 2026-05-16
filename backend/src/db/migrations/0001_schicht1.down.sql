-- Rollback Migration 0001 — Drop all Schicht-1-Tables in reverse FK order
-- Vorsicht: DATENVERLUST. Nur in Dev / Recovery verwenden.

DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS service_types CASCADE;
DROP TABLE IF EXISTS property_zones CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS property_managers CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;
