# ADR-15: Logging-Schema (Pino strukturiert)

**Status:** Active
**Datum:** 2026-05-16
**Kontext:** Observability-Lücke aus Architecture-Review: Pino war als Logger genannt, aber kein Schema definiert. Ohne Schema droht Log-Wildwuchs, Korrelationsverlust und Compliance-Probleme (DSGVO: keine PII in Logs).

## Entscheidung

### Tool: Pino (Fastify-nativ)

- Fastify nutzt Pino out-of-the-box
- JSON-Lines-Format (`ndjson`) für einfache Maschinen-Auswertung
- Im Dev-Mode: `pino-pretty` für lesbares Output
- In Production: Logs auf `stdout` (Container-Convention) → Sammlung via Loki/Promtail oder Logging-Driver

### Pflicht-Felder pro Log-Eintrag

| Feld        | Typ          | Wer setzt       | Zweck                                                                            |
| ----------- | ------------ | --------------- | -------------------------------------------------------------------------------- |
| `level`     | string       | Pino            | `trace` `debug` `info` `warn` `error` `fatal`                                    |
| `time`      | number       | Pino            | Unix-Timestamp ms                                                                |
| `requestId` | uuid         | Fastify-Plugin  | Korrelations-ID pro HTTP-Request (auto-generiert via `@fastify/request-context`) |
| `tenantId`  | uuid \| null | Auth-Middleware | Pflicht außer für ungeschützte Routes (Health, Login)                            |
| `userId`    | uuid \| null | Auth-Middleware | Pflicht für authentisierte Routes                                                |
| `route`     | string       | Fastify         | HTTP-Method + Path (z.B. `POST /api/schedules`)                                  |
| `duration`  | number       | Fastify-Hook    | Request-Dauer in ms (Pflicht in onResponse)                                      |
| `status`    | number       | Fastify         | HTTP-Status-Code                                                                 |
| `msg`       | string       | Caller          | Menschenlesbare Message                                                          |

### Verbotene Felder

**NIEMALS in Logs:**

- Passwörter, Password-Hashes
- JWT-Tokens, API-Keys, Secrets
- Vollständige Email-Adressen (`mail` darf — `name@domain.com` nicht)
- Mitarbeiter-Adressen, GPS-Koordinaten (außer für Debug-Level mit expliziter Erlaubnis)
- Bewohner-PII

**Sanitization-Helper:** `lib/log-sanitize.ts` (geplant in ELE-169) filtert automatisch.

### Log-Levels — Wann was

| Level   | Wann                                                                                       |
| ------- | ------------------------------------------------------------------------------------------ |
| `trace` | Detail-Debug, nur in Dev-Mode aktiv                                                        |
| `debug` | Operative Details (Query-Counts, Cache-Hits) — Dev + Pilot, in Production off              |
| `info`  | Normale Operationen (Request-Start/End, Plan-Generierung erfolgreich) — Production default |
| `warn`  | Recoverable Errors (Rate-Limit getriggert, ORS-Fallback aktiv, Deprecation-Use)            |
| `error` | Request-Fehler die User betreffen (5xx, Crashes, DB-Connection-Loss)                       |
| `fatal` | Service kann nicht weiterlaufen (DB initial nicht erreichbar) — Process Exit               |

Production-Default: `info`. Setting via `LOG_LEVEL` Env-Variable.

### Error-Logging-Pattern

```typescript
// FALSCH:
logger.error(`Failed to create user: ${err.message}`);

// RICHTIG:
logger.error({ err, userId, action: 'user.create' }, 'Failed to create user');
```

Pino serialisiert `err` automatisch korrekt (Stack, Name, Code) ohne Object-Spread-Gefahr.

### Audit-Events vs. App-Logs

**App-Logs** (Pino):

- Operative Events, kurzlebig (z.B. 30 Tage Retention)
- Format: stdout JSON-Lines

**Audit-Events** (separate AUDIT_LOG Tabelle):

- Compliance-relevante Events (DSGVO Art. 30)
- Schreib/Lesezugriffe auf personenbezogene Daten
- Permanent gespeichert in DB
- Eigene API für Auswertung

**Pro Compliance-Event:** Eintrag in AUDIT_LOG + zusätzlich Pino-Log mit `audit: true` Flag.

### Pseudocode-Beispiel

```typescript
// In Auth-Middleware
const tenantId = jwtPayload.tenantId;
const userId = jwtPayload.userId;
request.log = request.log.child({ tenantId, userId });

// In Route-Handler
request.log.info({ action: 'schedule.publish', scheduleId }, 'Wochenplan veröffentlicht');

// Bei Audit-relevanter Aktion (PII-Lesezugriff)
await auditLog.create({ tenantId, userId, action: 'employee.read', targetId: employeeId });
request.log.info(
  { audit: true, action: 'employee.read', targetId: employeeId },
  'Mitarbeiter-Daten gelesen'
);
```

## Konsequenzen

- **ELE-169 (Backend-Skeleton):** Pino-Setup mit allen Pflicht-Feldern + Sanitization-Helper
- **ELE-164 (DB-Schicht 1):** AUDIT_LOG-Tabelle (siehe Issue-Erweiterung)
- **CI:** ESLint-Rule die `logger.info(\`${variable}\`)` warnt (Strukturlosigkeit)
- `LOG_LEVEL` in `.env.example` ergänzen

## Verworfen

- **Winston:** Schlechtere Performance, nicht Fastify-nativ
- **Console.log:** Kein Strukturieren, kein Sampling, kein Filtern
- **Bunyan:** EOL
