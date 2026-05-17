-- ────────────────────────────────────────────────────────────────────────────
-- Migration 0009 — Pilot Wave-1 Demo-Seed (ELE-202)
-- ────────────────────────────────────────────────────────────────────────────
-- Ergänzt zum Pilot-Stammdaten-Seed aus 0005:
--   - 1 Property-Manager (Hausverwaltung)
--   - 4 Contracts (1 pro Property)
--   - Properties UPDATE: property_manager_id + contract_id setzen
--   - ~10 Property-Services (Treppenhaus/Hof/Garten/Fenster/Dachrinne/Keller mit Frequenz-Mix)
--   - 4 Waste-Schedules (Mülltonnen-Abfuhrpläne)
--   - 1 Schedule-Template "Standardwoche Gepard"
--   - ~16 Template-Entries
--   - 1 DRAFT-Schedule für KW 21/2026 + ~16 Schedule-Entries
--
-- Idempotenz: Migration-Marker via Property-Manager mit fix-UUID. Wenn der
-- existiert, wird das ganze Script geskipped (RAISE NOTICE).
-- ────────────────────────────────────────────────────────────────────────────

DO $migration$
DECLARE
  -- Bekannte UUIDs aus 0005-Seed
  v_tenant_id            UUID := '11111111-1111-1111-1111-111111111111';
  v_admin_id             UUID := 'aaaaaaaa-1111-1111-1111-111111111111';

  v_prop_porzer          UUID := 'a1a1a1a1-1111-1111-1111-111111111111';
  v_prop_deutschland     UUID := 'a1a1a1a1-2222-1111-1111-111111111111';
  v_prop_lorweg          UUID := 'a1a1a1a1-3333-1111-1111-111111111111';
  v_prop_hochhaus        UUID := 'a1a1a1a1-4444-1111-1111-111111111111';

  v_emp_daniel           UUID := 'bbbbbbbb-1111-1111-1111-111111111111';
  v_emp_anna             UUID := 'bbbbbbbb-2222-1111-1111-111111111111';
  v_emp_gabi             UUID := 'bbbbbbbb-3333-1111-1111-111111111111';
  v_emp_juergen          UUID := 'bbbbbbbb-4444-1111-1111-111111111111';

  v_st_treppenhaus       UUID := 'cccccccc-1111-1111-1111-111111111111';
  v_st_garten            UUID := 'cccccccc-2222-1111-1111-111111111111';
  v_st_hof               UUID := 'cccccccc-3333-1111-1111-111111111111';
  v_st_muell_raus        UUID := 'cccccccc-4444-1111-1111-111111111111';
  v_st_muell_rein        UUID := 'cccccccc-5555-1111-1111-111111111111';
  v_st_fenster           UUID := 'cccccccc-7777-1111-1111-111111111111';
  v_st_dachrinne         UUID := 'cccccccc-8888-1111-1111-111111111111';
  v_st_keller            UUID := 'cccccccc-9999-1111-1111-111111111111';

  v_wbt_restmuell        UUID := 'ffffffff-1111-1111-1111-111111111111';
  v_wbt_papier           UUID := 'ffffffff-2222-1111-1111-111111111111';
  v_wbt_bio              UUID := 'ffffffff-5555-1111-1111-111111111111';

  -- Neue UUIDs für ELE-202 — alle mit Präfix '20202020' für Audit-Trail
  v_pm_id                UUID := '20202020-1111-1111-1111-111111111111';
  v_contract_porzer      UUID := '20202020-2001-1111-1111-111111111111';
  v_contract_deutschland UUID := '20202020-2002-1111-1111-111111111111';
  v_contract_lorweg      UUID := '20202020-2003-1111-1111-111111111111';
  v_contract_hochhaus    UUID := '20202020-2004-1111-1111-111111111111';
  v_template_id          UUID := '20202020-3000-1111-1111-111111111111';
  v_schedule_id          UUID := '20202020-4000-1111-1111-111111111111';

  v_week_start           DATE := DATE '2026-05-18';  -- KW 21/2026 Montag
