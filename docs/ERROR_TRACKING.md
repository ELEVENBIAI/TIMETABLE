# Error-Tracking — Setup + Bedienung

> **Stand:** v0.5.4 (ELE-189) — GlitchTip self-hosted als Primär, Sentry SaaS als Backup.
> **ADR:** [docs/ADR-17-error-tracking.md](./ADR-17-error-tracking.md)

## Wo finde ich Errors?

| Quelle                | Wo                                                                    |
| --------------------- | --------------------------------------------------------------------- |
| **Backend 5xx**       | GlitchTip-Web-UI unter `<GLITCHTIP_URL>/issues/`                      |
| **Frontend Crashes**  | gleiche GlitchTip-Instanz, Projekt "timetable-frontend"               |
| **Dev-Maschine-Logs** | Backend stdout (Pino) — nur lokal, kein zentraler Sammler             |
| **Audit-Trail**       | `/settings/audit-trail` in der App (für Admin-Aktionen, nicht Errors) |

## Lokales GlitchTip via Docker

GlitchTip ist eine Open-Source-Sentry-Alternative. Sie ist API-kompatibel mit Sentry SDK — wir können den Server jederzeit gegen Sentry SaaS tauschen ohne Code-Änderung.

### 1. GlitchTip lokal starten

```yaml
# docker-compose.glitchtip.yml (optional, wenn du lokal experimentieren willst)
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: glitchtip
      POSTGRES_PASSWORD: glitchtip
      POSTGRES_DB: glitchtip
    volumes:
      - glitchtip-postgres:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  glitchtip-web:
    image: glitchtip/glitchtip:latest
    depends_on: [postgres, redis]
    ports:
      - '8000:8000'
    environment:
      DATABASE_URL: postgres://glitchtip:glitchtip@postgres:5432/glitchtip
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: change-me-locally
      PORT: 8000
      EMAIL_URL: consolemail://
      GLITCHTIP_DOMAIN: http://localhost:8000
      DEFAULT_FROM_EMAIL: dev@localhost

  glitchtip-worker:
    image: glitchtip/glitchtip:latest
    command: celery -A glitchtip worker -B -l INFO
    depends_on: [postgres, redis]
    environment:
      DATABASE_URL: postgres://glitchtip:glitchtip@postgres:5432/glitchtip
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: change-me-locally

volumes:
  glitchtip-postgres:
```

```bash
docker compose -f docker-compose.glitchtip.yml up -d
open http://localhost:8000
```

### 2. Projekt + DSN erzeugen

1. Erster Login: Email/PW selbst registrieren (das wird Owner-Account).
2. UI → "Create New Project"
3. Plattform: **Node.js** für Backend, **React** für Frontend.
4. Nach Anlage erscheint der **DSN** (`http://<key>@localhost:8000/<project-id>`).
5. Pro Projekt eigene DSN — wir machen zwei: `timetable-backend` und `timetable-frontend`.

### 3. DSNs in `.env` eintragen

```dotenv
# Backend
SENTRY_DSN=http://<key>@localhost:8000/1
SENTRY_ENVIRONMENT=development
SENTRY_RELEASE=0.5.4

# Frontend (VITE_ prefix damit Vite es exposed)
VITE_SENTRY_DSN=http://<key>@localhost:8000/2
VITE_APP_VERSION=0.5.4
```

### 4. Testen

```bash
# Backend-Test: 500 erzeugen
curl -X POST http://localhost:3000/api/dsgvo/data-export \
  -H "Content-Type: application/json" \
  -d '{"userId": "ffffffff-ffff-ffff-ffff-ffffffffffff"}'   # nicht-existenter User → 404, kein Tracking
```

Im Backend einen künstlichen Throw einbauen oder eine Route mit `throw new Error()` testen → sollte im GlitchTip-Issue-Feed erscheinen.

### 5. Source-Maps hochladen (Production-Build)

In CI oder lokal beim Production-Build:

```dotenv
SENTRY_AUTH_TOKEN=glitchtip-personal-token-aus-ui
SENTRY_ORG=<org-slug>
SENTRY_PROJECT=timetable-frontend
SENTRY_URL=http://localhost:8000     # oder Production-GlitchTip-URL
```

Dann normalen Build laufen lassen:

```bash
npm --workspace=frontend run build
```

Das `@sentry/vite-plugin` lädt die Source-Maps automatisch hoch und entfernt sie aus `dist/` (damit User sie nicht ziehen können).

**Ohne diese Vars** läuft der Build identisch zu vorher — keine Source-Maps werden hochgeladen.

## Alerts konfigurieren (5xx-Spike)

GlitchTip-UI bietet Email + Webhook als Alert-Kanäle.

### Webhook → Telegram-Bot

1. Telegram-Bot via @BotFather erstellen, Bot-Token notieren
2. Bot zu einer Group hinzufügen, Chat-ID via `https://api.telegram.org/bot<token>/getUpdates` auslesen
3. GlitchTip → Project → Alerts → "Create new Alert":
   - **Name:** "5xx-Spike"
   - **Condition:** `event count > 10` **in** `5 minutes`
   - **Filter:** `level:error AND environment:production`
   - **Action:** Webhook URL `https://api.telegram.org/bot<token>/sendMessage?chat_id=<chat_id>&text={{message}}`
   - **Throttle:** 30 min

### Direct-Email-Alert

1. GlitchTip → Project → Alerts → "Create new Alert":
   - Action: "Send email to" `<DSB-Email>` oder Operator
   - Throttle: 60 min

## PII-Scrubbing

Das Backend filtert vor dem Senden im `beforeSend`-Hook automatisch:

- `request.data` (kompletter JSON-Body — könnte Passwörter, Adressen enthalten)
- `request.headers.authorization` (JWT)
- `request.headers.cookie`

Falls weitere Felder PII enthalten könnten, in `backend/src/lib/tracking.ts beforeSend` ergänzen.

Frontend filtert:

- `request.cookies`
- `user.email`

## Production-Deployment

Steht noch aus — wird mit Hosting-Decision (ELE-191) konkretisiert. Erwartet:

1. GlitchTip-Server auf demselben Hoster wie Timetable (z.B. Hetzner)
2. Domain `errors.timetable.example` mit TLS
3. Backup der GlitchTip-Postgres-DB in normalem Backup-Plan
4. Retention: 30 Tage Events (Free-Plan), älter als 30 Tage werden automatisch gelöscht

## Wechsel zu Sentry SaaS

Falls GlitchTip-Ops-Aufwand zu hoch wird:

1. Sentry-Account anlegen, AVV unterschreiben
2. Projekte `timetable-backend` + `timetable-frontend` in Sentry erstellen
3. DSNs in `.env` umstellen (`SENTRY_DSN` + `VITE_SENTRY_DSN` + `SENTRY_URL` löschen)
4. `SENTRY_AUTH_TOKEN` neu generieren in Sentry
5. Restart — fertig. Kein Code-Change.
