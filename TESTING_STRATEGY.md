# Timetable — Testing-Strategie

**Version:** 0.1.0 | **Stand:** 2026-05-16

> Empfohlene Testing-Strategie für das Timetable-Projekt. Praktisch, pragmatisch, eng am Stack orientiert.

---

## Test-Pyramide

```
              ┌─────────────┐
              │  E2E (~10%) │   Playwright (Browser + Mobile)
              ├─────────────┤
              │ INTEGRATION │   Vitest + Testcontainers PostgreSQL
              │   (~30%)    │
              ├─────────────┤
              │ UNIT (~60%) │   Vitest (Backend Pure Functions, React Hooks)
              └─────────────┘
```

**Wieso diese Verteilung:**

- Frequenz-Engine, Reassignment-Scoring, Validators → viel Logik in Pure Functions → Unit-Tests skalieren
- DB-Logik (RLS, Transactions) → braucht echte Postgres → Integration
- User-Flows (Plan generieren, Drag&Drop, Mobile-Tagesplan) → braucht Browser → E2E

---

## Tools

| Ebene       | Tool                                      | Begründung                                                          |
| ----------- | ----------------------------------------- | ------------------------------------------------------------------- |
| Unit        | **Vitest**                                | Schnell, Vite-nativ, ESM-Support, gleiche Config Frontend + Backend |
| Integration | **Vitest + @testcontainers/postgresql**   | Echte Postgres pro Test-Suite, Isolation via separate Schemas       |
| API-Smoke   | **Vitest + supertest / fastify.inject**   | In-Process-Aufrufe, kein Network-Overhead                           |
| Frontend    | **Vitest + @testing-library/react**       | Component-Tests + Hook-Tests                                        |
| E2E         | **Playwright**                            | Cross-Browser, Mobile-Emulation, Test-Recorder                      |
| Coverage    | **Vitest c8**                             | Default-Integration, HTML-Report                                    |
| Linting     | **ESLint + Prettier + TypeScript strict** | Schon im Bootstrap aktiv                                            |
| Pre-Commit  | **lint-staged**                           | Nur geänderte Dateien linten                                        |

**Bewusst NICHT:**

- Jest (langsamer, schlechter ESM-Support)
- Cypress (Playwright ist breiter, schneller, besser)
- Mocha/Chai (zu viel Boilerplate)

---

## Coverage-Ziele

| Bereich                                                           | Ziel    | Pflicht   |
| ----------------------------------------------------------------- | ------- | --------- |
| Pure Services (frequency-engine, reassignment-engine, validators) | **90%** | ✅        |
| API-Routen                                                        | **70%** | ✅        |
| DB-Layer (Queries, Migrations)                                    | **60%** | ✅        |
| Frontend-Components                                               | **50%** | empfohlen |
| Frontend-Pages                                                    | **30%** | empfohlen |
| Gesamt                                                            | **70%** | ✅        |

**CI-Block:** Pull-Request kann nicht gemergt werden wenn Gesamt-Coverage < 70%.

---

## Test-Struktur im Repo

```
backend/
├── src/
│   ├── services/
│   │   ├── frequency-engine.ts
│   │   ├── frequency-engine.test.ts     ← Unit (Pure Functions)
│   │   ├── schedule-generator.ts
│   │   └── schedule-generator.test.ts   ← Integration (mit DB)
│   ├── routes/
│   │   ├── schedules.ts
│   │   └── schedules.test.ts            ← API-Smoke (fastify.inject)
│   └── db/
│       └── pools.test.ts                ← Integration RLS
├── tests/
│   ├── fixtures/                         ← Seed-Builder, Test-Daten
│   ├── helpers/                          ← withTestTenant(), loginAs()
│   └── setup.ts                          ← Global Setup (Testcontainers)
└── vitest.config.ts

frontend/
├── src/
│   ├── components/
│   │   ├── WeekGrid.tsx
│   │   └── WeekGrid.test.tsx            ← Component (Testing Library)
│   └── hooks/
│       └── useSchedule.test.ts          ← Hook
└── vitest.config.ts

e2e/
├── tests/
│   ├── plan-generieren.spec.ts          ← Critical Path
│   ├── drag-drop-umplanen.spec.ts
│   ├── mobile-tagesplan.spec.ts
│   └── auth-flow.spec.ts
├── fixtures/
└── playwright.config.ts
```

---

## DB-Testing-Pattern

**Problem:** RLS muss getestet werden, parallel laufende Tests dürfen sich nicht beeinflussen.

**Lösung:** Pro Test-Suite eigenes Schema in einem Testcontainer.

```typescript
// tests/setup.ts
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { migrate } from '../src/db/migrate';

let container: PostgreSqlContainer;
let connectionString: string;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  connectionString = container.getConnectionUri();
  await migrate(connectionString); // Schema + Seed
});

afterAll(async () => {
  await container.stop();
});
```

