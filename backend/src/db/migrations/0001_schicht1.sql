-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0001 — Schicht 1: Grunddaten + USERS + AUDIT_LOG
-- ────────────────────────────────────────────────────────────────────────────
-- Annahmen:
--   - Extensions, Rollen + fn_set_updated_at() sind via docker-entrypoint-initdb.d
--     beim Container-Start eingespielt (backend/src/db/init/*.sql).
--   - Diese Migration läuft als hmservice_owner (BYPASSRLS).
--
-- ADRs:
--   ADR-02 RLS Multi-Tenancy
--   ADR-07 Soft-Delete + Audit-Felder
--   ADR-08 Zwei DB-Rollen
--   ADR-09 USERS + 6 Rollen als CHECK-Constraint
--   ADR-13 Migration-Tracking
--   ADR-15 AUDIT_LOG Append-Only
-- ────────────────────────────────────────────────────────────────────────────

-- ─── REGIONS ────────────────────────────────────────────────────────────────
CREATE TABLE regions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL,
    name                  VARCHAR(200) NOT NULL,
    boundary_geojson      JSONB,
    assigned_employee_id  UUID,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    created_by            UUID,
    updated_by            UUID,
    is_deleted            BOOLEAN DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ
);

-- ─── TENANTS ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(50) NOT NULL,
    brand       VARCHAR(50) NOT NULL,
    timezone    VARCHAR(50) DEFAULT 'Europe/Berlin',
    settings    JSONB DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    is_deleted  BOOLEAN DEFAULT FALSE,
    deleted_at  TIMESTAMPTZ,
    CONSTRAINT ck_tenants_brand CHECK (brand IN ('GEPARD', 'IMMOBILIENBUTLER', 'PAUL'))
);

CREATE UNIQUE INDEX uq_tenants_slug ON tenants (slug) WHERE is_deleted = FALSE;

-- regions: FK auf tenants nachträglich
ALTER TABLE regions
  ADD CONSTRAINT fk_regions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);
CREATE INDEX idx_regions_tenant ON regions (tenant_id) WHERE is_deleted = FALSE;

-- ─── USERS ──────────────────────────────────────────────────────────────────
-- ADR-09: 6 Rollen als CHECK-Constraint, MUST_CHANGE_PASSWORD-Flag, Brute-Force-Schutz
CREATE TABLE users (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenants(id),
    email                  VARCHAR(255) NOT NULL,
    password_hash          VARCHAR(255) NOT NULL,
    display_name           VARCHAR(200),
    role                   VARCHAR(30) NOT NULL,
    is_super_admin         BOOLEAN DEFAULT FALSE,
    last_login_at          TIMESTAMPTZ,
    failed_login_count     INTEGER DEFAULT 0,
    locked_until           TIMESTAMPTZ,
    password_changed_at    TIMESTAMPTZ DEFAULT NOW(),
    must_change_password   BOOLEAN DEFAULT FALSE,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    created_by             UUID,
    updated_by             UUID,
    is_deleted             BOOLEAN DEFAULT FALSE,
    deleted_at             TIMESTAMPTZ,
    CONSTRAINT ck_users_role CHECK (role IN (
        'SUPER_ADMIN', 'ADMIN', 'PLANNER', 'FOREMAN', 'EMPLOYEE', 'PROPERTY_MANAGER'
    ))
);

CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE is_deleted = FALSE;
CREATE INDEX idx_users_tenant ON users (tenant_id) WHERE is_deleted = FALSE;

-- ─── EMPLOYEES ──────────────────────────────────────────────────────────────
CREATE TABLE employees (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    user_id         UUID REFERENCES users(id),
    region_id       UUID REFERENCES regions(id),
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    display_name    VARCHAR(200),
    employee_type   VARCHAR(30) NOT NULL,
    weekly_hours    DECIMAL(5,2),
    hourly_rate     DECIMAL(8,2),
    color_code      VARCHAR(7),
    phone           VARCHAR(30),
    email           VARCHAR(200),
    home_address    TEXT,
    home_lat        DECIMAL(10,7),
    home_lng        DECIMAL(10,7),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID,
    updated_by      UUID,
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT ck_employees_type CHECK (employee_type IN (
        'FULLTIME', 'PARTTIME', 'MINIJOB', 'SUBCONTRACTOR', 'FRANCHISEE'
    )),
    CONSTRAINT ck_employees_color CHECK (color_code IS NULL OR color_code ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX idx_employees_tenant ON employees (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employees_type ON employees (tenant_id, employee_type) WHERE is_deleted = FALSE;

-- regions.assigned_employee_id: FK nachträglich (zirkulär)
ALTER TABLE regions
  ADD CONSTRAINT fk_regions_employee FOREIGN KEY (assigned_employee_id) REFERENCES employees(id);

-- ─── PROPERTY_MANAGERS ──────────────────────────────────────────────────────
CREATE TABLE property_managers (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    name          VARCHAR(200) NOT NULL,
    contact_name  VARCHAR(200),
    email         VARCHAR(200),
    phone         VARCHAR(30),
    address       TEXT,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    created_by    UUID,
    updated_by    UUID,
    is_deleted    BOOLEAN DEFAULT FALSE,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_property_managers_tenant ON property_managers (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_property_managers_name_trgm ON property_managers USING gin (name gin_trgm_ops);

-- ─── CONTRACTS ──────────────────────────────────────────────────────────────
CREATE TABLE contracts (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    property_manager_id     UUID NOT NULL REFERENCES property_managers(id),
    contract_type           VARCHAR(30) NOT NULL,
    start_date              DATE,
    end_date                DATE,
    notice_period_months    INTEGER,
    monthly_value           DECIMAL(10,2),
    scope_description       TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              UUID,
    updated_by              UUID,
    is_deleted              BOOLEAN DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT ck_contracts_type CHECK (contract_type IN ('STANDARD', 'PREMIUM', 'FRANCHISE'))
);

CREATE INDEX idx_contracts_tenant ON contracts (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_contracts_manager ON contracts (property_manager_id) WHERE is_deleted = FALSE;

-- ─── PROPERTIES ─────────────────────────────────────────────────────────────
CREATE TABLE properties (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id),
    property_manager_id   UUID REFERENCES property_managers(id),
    contract_id           UUID REFERENCES contracts(id),
    region_id             UUID REFERENCES regions(id),
    name                  VARCHAR(200) NOT NULL,
    street                VARCHAR(200) NOT NULL,
    house_number          VARCHAR(20),
    zip_code              VARCHAR(10) NOT NULL,
    city                  VARCHAR(100) NOT NULL,
    lat                   DECIMAL(10,7),
    lng                   DECIMAL(10,7),
    property_type         VARCHAR(50) NOT NULL,
    unit_count            INTEGER DEFAULT 1,
    floor_count           INTEGER,
    green_area_sqm        INTEGER,
    paved_area_sqm        INTEGER,
    brand                 VARCHAR(50),
    is_bait_property      BOOLEAN DEFAULT FALSE,
    access_info           TEXT,
    notes                 TEXT,
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    created_by            UUID,
    updated_by            UUID,
    is_deleted            BOOLEAN DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT ck_properties_type CHECK (property_type IN (
        'APARTMENT_BUILDING', 'SINGLE_FAMILY', 'DUPLEX', 'COMMERCIAL', 'MIXED'
    )),
    CONSTRAINT ck_properties_brand CHECK (brand IS NULL OR brand IN ('GEPARD', 'IMMOBILIENBUTLER', 'PAUL'))
);

CREATE INDEX idx_properties_tenant ON properties (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_properties_city ON properties (tenant_id, city) WHERE is_deleted = FALSE;
CREATE INDEX idx_properties_geo ON properties (lat, lng) WHERE is_deleted = FALSE;
CREATE INDEX idx_properties_name_trgm ON properties USING gin (name gin_trgm_ops);

-- ─── PROPERTY_ZONES ─────────────────────────────────────────────────────────
CREATE TABLE property_zones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    property_id     UUID NOT NULL REFERENCES properties(id),
    name            VARCHAR(100) NOT NULL,
    zone_type       VARCHAR(30) NOT NULL,
    area_sqm        INTEGER,
    floor_number    INTEGER,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT ck_zones_type CHECK (zone_type IN (
        'STAIRCASE', 'GARDEN_FRONT', 'GARDEN_BACK', 'COURTYARD', 'GARAGE', 'BASEMENT', 'OTHER'
    ))
);

CREATE INDEX idx_property_zones_property ON property_zones (property_id) WHERE is_deleted = FALSE;

-- ─── SERVICE_TYPES ──────────────────────────────────────────────────────────
CREATE TABLE service_types (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    name                     VARCHAR(100) NOT NULL,
    short_name               VARCHAR(30) NOT NULL,
    category                 VARCHAR(50) NOT NULL,
    color_code               VARCHAR(7) NOT NULL,
    icon                     VARCHAR(50),
    default_duration_min     INTEGER NOT NULL DEFAULT 30,
    requires_qualification   VARCHAR(50),
    sort_order               INTEGER DEFAULT 0,
    is_active                BOOLEAN DEFAULT TRUE,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    is_deleted               BOOLEAN DEFAULT FALSE,
    deleted_at               TIMESTAMPTZ,
    CONSTRAINT ck_service_types_category CHECK (category IN (
        'CLEANING', 'GARDEN', 'WASTE', 'WINTER', 'MAINTENANCE', 'OTHER'
    )),
    CONSTRAINT ck_service_types_color CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT ck_service_types_duration CHECK (default_duration_min BETWEEN 5 AND 480)
);

CREATE INDEX idx_service_types_tenant ON service_types (tenant_id) WHERE is_deleted = FALSE;

-- ─── AUDIT_LOG ──────────────────────────────────────────────────────────────
-- DSGVO Art. 30 — Verzeichnis von Verarbeitungstätigkeiten
-- Append-Only: keine UPDATE/DELETE durch hmservice_app (via GRANT-Restriction unten)
-- Kein is_deleted-Flag — Audit-Trail muss unveränderlich sein
CREATE TABLE audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    user_id       UUID,
    action        VARCHAR(50) NOT NULL,
    target_type   VARCHAR(50),
    target_id     UUID,
    metadata      JSONB DEFAULT '{}'::jsonb,
    ip_address    INET,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT ck_audit_log_action CHECK (action ~ '^[a-z_]+\.[a-z_]+$')
);

CREATE INDEX idx_audit_log_tenant_date ON audit_log (tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON audit_log (tenant_id, user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_log_target ON audit_log (tenant_id, target_type, target_id, created_at DESC) WHERE target_id IS NOT NULL;

-- ─── Triggers: updated_at ───────────────────────────────────────────────────
-- Funktion fn_set_updated_at() kommt aus 03-functions.sql
CREATE TRIGGER tr_tenants_updated_at            BEFORE UPDATE ON tenants            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_users_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_regions_updated_at            BEFORE UPDATE ON regions            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_employees_updated_at          BEFORE UPDATE ON employees          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_property_managers_updated_at  BEFORE UPDATE ON property_managers  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_contracts_updated_at          BEFORE UPDATE ON contracts          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_properties_updated_at         BEFORE UPDATE ON properties         FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_property_zones_updated_at     BEFORE UPDATE ON property_zones     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_service_types_updated_at      BEFORE UPDATE ON service_types      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
-- KEIN Trigger für audit_log — die Tabelle wird nie geupdatet

-- ─── Row Level Security ─────────────────────────────────────────────────────
-- ADR-02: tenant_isolation via app.current_tenant_id
-- USERS hat zusätzlich Super-Admin-Bypass (ADR-09)

ALTER TABLE tenants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees          ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_managers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_zones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log          ENABLE ROW LEVEL SECURITY;

-- TENANTS: jeder darf nur eigenen Tenant sehen (id = current_tenant) — außer Super-Admin
CREATE POLICY tenants_isolation ON tenants
    USING (
        id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.is_super_admin', true) = 'true'
    );

-- USERS: gleiche Tenant-Isolation + Super-Admin-Bypass
CREATE POLICY users_isolation ON users
    USING (
        tenant_id = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.is_super_admin', true) = 'true'
    );

-- Standard-Policies für alle anderen tenant-scoped Tabellen
CREATE POLICY regions_isolation           ON regions           USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY employees_isolation         ON employees         USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY property_managers_isolation ON property_managers USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY contracts_isolation         ON contracts         USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY properties_isolation        ON properties        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY property_zones_isolation    ON property_zones    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY service_types_isolation     ON service_types     USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY audit_log_isolation         ON audit_log         USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ─── GRANTs ─────────────────────────────────────────────────────────────────
-- hmservice_app: SELECT/INSERT/UPDATE/DELETE auf 9 Tabellen
-- ABER: nur INSERT + SELECT auf AUDIT_LOG (Append-Only — ADR-15 + DSGVO)

GRANT SELECT, INSERT, UPDATE, DELETE ON tenants            TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON users              TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON regions            TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON employees          TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON property_managers  TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON contracts          TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON properties         TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON property_zones     TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON service_types      TO hmservice_app;

-- AUDIT_LOG: Append-Only-Schutz — kein UPDATE, kein DELETE für App-Rolle
-- ALTER DEFAULT PRIVILEGES (02-roles.sql) gibt App-Rolle auto S/I/U/D auf neue Tabellen,
-- daher müssen wir UPDATE/DELETE explizit zurücknehmen.
GRANT SELECT, INSERT ON audit_log TO hmservice_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM hmservice_app;
