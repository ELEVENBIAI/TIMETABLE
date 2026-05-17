# ADR-17 — Error-Tracking-Strategie

**Status:** Accepted
**Datum:** 2026-05-17
**Issue:** ELE-189
**Stand:** v0.5.4

## Kontext

Ohne zentrales Error-Tracking ist Pilot-Betrieb nicht supportbar. Symptome:

- Pino-Logs gehen auf stdout, keine zentrale Sammlung über mehrere Container/Restarts
- Kein Stacktrace-Dedup → 50× derselbe Bug = 50 Log-Einträge
- Kein Alarm bei 5xx-Spike — Operator merkt es erst wenn Robert oder Daniel anruft
- Kein Frontend-Crash-Capture (React-Render-Errors verschwinden in der Console des Users)

Architecture-Review 2026-05-16 hat das als Tech-Debt-Punkt B markiert. Vor Pilot-Launch braucht es Sichtbarkeit.

## Optionen

| Option                       | Pro                                                                                           | Contra                                                                                                |
| ---------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Sentry SaaS**              | Best-in-class UI, Source-Maps-Upload eingebaut, 5k Events/Monat Free                          | DSGVO: USA-Server (Sentry, Inc.), AVV unter Standardvertragsklauseln nötig, Subprozessoren-Liste lang |
| **GlitchTip (self-hosted)**  | Sentry-Protocol-kompatibel (kein Code-Switch nötig), DSGVO-freundlich (eigene Hardware), Free | Ops-Overhead (eigener Server, Postgres, S3-kompatibles Storage, Redis), Update-Pflege                 |
| **Eigenes (Loki + Grafana)** | Bereits geplante Tooling-Stack-Komponente für Wave 4 Monitoring, voll unter Kontrolle         | Mehr Bauaufwand, kein eingebauter Stacktrace-Dedup, Source-Map-Resolution selbst bauen                |

## Entscheidung

**Primär: GlitchTip (selfhosted)**
**Backup: Sentry SaaS** (falls GlitchTip-Ops-Aufwand zu hoch oder Hosting-Anbieter Managed-Sentry anbietet)

Begründung:

- DSGVO-Compliance ist Pilot-Hartgate (ELE-187): GlitchTip läuft auf eigenem Server in EU, kein Auftragsverarbeiter außerhalb EWR, kein SCC nötig
- Sentry-Protocol-kompatibel: Wir nutzen `@sentry/node` + `@sentry/react` und können bei Bedarf den DSN auf Sentry SaaS umschalten ohne Code-Änderung
- Cost: Free vs ggf. Bezahl-Tier bei Sentry wenn Pilot wächst
- Migrations-Pfad zurück zu Sentry SaaS jederzeit möglich

## Konsequenzen

### Positiv

- Frontend + Backend nutzen dasselbe SDK (Sentry) — gleiche Patterns, gleiche Dashboards
- DSN ist konfigurierbar via .env, kein Hardcode
- Code läuft auch ohne DSN (Dev-Default = no-op)

### Negativ / Risiken

- Ein GlitchTip-Server muss aufgesetzt + gepflegt werden (Hosting-Decision ELE-191 enthält Aufwand)
- Source-Maps-Upload setzt `SENTRY_AUTH_TOKEN` (GlitchTip Personal Token) im CI/Build voraus
- GlitchTip-Free-Plan hat keine Native-Alerting — Alerts laufen über Email/Webhook in den eigenen Notification-Channel

## Implementation-Pattern

### Backend (Node.js + Fastify)

```ts
// backend/src/lib/tracking.ts
import * as Sentry from '@sentry/node';

export function initTracking() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // Dev-Default: no-op
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    sampleRate: 1.0, // alle Errors (kein Sampling — Volume ist klein im Pilot)
    tracesSampleRate: 0, // kein Performance-Tracing (ADR Wave 4)
    beforeSend: (event) => {
      // PII-Scrubbing — Bodies und Authorization-Header entfernen
      if (event.request) {
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
}

export function captureServerError(
  err: Error,
  ctx: { requestId?: string; tenantId?: string; route?: string }
) {
  Sentry.captureException(err, { tags: ctx });
}
```

Aufruf-Punkt: `fastify.setErrorHandler` für Statuscodes ≥ 500. 4xx wird **nicht** gemeldet — das sind Client-Fehler.

### Frontend (React + Vite)

```ts
// frontend/src/lib/tracking.ts
import * as Sentry from '@sentry/react';

export function initTracking() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION,
    beforeSend: (event) => {
      // PII-Scrubbing
      if (event.request) delete event.request.cookies;
      if (event.user) delete event.user.email;
      return event;
    },
  });
}
```

`AppErrorBoundary` wrappt App-Root + zeigt User-Fallback bei React-Render-Errors. Verlinkt auf Support-Email oder "App neu laden".

### Source-Maps

`@sentry/vite-plugin` ist im `vite.config.ts` conditional:

```ts
import { sentryVitePlugin } from '@sentry/vite-plugin';

const plugins = [react(), VitePWA({...})];
if (process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
  plugins.push(sentryVitePlugin({
    authToken: process.env.SENTRY_AUTH_TOKEN,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    url: process.env.SENTRY_URL,  // GlitchTip-URL
  }));
}
```

Dev-Build und CI-Build bleiben unverändert schnell — der Plugin macht nur was wenn die drei Env-Vars gesetzt sind.

## 5xx-Spike-Alert

**Hinweis:** Alerts können nicht im Code konfiguriert werden — das ist Server-Side-Konfiguration in GlitchTip-/Sentry-UI.

Vorgehen (siehe `docs/ERROR_TRACKING.md` für Schritt-für-Schritt):

1. GlitchTip-UI → Settings → Alerts → "Create new Alert"
2. Condition: `count(events) > 10 in 5 minutes` filtered by `level:error AND environment:production`
3. Action: Webhook (Telegram-Bot) ODER E-Mail an `<DSB-Email>`
4. Throttle: 30 min (kein Spam)

## Verwandte ADRs

- ADR-12 — Backup + Feature-Flags (Maintenance-Mode bei Tracking-Fail)
- ADR-15 — Logging-Schema (Pino bleibt für Info/Debug-Logs, Sentry nur für Errors)

## Migration Notes

Wenn später ein Wechsel zu Sentry SaaS gewünscht ist:

1. `SENTRY_DSN` in `.env` auf neue Sentry-Org-DSN umstellen
2. AVV mit Sentry, Inc. unterschreiben (Standardvertragsklauseln)
3. GlitchTip-Server ausschalten / parken
4. Kein Code-Change nötig (gleiche SDK).
