# ADR-14: Performance-Budgets

**Status:** Active
**Datum:** 2026-05-16
**Kontext:** "Performance: Mittel" war als Quality Attribute gesetzt, aber ohne messbare Targets. Ohne Budgets keine Drift-Detection.

## Entscheidung

### Backend-Targets

| Endpoint-Klasse                            | p50   | p95   | p99    | Max |
| ------------------------------------------ | ----- | ----- | ------ | --- |
| GET-Endpoints (Listings, Detail)           | 50ms  | 200ms | 500ms  | 1s  |
| POST/PUT/PATCH (CRUD)                      | 80ms  | 250ms | 600ms  | 1s  |
| `/api/schedules/generate` (Plan-Generator) | 1s    | 3s    | **5s** | 8s  |
| `/api/schedules/:id/suggest-reassignment`  | 200ms | 500ms | 1s     | 2s  |
| `/api/auth/login` (bcrypt-cost-bedingt)    | 150ms | 250ms | 400ms  | 1s  |
| `/api/reports/*`                           | 500ms | 1s    | 2s     | 5s  |

Hardcodierte Hard-Limit: alle Requests werden nach **10s** abgebrochen (`@fastify/timeout`).

### Frontend-Targets

| Metrik                           | Target                     |
| -------------------------------- | -------------------------- |
| Lighthouse Performance Score     | ≥ 90                       |
| Lighthouse PWA Score             | ≥ 90 (Pflicht für ELE-182) |
| First Contentful Paint (FCP)     | < 1.5s auf 4G              |
| Largest Contentful Paint (LCP)   | < 2.5s                     |
| Time to Interactive (TTI)        | < 3.5s                     |
| Cumulative Layout Shift (CLS)    | < 0.1                      |
| **Bundle Size (gzipped)**        | **< 250 KB** initial JS    |
| **Bundle Size (gzipped, total)** | < 500 KB für gesamte App   |

### Datenbank-Targets

- Query p95 < 50ms für Single-Row-Lookups
- Query p95 < 200ms für Wochenplan-Listing (≤ 50 Mitarbeiter × 7 Tage × 10 Aufgaben)
- Connection-Pool-Size: Start 10, Max 30 (anpassen nach Load-Tests)

### Messung

**Backend:**

- Pino-Logger schreibt `duration` pro Request (Pflicht in ADR-15)
- `/api/metrics` (Prometheus-Format) später für Grafana
- Vitest Integration-Tests führen Performance-Assertions für Plan-Generator + Reassignment-Scoring durch (Toleranz +50% Buffer)

**Frontend:**

- Lighthouse-Check in CI bei jedem PR (über Playwright + Lighthouse CI)
- `vite-bundle-visualizer` bei jedem Release zur Bundle-Analyse

### Eskalation bei Verletzung

- Performance-Regression in CI → PR blockt
- p95-Drift in Production (Trend-Alert > 20% über Budget für 7 Tage) → Issue automatisch erstellen

## Konsequenzen

- **ELE-169 (Backend-Skeleton):** Pino-Logger muss `duration` loggen + `@fastify/timeout` mit 10s
- **ELE-182 (Mobile-PWA):** Lighthouse-Check als CI-Job + Pflicht-AC
- **ELE-185 (Plan-Generator):** Performance-Test mit 1000 SCHEDULE_ENTRIES → muss unter 5s
- `package.json` ergänzt um Scripts `lighthouse`, `bundle-analyze`

## Verworfen

- **APM-Lösungen** wie New Relic, Datadog für MVP — kosten Geld, Grafana + Pino-Logs reichen
- **Microbenchmarks** für jede Funktion — pragmatisch nur an heißen Pfaden (Frequenz-Engine, Scoring)
