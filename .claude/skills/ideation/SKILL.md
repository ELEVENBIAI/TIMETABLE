---
name: ideation
description: |
  Deep Research, Architektur-Pruefung und User Story Erstellung.
  Verwenden wenn der Nutzer eine neue Idee hat, ein Feature vorschlaegt, oder "ideation" / "neue Story" sagt.
  Ausloeser sind Anfragen wie "ich hab eine Idee", "neues Feature", "wir brauchen X", "/ideation".
version: 1.3.0
---

# Ideation

Neue Ideen systematisch recherchieren, gegen Architektur + Backlog abgleichen und als qualitativ hochwertige User Story in Linear erstellen.

## Workflow (6 Schritte)

### Schritt 1: Research (wenn noetig)

Pruefen ob externe Recherche noetig ist (neue APIs, unbekannte Technologien, Best Practices).
- Falls ja: Den `/research`-Skill-Ansatz verwenden (2-Tier: QUICK fuer Fakten, DEEP fuer Analysen).
  Perplexity API Details: siehe `research/references/perplexity-api.md`
- Falls nein (internes Refactoring, bekannte Technologie): ueberspringen

### Schritt 2: Kontext laden

Parallel ausfuehren:
1. `linear.getOpenIssues()` — gesamtes Backlog laden
2. **`ARCHITECTURE_DESIGN.md` VOLLSTAENDIG lesen** — bis zur letzten Zeile — alle Sektionen §1–§8 und alle ADRs.
   **PFLICHT-Checkliste — alle folgenden Sektionen muessen gelesen sein:**
   - [ ] §1 Architectural Vision + Leitprinzipien
   - [ ] §2 Quality Attributes (Availability, Latency, Security-Targets)
   - [ ] §3 Alle vorhandenen ADRs vollstaendig (ADR-1 bis zum letzten im Dokument)
   - [ ] §4 Layer-to-Pipeline Mapping
   - [ ] §5 Failure Mode Analysis
   - [ ] §6 Component Relationships
   - [ ] §7 Scalability Roadmap
   - [ ] §8 Testing Architecture
   - [ ] Referenzen-Sektion (Querverweise auf weitere Architektur-Dokumente)
3. `SYSTEM_ARCHITECTURE.md` VOLLSTAENDIG lesen — Agent-Liste, Signal-Flow, Brain DB, Schwachstellen
4. `lib/config.js` relevante Sektionen pruefen
5. Pruefen: Gibt es schon ein aehnliches Issue? Existiert das Feature teilweise?

**Brain-DB Schema Check (PFLICHT wenn Story die Datenbank beruehrt):**

1. `lib/claw-db.js` (oder aequivalentes DB-Modul) lesen → `SCHEMA_VERSION` Konstante = aktuelle Produktiv-Version
2. Alle offenen Issues nach `## DB Schema Impact` Sektion durchsuchen — welche Versionen sind bereits "vergeben"?
3. Naechste freie Ziel-Version ermitteln (Konflikt = zwei Stories mit gleicher `targetSchemaVersion`)
4. Im Story-Spec `## DB Schema Impact` ausfuellen: `currentSchemaVersion` + `targetSchemaVersion` + neue Tabellen
5. Bei Versionskonflikt: Reihenfolge in `## Abhaengigkeiten` festhalten ("muss nach [STORY-XXX] implementiert werden")

> **Warum ARCHITECTURE_DESIGN.md vollstaendig?** Es ist das einzige Dokument das alle
> Architektur-Entscheidungen (ADRs), Quality Attributes und strategische Constraints
> zusammenfasst. Ohne alle ADRs gelesen zu haben fehlt der 360°-Blick: Das Kill-Switch Pattern
> ist Pflicht fuer jedes Feature, ADRs beeinflussen Signal-Routing-Entscheidungen.
> Jede neue Story muss gegen ALLE ADRs geprueft werden — sonst entstehen Features die mit
> bestehenden Entscheidungen kollidieren.

### Schritt 3: Architecture Design Document (fuer Features)

Bei Feature-Stories und komplexen Aenderungen ein ADD erstellen:
Siehe [references/architecture-design-document.md](references/architecture-design-document.md)

