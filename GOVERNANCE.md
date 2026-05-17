# Timetable — Governance

**Version:** 0.4.0 | **Stand:** 2026-05-17

## Entwicklungs-Workflow

### 1. Issue anlegen (Linear)

- Projekt: ELEVENBI (`https://linear.app/elevenbi/`)
- Prefix: `ELE-`
- Pflicht-Labels: mind. 1 Label pro Issue
- Status-Flow: Backlog → In Progress → Done (kein Direktsprung)

### 2. Spec-File anlegen

Vor **jeder** Code-Änderung:

```
specs/ELE-XXX.md  ← aus specs/TEMPLATE.md erstellen
```

Pflichtfelder: Agent-Pattern, Why, What, Constraints, Tasks, Acceptance Criteria.

### 3. Agent-Pattern wählen

| Pattern            | Wann                                        |
| ------------------ | ------------------------------------------- |
| Solo               | 1 abgegrenzte Story, <5 Dateien             |
| Subagent           | Isolierter Task / Recherche                 |
| Agent-Team         | >3 unabhängige Tasks ODER unklare Ursache   |
| Parallel-Subagents | Mehrere unabhängige Recherchen gleichzeitig |

### 4. Implementieren

- Alle Änderungen durch TypeScript-Types abgesichert
- Zod-Validierung für alle API-Inputs
- Keine Hardcoded Values — alles über `lib/config.js`
- Keine Secrets in Code oder Logs

### 5. T_last — Dokumentation

Letzter Task **jeder** Story:

- [ ] `ARCHITECTURE_DESIGN.md §9` um neue Dateien ergänzen
- [ ] `INDEX.md` aktualisieren
- [ ] `COMPONENT_INVENTORY.md` aktualisieren
- [ ] `CHANGELOG.md` Eintrag
- [ ] `config.js` VERSION bumpen
- [ ] Alle DOC_FILES auf neue VERSION setzen
- [ ] Obsidian Component-Doc updaten (T_last)

### 6. Commit + Push

```bash
git add <spezifische-dateien>
git commit -m "feat: ELE-XXX — <Beschreibung>"
git push
```

## Aktivierte Add-ons

### Privacy / DSGVO

- Mitarbeiterdaten (Namen, Zeitpläne) sind personenbezogen gem. Art. 4 DSGVO
- Datenminimierung: Nur notwendige Felder speichern
- Zugriffsprotokoll für Mitarbeiterdaten-Zugriffe
- Löschkonzept: Daten auf Anfrage vollständig entfernbar
- Keine Weitergabe an Dritte ohne Einwilligung

### Cost Efficiency

- LLM-Aufrufe nur wenn notwendig (kein AI-Overkill)
- Datenbankabfragen optimieren (Indexes, Pagination)
- Caching-Strategie vor Skalierung evaluieren

### Signal Quality

- Planungsqualität messbar machen: Soll vs. Ist-Stunden
- Abweichungsreports nach Sprint-Review
- KPIs definieren bevor gemessen wird
