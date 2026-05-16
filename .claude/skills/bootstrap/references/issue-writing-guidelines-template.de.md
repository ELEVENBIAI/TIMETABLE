# Issue-Schreibrichtlinien — {{PROJECT_NAME}}

**Version:** 1.0
**Zweck:** Standardisierte Issue-Erstellung fuer die Zusammenarbeit Claude + Operator

---

## Kurzreferenz

### Titel-Format
```
[Aktion] [Komponente] — [Detail/Nutzen]
```

**Beispiele:**
- "Build Auth Service — JWT-basiertes Session Management"
- "Add Rate Limiting to API Gateway"
- "Fix Memory Leak in Worker Process"
- "Epic: Data Pipeline Refactor (5 Komponenten)"

### Description-Struktur
```
## Was
[Was wird gebaut/geaendert? Technischer Ueberblick]

## Warum
[Warum ist das wichtig? Business Value? Performance-Gewinn?]

## Kontext
[Verwandte Issues? Abhaengigkeiten? Hintergrund?]

## Workflow-Type
`direct` (direkt bauen) oder `epic` (mehrere Sub-Tasks)

## Komplexität
`low`, `medium`, oder `high`

## Abhängigkeiten
- Benötigt: [ISSUE-XX] (muss vorher fertig sein)
- Beeinflusst: [ISSUE-YY] (wird durch diese Aenderung beeinflusst)

## Akzeptanzkriterien
- [ ] Konkrete Anforderung 1
- [ ] Konkrete Anforderung 2
- [ ] Dokumentation aktualisiert (CLAUDE.md + SYSTEM_ARCHITECTURE.md)
- [ ] Git Push

## Agent Team Setup
**Team nötig:** Ja/Nein — [Begruendung]
```

---

## Detailliertes Format

### 1. Titel

**Struktur:**
```
[Aktion] [Komponente] — [Hauptnutzen/Detail]
```

**Aktionstypen:**
- **Build:** "Build [Komponente]"
- **Add:** "Add [Feature] to [Komponente]"
- **Integrate:** "Integrate [Quelle] with [Ziel]"
- **Optimize:** "Optimize [Komponente]"
- **Fix:** "Fix [Problem] in [Komponente]"
- **Epic:** "Epic: [grosses Architektur-Thema]"

---

### 2. "Was"-Sektion

**Was einschliessen:**
- Technische Implementierungs-Details
- Architektur-Entscheidungen
- Komponenten-Breakdown
- Code-Referenzen (Dateien/Funktionen)
- Datenstrukturen (wenn relevant)

**Template:**
```markdown
## Was

[Was wird gebaut]

**Architektur:**
[Diagramm oder Bullet-Points die den Fluss zeigen]

**Komponenten:**
1. [Komponente 1]: [Zweck]
2. [Komponente 2]: [Zweck]
3. [Komponente 3]: [Zweck]

**Wichtige Implementierungs-Details:**
* [Detail 1]
* [Detail 2]
```

---

### 3. "Warum"-Sektion

**Was einschliessen:**
- Business Value / Kernnutzen
- Performance-Verbesserungen (wenn moeglich quantifiziert)
- Risiko-Reduktion
- Vergleich zum aktuellen Zustand

**Template:**
```markdown
## Warum

* [Nutzen 1]: [wenn moeglich quantifiziert]
* [Nutzen 2]: [wenn moeglich quantifiziert]

Vergleich zur aktuellen Loesung:
| Aspekt | Heute | Mit dieser Aenderung |
|--------|-------|----------------------|
| [Metrik 1] | [aktuell] | [verbessert] |
```

---

### 4. "Kontext"-Sektion

**Was einschliessen:**
- Verwandte Issues / Epics
- Abhaengigkeiten (was muss vorher passieren?)
- Risiko-Betrachtungen

**Template:**
```markdown
## Kontext

**Verwandte Issues:**
* Haengt ab von: [ISSUE-X], [ISSUE-Y]
* Blockiert: [ISSUE-Z]
* Epic: [ISSUE-Epic]

**Trigger:**
Umsetzen wenn [Bedingung]. Aktuell [Ist-Zustand].

**Risiken & Mitigation:**
* Risiko 1 → Mitigation 1
* Risiko 2 → Mitigation 2

**Workflow-Type:** `direct`
**Komplexität:** `high`
```

---

### 5. Akzeptanzkriterien

