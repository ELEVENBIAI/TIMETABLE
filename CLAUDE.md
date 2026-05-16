# Timetable — AI System Reference

**Version:** 0.1.1 | **Stand:** 2026-05-16
**Repository:** https://github.com/ELEVENBIAI/TIMETABLE

## Identität

Hausmeister services Wochenplan erstellen

## Stack

| Komponente    | Technologie                              | Version              |
| ------------- | ---------------------------------------- | -------------------- |
| Backend       | Node.js + Fastify + TypeScript           | Node 20+, Fastify 5+ |
| ORM           | Drizzle ORM / raw pg                     | latest               |
| Datenbank     | PostgreSQL                               | 16+                  |
| Frontend      | React + TypeScript + Tailwind CSS (Vite) | React 18+, Vite 5+   |
| Auth          | JWT (jsonwebtoken + bcryptjs)            | latest               |
| API           | REST + OpenAPI/Swagger                   | @fastify/swagger     |
| PWA           | manifest.json + Service Worker           | —                    |
| Validation    | Zod                                      | latest               |
| Rate Limiting | @fastify/rate-limit                      | latest               |

**Architektur-Prinzip:** Monolith mit klaren Layern.

## Regeln (NIEMALS)

1. **NIEMALS** Code ändern ohne Linear Issue
2. **NIEMALS** Code ändern ohne Spec-File (`specs/ELE-XXX.md`)
3. **NIEMALS** Issue schließen ohne Git Push + Changelog
4. **NIEMALS** API Keys im Chat — User trägt direkt in .env ein
5. **NIEMALS** Issue ohne Labels anlegen
6. **NIEMALS** `config.js` VERSION erhöhen ohne alle DOC_FILES zu bumpen
7. **NIEMALS** Sub-Task direkt von Backlog → Done — immer zuerst "In Progress"
8. **NIEMALS** neue Datei anlegen ohne Eintrag in `ARCHITECTURE_DESIGN.md §9 Referenzen` + `INDEX.md`
9. **NIEMALS** Issue schließen ohne Integration-Test-Check (neue Komponente abgedeckt?)
10. **NIEMALS** personenbezogene Daten (Mitarbeiter, Zeitpläne) ohne DSGVO-Prüfung speichern

## Governance-Hooks

Drei automatische Git-Hooks sind aktiv:

- **spec-gate.sh**: Blockiert Commits mit Issue-Referenz wenn `specs/ELE-XXX.md` fehlt oder `## Agent-Pattern` nicht ausgefüllt ist
- **doc-version-sync.sh**: Blockiert Commits wenn `config.js` VERSION erhöht wurde aber DOC_FILES-Einträge noch die alte Version haben
- **orphan-check.sh**: Blockiert Commits wenn neue `*.md`-Dateien nicht in `ARCHITECTURE_DESIGN.md §9 Referenzen` registriert sind

## Agent-Pattern (PFLICHT vor jeder Story)

Vor dem Start jeder Story deklarieren:

- **Solo** — 1 klar abgegrenzte Story, <5 Dateien
- **Subagent** — isolierter Task / Einzelrecherche
- **Agent-Team** — >3 unabhängige Tasks ODER Debugging mit unklarer Ursache
- **Parallel-Subagents** — mehrere unabhängige Recherchen gleichzeitig

Entscheidung in `specs/ELE-XXX.md` unter `## Agent-Pattern` eintragen — wird von spec-gate.sh erzwungen.

## Aktivierte Architektur-Add-ons

- **Privacy / DSGVO** — Mitarbeiterdaten, Zeitpläne → personenbezogene Daten
- **Cost Efficiency** — LLM-/SaaS-Kosten im Blick behalten
- **Signal Quality** — Analytics und Planungsqualität messen

## System-Architektur

Siehe `SYSTEM_ARCHITECTURE.md` und `ARCHITECTURE_DESIGN.md`.

## Config-Werte

Alle Config-Werte kommen aus `lib/config.js`. VERSION ist dort SSoT.

## Learning-Loop (L1)

Nach jedem Sprint-Review ist ein Eintrag in `journal/learnings.md` Pflicht.
Format: Was hat funktioniert / Was nicht / Nächste Experimente.
Trigger: `/sprint-review` (Schritt 7). Wird von `/ideation` gelesen.

## Handoff-Prozess

Nach Feature-Entwicklung:

1. Code committen + pushen
2. CLAUDE.md + Changelog updaten
3. Operator informieren: "Feature X fertig"