**Test-Tenant-Helper:**

```typescript
// tests/helpers/withTestTenant.ts
export async function withTestTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  await pool.query(`SET app.current_tenant_id = '${tenantId}'`);
  try {
    return await fn();
  } finally {
    await pool.query(`RESET app.current_tenant_id`);
  }
}
```

---

## RLS-Test-Pflicht

Jedes Issue mit RLS-betroffenen Tabellen MUSS testen:

```typescript
describe('RLS for PROPERTIES', () => {
  it('hmservice_app without tenant_id sees nothing', async () => {
    const result = await query('SELECT * FROM PROPERTIES');
    expect(result.rows).toHaveLength(0);
  });

  it('hmservice_app with tenant_id sees only own tenant data', async () => {
    await withTestTenant(TENANT_A, async () => {
      const result = await query('SELECT * FROM PROPERTIES');
      expect(result.rows.every((r) => r.tenant_id === TENANT_A)).toBe(true);
    });
  });

  it('hmservice_owner bypasses RLS', async () => {
    const result = await ownerPool.query('SELECT * FROM PROPERTIES');
    expect(result.rows.length).toBeGreaterThan(0);
  });
});
```

---

## E2E-Critical-Paths (Playwright)

Diese müssen IMMER grün sein (CI-Block):

1. **Auth-Flow** — Login mit MUST_CHANGE_PASSWORD → Passwort ändern → Dashboard
2. **Plan generieren** — Template auswählen → Woche generieren → Warnings → Speichern → Veröffentlichen
3. **Drag&Drop-Umplanung** — Aufgabe von Daniel auf Anna ziehen → Constraint-Check → Erfolg
4. **Krankmeldung-Flow** — Absence eintragen → Betroffene Entries markiert → Manuelle Umplanung
5. **Mobile-Tagesplan** — Employee-Login auf Smartphone-Viewport → Tagesplan sichtbar
6. **Offline-Cache** — Plan laden → Network offline → Plan immer noch sichtbar

---

## Test-Commands

```bash
# Backend
cd backend
npm test                # Vitest watch
npm run test:run        # Einmaliger Run (CI)
npm run test:coverage   # Mit Coverage-Report
npm run test:ui         # Vitest UI

# Frontend (analog)
cd frontend
npm test
npm run test:coverage

# E2E
cd e2e
npx playwright test
npx playwright test --ui     # UI-Mode für Entwicklung
npx playwright codegen        # Test-Recorder
```

---

## CI-Pipeline (GitHub Actions Skelett)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
        ports: ['5432:5432']

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - run: npm run e2e

      - name: Upload Coverage
        uses: codecov/codecov-action@v4
```

---

## Pre-Commit-Hook (zusätzlich zu spec-gate)

`.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
npm run typecheck
```

`package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

---

## Manuelle QA — Pilot-Tenant-Smoke-Test

Vor jedem Release in den Pilot-Tenant:

| #   | Schritt                               | Erwartet                          |
| --- | ------------------------------------- | --------------------------------- |
| 1   | Login als Robert (PLANNER)            | Dashboard                         |
| 2   | Template "Standard-Sommer" auswählen  | Editor zeigt 4 MA × 5 Tage        |
| 3   | Woche KW 21 generieren                | DRAFT mit ~30 Entries             |
| 4   | Daniel auf "krank" setzen für Mi      | 3 Entries auf REASSIGNMENT_NEEDED |
| 5   | 2 Entries auf Anna ziehen (Drag&Drop) | Constraint-Check ok, gespeichert  |
| 6   | Wochenplan veröffentlichen            | Status PUBLISHED                  |
| 7   | Smartphone-Login als Daniel           | Eigener Tagesplan sichtbar        |
| 8   | Offline gehen                         | Plan immer noch sichtbar          |

---

## Testing-Issue (TT-Test-Setup)

Empfehlung: Issue TT-Test-Setup als erstes Issue **vor** ELE-164:

- Vitest-Config Backend + Frontend
- Playwright-Setup mit Mobile-Profil
- @testcontainers/postgresql Setup
- husky + lint-staged
- GitHub Actions Workflow
- Coverage-Gate auf 70%

**Aufwand:** ~1 Tag. **ROI:** Jedes nachfolgende Issue spart Zeit beim Test-Setup.

---

## Was wir bewusst NICHT testen

- **Integration mit externen Services (OpenRouteService, Google Maps):** In Wave 5+ → dann mit mocks
- **Performance unter Last:** Nicht im MVP — k6/Artillery erst wenn nötig
- **Visuelle Regression:** Erst wenn UI stabil — dann Playwright-Screenshots
- **A11y im Detail:** Lighthouse-Check reicht im MVP

## Referenzen

- Vitest: https://vitest.dev/
- Playwright: https://playwright.dev/
- Testcontainers Node: https://node.testcontainers.org/
- Testing Library: https://testing-library.com/
