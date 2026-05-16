# DB-Schicht 3 — Leistungen + Mülltonnen

> **Issue:** TT-01c | **Erstellt:** 2026-05-16 | **Status:** Draft

## Agent-Pattern

- [x] **Solo**

**Gewähltes Pattern:** Solo
**Begründung:** 3 Tabellen, klar abgegrenzt.
**Team-Komposition:** n/a

## Why

PROPERTY_SERVICES ist das Herzstück des Leistungsverzeichnisses — Basis für Plan-Generator (TT-18) und Frequenz-Engine (TT-17). WASTE_SCHEDULES sind die komplexesten Constraints (LATEST_PUT_OUT etc.).

## What

3 Tabellen: PROPERTY_SERVICES, WASTE_BIN_TYPES, WASTE_SCHEDULES.

## Constraints

### Must
- PROPERTY_SERVICES.FREQUENCY als CHECK-Constraint ('WEEKLY','BIWEEKLY','MONTHLY','QUARTERLY','BIANNUAL','ANNUAL','ON_DEMAND')
- PROPERTY_SERVICES.FREQUENCY_DETAIL JSONB mit definiertem Schema
- PROPERTY_SERVICES.PRIORITY INTEGER 1–4
- PROPERTY_SERVICES.SEASONAL_START/END INTEGER 1–12 (wrap-around erlaubt)
- WASTE_SCHEDULES.LATEST_PUT_OUT + EARLIEST_TAKE_IN TIME
- Hilfsfunktion `fn_get_due_waste_schedules(week_start)`
- RLS auf allen 3 Tabellen

### Must Not
- Keine Frequenz-Berechnungs-Logik (kommt in TT-17 als Pure Functions im Backend)

### Out of Scope
- ICS-Import Mülltonnen-Kalender (kommt später)

## Current State

**Relevante Dateien:**
- Schemas Schicht 1+2 aus TT-01a/b
- `developer_input/DATENMODELL_Erklaerung_Stundenplan.md` Schicht 3

**Architektur-Dimensionen:** Data Integrity, Performance (indexes auf FREQUENCY)

## Tasks

### T1: Schicht-3-Tabellen
- [ ] `backend/src/db/schema/03-schicht3.sql`
- [ ] FK PROPERTY_SERVICES → PROPERTIES, SERVICE_TYPES
- [ ] FK WASTE_SCHEDULES → PROPERTIES, WASTE_BIN_TYPES

### T2: RLS + Hilfsfunktion
- [ ] RLS-Policies
- [ ] `fn_get_due_waste_schedules(p_tenant_id UUID, p_week_start DATE)` als SQL-Funktion
- Verify: Funktion gibt Aufgaben für gegebene KW zurück (raus + rein)

### T3: Tests
- [ ] Test: FREQUENCY='INVALID' wird abgelehnt
- [ ] Test: PRIORITY=5 wird abgelehnt
- [ ] Test: SEASONAL Wrap-around (11→3) funktioniert in Helper-Funktion
- [ ] Test: `fn_get_due_waste_schedules` gibt korrekte Tage zurück

### T_last
- [ ] Doku + VERSION 0.1.3 + Sync

## Abhängigkeiten

- **Blockiert durch:** TT-01a (PROPERTIES), TT-01b (SERVICE_TYPES)
- **Blockiert:** TT-10 (Property Services CRUD), TT-11 (Waste CRUD), TT-17 (Frequenz-Engine)

## Acceptance Criteria

- [ ] 3 Tabellen + Hilfsfunktion erstellt
- [ ] CHECK-Constraints greifen
- [ ] Vitest: ≥4 Tests
- [ ] spec-gate.sh + doc-version-sync.sh + orphan-check.sh grün
