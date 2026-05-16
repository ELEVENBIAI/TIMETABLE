---
name: sprint-review
description: |
  Quartals-Audit fuer Architektur-Gesundheit, Tech Debt und Backlog-Hygiene.
  Verwenden fuer periodische Reviews oder wenn der Operator "Sprint Review", "Architektur Audit",
  "Tech Debt", "Aufraumen" oder "/sprint-review" sagt.
version: 1.2.0
---

# Sprint Review

Periodisches Audit des Gesamtsystems: Architektur-Gesundheit, Tech Debt, Backlog-Hygiene, Prozess-Compliance.

## Workflow

### Schritt 1: System-Snapshot

Parallel laden:
1. Gesamtes Linear-Backlog (alle Status)
2. **`ARCHITECTURE_DESIGN.md` VOLLSTAENDIG lesen** — bis zur letzten Zeile — alle Sektionen §1–§8 und alle ADRs.
   **PFLICHT-Checkliste — alle Sektionen muessen gelesen sein:**
   - [ ] §1 Architectural Vision + Leitprinzipien
   - [ ] §2 Quality Attributes (Availability, Latency, Security-Targets — Ist vs. Soll)
   - [ ] §3 Alle vorhandenen ADRs vollstaendig (ADR-1 bis zum letzten im Dokument)
   - [ ] §4 Layer-to-Pipeline Mapping
   - [ ] §5 Failure Mode Analysis
   - [ ] §6 Component Relationships
   - [ ] §7 Scalability Roadmap
   - [ ] §8 Testing Architecture
   - [ ] Referenzen-Sektion (Querverweise auf weitere Architektur-Dokumente)
3. `SYSTEM_ARCHITECTURE.md` VOLLSTAENDIG lesen
4. `config.js` (aktuelle Konfiguration)
5. Git Log der letzten Periode (Commits, Branches)
6. Self-Healing Logs (haeufigste Warnings)

### Schritt 2: Architektur-Review (8 Dimensionen)

Alle 8 Dimensionen systematisch gegen den Ist-Zustand pruefen:
- Reliability, Data Integrity, Security, Performance
- Observability, Maintainability, Cost Efficiency, Signal Quality

Fuer jede Dimension: Status (OK/Warnung/Kritisch) + Befund + Empfehlung.

### Schritt 3: Tech Debt Inventur

- Code-Duplikation identifizieren (gleiche Funktionen in mehreren Dateien)
- Hardcoded Werte die in config.js gehoeren
- Deprecated Features die noch nicht entfernt sind
- Offene Code-Marker zaehlen und bewerten (unfertige Stellen, Workarounds)
- Stale Dependencies oder veraltete API-Versionen

### Schritt 4: Backlog-Hygiene

- Verwaiste Issues (referenzierte Issues die nicht existieren)
- Issues ohne Abhaengigkeiten die welche haben sollten
- Obsolete Issues (durch andere Arbeit ueberfluessig geworden)
- Fehlende Issues (Tech Debt das kein Ticket hat)
- Prioritaeten noch aktuell?

### Schritt 5: Prozess-Compliance

- Haben alle kuerzlichen Issues das Pflicht-Template?
- Wurden Abhaengigkeiten bidirektional dokumentiert?
- Sind alle Doku-Files auf gleicher Version?
- Wurden Obsidian Change-Logs geschrieben?

### Schritt 6: Report + Massnahmen

Dem Operator praesentieren:
- **Zusammenfassung**: 3-5 Saetze Gesamtbewertung
- **Top 3 Risiken**: Was sollte als naechstes angegangen werden?
- **Tech Debt Score**: Niedrig / Mittel / Hoch
- **Empfohlene Issues**: Neue Stories fuer identifizierten Tech Debt
- **Backlog-Bereinigung**: Issues zum Schliessen/Anpassen vorschlagen
