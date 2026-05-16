# DB-Schicht 4 — Planung (Templates, Schedules, Absences, Contingency)

> **Issue:** TT-01d | **Erstellt:** 2026-05-16 | **Status:** Draft

## Agent-Pattern

- [x] **Solo**

**Gewähltes Pattern:** Solo
**Begründung:** 6 Tabellen, alle Planungs-Domain.
**Team-Komposition:** n/a

## Why

Plan-Tabellen sind das operationelle Zentrum. SCHEDULE_ENTRIES ist die zentrale Datenstruktur (jede Zeile = 1 Aufgabe). Ohne diese Tabellen kein Wochenplan-CRUD (TT-12).

## What

6 Tabellen: SCHEDULE_TEMPLATES, TEMPLATE_ENTRIES, SCHEDULES, SCHEDULE_ENTRIES, ABSENCE_RECORDS, CONTINGENCY_RULES.

## Constraints

### Must
- SCHEDULES.STATUS CHECK ('DRAFT','PUBLISHED','ARCHIVED')
- SCHEDULES.UQ_SCHEDULES_WEEK UNIQUE (TENANT_ID, WEEK_START) — verhindert Doppel-Generierung
- SCHEDULE_ENTRIES.STATUS CHECK ('PLANNED','IN_PROGRESS','COMPLETED','SKIPPED','REASSIGNED','REASSIGNMENT_NEEDED')
- ABSENCE_RECORDS.ABSENCE_TYPE CHECK ('SICK','VACATION','PERSONAL','TRAINING','OTHER')
- CONTINGENCY_RULES.CK_NOT_SELF CHECK (PRIMARY_EMPLOYEE_ID != BACKUP_EMPLOYEE_ID)
- Index auf SCHEDULE_ENTRIES (EMPLOYEE_ID, ENTRY_DATE) — häufigster Query
- Index auf SCHEDULE_ENTRIES (PROPERTY_ID, ENTRY_DATE)
- RLS auf allen 6 Tabellen

### Must Not
- Keine Plan-Generierungs-Logik (kommt in TT-18)
- Keine Reassignment-Logik (kommt in TT-21)

## Current State

**Relevante Dateien:**
- Schemas Schicht 1–3 aus TT-01a/b/c
- `developer_input/DATENMODELL_Erklaerung_Stundenplan.md` Schicht 4

**Architektur-Dimensionen:** Data Integrity, Performance, Reliability

## Tasks

### T1: Schicht-4-Tabellen
- [ ] `backend/src/db/schema/04-schicht4.sql`
- [ ] FK-Reihenfolge: SCHEDULE_TEMPLATES → TEMPLATE_ENTRIES, SCHEDULES → SCHEDULE_ENTRIES, ABSENCE_RECORDS, CONTINGENCY_RULES
- [ ] Alle CHECK-Constraints
- [ ] UPDATED_AT-Trigger

### T2: Indexes
- [ ] Indexes für häufige Queries (Wochenplan-Abruf, Mitarbeiter-Tagesplan)
- [ ] Partial Indexes mit `WHERE IS_DELETED = FALSE`

### T3: RLS + Tests
- [ ] RLS-Policies analog Schicht 1–3
- [ ] Test: SCHEDULES Doppel-INSERT für gleiche Woche wird abgelehnt
- [ ] Test: SCHEDULE_ENTRIES.STATUS='INVALID' wird abgelehnt
- [ ] Test: CONTINGENCY_RULES PRIMARY=BACKUP wird abgelehnt
- [ ] Test: ABSENCE_RECORDS.ABSENCE_TYPE='INVALID' wird abgelehnt

### T_last
- [ ] Doku + VERSION 0.1.4 + Sync

## Abhängigkeiten

- **Blockiert durch:** TT-01a (EMPLOYEES, PROPERTIES, SERVICE_TYPES), TT-01c (PROPERTY_SERVICES)
- **Blockiert:** TT-12, TT-16, TT-18, TT-19, TT-20

## Acceptance Criteria

- [ ] 6 Tabellen mit allen Constraints, Triggers, Indexes
- [ ] RLS auf allen 6 aktiv
- [ ] Vitest: ≥5 Constraint-Tests
- [ ] spec-gate.sh + doc-version-sync.sh + orphan-check.sh grün
