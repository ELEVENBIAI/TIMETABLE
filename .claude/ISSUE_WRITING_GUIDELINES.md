# Issue Writing Guidelines — Timetable

**Prefix:** `ELE-`
**Backlog:** Linear (https://linear.app/elevenbi/)

## Titel-Format

```
ELE-XXX — <kurze, handlungsorientierte Beschreibung>
```

Beispiele:

- `ELE-180 — Wochenplan-Grid-Ansicht implementieren`
- `ELE-170 — Auth: Login-Endpoint mit JWT`
- `ELE-164 — PostgreSQL RLS für Mandanten-Trennung`

## Pflicht-Labels

Jedes Issue braucht mind. 1 Label:

| Label          | Wann                              |
| -------------- | --------------------------------- |
| `feature`      | Neue Funktionalität               |
| `bug`          | Fehler beheben                    |
| `refactor`     | Code-Qualität, kein Nutzer-Impact |
| `docs`         | Nur Dokumentation                 |
| `infra`        | Setup, CI/CD, Config              |
| `architecture` | ADR, Struktur-Entscheidung        |
| `privacy`      | DSGVO-relevante Änderung          |

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

[Link zu specs/ELE-XXX.md wenn vorhanden]

## Acceptance Criteria

- [ ] Kriterium 1
- [ ] Tests grün
- [ ] Doku aktuell
```
