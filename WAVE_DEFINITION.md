# Timetable — Wellen-Definition (Single Source of Truth)

**Version:** 0.1.0 | **Stand:** 2026-05-16

> Diese Datei löst die Inkonsistenz zwischen Tool-Beschreibung, Feature-Spec und Linear-Issues auf.
> **Hier ist die einzig gültige Welle-Definition.**

Linear-Projekt: **Timetable** (Team ELEVENBI, Prefix `ELE-`).
Issue-Range: ELE-163 bis ELE-186 (MVP), ELE-187+ für Wave 3–5 wenn dort relevant.

---

## Übersicht

| Welle | Thema                                                        | Wochen | MVP?          |
| ----- | ------------------------------------------------------------ | ------ | ------------- |
| 1     | Fundament + Stundenplan-MVP                                  | 1–5    | —             |
| 2     | Templates + Plan-Generator                                   | 6–8    | **MVP-Cut** ← |
| 3     | KI-Vertretung + Zeiterfassung                                | 9–11   | —             |
| 4     | Reporting + Lerneffekt                                       | 12–13  | —             |
| 5     | Tourenoptimierung                                            | 14+    | —             |
| 6+    | Voicebot, Wissensdatenbank, Franchise-Portal, Objekttagebuch | später | —             |

**MVP = Wave 1 + Wave 2** = Robert kann digital planen, Mitarbeiter sehen mobil, Plan-Generator läuft.

---

## Wave 1 — Fundament + Stundenplan-MVP (Wochen 1–5)

**Ziel:** Robert kann Wochenplan komplett digital erstellen statt in Excel. Mitarbeiter sehen ihren Tagesplan auf dem Handy.

| Linear      | Was                                                                        | Abhängig                           |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------- |
| **ELE-163** | **Test-Infrastruktur (Vitest + Playwright + Testcontainers + husky + CI)** | —                                  |
| ELE-164     | DB-Schicht 1 (Grunddaten, 8 Tabellen) + RLS + DB-Rollen                    | ELE-163                            |
| ELE-165     | DB-Schicht 2 (Fähigkeiten, 5 Tabellen)                                     | ELE-164                            |
| ELE-166     | DB-Schicht 3 (Leistungen + Waste, 3 Tabellen)                              | ELE-164                            |
| ELE-167     | DB-Schicht 4 (Planung, 6 Tabellen)                                         | ELE-164                            |
| ELE-168     | DB-Schicht 5 (Ausführung, 2 Tabellen) + Seed inkl. Pilot-Tenant            | ELE-164, ELE-165, ELE-166, ELE-167 |
| ELE-169     | Backend-Skeleton (Fastify + Auth + Swagger)                                | ELE-168                            |
| ELE-170     | Tenants + Users CRUD (inkl. 6 Rollen)                                      | ELE-169                            |
| ELE-171     | Service-Types CRUD                                                         | ELE-169                            |
| ELE-172     | Qualification + Equipment Types CRUD                                       | ELE-169                            |
| ELE-173     | Employees CRUD                                                             | ELE-169                            |
| ELE-174     | Employee Skills (Qualifications, Equipment, Availability)                  | ELE-173                            |
| ELE-175     | Property Managers + Contracts CRUD                                         | ELE-169                            |
| ELE-176     | Properties + Property Zones CRUD                                           | ELE-175                            |
| ELE-177     | Property Services (Leistungsverzeichnis)                                   | ELE-176                            |
| ELE-178     | Waste Bin Types + Waste Schedules                                          | ELE-176                            |
| ELE-179     | Schedules + Schedule Entries CRUD                                          | ELE-177, ELE-178                   |
| ELE-180     | Wochenplan-Grid-Ansicht (Frontend)                                         | ELE-179                            |
| ELE-181     | Drag-&-Drop-Umplanung                                                      | ELE-180                            |
| ELE-182     | **Mobile-Tagesansicht (PWA) — VORGEZOGEN**                                 | ELE-180                            |

**DoD Wave 1:**

- ✅ Robert kann Mitarbeiter, Objekte, Tätigkeiten, Wochenpläne anlegen
- ✅ Drag&Drop funktioniert mit Constraints (Quali, Kapazität, Zeitkonflikt)
- ✅ Mitarbeiter sehen ihren Plan auf dem Handy (PWA installierbar)
- ✅ Pilot-Tenant existiert mit realistischen Seed-Daten

---

## Wave 2 — Templates + Plan-Generator (Wochen 6–8)

**Ziel:** Aus Templates automatisch konkrete Wochenpläne generieren. Abwesenheiten erfassen.

| Linear    | Was                                               | Abhängig                  |
| --------- | ------------------------------------------------- | ------------------------- |
| ELE-183   | Schedule Templates + Template Entries CRUD        | ELE-179                   |
| ELE-184   | Frequenz-Engine (Pure Functions)                  | ELE-177, ELE-178          |
| ELE-185   | Plan-Generator (Woche aus Template) — **MVP-CUT** | ELE-183, ELE-184, ELE-186 |
| ELE-186   | Abwesenheitsverwaltung (Absences CRUD)            | ELE-179                   |
| _(later)_ | Contingency Rules (vordefinierte Vertretungen)    | ELE-173                   |

