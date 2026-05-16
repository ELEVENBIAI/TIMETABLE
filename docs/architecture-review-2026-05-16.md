# System Architecture Review — 2026-05-16

**Reviewer:** Claude Sonnet 4.6 via `/architecture-review`
**Scope:** Gesamtsystem nach Bootstrap, 24 MVP-Specs, Linear-Setup, ELE-163 (Test-Infra) abgeschlossen
**Methode:** 9 Dimensionen (6 Standard + 3 Add-ons: Privacy, Cost, Signal) gegen ARCHITECTURE_DESIGN.md, SYSTEM_ARCHITECTURE.md, Linear-Backlog

## Zusammenfassung

| Dimension       | Status      | Hauptbefund                                                        |
| --------------- | ----------- | ------------------------------------------------------------------ |
| Reliability     | ⚠ Warnung   | Keine Backup-Strategie, keine Feature-Flags → **ADR-12**           |
| Data Integrity  | ⚠ Warnung   | Migration-Tooling fehlte → **ADR-13**                              |
| Security        | 🔴 Kritisch | JWT-Rotation undefiniert, AUDIT_LOG fehlte → **ELE-164 + ELE-187** |
| Performance     | ⚠ Warnung   | Keine messbaren Targets → **ADR-14**                               |
| Observability   | 🔴 Kritisch | Logging-Schema undefiniert → **ADR-15**                            |
| Maintainability | 🟢 OK       | SYSTEM_ARCHITECTURE.md veraltet — gefixt                           |
| Privacy/DSGVO   | 🔴 Kritisch | Workflows fehlten → **ELE-187 (Pre-Pilot Pflicht)**                |
| Cost Efficiency | 🟢 OK       | Hosting-Entscheidung offen                                         |
| Signal Quality  | ⚠ Warnung   | KPI-Baseline + Scoring-Gewichte-ADR offen                          |

## Stärken

- 11 ADRs zum Zeitpunkt der Review (jetzt 15)
- Multi-Tenancy via RLS auf DB-Ebene
- Test-Infrastruktur produktiv vor Feature-Code
- Spec-Gate + DocSync + Coverage-Gate aktiv
- Privacy als Quality Attribute "Hoch" verankert
- Regelbasiertes Scoring (kein LLM-Lock-in)
- Linear-CLI als wiederverwendbares Audit-Trail-Tool

## Aktionen aus dieser Review

| #   | Aktion                              | Status      | Referenz                                                                  |
| --- | ----------------------------------- | ----------- | ------------------------------------------------------------------------- |
| 1   | SYSTEM_ARCHITECTURE.md überarbeiten | ✅ erledigt | SYSTEM_ARCHITECTURE.md (neue Komponententabelle + Cross-Cutting Concerns) |
| 2   | ADR-12 Backup + Feature-Flags       | ✅ erledigt | docs/ADR-12-backup-feature-flags.md                                       |
| 3   | ADR-13 Migration-Tooling            | ✅ erledigt | docs/ADR-13-migration-tooling.md                                          |
| 4   | ADR-14 Performance-Budgets          | ✅ erledigt | docs/ADR-14-performance-budgets.md                                        |
| 5   | ADR-15 Logging-Schema               | ✅ erledigt | docs/ADR-15-logging-schema.md                                             |
| 6   | AUDIT_LOG-Tabelle in ELE-164        | ✅ erledigt | specs/ELE-164.md (T3 ergänzt) + Linear-Description aktualisiert           |
| 7   | DSGVO-Pre-Pilot-Issue               | ✅ erledigt | Linear ELE-187                                                            |
| 8   | ARCHITECTURE_DESIGN §9 + ADR-Liste  | ✅ erledigt | ARCHITECTURE_DESIGN.md                                                    |

## Verbliebenes Tech Debt — als Linear-Issues angelegt

| #   | Linear                                                        | Was                                       | Wave                     | Status                |
| --- | ------------------------------------------------------------- | ----------------------------------------- | ------------------------ | --------------------- |
| A   | [ELE-188](https://linear.app/elevenbi/issue/ELE-188)          | JWT-Secret-Rotation-Strategie             | 4 (Pre-Pilot)            | Backlog               |
| B   | [ELE-189](https://linear.app/elevenbi/issue/ELE-189)          | Error-Tracking (Sentry/GlitchTip/eigenes) | 3                        | Backlog               |
| C   | [ELE-190](https://linear.app/elevenbi/issue/ELE-190)          | ADR-17 Scoring-Gewichte für Reassignment  | 3 (zusammen mit TT-21)   | Backlog               |
| D   | [ELE-191](https://linear.app/elevenbi/issue/ELE-191)          | Hosting-Provider-Entscheidung + Cost      | 4 (Pre-Pilot)            | Backlog               |
| E   | [ELE-192](https://linear.app/elevenbi/issue/ELE-192)          | KPI-Baseline + Messung MVP-Erfolg         | 4 (Pre-Pilot)            | Backlog               |
| F   | _kein Issue_                                                  | Sprint-Review-Frequenz (alle 2 Wochen?)   | sofort                   | Operator-Entscheidung |
| G   | Teil von [ELE-187](https://linear.app/elevenbi/issue/ELE-187) | Datenbankgröße + Cleanup-Strategie        | 4 (DSGVO-Retention-Cron) | siehe ELE-187         |
| H   | [ELE-193](https://linear.app/elevenbi/issue/ELE-193)          | CI-Cost-Monitoring (GitHub Actions)       | nach 1. Production-Monat | Backlog               |

**Mapping in Repo:** `scripts/linear-tech-debt-mapping.json`

Punkt F (Sprint-Review-Frequenz) ist organisatorisch — keine Tech-Debt im engeren Sinn. Operator-Entscheidung. Vorschlag: alle 2 Wochen, gekoppelt an Wave-Meilensteine.

## Methodische Anmerkung

Die `dimensions-detail.md` des `architecture-review`-Skills stammt aus einem Trading-Kontext (Signal-Latenz Fast-Tier, AGENT_WEIGHTS). Übertragung auf Timetable:

| Trading-Konzept            | Timetable-Äquivalent                            |
| -------------------------- | ----------------------------------------------- |
| Signal-Latenz              | API-Latenz + Plan-Generierungs-Zeit             |
| AGENT_WEIGHTS Summe = 1.0  | Scoring-Gewichte (30+25+20+15+10=100 in ADR-04) |
| Trade-Verbesserung messbar | Soll-Ist-Abweichung als KPI (TT-26)             |
| Self-Healing               | Health-Check + Restart-Policy (ADR-12)          |
| Brain DB / JSONL SSoT      | PostgreSQL + AUDIT_LOG                          |

## Nächste Review

Empfehlung: System-Review nach **Wave 1 Abschluss** (nach ELE-182, ca. Woche 5) — vor Start von Wave 2 Plan-Generator.
