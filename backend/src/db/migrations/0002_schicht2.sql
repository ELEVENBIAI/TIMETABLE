-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0002 — Schicht 2: Fähigkeiten (Qualifikationen, Equipment, Verfügbarkeit)
-- ────────────────────────────────────────────────────────────────────────────
-- 5 Tabellen:
--   qualification_types    — Stammdaten der Qualifikationen (WINTERDIENST, MOTORSAEGE, …)
--   equipment_types        — Stammdaten der Geräte (Rasenmäher, Wischmopp, …) mit Zeitfaktor
--   employee_qualifications — M:N zwischen Employees und QualificationTypes
--   employee_equipment      — M:N zwischen Employees und EquipmentTypes
--   employee_availability   — Reguläre Wochenverfügbarkeit pro Mitarbeiter
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE qualification_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    code            VARCHAR(50) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    requires_proof  BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_qualification_types_code ON qualification_types (tenant_id, code) WHERE is_deleted = FALSE;
CREATE INDEX idx_qualification_types_tenant ON qualification_types (tenant_id) WHERE is_deleted = FALSE;

CREATE TABLE equipment_types (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            UUID NOT NULL REFERENCES tenants(id),
    code                 VARCHAR(50) NOT NULL,
    name                 VARCHAR(200) NOT NULL,
    category             VARCHAR(50) NOT NULL,
    hourly_rate_factor   DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    description          TEXT,
    is_active            BOOLEAN DEFAULT TRUE,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    is_deleted           BOOLEAN DEFAULT FALSE,
    deleted_at           TIMESTAMPTZ,
    CONSTRAINT ck_equipment_types_category CHECK (category IN (
        'RASENMAEHER', 'REINIGUNG', 'WINTER', 'GARTEN', 'WERKZEUG', 'FAHRZEUG', 'OTHER'
    )),
    CONSTRAINT ck_equipment_types_factor CHECK (hourly_rate_factor BETWEEN 0.30 AND 2.00)
);

CREATE UNIQUE INDEX uq_equipment_types_code ON equipment_types (tenant_id, code) WHERE is_deleted = FALSE;
CREATE INDEX idx_equipment_types_tenant ON equipment_types (tenant_id) WHERE is_deleted = FALSE;

CREATE TABLE employee_qualifications (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID NOT NULL REFERENCES tenants(id),
    employee_id            UUID NOT NULL REFERENCES employees(id),
    qualification_type_id  UUID NOT NULL REFERENCES qualification_types(id),
    valid_until            DATE,
    certificate_number     VARCHAR(100),
    notes                  TEXT,
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW(),
    is_deleted             BOOLEAN DEFAULT FALSE,
    deleted_at             TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_employee_qualifications
    ON employee_qualifications (employee_id, qualification_type_id)
    WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_qualifications_tenant ON employee_qualifications (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_qualifications_expiry
    ON employee_qualifications (tenant_id, valid_until)
    WHERE valid_until IS NOT NULL AND is_deleted = FALSE;

CREATE TABLE employee_equipment (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    employee_id         UUID NOT NULL REFERENCES employees(id),
    equipment_type_id   UUID NOT NULL REFERENCES equipment_types(id),
    assigned_at         DATE DEFAULT CURRENT_DATE,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_employee_equipment
    ON employee_equipment (employee_id, equipment_type_id)
    WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_equipment_tenant ON employee_equipment (tenant_id) WHERE is_deleted = FALSE;

CREATE TABLE employee_availability (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    employee_id       UUID NOT NULL REFERENCES employees(id),
    day_of_week       INTEGER NOT NULL,
    is_available      BOOLEAN DEFAULT TRUE,
    available_from    TIME,
    available_until   TIME,
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted        BOOLEAN DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT ck_employee_availability_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_employee_availability_time CHECK (
        available_from IS NULL OR available_until IS NULL OR available_from < available_until
    )
);

CREATE UNIQUE INDEX uq_employee_availability
    ON employee_availability (employee_id, day_of_week)
    WHERE is_deleted = FALSE;
CREATE INDEX idx_employee_availability_tenant ON employee_availability (tenant_id) WHERE is_deleted = FALSE;

-- Triggers: updated_at
CREATE TRIGGER tr_qualification_types_updated_at    BEFORE UPDATE ON qualification_types    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_equipment_types_updated_at        BEFORE UPDATE ON equipment_types        FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_employee_qualifications_updated_at BEFORE UPDATE ON employee_qualifications FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_employee_equipment_updated_at     BEFORE UPDATE ON employee_equipment     FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_employee_availability_updated_at  BEFORE UPDATE ON employee_availability  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE qualification_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_equipment      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_availability   ENABLE ROW LEVEL SECURITY;

CREATE POLICY qualification_types_isolation     ON qualification_types     USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY equipment_types_isolation         ON equipment_types         USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY employee_qualifications_isolation ON employee_qualifications USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY employee_equipment_isolation      ON employee_equipment      USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY employee_availability_isolation   ON employee_availability   USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- GRANTs (Default-Privileges greift bereits — explizit zur Sicherheit)
GRANT SELECT, INSERT, UPDATE, DELETE ON qualification_types     TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON equipment_types         TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_qualifications TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_equipment      TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_availability   TO hmservice_app;
