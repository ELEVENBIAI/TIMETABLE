-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0003 — Schicht 3: Leistungen + Müllabfuhr
-- ────────────────────────────────────────────────────────────────────────────
-- 3 Tabellen:
--   property_services  — Leistungsverzeichnis (was wird wo + Frequenz)
--   waste_bin_types    — Stammdaten der Tonnen-Typen (Restmüll, Papier, …)
--   waste_schedules    — Abfuhrpläne pro Property
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE property_services (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    property_id              UUID NOT NULL REFERENCES properties(id),
    service_type_id          UUID NOT NULL REFERENCES service_types(id),
    frequency                VARCHAR(30) NOT NULL,
    frequency_detail         JSONB DEFAULT '{}'::jsonb,
    estimated_duration_min   INTEGER NOT NULL,
    time_window_start        TIME,
    time_window_end          TIME,
    priority                 INTEGER DEFAULT 3,
    notes                    TEXT,
    seasonal_start           INTEGER,
    seasonal_end             INTEGER,
    is_active                BOOLEAN DEFAULT TRUE,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    created_by               UUID,
    updated_by               UUID,
    is_deleted               BOOLEAN DEFAULT FALSE,
    deleted_at               TIMESTAMPTZ,
    CONSTRAINT ck_property_services_frequency CHECK (frequency IN (
        'WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','BIANNUAL','ANNUAL','ON_DEMAND'
    )),
    CONSTRAINT ck_property_services_priority CHECK (priority BETWEEN 1 AND 4),
    CONSTRAINT ck_property_services_duration CHECK (estimated_duration_min BETWEEN 5 AND 480),
    CONSTRAINT ck_property_services_seasonal_start CHECK (seasonal_start IS NULL OR seasonal_start BETWEEN 1 AND 12),
    CONSTRAINT ck_property_services_seasonal_end CHECK (seasonal_end IS NULL OR seasonal_end BETWEEN 1 AND 12)
);

CREATE INDEX idx_property_services_property ON property_services (property_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_property_services_frequency ON property_services (tenant_id, frequency) WHERE is_deleted = FALSE;
CREATE INDEX idx_property_services_seasonal ON property_services (tenant_id, seasonal_start, seasonal_end) WHERE is_deleted = FALSE;

CREATE TABLE waste_bin_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    code            VARCHAR(30) NOT NULL,
    name            VARCHAR(100) NOT NULL,
    color_code      VARCHAR(7),
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_deleted      BOOLEAN DEFAULT FALSE,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT ck_waste_bin_types_code CHECK (code IN (
        'RESTMUELL','PAPIER','GELBER_SACK','GELBE_TONNE','BIOMUELL','GLAS','SPERRMUELL','ANDERE'
    )),
    CONSTRAINT ck_waste_bin_types_color CHECK (color_code IS NULL OR color_code ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE UNIQUE INDEX uq_waste_bin_types_code ON waste_bin_types (tenant_id, code) WHERE is_deleted = FALSE;

CREATE TABLE waste_schedules (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenants(id),
    property_id           UUID NOT NULL REFERENCES properties(id),
    waste_bin_type_id     UUID NOT NULL REFERENCES waste_bin_types(id),
    collection_days       JSONB NOT NULL,
    collection_time       TIME,
    latest_put_out        TIME,
    earliest_take_in      TIME,
    bin_count             INTEGER DEFAULT 1,
    location_description  TEXT,
    notes                 TEXT,
    is_active             BOOLEAN DEFAULT TRUE,
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW(),
    is_deleted            BOOLEAN DEFAULT FALSE,
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT ck_waste_schedules_bin_count CHECK (bin_count >= 1)
);

CREATE INDEX idx_waste_schedules_property ON waste_schedules (property_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_waste_schedules_tenant ON waste_schedules (tenant_id) WHERE is_deleted = FALSE;

-- Triggers
CREATE TRIGGER tr_property_services_updated_at  BEFORE UPDATE ON property_services  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_waste_bin_types_updated_at    BEFORE UPDATE ON waste_bin_types    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER tr_waste_schedules_updated_at    BEFORE UPDATE ON waste_schedules    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- RLS
ALTER TABLE property_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_bin_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_schedules   ENABLE ROW LEVEL SECURITY;

CREATE POLICY property_services_isolation ON property_services USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY waste_bin_types_isolation   ON waste_bin_types   USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY waste_schedules_isolation   ON waste_schedules   USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON property_services TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON waste_bin_types   TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON waste_schedules   TO hmservice_app;
