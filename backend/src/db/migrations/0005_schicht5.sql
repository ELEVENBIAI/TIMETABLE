-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0005 — Schicht 5: Ausführung & Auswertung + Pilot-Tenant-Seed
-- ────────────────────────────────────────────────────────────────────────────
-- 2 Tabellen:
--   time_logs          — Ist-Zeiterfassung mit GPS (DSGVO: GPS = personenbezogen)
--   reassignment_log   — Protokoll der KI-Vertretungsvorschläge (Lerneffekt)
--
-- Seed: Pilot-Tenant mit realistischen Stammdaten (aus Erstgespräch)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE time_logs (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id),
    schedule_entry_id        UUID NOT NULL REFERENCES schedule_entries(id),
    employee_id              UUID NOT NULL REFERENCES employees(id),
    check_in                 TIMESTAMPTZ,
    check_out                TIMESTAMPTZ,
    actual_duration_min      INTEGER,
    check_in_lat             DECIMAL(10,7),
    check_in_lng             DECIMAL(10,7),
    check_out_lat            DECIMAL(10,7),
    check_out_lng            DECIMAL(10,7),
    deviation_min            INTEGER,
    status                   VARCHAR(30) DEFAULT 'PENDING',
    notes                    TEXT,
    created_at               TIMESTAMPTZ DEFAULT NOW(),
    updated_at               TIMESTAMPTZ DEFAULT NOW(),
    is_deleted               BOOLEAN DEFAULT FALSE,
    deleted_at               TIMESTAMPTZ,
    CONSTRAINT ck_time_logs_status CHECK (status IN ('PENDING','CHECKED_IN','CHECKED_OUT','AUTO_CLOSED')),
    CONSTRAINT ck_time_logs_check_order CHECK (check_out IS NULL OR check_in IS NULL OR check_out >= check_in)
);

