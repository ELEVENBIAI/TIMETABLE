-- DB-Rollen für RLS-Multi-Tenancy (ADR-08)
-- hmservice_owner: BYPASSRLS für Migrations + Admin-Operationen
-- hmservice_app:   NOBYPASSRLS für alle API-Requests
--
-- Wichtig: hmservice_owner ist auch POSTGRES_USER im docker-compose,
-- aber default-Rollen sind keine BYPASSRLS. Wir setzen das explizit.

ALTER ROLE hmservice_owner BYPASSRLS;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'hmservice_app') THEN
    -- Password aus env-Var POSTGRES_APP_PASSWORD, Fallback 'app_dev_pw'
    EXECUTE format(
      'CREATE ROLE hmservice_app LOGIN PASSWORD %L NOBYPASSRLS',
      COALESCE(current_setting('app.app_password', true), 'app_dev_pw')
    );
  END IF;
END
$$;

-- App-Rolle erhält CONNECT auf die aktuelle DB (portabel — funktioniert in Test + Prod)
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO hmservice_app', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO hmservice_app;

-- Default-Privileges: Neue Objekte erbt App-Rolle automatisch
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO hmservice_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO hmservice_app;
