---
name: architecture-review
description: |
  Architektur-Review fuer einzelne Stories oder das Gesamtsystem. Prueft 8 OpenCLAW-spezifische
  Dimensionen und identifiziert Risiken, Tech Debt und Verbesserungspotential.
  Verwenden wenn der Operator "Architektur pruefen", "Review", "passt das architektonisch" oder "/architecture-review" sagt.
version: 1.2.0
---

# Architecture Review

8 Dimensionen gegen eine Story oder das Gesamtsystem pruefen.

## Modi

### Modus A: Story-Review (Standard)

Eine einzelne Story oder geplante Aenderung architektonisch bewerten.

1. **`ARCHITECTURE_DESIGN.md` VOLLSTAENDIG lesen** — bis zur letzten Zeile — alle Sektionen §1–§8 und alle ADRs.
   **PFLICHT-Checkliste — alle Sektionen muessen gelesen sein:**
   - [ ] §1 Architectural Vision + Leitprinzipien
   - [ ] §2 Quality Attributes (Availability, Latency, Security-Targets)
   - [ ] §3 Alle vorhandenen ADRs vollstaendig (ADR-1 bis zum letzten im Dokument)
   - [ ] §4 Layer-to-Pipeline Mapping
   - [ ] §5 Failure Mode Analysis
   - [ ] §6 Component Relationships
   - [ ] §7 Scalability Roadmap
   - [ ] §8 Testing Architecture
   - [ ] Referenzen-Sektion (Querverweise auf weitere Architektur-Dokumente)
2. Story/Aenderung verstehen
3. Betroffene Dateien + Komponenten identifizieren
4. Relevante Dimensionen pruefen (nicht immer alle 8):
   Siehe [references/dimensions-detail.md](references/dimensions-detail.md)
4. Risiken und Empfehlungen praesentieren
5. Falls noetig: Aenderungen an der Story vorschlagen

### Modus B: System-Review

Das Gesamtsystem auf architektonische Gesundheit pruefen.

1. **`ARCHITECTURE_DESIGN.md` VOLLSTAENDIG lesen** — bis zur letzten Zeile — alle Sektionen §1–§8 und alle ADRs (gleiche Checkliste wie Modus A).
2. `SYSTEM_ARCHITECTURE.md` VOLLSTAENDIG lesen + `config.js` relevante Sektionen
3. Alle 8 Dimensionen systematisch durchgehen
3. Tech Debt identifizieren und quantifizieren
4. Backlog laden — gibt es Issues die Tech Debt adressieren?
5. Report erstellen:
   - Staerken (was laeuft gut)
   - Risiken (was koennte Probleme machen)
   - Empfehlungen (konkrete Massnahmen, ggf. neue Issues)

## Output-Format

Fuer jede gepruefte Dimension:
- **Status**: OK / Warnung / Kritisch
- **Befund**: Was wurde gefunden
- **Empfehlung**: Was sollte geaendert werden (falls noetig)