BEGIN
  -- ── Idempotenz-Check ────────────────────────────────────────────────────
  IF EXISTS (SELECT 1 FROM property_managers WHERE id = v_pm_id) THEN
    RAISE NOTICE 'ELE-202 seed already applied (property_manager exists). Skipping.';
    RETURN;
  END IF;

  -- ── 1. Property-Manager ────────────────────────────────────────────────
  INSERT INTO property_managers (id, tenant_id, name, contact_name, email, phone, address, created_by)
  VALUES (
    v_pm_id, v_tenant_id,
    'Hausverwaltung Schmidt & Partner',
    'Klaus Schmidt',
    'k.schmidt@hvs-koeln.de',
    '+49 221 5551234',
    'Aachener Str. 142, 50931 Köln',
    v_admin_id
  );

  -- ── 2. Contracts (1 pro Property) ──────────────────────────────────────
  INSERT INTO contracts (id, tenant_id, property_manager_id, contract_type, start_date, end_date, notice_period_months, monthly_value, scope_description, created_by) VALUES
    (v_contract_porzer,      v_tenant_id, v_pm_id, 'STANDARD', DATE '2024-04-01', NULL, 3, 380.00, 'Porzer Straße 12 — Treppenhaus, Hof, Müllabfuhr',         v_admin_id),
    (v_contract_deutschland, v_tenant_id, v_pm_id, 'STANDARD', DATE '2024-09-01', NULL, 3, 290.00, 'Deutschlandstraße 7 — Treppenhaus, Müllabfuhr, Dachrinne', v_admin_id),
    (v_contract_lorweg,      v_tenant_id, v_pm_id, 'PREMIUM',  DATE '2025-01-15', NULL, 6, 550.00, 'Lorweg 3 — Treppenhaus, Hof, Fenster, Müllabfuhr',         v_admin_id),
    (v_contract_hochhaus,    v_tenant_id, v_pm_id, 'STANDARD', DATE '2024-06-01', NULL, 3, 640.00, 'Hochhaus Am Park — Treppenhaus, Hof, Keller, Müllabfuhr',  v_admin_id);

  -- ── 3. Properties: PM + Contract verknüpfen ────────────────────────────
  UPDATE properties SET property_manager_id = v_pm_id, contract_id = v_contract_porzer,      updated_by = v_admin_id WHERE id = v_prop_porzer;
  UPDATE properties SET property_manager_id = v_pm_id, contract_id = v_contract_deutschland, updated_by = v_admin_id WHERE id = v_prop_deutschland;
  UPDATE properties SET property_manager_id = v_pm_id, contract_id = v_contract_lorweg,      updated_by = v_admin_id WHERE id = v_prop_lorweg;
  UPDATE properties SET property_manager_id = v_pm_id, contract_id = v_contract_hochhaus,    updated_by = v_admin_id WHERE id = v_prop_hochhaus;

  -- ── 4. Property-Services (Frequenz-Mix, ohne Mülltonnen) ───────────────
  -- WEEKLY-Frequency-Detail: { "weekdays": [1] } für Montag etc. (1=Mo, 7=So)
  -- BIWEEKLY: { "weekdays": [3], "oddWeek": false } für gerade KWs
  -- MONTHLY: { "weekOfMonth": 1, "dayOfWeek": 1 } für 1. Montag
  -- QUARTERLY: { } (Default: erste Woche im Quartal-Anfangsmonat)
  INSERT INTO property_services (tenant_id, property_id, service_type_id, frequency, frequency_detail, estimated_duration_min, priority, created_by) VALUES
    -- Lorweg 3 (Premium)
    (v_tenant_id, v_prop_lorweg,      v_st_treppenhaus, 'WEEKLY',    '{"weekdays": [1]}'::jsonb,                            30, 2, v_admin_id),
    (v_tenant_id, v_prop_lorweg,      v_st_hof,         'BIWEEKLY',  '{"weekdays": [3], "oddWeek": false}'::jsonb,          30, 3, v_admin_id),
    (v_tenant_id, v_prop_lorweg,      v_st_fenster,     'MONTHLY',   '{"weekOfMonth": 1, "dayOfWeek": 1}'::jsonb,           45, 3, v_admin_id),
    -- Porzer Straße 12
    (v_tenant_id, v_prop_porzer,      v_st_treppenhaus, 'WEEKLY',    '{"weekdays": [2]}'::jsonb,                            30, 2, v_admin_id),
    (v_tenant_id, v_prop_porzer,      v_st_garten,      'BIWEEKLY',  '{"weekdays": [4], "oddWeek": true}'::jsonb,           60, 3, v_admin_id),
    -- Deutschlandstraße 7
    (v_tenant_id, v_prop_deutschland, v_st_treppenhaus, 'WEEKLY',    '{"weekdays": [3]}'::jsonb,                            30, 2, v_admin_id),
    (v_tenant_id, v_prop_deutschland, v_st_dachrinne,   'QUARTERLY', '{}'::jsonb,                                           30, 3, v_admin_id),
    -- Hochhaus Am Park
    (v_tenant_id, v_prop_hochhaus,    v_st_treppenhaus, 'WEEKLY',    '{"weekdays": [4]}'::jsonb,                            30, 2, v_admin_id),
    (v_tenant_id, v_prop_hochhaus,    v_st_hof,         'WEEKLY',    '{"weekdays": [5]}'::jsonb,                            30, 3, v_admin_id),
    (v_tenant_id, v_prop_hochhaus,    v_st_keller,      'MONTHLY',   '{"weekOfMonth": 1, "dayOfWeek": 5}'::jsonb,           20, 3, v_admin_id);

  -- ── 5. Waste-Schedules (Mülltonnen-Abfuhrpläne, 1 pro Property) ────────
  -- collection_days JSONB: { "weeks": ["A", "B", ...] } für KW-Pattern,
  -- oder einfach { "dayOfWeek": 2 } für jeden Dienstag etc.
  -- latest_put_out + earliest_take_in legen fest WANN raus/rein
  INSERT INTO waste_schedules (tenant_id, property_id, waste_bin_type_id, collection_days, collection_time, latest_put_out, earliest_take_in, bin_count, location_description) VALUES
    (v_tenant_id, v_prop_lorweg,      v_wbt_restmuell, '{"frequency": "WEEKLY", "daysOfWeek": [3]}'::jsonb, TIME '06:00', TIME '20:00', TIME '08:00', 3, 'Müllraum hinten links im Hof'),
    (v_tenant_id, v_prop_porzer,      v_wbt_restmuell, '{"frequency": "WEEKLY", "daysOfWeek": [4]}'::jsonb, TIME '06:00', TIME '20:00', TIME '08:00', 2, 'Müllraum im Erdgeschoss'),
    (v_tenant_id, v_prop_deutschland, v_wbt_papier,    '{"frequency": "WEEKLY", "daysOfWeek": [2]}'::jsonb, TIME '07:00', TIME '20:00', TIME '09:00', 1, 'Müllraum vorne rechts'),
    (v_tenant_id, v_prop_hochhaus,    v_wbt_bio,       '{"frequency": "WEEKLY", "daysOfWeek": [5]}'::jsonb, TIME '06:00', TIME '20:00', TIME '08:00', 4, 'Müllraum im Tiefgeschoss');

  -- ── 6. Schedule-Template "Standardwoche Gepard" ────────────────────────
  INSERT INTO schedule_templates (id, tenant_id, name, description, is_default, valid_from, valid_until, created_by)
  VALUES (
    v_template_id, v_tenant_id,
    'Standardwoche Gepard',
    'Pilot-Vorlage: 4 Köln-Objekte verteilt auf 4 Mitarbeiter, Mo-Fr',
    TRUE, NULL, NULL,
    v_admin_id
  );

  -- ── 7. Template-Entries (16 Einträge, Mo-Fr) ───────────────────────────
  -- Workload-balanced:
  --   Daniel (40h): Mo+Di+Mi+Do+Fr, 1-2 Aufgaben/Tag = ~16-20h reine Aufgabenzeit
  --   Anna (20h):   Di+Do+Fr = ~6-8h
  --   Gabi (15h):   Mo+Mi    = ~4-6h
  --   Jürgen (30h, SubU): Di+Mi+Do+Fr = ~10-14h
  INSERT INTO template_entries (tenant_id, template_id, employee_id, day_of_week, property_id, service_type_id, start_time, duration_min, sort_order, notes) VALUES
    -- Montag
    (v_tenant_id, v_template_id, v_emp_daniel,  1, v_prop_lorweg,      v_st_treppenhaus, TIME '07:00', 30, 1, 'Beginn Standardwoche'),
    (v_tenant_id, v_template_id, v_emp_gabi,    1, v_prop_deutschland, v_st_treppenhaus, TIME '08:30', 30, 2, NULL),
    -- Dienstag
    (v_tenant_id, v_template_id, v_emp_daniel,  2, v_prop_porzer,      v_st_treppenhaus, TIME '07:00', 30, 1, NULL),
    (v_tenant_id, v_template_id, v_emp_anna,    2, v_prop_lorweg,      v_st_hof,         TIME '09:00', 30, 2, 'Gerade KW'),
    (v_tenant_id, v_template_id, v_emp_juergen, 2, v_prop_porzer,      v_st_garten,      TIME '13:00', 60, 3, 'Ungerade KW'),
    -- Mittwoch
    (v_tenant_id, v_template_id, v_emp_daniel,  3, v_prop_deutschland, v_st_treppenhaus, TIME '07:00', 30, 1, NULL),
    (v_tenant_id, v_template_id, v_emp_gabi,    3, v_prop_lorweg,      v_st_fenster,     TIME '09:00', 45, 2, '1. Mittwoch im Monat'),
    (v_tenant_id, v_template_id, v_emp_juergen, 3, v_prop_porzer,      v_st_garten,      TIME '13:00', 60, 3, 'Ungerade KW'),
    -- Donnerstag
    (v_tenant_id, v_template_id, v_emp_daniel,  4, v_prop_hochhaus,    v_st_treppenhaus, TIME '07:00', 30, 1, NULL),
    (v_tenant_id, v_template_id, v_emp_anna,    4, v_prop_porzer,      v_st_garten,      TIME '09:00', 60, 2, 'Ungerade KW'),
    (v_tenant_id, v_template_id, v_emp_juergen, 4, v_prop_deutschland, v_st_dachrinne,   TIME '10:30', 30, 3, 'Quartalsweise'),
    -- Freitag
    (v_tenant_id, v_template_id, v_emp_daniel,  5, v_prop_hochhaus,    v_st_hof,         TIME '07:00', 30, 1, NULL),
    (v_tenant_id, v_template_id, v_emp_anna,    5, v_prop_hochhaus,    v_st_keller,      TIME '08:00', 20, 2, '1. Freitag im Monat'),
    (v_tenant_id, v_template_id, v_emp_juergen, 5, v_prop_hochhaus,    v_st_hof,         TIME '11:00', 30, 3, NULL),
    (v_tenant_id, v_template_id, v_emp_daniel,  5, v_prop_lorweg,      v_st_hof,         TIME '13:00', 30, 4, 'Gerade KW'),
    (v_tenant_id, v_template_id, v_emp_juergen, 5, v_prop_porzer,      v_st_treppenhaus, TIME '14:00', 30, 5, 'Nachmittag-Tour');

  -- ── 8. DRAFT-Schedule für KW 21/2026 ────────────────────────────────────
  INSERT INTO schedules (id, tenant_id, week_start, week_number, year, status, template_id, generation_method, notes, created_by)
  VALUES (
    v_schedule_id, v_tenant_id,
    v_week_start, 21, 2026, 'DRAFT', v_template_id, 'FROM_TEMPLATE',
    'Pilot-Demo-Schedule (Wave 1)',
    v_admin_id
  );

  -- ── 9. Schedule-Entries (spiegelt Template-Entries auf konkrete Daten) ─
  -- day_of_week 1=Mo (2026-05-18), 2=Di (2026-05-19), ..., 5=Fr (2026-05-22)
  INSERT INTO schedule_entries (tenant_id, schedule_id, employee_id, entry_date, day_of_week, property_id, service_type_id, start_time, duration_min, sort_order, status, created_by) VALUES
    -- Montag 2026-05-18
    (v_tenant_id, v_schedule_id, v_emp_daniel,  DATE '2026-05-18', 1, v_prop_lorweg,      v_st_treppenhaus, TIME '07:00', 30, 1, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_gabi,    DATE '2026-05-18', 1, v_prop_deutschland, v_st_treppenhaus, TIME '08:30', 30, 2, 'PLANNED', v_admin_id),
    -- Dienstag 2026-05-19
    (v_tenant_id, v_schedule_id, v_emp_daniel,  DATE '2026-05-19', 2, v_prop_porzer,      v_st_treppenhaus, TIME '07:00', 30, 1, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_anna,    DATE '2026-05-19', 2, v_prop_lorweg,      v_st_hof,         TIME '09:00', 30, 2, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_juergen, DATE '2026-05-19', 2, v_prop_porzer,      v_st_garten,      TIME '13:00', 60, 3, 'PLANNED', v_admin_id),
    -- Mittwoch 2026-05-20
    (v_tenant_id, v_schedule_id, v_emp_daniel,  DATE '2026-05-20', 3, v_prop_deutschland, v_st_treppenhaus, TIME '07:00', 30, 1, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_gabi,    DATE '2026-05-20', 3, v_prop_lorweg,      v_st_fenster,     TIME '09:00', 45, 2, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_juergen, DATE '2026-05-20', 3, v_prop_porzer,      v_st_garten,      TIME '13:00', 60, 3, 'PLANNED', v_admin_id),
    -- Donnerstag 2026-05-21
    (v_tenant_id, v_schedule_id, v_emp_daniel,  DATE '2026-05-21', 4, v_prop_hochhaus,    v_st_treppenhaus, TIME '07:00', 30, 1, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_anna,    DATE '2026-05-21', 4, v_prop_porzer,      v_st_garten,      TIME '09:00', 60, 2, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_juergen, DATE '2026-05-21', 4, v_prop_deutschland, v_st_dachrinne,   TIME '10:30', 30, 3, 'PLANNED', v_admin_id),
    -- Freitag 2026-05-22
    (v_tenant_id, v_schedule_id, v_emp_daniel,  DATE '2026-05-22', 5, v_prop_hochhaus,    v_st_hof,         TIME '07:00', 30, 1, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_anna,    DATE '2026-05-22', 5, v_prop_hochhaus,    v_st_keller,      TIME '08:00', 20, 2, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_juergen, DATE '2026-05-22', 5, v_prop_hochhaus,    v_st_hof,         TIME '11:00', 30, 3, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_daniel,  DATE '2026-05-22', 5, v_prop_lorweg,      v_st_hof,         TIME '13:00', 30, 4, 'PLANNED', v_admin_id),
    (v_tenant_id, v_schedule_id, v_emp_juergen, DATE '2026-05-22', 5, v_prop_porzer,      v_st_treppenhaus, TIME '14:00', 30, 5, 'PLANNED', v_admin_id);

  RAISE NOTICE 'ELE-202 Pilot Wave-1 Demo-Seed angewendet.';
END
$migration$;
