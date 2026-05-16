-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0004 — Schicht 4: Planung (Templates, Schedules, Absences, Contingency)
-- ────────────────────────────────────────────────────────────────────────────
-- 6 Tabellen:
--   schedule_templates  — Wiederkehrende Basis-Wochenpläne
--   template_entries    — Einzelne Einträge im Template
--   schedules           — Konkrete Wochenpläne (DRAFT → PUBLISHED → ARCHIVED)
--   schedule_entries    — Zentrale Datenstruktur: 1 Aufgabe = 1 Zeile
--   absence_records     — Abwesenheiten (Krankheit, Urlaub)
--   contingency_rules   — Vordefinierte Vertretungsketten
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE schedule_templates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    name          VARCHAR(200) NOT NULL,
    description   TEXT,
    is_default    BOOLEAN DEFAULT FALSE,
    valid_from    DATE,
    valid_until   DATE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    created_by    UUID,
    is_deleted    BOOLEAN DEFAULT FALSE,
    deleted_at    TIMESTAMPTZ
);

CREATE INDEX idx_schedule_templates_tenant ON schedule_templates (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_schedule_templates_default ON schedule_templates (tenant_id, is_default) WHERE is_default = TRUE AND is_deleted = FALSE;

CREATE TABLE template_entries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    template_id       UUID NOT NULL REFERENCES schedule_templates(id),
    employee_id       UUID NOT NULL REFERENCES employees(id),
    day_of_week       INTEGER NOT NULL,
    property_id       UUID NOT NULL REFERENCES properties(id),
    service_type_id   UUID NOT NULL REFERENCES service_types(id),
    start_time        TIME NOT NULL,
    duration_min      INTEGER NOT NULL,
    sort_order        INTEGER DEFAULT 0,
    notes             TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    is_deleted        BOOLEAN DEFAULT FALSE,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT ck_template_entries_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_template_entries_duration CHECK (duration_min BETWEEN 5 AND 480)
);

CREATE INDEX idx_template_entries_template ON template_entries (template_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_template_entries_employee ON template_entries (employee_id, day_of_week) WHERE is_deleted = FALSE;

CREATE TABLE schedules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id),
    week_start          DATE NOT NULL,
    week_number         INTEGER NOT NULL,
    year                INTEGER NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    template_id         UUID REFERENCES schedule_templates(id),
    generation_method   VARCHAR(30),
    published_at        TIMESTAMPTZ,
    published_by        UUID,
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          UUID,
    is_deleted          BOOLEAN DEFAULT FALSE,
    deleted_at          TIMESTAMPTZ,
    CONSTRAINT ck_schedules_status CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
    CONSTRAINT ck_schedules_generation CHECK (generation_method IS NULL OR generation_method IN (
        'MANUAL','FROM_TEMPLATE','AI_GENERATED','AI_ADJUSTED'
    )),
    CONSTRAINT ck_schedules_week_number CHECK (week_number BETWEEN 1 AND 53),
    CONSTRAINT uq_schedules_week UNIQUE (tenant_id, week_start)
);

CREATE INDEX idx_schedules_week ON schedules (tenant_id, year, week_number);

CREATE TABLE schedule_entries (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    schedule_id             UUID NOT NULL REFERENCES schedules(id),
    employee_id             UUID NOT NULL REFERENCES employees(id),
    entry_date              DATE NOT NULL,
    day_of_week             INTEGER NOT NULL,
    property_id             UUID NOT NULL REFERENCES properties(id),
    service_type_id         UUID NOT NULL REFERENCES service_types(id),
    property_service_id     UUID REFERENCES property_services(id),
    start_time              TIME,
    duration_min            INTEGER NOT NULL,
    sort_order              INTEGER DEFAULT 0,
    status                  VARCHAR(30) DEFAULT 'PLANNED',
    is_extra                BOOLEAN DEFAULT FALSE,
    is_from_reassignment    BOOLEAN DEFAULT FALSE,
    original_employee_id    UUID REFERENCES employees(id),
    reassignment_reason     VARCHAR(50),
    notes                   TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              UUID,
    updated_by              UUID,
    is_deleted              BOOLEAN DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT ck_schedule_entries_day CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT ck_schedule_entries_status CHECK (status IN (
        'PLANNED','IN_PROGRESS','COMPLETED','SKIPPED','REASSIGNED','REASSIGNMENT_NEEDED'
    )),
    CONSTRAINT ck_schedule_entries_reason CHECK (reassignment_reason IS NULL OR reassignment_reason IN (
        'SICK','VACATION','EMERGENCY','OPTIMIZATION','OTHER'
    )),
    CONSTRAINT ck_schedule_entries_duration CHECK (duration_min BETWEEN 5 AND 480)
);

