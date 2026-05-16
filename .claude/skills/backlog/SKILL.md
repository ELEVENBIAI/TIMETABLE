---
name: backlog
description: |
  Sprint Planning und Backlog-Uebersicht. Laedt alle Issues,
  analysiert Abhaengigkeiten und schlaegt priorisierte Reihenfolge vor.
  Verwenden wenn der Operator "was steht an", "Backlog", "Sprint Planning", "Prioritaeten" oder "/backlog" sagt.
version: 1.2.0
---

# Backlog

Gesamtes Backlog laden, nach Abhaengigkeiten sortieren und priorisierte Reihenfolge vorschlagen.

## Workflow

### Schritt 0: Systemkontext laden (parallel)

Vor der Issue-Analyse den System-Zustand verstehen — sonst werden Blocker als offen eingestuft
die bereits implementiert sind, oder Prioritaeten ignorieren bestehende ADR-Constraints.

1. **`CLAUDE.md` lesen** — Welche Stories sind als implementiert erwaehnt? (`[PROJECT]-XXX` in
   Versionsbeschreibungen). Aktuelle System-VERSION. Bekannte Diskrepanzen. Diese Stories
   sind effektiv "done" auch wenn Linear sie noch nicht als Completed zeigt.

2. **`ARCHITECTURE_DESIGN.md` VOLLSTAENDIG lesen** — Das Lead-Dokument mit allen
   strategischen Constraints. Bis zur letzten Zeile lesen — nicht abbrechen wenn du glaubst
   genug gelesen zu haben. Das Dokument waechst mit jeder neuen ADR.
   **PFLICHT-Checkliste — alle Sektionen muessen gelesen sein:**
   - [ ] §1 Architectural Vision + Leitprinzipien
   - [ ] §2 Quality Attributes (Availability, Latency, Security-Targets)
   - [ ] §3 Alle vorhandenen ADRs vollstaendig (ADR-1 bis zum letzten im Dokument — nicht nur die ersten 5!)
   - [ ] §4 Layer-to-Pipeline Mapping
   - [ ] §5 Failure Mode Analysis
   - [ ] §6 Component Relationships
   - [ ] §7 Scalability Roadmap
   - [ ] §8 Testing Architecture
   - [ ] Referenzen-Sektion (Links auf weitere Architektur-Dokumente)

3. **`SYSTEM_ARCHITECTURE.md` lesen** — Agent-Liste, Signal-Flow, Brain DB Schema, bekannte
   Schwachstellen. Gibt Klarheit ueber aktuellen Ist-Zustand und welche Pfade bereits
   implementiert sind.

4. **Completed Issues (letzte 30 Tage) laden** — Blocker-Status aktualisieren: Wenn eine Story
   in Linear "Done" ist aber noch als Blocker in offenen Issues referenziert wird, als
   "unblocked" markieren und in der Praesentation explizit nennen.

### Schritt 1: Backlog laden

- `linear.getOpenIssues()` — alle offenen Issues
- Nach Status gruppieren: In Progress > Todo > Backlog > Ideation

### Schritt 2: Abhaengigkeiten analysieren

- Issue-Descriptions lesen: `## Abhaengigkeiten` Sektionen
- Abhaengigkeitsgraph aufbauen: Was blockiert was?
- Zirkulaere Abhaengigkeiten erkennen und melden
- Verwaiste Issues identifizieren (referenzierte Issues die nicht existieren)

**Schema-Chain Check (PFLICHT — laeuft bei jedem Backlog-Durchlauf):**

1. Alle offenen Issues auf `## DB Schema Impact` Sektion pruefen — welche planen ein Schema-Update?
2. Schema-Chain aufbauen: `currentSchemaVersion → targetSchemaVersion` pro Story
3. Sortier-Regel: **Stories mit niedrigerer `targetSchemaVersion` IMMER zuerst** — keine zwei Schema-Update-Stories gleichzeitig als "In Progress"
4. Konflikt-Flag: Zwei Stories mit gleicher `targetSchemaVersion` → sofort als **kritischen Blocker** melden (eine muss umgeschrieben werden)
5. In Priorisierungs-Empfehlung explizit nennen: "Schema-Chain: STORY-A (v17→v18) muss vor STORY-B (v18→v19) kommen"

### Schritt 3: Reihenfolge vorschlagen

Sortier-Kriterien (in dieser Prioritaet):
1. **In Progress** — laufende Arbeit zuerst abschliessen
2. **Blocker** — Issues die andere blockieren
3. **Priority** — P1 > P2 > P3 > P4
4. **Abhaengigkeits-Tiefe** — Issues ohne Abhaengigkeiten vor solchen mit
5. **Alter** — aeltere Issues vor neueren (bei gleicher Prio)

### Schritt 4: Praesentieren

Dem Operator zeigen:
- Priorisierte Liste mit Begruendung
- Abhaengigkeits-Konflikte oder Luecken
- Issues die veraltet oder obsolet sein koennten
- Empfehlung: "Als naechstes wuerde ich [STORY-XX] umsetzen weil..."

### Schritt 5: Backlog-Hygiene (optional)

Falls Probleme erkannt:
- Fehlende Abhaengigkeiten nachtragen
- Verwaiste Referenzen melden
- Obsolete Issues dem Operator zum Schliessen vorschlagen
