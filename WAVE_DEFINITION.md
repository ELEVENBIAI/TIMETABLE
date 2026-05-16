# Timetable — Wellen-Definition (Single Source of Truth)

**Version:** 0.1.0 | **Stand:** 2026-05-16

> Diese Datei löst die Inkonsistenz zwischen Tool-Beschreibung, Feature-Spec und Linear-Issues auf.
> **Hier ist die einzig gültige Welle-Definition.**

---

## Übersicht

| Welle | Thema | Wochen | MVP? |
|-------|-------|--------|------|
| 1 | Fundament + Stundenplan-MVP | 1–5 | — |
| 2 | Templates + Plan-Generator | 6–8 | **MVP-Cut** ← |
| 3 | KI-Vertretung + Zeiterfassung | 9–11 | — |
| 4 | Reporting + Lerneffekt | 12–13 | — |
| 5 | Tourenoptimierung | 14+ | — |
| 6+ | Voicebot, Wissensdatenbank, Franchise-Portal, Objekttagebuch | später | — |

**MVP = Wave 1 + Wave 2** = Robert kann digital planen, Mitarbeiter sehen mobil, Plan-Generator läuft.

---

## Wave 1 — Fundament + Stundenplan-MVP (Wochen 1–5)

**Ziel:** Robert kann Wochenplan komplett digital erstellen statt in Excel. Mitarbeiter sehen ihren Tagesplan auf dem Handy.

| TT- | Was | Abhängig |
|-----|-----|---------|
| **TT-00** | **Test-Infrastruktur (Vitest + Playwright + Testcontainers + husky + CI)** | — |
| TT-01a | DB-Schicht 1 (Grunddaten, 8 Tabellen) + RLS + DB-Rollen | TT-00 |
| TT-01b | DB-Schicht 2 (Fähigkeiten, 5 Tabellen) | TT-01a |
| TT-01c | DB-Schicht 3 (Leistungen + Waste, 3 Tabellen) | TT-01a |
| TT-01d | DB-Schicht 4 (Planung, 6 Tabellen) | TT-01a |
| TT-01e | DB-Schicht 5 (Ausführung, 2 Tabellen) + Seed inkl. Pilot-Tenant | TT-01a..d |
| TT-02 | Backend-Skeleton (Fastify + Auth + Swagger) | TT-01e |
| TT-03 | Tenants + Users CRUD (inkl. 6 Rollen) | TT-02 |
| TT-04 | Service-Types CRUD | TT-02 |
| TT-05 | Qualification + Equipment Types CRUD | TT-02 |
| TT-06 | Employees CRUD | TT-02 |
| TT-07 | Employee Skills (Qualifications, Equipment, Availability) | TT-06 |
| TT-08 | Property Managers + Contracts CRUD | TT-02 |
| TT-09 | Properties + Property Zones CRUD | TT-08 |
| TT-10 | Property Services (Leistungsverzeichnis) | TT-09 |
| TT-11 | Waste Bin Types + Waste Schedules | TT-09 |
| TT-12 | Schedules + Schedule Entries CRUD | TT-10, TT-11 |
| TT-13 | Wochenplan-Grid-Ansicht (Frontend) | TT-12 |
| TT-14 | Drag-&-Drop-Umplanung | TT-13 |
| TT-15 | **Mobile-Tagesansicht (PWA) — VORGEZOGEN** | TT-13 |

**DoD Wave 1:**
- ✅ Robert kann Mitarbeiter, Objekte, Tätigkeiten, Wochenpläne anlegen
- ✅ Drag&Drop funktioniert mit Constraints (Quali, Kapazität, Zeitkonflikt)
- ✅ Mitarbeiter sehen ihren Plan auf dem Handy (PWA installierbar)
- ✅ Pilot-Tenant existiert mit realistischen Seed-Daten

---

## Wave 2 — Templates + Plan-Generator (Wochen 6–8)

**Ziel:** Aus Templates automatisch konkrete Wochenpläne generieren. Abwesenheiten erfassen.

| TT- | Was | Abhängig |
|-----|-----|---------|
| TT-16 | Schedule Templates + Template Entries CRUD | TT-12 |
| TT-17 | Frequenz-Engine (Pure Functions) | TT-10, TT-11 |
| TT-18 | Plan-Generator (Woche aus Template) | TT-16, TT-17 |
| TT-19 | Abwesenheitsverwaltung (Absences CRUD) | TT-12 |
| TT-20 | Contingency Rules (vordefinierte Vertretungen) | TT-06 |

**DoD Wave 2 (MVP-CUT):**
- ✅ Planer drückt "Woche generieren" → DRAFT-Plan in 5 Sekunden
- ✅ Krankheit/Urlaub markiert betroffene Entries automatisch
- ✅ Vordefinierte Vertretungsregeln lookup-bar

---

## Wave 3 — KI-Vertretung + Zeiterfassung (Wochen 9–11)

| TT- | Was | Abhängig |
|-----|-----|---------|
| TT-21 | Vertretungs-Scoring (regelbasiert, **kein LLM**) | TT-19, TT-20 |
| TT-22 | Umplanungs-Workflow (Accept/Reject/Modify UI) | TT-21 |
| TT-23 | Zeiterfassung mit GPS (Check-in/out) | TT-15 |

---

## Wave 4 — Reporting + Lerneffekt (Wochen 12–13)

| TT- | Was | Abhängig |
|-----|-----|---------|
| TT-24 | PDF-Export Stundenplan | TT-12 |
| TT-25 | Auslastungs-Dashboard | TT-12 |
| TT-26 | Soll-Ist-Analyse aus TIME_LOGS | TT-23 |
| TT-27 | Projekt-Doku-Komplettierung | TT-15 |

---

## Wave 5 — Tourenoptimierung (Wochen 14+)

**Provider:** OpenRouteService (primär, DSGVO-konform, Heidelberg-basiert).
**Fallback:** Google Routes API — Entscheidung erst wenn ORS nicht reicht.

| TT- | Was | Abhängig |
|-----|-----|---------|
| TT-28 | OpenRouteService-Adapter + Distanz-Cache | TT-09 |
| TT-29 | Routen-Visualisierung auf Karte (Leaflet) | TT-28 |
| TT-30 | Tagesroute-Optimierung (TSP für N=10–15) | TT-28 |
| TT-31 | Constraint-basierte Planung (Müllabfuhr-Zeitfenster) | TT-30 |

---

## Wave 6+ — Erweiterung (später, nicht detailliert)

- Voicebot (Notdienst-Triage, Marken-Routing)
- Wissensdatenbank (FAQ, Sondereigentum-Abgrenzung)
- Franchise-Portal (Lizenznehmer-Onboarding, Audits, Equipment-Leasing)
- Digitales Objekttagebuch (QR-Code, Bewohner-Meldungen)

---

## Mapping HMS- (Source) → TT- (Project)

Die Linear-Issues im `developer_input/` nutzen `HMS-`. Wir mappen 1:1 auf `TT-`:

| Source | Target |
|--------|--------|
| HMS-01 | **gesplittet** → TT-01a bis TT-01e |
| HMS-02 | TT-02 |
| HMS-03 bis HMS-27 | TT-03 bis TT-27 |
| (NEU) | TT-15 in Wave 1 vorgezogen (war HMS-15 in Wave 2) |
| (NEU) | TT-28 bis TT-31 (Tourenoptimierung) |