CREATE INDEX idx_schedule_entries_schedule ON schedule_entries (schedule_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_schedule_entries_employee_date ON schedule_entries (employee_id, entry_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_schedule_entries_property_date ON schedule_entries (property_id, entry_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_schedule_entries_date ON schedule_entries (tenant_id, entry_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_schedule_entries_status ON schedule_entries (tenant_id, status) WHERE status IN ('REASSIGNMENT_NEEDED', 'PLANNED') AND is_deleted = FALSE;

CREATE TABLE absence_records (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    employee_id     UUID NOT NULL REFERENCES employees(id),
    absence_type    VARCHAR(30) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    is_full_day     BOOLEAN DEFAULT TRUE,
    start_time      TIME,
    end_time        TIME,
    notes           TEXT,
    reported_at     TIMESTAMPTZ DEFAULT NOW(),
    reported_by     UUID,
    is_handled      BOOLEAN DEFAULT FALSE,
    handled_at      TIMESTAMPTZ,
    handled_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT ck_absence_type CHECK (absence_type IN ('SICK','VACATION','PERSONAL','TRAINING','OTHER')),
    CONSTRAINT ck_absence_dates CHECK (start_date <= end_date)
);

CREATE INDEX idx_absence_employee ON absence_records (employee_id, start_date, end_date) WHERE is_deleted = FALSE;
CREATE INDEX idx_absence_unhandled ON absence_records (tenant_id) WHERE is_handled = FALSE AND is_deleted = FALSE;

CREATE TABLE contingency_rules (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    primary_employee_id     UUID NOT NULL REFERENCES employees(id),
    backup_employee_id      UUID NOT NULL REFERENCES employees(id),
    property_id             UUID REFERENCES properties(id),
    service_type_id         UUID REFERENCES service_types(id),
    priority                INTEGER DEFAULT 1,
    notes                   TEXT,
    is_active               BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    is_deleted              BOOLEAN DEFAULT FALSE,
    deleted_at              TIMESTAMPTZ,
    CONSTRAINT ck_contingency_not_self CHECK (primary_employee_id != backup_employee_id),
    CONSTRAINT ck_contingency_priority CHECK (priority BETWEEN 1 AND 10)
);

CREATE INDEX idx_contingency_primary ON contingency_rules (tenant_id, primary_employee_id, priority) WHERE is_deleted = FALSE;
CREATE INDEX idx_contingency_property ON contingency_rules (tenant_id, property_id) WHERE property_id IS NOT NULL AND is_deleted = FALSE;

-- Triggers
CREATE TRIGGER tr_schedule_templates_updated_at BEFORE UPDATE ON schedule_templates FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_template_entries_updated_at   BEFORE UPDATE ON template_entries   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_schedules_updated_at          BEFORE UPDATE ON schedules          FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_schedule_entries_updated_at   BEFORE UPDATE ON schedule_entries   FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_absence_records_updated_at    BEFORE UPDATE ON absence_records    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_contingency_rules_updated_at  BEFORE UPDATE ON contingency_rules  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contingency_rules  ENABLE ROW LEVEL SECURITY;

CREATE POLICY schedule_templates_isolation ON schedule_templates USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY template_entries_isolation   ON template_entries   USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY schedules_isolation          ON schedules          USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY schedule_entries_isolation   ON schedule_entries   USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY absence_records_isolation    ON absence_records    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY contingency_rules_isolation  ON contingency_rules  USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_templates TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON template_entries   TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedules          TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON schedule_entries   TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON absence_records    TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON contingency_rules  TO hmservice_app;
