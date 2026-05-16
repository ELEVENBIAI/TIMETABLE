# Timetable

Hausmeisterservice Stundenplan-Plattform (Gepard / Immobilienbutler / Paul) — Franchise-Ready.

**Repository:** https://github.com/ELEVENBIAI/TIMETABLE
**Doku-Hub:** [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md)
**Roadmap:** [WAVE_DEFINITION.md](WAVE_DEFINITION.md)
**AI-Kontext:** [CLAUDE.md](CLAUDE.md)

## Stack

- **Backend:** Fastify + TypeScript (Node 20+)
- **Frontend:** React + Vite + Tailwind + PWA
- **Datenbank:** PostgreSQL 16+ mit Row Level Security
- **Auth:** JWT + bcryptjs + 6 Rollen
- **Validation:** Zod
- **Tests:** Vitest + Playwright + Testcontainers

## Voraussetzungen

- Node.js ≥ 20
- Docker (für PostgreSQL via Testcontainers + lokale Entwicklung)
- npm ≥ 10 (für Workspaces)

## Setup

```bash
git clone https://github.com/ELEVENBIAI/TIMETABLE
cd TIMETABLE
npm install
npm run e2e:install   # Playwright Browser einmalig installieren
```

## Testing

Die komplette Test-Strategie steht in [TESTING_STRATEGY.md](TESTING_STRATEGY.md).

### Schnellüberblick

```bash
# Alle Workspaces (Backend + Frontend)
npm test                  # Watch-Mode
npm run test:run          # Einmaliger Run
npm run test:coverage     # Mit HTML-Coverage-Report

# Einzelner Workspace
npm --workspace=backend test
npm --workspace=frontend test

# E2E mit Playwright
npm run e2e                                   # Headless
npm --workspace=e2e run test:headed           # Mit Browser-Fenster
npm --workspace=e2e run test:ui               # Playwright UI-Mode

# Code-Qualität
npm run lint              # ESLint
npm run typecheck         # TypeScript-Check beide Workspaces
npm run format            # Prettier
```

### Coverage-Ziele

| Bereich                                   | Schwellwert |
| ----------------------------------------- | ----------- |
| Pure Services (`backend/src/services/**`) | 90%         |
| Backend gesamt                            | 70%         |
| Frontend gesamt                           | 50%         |

CI blockiert PR-Merge bei Unterschreitung.

### Voraussetzung Docker

Backend-Integration-Tests starten via `@testcontainers/postgresql` einen PostgreSQL 16 Container.
Wenn Docker nicht läuft, schlagen Integration-Tests fehl — Pure-Unit-Tests laufen weiterhin.

Zum nur-Pure-Tests laufen:

```bash
USE_TESTCONTAINERS=false npm --workspace=backend run test:run
```

## Development

Wird in ELE-169 (Backend-Skeleton) konkretisiert.

## Governance

Jede Code-Änderung braucht ein Spec-File unter `specs/ELE-XXX.md`. Die Pre-Commit-Hooks erzwingen das (`spec-gate.sh`).

Details: [GOVERNANCE.md](GOVERNANCE.md)

## Wave-Roadmap

| Welle | Inhalt                               | Wochen |
| ----- | ------------------------------------ | ------ |
| 1     | Fundament + Stundenplan-MVP          | 1–5    |
| 2     | Templates + Plan-Generator (MVP-Cut) | 6–8    |
| 3     | KI-Vertretung + Zeiterfassung        | 9–11   |
| 4     | Reporting                            | 12–13  |
| 5     | Tourenoptimierung (OpenRouteService) | 14+    |

Voll-Details: [WAVE_DEFINITION.md](WAVE_DEFINITION.md)