Das ADD beschreibt:
- Betroffene Layer und Komponenten-Zusammenspiel
- Datenarchitektur: Fluss, Formate, Konsistenz
- API- und Integrations-Design
- Infrastruktur-Impact (vom Cloud System Engineer, falls als Teammate verfuegbar)
- 8-Dimensionen-Bewertung mit Befund und konkreter Massnahme
- Architektur-Entscheidungen (ADRs) mit Begruendung
- Risiken und Mitigationen
- Implementierungs-Hinweise (betroffene Dateien, Reihenfolge, Config)

**Umfang skaliert mit Komplexitaet** — das ADD-Template definiert welche Sektionen
je nach Story-Typ Pflicht sind. Bug Fixes brauchen kein ADD.

**Bei Agent Teams:** Architekt-Teammate und Cloud System Engineer erstellen
das ADD kollaborativ und challengen sich gegenseitig.

### Enforcement-Check (PFLICHT bei jedem neuen ADR oder Architektur-Entscheid)

Nach jedem neuen ADR oder jeder neuen Architektur-Entscheidung IMMER diese Frage stellen:

> **"Ist dieser Entscheid nur dokumentiert — oder auch maschinell erzwungen?"**

| Antwort | Aktion |
|---------|--------|
| **Maschinell erzwungen** (Commit-Hook, Self-Healing Check, Config-Validation) | Hinweis in Story-Description eintragen wo der Guard liegt |
| **Nur dokumentiert** | Automatisch eine Guard-Story vorschlagen |

**Typische Guard-Mechanismen:**
- Commit-Hook in `.claude/hooks/` (wie Spec-Gate, Exchange-Guard)
- Self-Healing Check (Architecture Guard) — Erweiterung um neue Pruefung
- Config-Validation in Self-Healing

**Wichtig:** Der Operator muss nicht danach fragen — diese Pruefung laeuft automatisch
als Teil jeder Ideation-Session. Wenn ein ADR nur auf Papier existiert → Guard-Story
direkt in Schritt 5 (Abgleich) als separate 1-SP-Story vorschlagen.

### Schritt 4: Story entwerfen (Draft)

ADD + Story-Template kombinieren. Der Draft besteht aus:

**Story-Body** (je nach Typ):
- **Feature/Agent**: Siehe [references/story-template-feature.md](references/story-template-feature.md)
- **Fix/Refactoring**: Siehe [references/story-template-fix.md](references/story-template-fix.md)

**ADD als Anhang** (bei Features):
- Das ADD wird als Kommentar an die Linear-Story angehaengt
- Oder als eingeklappte Sektion (`<details>`) im Story-Body

Die 4 Perspektiven fliessen in Story + ADD ein:
- **Business:** Sektion 1 im ADD (Zusammenfassung)
- **Architektur:** Sektionen 2-7 im ADD
- **Umsetzung:** Sektion 9 im ADD + Story-Template
- **Qualitaet:** Acceptance Criteria in Story + Sektion 8 im ADD

### Schritt 5: Abgleich + Einordnung + Sprint-Fit

Den Draft dem Operator praesentieren, zusammen mit:
- Abhaengigkeiten zu bestehenden Issues (bidirektional)
- Prioritaetsempfehlung im Gesamtkontext
- Betroffene Issues die angepasst werden muessen
- Falls Vorarbeit noetig: "Dafuer brauchen wir erst [STORY-XX]" oder "Neue Story noetig fuer Y"

**Sprint-Fit-Bewertung** (PFLICHT):

| Kriterium | Bewertung |
|-----------|-----------|
| **Geschaetzte Story Points** | 1–5 SP (>5 → Splitting-Vorschlag machen) |
| **Sessions bis Done** | 1–2 Sessions (>2 → zu gross, splitten) |
| **Sprint-Passung** | Passt diese Story neben die aktuellen Sprint-Stories? (Max 3–4 total) |
| **WIP-Impact** | Wuerde die Aufnahme WIP > 2 erzeugen? |
| **Carry-Over-Risiko** | Niedrig / Mittel / Hoch — basierend auf Komplexitaet und Abhaengigkeiten |

Bei Carry-Over-Risiko "Hoch" einen Splitting-Vorschlag machen:
- Welche Teile koennen als eigene Stories herausgeloest werden?
- Was ist der minimale Scope fuer einen ersten Wurf?

**Auf Operator-Freigabe warten** bevor Linear-Issue erstellt wird.

### Schritt 6: Finalisieren (nach OK)

1. Linear-Issue erstellen mit vollstaendigem Template
2. Betroffene bestehende Issues updaten (Abhaengigkeiten, Gesamtplan)
3. Operator zusammenfassen: Was wurde erstellt, was wurde geaendert