**DoD Wave 2 (MVP-CUT):**

- ✅ Planer drückt "Woche generieren" → DRAFT-Plan in 5 Sekunden
- ✅ Krankheit/Urlaub markiert betroffene Entries automatisch
- ✅ Vordefinierte Vertretungsregeln lookup-bar

---

## Wave 3 — KI-Vertretung + Zeiterfassung (Wochen 9–11)

> Linear-Issues werden bei Wave-3-Start angelegt (geplant ELE-187+).

| Tag  | Was                                              | Abhängig      |
| ---- | ------------------------------------------------ | ------------- |
| W3-A | Contingency Rules (vordefinierte Vertretungen)   | ELE-173       |
| W3-B | Vertretungs-Scoring (regelbasiert, **kein LLM**) | ELE-186, W3-A |
| W3-C | Umplanungs-Workflow (Accept/Reject/Modify UI)    | W3-B          |
| W3-D | Zeiterfassung mit GPS (Check-in/out)             | ELE-182       |

---

## Wave 4 — Reporting + Lerneffekt (Wochen 12–13)

| Tag  | Was                            | Abhängig |
| ---- | ------------------------------ | -------- |
| W4-A | PDF-Export Stundenplan         | ELE-179  |
| W4-B | Auslastungs-Dashboard          | ELE-179  |
| W4-C | Soll-Ist-Analyse aus TIME_LOGS | W3-D     |
| W4-D | Projekt-Doku-Komplettierung    | ELE-182  |

---

## Wave 5 — Tourenoptimierung (Wochen 14+)

**Provider:** OpenRouteService (primär, DSGVO-konform, Heidelberg-basiert).
**Fallback:** Google Routes API — Entscheidung erst wenn ORS-Limit erreicht.

| Tag  | Was                                                  | Abhängig |
| ---- | ---------------------------------------------------- | -------- |
| W5-A | OpenRouteService-Adapter + Distanz-Cache             | ELE-176  |
| W5-B | Routen-Visualisierung auf Karte (Leaflet)            | W5-A     |
| W5-C | Tagesroute-Optimierung (TSP für N=10–15)             | W5-A     |
| W5-D | Constraint-basierte Planung (Müllabfuhr-Zeitfenster) | W5-C     |

---

## Wave 6+ — Erweiterung (später, nicht detailliert)

- Voicebot (Notdienst-Triage, Marken-Routing)
- Wissensdatenbank (FAQ, Sondereigentum-Abgrenzung)
- Franchise-Portal (Lizenznehmer-Onboarding, Audits, Equipment-Leasing)
- Digitales Objekttagebuch (QR-Code, Bewohner-Meldungen)

---

## Mapping HMS- (Source) → ELE- (Linear)

Die Linear-Issues im `developer_input/` nutzen `HMS-` (alte Quell-Nummerierung). Mapping zu Linear:

| Source            | Target                                                   |
| ----------------- | -------------------------------------------------------- |
| HMS-01            | **gesplittet** → ELE-164 bis ELE-168 (5 DB-Schichten)    |
| HMS-02            | ELE-169                                                  |
| HMS-03            | ELE-170                                                  |
| HMS-04            | ELE-171                                                  |
| HMS-05            | ELE-172                                                  |
| HMS-06            | ELE-173                                                  |
| HMS-07            | ELE-174                                                  |
| HMS-08            | ELE-175                                                  |
| HMS-09            | ELE-176                                                  |
| HMS-10            | ELE-177                                                  |
| HMS-11            | ELE-178                                                  |
| HMS-12            | ELE-179                                                  |
| HMS-13            | ELE-180                                                  |
| HMS-14            | ELE-181                                                  |
| HMS-15            | ELE-182 (vorgezogen in Wave 1)                           |
| HMS-16            | ELE-183                                                  |
| HMS-17            | ELE-184                                                  |
| HMS-18            | ELE-185                                                  |
| HMS-19            | ELE-186                                                  |
| HMS-20            | Wave 3 (noch nicht in Linear)                            |
| HMS-21 bis HMS-27 | Wave 3/4 (noch nicht in Linear)                          |
| NEU (kein HMS)    | TT-00 → ELE-163 (Test-Infrastruktur — Bootstrap-Pflicht) |
| NEU (kein HMS)    | Tourenoptimierung Wave 5 (noch nicht in Linear)          |

---

## Aktueller Status (2026-05-16)

|              |                                                |
| ------------ | ---------------------------------------------- |
| ELE-163      | ✅ **Done** (Test-Infrastruktur implementiert) |
| ELE-164      | 🟡 **In Progress** (nächstes Issue)            |
| ELE-165..186 | ⏸ Backlog                                      |
