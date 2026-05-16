# Issue Writing Guidelines — Timetable

**Prefix:** `TT-`
**Backlog:** Linear (https://linear.app/elevenbi/)

## Titel-Format

```
TT-XXX — <kurze, handlungsorientierte Beschreibung>
```

Beispiele:
- `TT-001 — Wochenplan-Ansicht implementieren`
- `TT-002 — Auth: Login-Endpoint mit JWT`
- `TT-003 — PostgreSQL RLS für Mandanten-Trennung`

## Pflicht-Labels

Jedes Issue braucht mind. 1 Label:

| Label | Wann |
|-------|------|
| `feature` | Neue Funktionalität |
| `bug` | Fehler beheben |
| `refactor` | Code-Qualität, kein Nutzer-Impact |
| `docs` | Nur Dokumentation |
| `infra` | Setup, CI/CD, Config |
| `architecture` | ADR, Struktur-Entscheidung |
| `privacy` | DSGVO-relevante Änderung |

## Status-Flow

```
Backlog → In Progress → Done
```

**NIEMALS** direkt Backlog → Done. Immer "In Progress" durchlaufen.

## Issue-Body-Template

```markdown
## Why
[Warum ist das nötig? Problem beschreiben]

## What
[Was soll geliefert werden? Messbares Kriterium]

## Spec
[Link zu specs/TT-XXX.md wenn vorhanden]

## Acceptance Criteria
- [ ] Kriterium 1
- [ ] Tests grün
- [ ] Doku aktuell
```
