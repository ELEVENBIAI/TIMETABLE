# ADR-12: Backup-Strategie + Feature-Flags

**Status:** Active
**Datum:** 2026-05-16
**Kontext:** Reliability-Lücke aus Architecture-Review: Disaster-Recovery + Kill-Switches fehlten.

## Entscheidung

### 1. Database Backup

| Was                 | Wie                                          | Wo                                       |
| ------------------- | -------------------------------------------- | ---------------------------------------- |
| Daily Full Snapshot | `pg_dump` Cron 03:00                         | S3-kompatibel (z.B. Hetzner Storage Box) |
| WAL-Archiving       | Continuous (`archive_command`)               | Gleicher Storage                         |
| Retention           | 30 Tage Tagessnapshots, 7 Tage WAL           | Automatic Lifecycle-Policy               |
| Recovery-Test       | Quartalsweise: kompletter Restore in Staging | Dokumentation in CHANGELOG               |

**Rationale:**

- pg_dump + WAL-Archiving ist Standard-Pattern für PostgreSQL Point-in-Time-Recovery (PITR).
- Externe Storage-Lokation: Backup darf nicht auf gleichem Host wie DB liegen.
- Recovery-Tests sind Pflicht — ungetestetes Backup ist kein Backup.

**Verworfen:**

- Managed-DB-Service (Hetzner Managed PostgreSQL existiert nicht; AWS RDS/Cloud SQL zu teuer für MVP).
- Logical Replication (Overkill für MVP, später für Read-Replicas evaluieren).

### 2. Feature-Flags

Implementierung via `lib/config.js` als Sektion `FEATURES`:

```javascript
const FEATURES = {
  PLAN_GENERATOR_ENABLED: true, // ELE-185 — Notbremse falls Bug
  REASSIGNMENT_AI_ENABLED: false, // Wave 3 — initial off
  TIME_LOGS_GPS_REQUIRED: false, // Pilot: optional, Production: required
  ROUTING_PROVIDER: 'ORS', // 'ORS' | 'GOOGLE' | 'NONE'
  MAINTENANCE_MODE: false, // True: API antwortet nur mit 503 + Status
};
```

**Auswertung:**

- Backend-Routes prüfen Flag vor Business-Logik
- Frontend liest Flags über `/api/config` Endpoint (whitelisted Subset)
- Änderungen erfordern Deployment — keine Live-Toggles. Für Live-Toggles in Production später LaunchDarkly oder GrowthBook evaluieren.

### 3. Graceful Degradation

| Fehlerszenario        | Verhalten                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| DB nicht erreichbar   | API antwortet `503 Service Unavailable` mit `{error:{code:"DB_UNAVAILABLE"}}` — Health-Check zeigt das |
| OpenRouteService down | Routing-Features fallen auf "kein Routing" zurück (Plan funktioniert ohne Optimierung)                 |
| Plan-Generator-Bug    | `FEATURES.PLAN_GENERATOR_ENABLED = false` → Planer arbeitet manuell mit CRUD                           |
| PWA-Offline           | Service Worker liefert letzten gecachten Plan                                                          |

## Konsequenzen

- **ELE-164** (DB-Schicht 1) muss die Backup-Konfiguration nicht implementieren, aber das Cron-Script wird in einem späteren Issue (Pre-Pilot) ergänzt.
- **ELE-169** (Backend-Skeleton) muss `/api/health` mit DB-Connectivity-Check liefern (steht schon im Spec).
- `lib/config.js` muss um `FEATURES`-Sektion erweitert werden — geplant in ELE-169.
- Ein eigenes Issue **"Backup-Setup + Recovery-Test"** wird in Wave 4 (Pre-Pilot) angelegt.
