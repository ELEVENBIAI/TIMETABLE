# ADR-18 — JWT-Secret-Rotation-Strategie

**Status:** Accepted
**Datum:** 2026-05-17
**Issue:** ELE-188
**Stand:** v0.5.5

## Kontext

JWT-Secret-Leak ist ein Szenario mit hohem Schaden: Ein Angreifer kann beliebige Tokens signen und sich als beliebiger User ausgeben. Die einzige Gegenmaßnahme ist Rotation des Secrets.

Aktueller Stand (vor ELE-188):

- `signJwt` und `verifyJwt` lesen `process.env.JWT_SECRET`
- Ein einziges Secret — bei Rotation müssen **alle** Tokens neu ausgestellt werden
- Folge: Total-Logout aller User, schlechte UX, kein dokumentiertes Verfahren

## Optionen

| Option                                         | Pro                                       | Contra                                                    |
| ---------------------------------------------- | ----------------------------------------- | --------------------------------------------------------- |
| **Einzelnes Secret + Rotation = Total-Logout** | Einfach, weniger Code                     | Schlechte UX, alle User müssen sich neu einloggen         |
| **Multi-Secret (primary + previous)**          | Nahtloser Übergang, keine User-Disruption | Etwas mehr Verify-Code                                    |
| **Rotating JWT mit JWKS-Endpoint (kid)**       | Industrie-Standard für OAuth2/OIDC        | Overkill für Single-Tenant-Pilot, JWKS-Server-Setup nötig |
| **HSM / Vault**                                | Höchste Sicherheit                        | Massiver Ops-Overhead, falsche Welle                      |

## Entscheidung

**Multi-Secret-Strategie (primary + previous)** mit manueller Rotation per Skript.

- `JWT_SECRET` = primary, wird zum **Signen** und **Verifizieren** benutzt
- `JWT_SECRET_PREVIOUS` = optional, wird **nur zum Verifizieren** benutzt
- `verifyJwt` versucht primary zuerst, bei Fehler fällt es zurück auf previous
- `signJwt` nutzt **immer nur** primary

Rotation = Skript schiebt das aktuelle Secret nach `JWT_SECRET_PREVIOUS` und generiert ein neues primary. Beide bleiben für 7 Tage gültig — danach entfernt der Operator das previous manuell.

## Konsequenzen

### Positiv

- Rotation ist **disruption-free** für eingeloggte User (alte Tokens bleiben bis zu ihrem Ablauf [SECURITY.JWT_EXPIRES_IN = 7d] gültig)
- Operator hat ein klares Skript + Playbook — kein Improvisieren bei Verdacht
- Code-Komplexität minimal: zwei `verify`-Versuche statt einer

### Negativ / Risiken

- `JWT_SECRET_PREVIOUS` bleibt 7 Tage in `.env` liegen — wenn `.env` selbst kompromittiert ist, hat der Angreifer alle aktuell gültigen Secrets. Mitigation: `.env`-Berechtigungen auf 600, `.env`-Backup-Files in `.gitignore`.
- Manuelle Cleanup-Pflicht (`JWT_SECRET_PREVIOUS` nach 7d entfernen) — kann vergessen werden. Mitigation: Kalender-Erinnerung im Operator-Playbook + Skript schreibt den Cleanup-Termin in stdout.

## Implementation

### Verify-Logik (`backend/src/auth/jwt.ts`)

```ts
export function verifyJwt(token: string): JwtPayloadWithMeta {
  const primary = process.env.JWT_SECRET;
  const previous = process.env.JWT_SECRET_PREVIOUS;
  if (!primary) throw new Error('JWT_SECRET nicht gesetzt');

  // Erst primary
  try {
    return decode(jsonwebtoken.verify(token, primary));
  } catch (errPrimary) {
    // Fallback auf previous (falls Rotation aktiv)
    if (previous) {
      try {
        return decode(jsonwebtoken.verify(token, previous));
      } catch {
        /* fallthrough — wir werfen den Primary-Fehler */
      }
    }
    throw errPrimary;
  }
}
```

### Sign-Logik

Unverändert — Sign immer mit `JWT_SECRET`. Nie mit previous.

### Rotation-Skript (`scripts/rotate-jwt-secret.mjs`)

```bash
node scripts/rotate-jwt-secret.mjs --dry-run    # zeigt Plan ohne Schreibvorgang
node scripts/rotate-jwt-secret.mjs --apply       # rotiert + Backup
```

Workflow:

1. Liest aktuelle `.env`
2. Backup nach `.env.<ISO-Timestamp>.bak`
3. Verschiebt `JWT_SECRET` → `JWT_SECRET_PREVIOUS`
4. Generiert neues `JWT_SECRET` (48 Bytes via `crypto.randomBytes(48).toString('base64')`)
5. Schreibt zurück
6. stdout: "Backend bitte neu starten. Cleanup-Termin: <heute+7d>"

## Operator-Playbook

Siehe [GOVERNANCE.md](../GOVERNANCE.md) Sektion "JWT-Secret-Rotation".

Drei Szenarien:

1. **Geplante Rotation (alle 90 Tage)** — Routine
2. **Notfall-Rotation (Verdacht auf Leak)** — sofort, mit zusätzlichem SQL-Forced-Logout
3. **Cleanup nach 7 Tagen** — `JWT_SECRET_PREVIOUS` löschen

## Verwandte ADRs

- ADR-09 — USERS-Tabelle + 6 Rollen
- ADR-15 — Logging (Secrets niemals loggen — sanitizeForLog deckt das ab)
- ADR-17 — Error-Tracking (Sentry sieht nie das Secret, nur die ID)

## Out of Scope

- **Automatische Rotation per Cron** — manuell reicht für Pilot. Bei späterem Scaling: GitHub-Action mit Manual-Approval kann das übernehmen.
- **JWKS-Endpoint mit `kid`** — Standard für OAuth2-Providers. Für Single-Tenant-Pilot Overkill.
- **HSM / Vault** — Welle 6+.
- **Refresh-Token-Architektur** — vereinfacht Rotation, aber Single-Token-JWT reicht für Pilot.