**Format:**
```markdown
## Akzeptanzkriterien

- [ ] Konkrete, testbare Anforderung 1
- [ ] Konkrete, testbare Anforderung 2
- [ ] Konkrete, testbare Anforderung 3
- [ ] Dokumentation aktualisiert (CLAUDE.md + SYSTEM_ARCHITECTURE.md)
- [ ] Git Push
- [ ] [Optional: Testperiode, z.B. "48h Parallelbetrieb"]
```

**Regeln:**
- Jede Checkbox muss testbar/verifizierbar sein
- Keine mehrdeutigen Anforderungen
- Immer Doku-Updates einschliessen
- Immer git push als letzten Schritt einschliessen

---

### 6. Agent Team Setup

```markdown
## Agent Team Setup

**Team nötig:** Ja — [Begruendung]

| Rolle | Aufgabe |
|-------|---------|
| **Lead (Implementer)** | [Hauptaufgabe] |
| **Architect** | [Architektur-Aufgabe wenn noetig] |
```

Fuer Solo-Stories:
```markdown
## Agent Team Setup

**Team nötig:** Nein — [Begruendung]

| Rolle | Aufgabe |
|-------|---------|
| **Solo (Implementer)** | [Aufgabe] |
```

**Wann ist ein Team noetig?**
| Kriterium | Ergebnis |
|-----------|----------|
| Mehrere Dateien/Layer betroffen | → Team (+ Architect) |
| Blockiert andere Issues | → Team (+ Architect) |
| Infrastruktur-Aenderungen (Docker, DNS, Ports) | → Team (+ Cloud Engineer) |
| Sicherheits-relevant (Auth, Permissions) | → Team (+ Architect) |
| Einzelne Komponente mit klarem Template | → Solo |
| Reine Dokumentation/Review | → Solo |

---

### 7. Metadaten (vor Erstellung in Linear)

```
Priority: [1=Urgent, 2=High, 3=Medium, 4=Low]
Labels: [relevante Tags, z.B. feature, bug, architecture, infra]
Estimate: [Stunden, oder leer lassen wenn unsicher]
State: [Backlog, Current Sprint, etc.]
```

---

## Wenn Claude ein Issue erstellt

Am Anfang der Description immer einfuegen:

```markdown
> 🤖 **Ideation Source:** Claude AI Agent
> Erstellt waehrend [Kontext]
> Empfehlung: [Prioritaets-Vorschlag]
```

---

## Anti-Patterns

| Schlecht | Gut |
|----------|-----|
| "Verbessere das System" | "Optimize Worker Loop — Add Delta-Based Change Detection" |
| "Bau was Cooles" | "- [ ] Feature X implementiert und getestet" |
| "Neue Komponente hinzufuegen" | "Haengt von ISSUE-50 ab. Blockiert bis Datenbank deployed." |
| "Mach es schneller" | "Reduziere Latenz von 150ms auf <100ms" |
| "Das wird super!" | "Risiko: Single Point of Failure. Mitigation: Graceful Degradation." |

---

## Vollstaendiges Template fuer Claude-generierte Issues

```markdown
> 🤖 **Ideation Source:** Claude AI Agent
> Vorgeschlagen waehrend [Kontext]
> Empfehlung: [z.B. "Nach ISSUE-42"]

## Was

[Technische Implementierung]

## Warum

[Business Value + quantifizierte Nutzen]

## Kontext

[Abhaengigkeiten, Trigger, Risiken]

**Workflow-Type:** `direct`
**Komplexität:** `medium`

## Abhängigkeiten
- Benötigt: [ISSUE-XX, falls vorhanden]
- Beeinflusst: [ISSUE-YY, falls vorhanden]

## Akzeptanzkriterien
- [ ] Konkrete Anforderung 1
- [ ] Konkrete Anforderung 2
- [ ] Dokumentation aktualisiert (CLAUDE.md + SYSTEM_ARCHITECTURE.md)
- [ ] Git Push

**Priority:** [1-4]
**Labels:** [relevante Tags]
**Estimate:** [Stunden oder TBD]
**Depends on:** [ISSUE-X, falls vorhanden]

## Agent Team Setup

**Team nötig:** [Ja/Nein] — [Begruendung]

| Rolle | Aufgabe |
|-------|---------|
| **Lead (Implementer)** | [Hauptaufgabe] |
```

---

*Issue-Schreibrichtlinien — {{PROJECT_NAME}} | Basiert auf dem OpenCLAW Governance Framework*
