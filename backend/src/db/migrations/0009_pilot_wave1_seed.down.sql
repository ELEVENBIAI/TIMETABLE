-- ────────────────────────────────────────────────────────────────────────────
-- Down-Migration 0009 — Pilot Wave-1 Demo-Seed entfernen (ELE-202)
-- ────────────────────────────────────────────────────────────────────────────
-- Reset auf Vor-Seed-Status. FK-Reihenfolge: zuerst Entries/Schedules,
-- dann Templates, dann Property-Services + Waste-Schedules, dann Contracts
-- + Property-Manager. Properties bleiben — nur property_manager_id und
-- contract_id zurück auf NULL.
-- ────────────────────────────────────────────────────────────────────────────

DO $migration$
DECLARE
  v_tenant_id            UUID := '11111111-1111-1111-1111-111111111111';
  v_pm_id                UUID := '20202020-1111-1111-1111-111111111111';
  v_template_id          UUID := '20202020-3000-1111-1111-111111111111';
  v_schedule_id          UUID := '20202020-4000-1111-1111-111111111111';
BEGIN
  -- 1. Schedule-Entries des Demo-Schedules
  DELETE FROM schedule_entries WHERE schedule_id = v_schedule_id;

  -- 2. Schedule
  DELETE FROM schedules WHERE id = v_schedule_id;

  -- 3. Template-Entries
  DELETE FROM template_entries WHERE template_id = v_template_id;

  -- 4. Schedule-Template
  DELETE FROM schedule_templates WHERE id = v_template_id;

  -- 5. Waste-Schedules (alle des Pilot-Tenant — ELE-202 hat alle 4 angelegt)
  DELETE FROM waste_schedules
   WHERE tenant_id = v_tenant_id
     AND property_id IN (
       'a1a1a1a1-1111-1111-1111-111111111111',
       'a1a1a1a1-2222-1111-1111-111111111111',
       'a1a1a1a1-3333-1111-1111-111111111111',
       'a1a1a1a1-4444-1111-1111-111111111111'
     );

  -- 6. Property-Services (alle des Pilot-Tenant — ELE-202 hat 10 angelegt)
  DELETE FROM property_services
   WHERE tenant_id = v_tenant_id
     AND property_id IN (
       'a1a1a1a1-1111-1111-1111-111111111111',
       'a1a1a1a1-2222-1111-1111-111111111111',
       'a1a1a1a1-3333-1111-1111-111111111111',
       'a1a1a1a1-4444-1111-1111-111111111111'
     );

  -- 7. Properties: FK zurücksetzen
  UPDATE properties
     SET property_manager_id = NULL, contract_id = NULL
   WHERE tenant_id = v_tenant_id
     AND property_manager_id = v_pm_id;

  -- 8. Contracts
  DELETE FROM contracts WHERE property_manager_id = v_pm_id;

  -- 9. Property-Manager
  DELETE FROM property_managers WHERE id = v_pm_id;

  RAISE NOTICE 'ELE-202 Pilot Wave-1 Demo-Seed zurückgenommen.';
END
$migration$;