CREATE INDEX idx_time_logs_entry ON time_logs (schedule_entry_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_time_logs_employee_date ON time_logs (employee_id, check_in) WHERE is_deleted = FALSE;
CREATE INDEX idx_time_logs_tenant ON time_logs (tenant_id) WHERE is_deleted = FALSE;

CREATE TABLE reassignment_log (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenants(id),
    schedule_id             UUID NOT NULL REFERENCES schedules(id),
    absence_record_id       UUID REFERENCES absence_records(id),
    absent_employee_id      UUID NOT NULL REFERENCES employees(id),
    reassigned_to_id        UUID NOT NULL REFERENCES employees(id),
    schedule_entry_id       UUID NOT NULL REFERENCES schedule_entries(id),
    reason                  VARCHAR(50) NOT NULL,
    method                  VARCHAR(30) NOT NULL,
    ai_confidence           DECIMAL(3,2),
    ai_reasoning            TEXT,
    was_accepted            BOOLEAN,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    created_by              UUID,
    CONSTRAINT ck_reassignment_log_reason CHECK (reason IN ('SICK','VACATION','EMERGENCY','OPTIMIZATION','OTHER')),
    CONSTRAINT ck_reassignment_log_method CHECK (method IN ('MANUAL','AI_SUGGESTED','AI_AUTO','CONTINGENCY_RULE')),
    CONSTRAINT ck_reassignment_log_confidence CHECK (ai_confidence IS NULL OR ai_confidence BETWEEN 0.00 AND 1.00)
);

CREATE INDEX idx_reassignment_log_tenant_date ON reassignment_log (tenant_id, created_at DESC);
CREATE INDEX idx_reassignment_log_absent ON reassignment_log (tenant_id, absent_employee_id);
CREATE INDEX idx_reassignment_log_method ON reassignment_log (tenant_id, method, was_accepted);

-- Triggers
CREATE TRIGGER tr_time_logs_updated_at BEFORE UPDATE ON time_logs FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
-- reassignment_log ist append-only-ähnlich (kein UPDATE-Pattern für Korrekturen)

-- RLS
ALTER TABLE time_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reassignment_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY time_logs_isolation        ON time_logs        USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
CREATE POLICY reassignment_log_isolation ON reassignment_log USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON time_logs        TO hmservice_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON reassignment_log TO hmservice_app;

-- ────────────────────────────────────────────────────────────────────────────
-- Pilot-Tenant-Seed
-- ────────────────────────────────────────────────────────────────────────────
-- Deterministische UUIDs für Tests + Pilot-Onboarding
-- Diese Seeds dürfen idempotent sein (ON CONFLICT DO NOTHING)
-- ────────────────────────────────────────────────────────────────────────────

-- Pilot-Tenant
INSERT INTO tenants (id, name, slug, brand) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Pilot Tenant', 'pilot', 'GEPARD')
ON CONFLICT (id) DO NOTHING;

-- Pilot-Users (Passwort-Hash ist Placeholder — wird in TT-02 mit echtem bcrypt ersetzt)
-- 'placeholder-hash' triggert MUST_CHANGE_PASSWORD beim ersten Login
INSERT INTO users (id, tenant_id, email, password_hash, display_name, role, must_change_password) VALUES
    ('aaaaaaaa-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin@pilot.local',   'placeholder-hash', 'Pilot Admin',    'ADMIN',   TRUE),
    ('aaaaaaaa-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'robert@pilot.local',  'placeholder-hash', 'Robert (Planer)','PLANNER', TRUE),
    ('aaaaaaaa-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daniel@pilot.local',  'placeholder-hash', 'Daniel K.',      'EMPLOYEE',TRUE),
    ('aaaaaaaa-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'anna@pilot.local',    'placeholder-hash', 'Anna S.',        'EMPLOYEE',TRUE),
    ('aaaaaaaa-5555-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'gabi@pilot.local',    'placeholder-hash', 'Gabi M.',        'EMPLOYEE',TRUE),
    ('aaaaaaaa-6666-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'juergen@pilot.local', 'placeholder-hash', 'Jürgen',         'EMPLOYEE',TRUE)
ON CONFLICT (id) DO NOTHING;

-- Pilot-Employees (Daten aus Erstgespräch + Datenmodell-Spec)
INSERT INTO employees (id, tenant_id, user_id, first_name, last_name, display_name, employee_type, weekly_hours, color_code) VALUES
    ('bbbbbbbb-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-3333-1111-1111-111111111111', 'Daniel', 'K.',   'Daniel K.', 'FULLTIME',      40.0, '#FF6B6B'),
    ('bbbbbbbb-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-4444-1111-1111-111111111111', 'Anna',   'S.',   'Anna S.',   'PARTTIME',      20.0, '#4ECDC4'),
    ('bbbbbbbb-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-5555-1111-1111-111111111111', 'Gabi',   'M.',   'Gabi M.',   'PARTTIME',      15.0, '#FFD166'),
    ('bbbbbbbb-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-6666-1111-1111-111111111111', 'Jürgen', 'SubU', 'Jürgen',    'SUBCONTRACTOR', 30.0, '#06D6A0')
ON CONFLICT (id) DO NOTHING;

-- 9 Standard-Tätigkeitstypen aus Transkript (Farbkodierung Pflicht)
INSERT INTO service_types (id, tenant_id, name, short_name, category, color_code, default_duration_min, sort_order) VALUES
    ('cccccccc-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Treppenhaus Reinigung',  'Treppenhaus',    'CLEANING',    '#F97316', 30, 1),
    ('cccccccc-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Gartenpflege',           'Garten',         'GARDEN',      '#22C55E', 60, 2),
    ('cccccccc-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Hofflächenpflege',       'Hof',            'CLEANING',    '#E5E7EB', 30, 3),
    ('cccccccc-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Mülltonnen rausstellen', 'Müll raus',      'WASTE',       '#8B5CF6', 10, 4),
    ('cccccccc-5555-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Mülltonnen reinstellen', 'Müll rein',      'WASTE',       '#8B5CF6', 10, 5),
    ('cccccccc-6666-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Winterdienst',           'Winter',         'WINTER',      '#3B82F6', 45, 6),
    ('cccccccc-7777-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Fensterreinigung',       'Fenster',        'CLEANING',    '#F97316', 45, 7),
    ('cccccccc-8888-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Dachrinne reinigen',     'Dachrinne',      'MAINTENANCE', '#6B7280', 30, 8),
    ('cccccccc-9999-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Kellerreinigung',        'Keller',         'CLEANING',    '#F97316', 20, 9)
ON CONFLICT (id) DO NOTHING;

-- 5 Qualifikationstypen
INSERT INTO qualification_types (id, tenant_id, code, name, requires_proof) VALUES
    ('dddddddd-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'WINTERDIENST',     'Winterdienst (Räumfahrzeug, Streupflicht)', TRUE),
    ('dddddddd-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'MOTORSAEGE',       'Motorsäge / Kettensäge',                    TRUE),
    ('dddddddd-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HEBEBUEHNE',       'Hebebühne bedienen',                        TRUE),
    ('dddddddd-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'GEBAEUDEREINIGUNG','Gebäudereinigung (Standard)',               FALSE),
    ('dddddddd-5555-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'PREMIUM_SERVICE',  'Premium Service (Immobilienbutler-Level)',  FALSE)
ON CONFLICT (id) DO NOTHING;

-- 9 Equipment-Types mit Zeitfaktoren
INSERT INTO equipment_types (id, tenant_id, code, name, category, hourly_rate_factor) VALUES
    ('eeeeeeee-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HANDRASENMAEHER',       'Handrasenmäher',         'RASENMAEHER', 2.00),
    ('eeeeeeee-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ELEKTRO_RASENMAEHER',   'Elektro-Rasenmäher',     'RASENMAEHER', 1.00),
    ('eeeeeeee-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'BENZIN_RASENMAEHER',    'Benzin-Rasenmäher',      'RASENMAEHER', 0.80),
    ('eeeeeeee-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'FAHRRASENMAEHER',       'Fahrrasenmäher',         'RASENMAEHER', 0.30),
    ('eeeeeeee-5555-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'WISCHMOPP',             'Wischmopp-Gürtel',       'REINIGUNG',   1.00),
    ('eeeeeeee-6666-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'RAEUMFAHRZEUG',         'Räumfahrzeug',           'WINTER',      0.40),
    ('eeeeeeee-7777-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'SCHNEESCHIEBER',        'Schneeschieber manuell', 'WINTER',      1.50),
    ('eeeeeeee-8888-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HECKENSCHERE_ELEKTRO',  'Heckenschere elektrisch','GARTEN',      0.70),
    ('eeeeeeee-9999-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'HECKENSCHERE_MANUAL',   'Heckenschere manuell',   'GARTEN',      1.50)
ON CONFLICT (id) DO NOTHING;

-- 6 Waste Bin Types (deutsche Mülltrennung)
INSERT INTO waste_bin_types (id, tenant_id, code, name, color_code) VALUES
    ('ffffffff-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'RESTMUELL',    'Restmüll',     '#4B5563'),
    ('ffffffff-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'PAPIER',       'Papier',       '#3B82F6'),
    ('ffffffff-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'GELBER_SACK',  'Gelber Sack',  '#FCD34D'),
    ('ffffffff-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'GELBE_TONNE',  'Gelbe Tonne',  '#EAB308'),
    ('ffffffff-5555-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'BIOMUELL',     'Biomüll',      '#92400E'),
    ('ffffffff-6666-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'GLAS',         'Glas',         '#10B981')
ON CONFLICT (id) DO NOTHING;

-- 4 Pilot-Properties (aus Erstgespräch)
INSERT INTO properties (id, tenant_id, name, street, house_number, zip_code, city, property_type, unit_count, floor_count, brand) VALUES
    ('a1a1a1a1-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Porzer Straße 12',     'Porzer Straße',     '12', '51143', 'Köln', 'APARTMENT_BUILDING', 12,  4, 'IMMOBILIENBUTLER'),
    ('a1a1a1a1-2222-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Deutschlandstraße 7',  'Deutschlandstraße', '7',  '51149', 'Köln', 'APARTMENT_BUILDING',  4,  2, 'GEPARD'),
    ('a1a1a1a1-3333-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Lorweg 3',             'Lorweg',            '3',  '51147', 'Köln', 'APARTMENT_BUILDING',  8,  3, 'GEPARD'),
    ('a1a1a1a1-4444-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Hochhaus Am Park',     'Parkstraße',        '1',  '51145', 'Köln', 'APARTMENT_BUILDING', 80, 12, 'IMMOBILIENBUTLER')
ON CONFLICT (id) DO NOTHING;
