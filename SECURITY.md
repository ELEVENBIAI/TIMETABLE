# Timetable — Security Policy

**Version:** 0.1.0 | **Stand:** 2026-05-16

## Grundregeln

1. **NIEMALS** API-Keys, Passwörter oder Secrets in Code oder Chat
2. **NIEMALS** Secrets in Git committen — `.env` ist in `.gitignore`
3. **IMMER** `.env.example` für neue Variablen aktualisieren
4. Alle Inputs werden mit Zod validiert (Server + Client)
5. Rate Limiting auf alle öffentlichen Endpoints (`@fastify/rate-limit`)

## Auth & JWT

- JWT-Secrets: mindestens 256-bit zufällig, in `.env`
- Token-Expiry: `JWT_EXPIRES_IN=7d` (konfigurierbar)
- Passwörter: bcryptjs mit mindestens 12 Rounds
- Refresh-Token-Rotation bei sensitiven Operationen

## Datenbank-Sicherheit

- PostgreSQL RLS (Row Level Security) für Multi-Tenancy — Mandanten-Isolation auf DB-Ebene
- Prepared Statements / parameterisierte Queries (Drizzle ORM oder raw pg)
- Keine SQL-String-Konkatenation mit User-Input
- DB-User mit minimalen Rechten (kein Superuser für App)

## API-Sicherheit

- CORS: Whitelist statt `*` in Production
- Helmet-Headers via Fastify-Plugin
- Input-Validierung: Zod für alle Request-Bodies, Query-Params, Path-Params
- Fehler-Responses: Keine internen Stacktraces an Client

## Privacy / DSGVO

> **Add-on aktiv** — Mitarbeiterdaten sind personenbezogen gem. Art. 4 DSGVO

- **Datenminimierung:** Nur Felder speichern, die für den Wochenplan notwendig sind
- **Zugriffsprotokoll:** Zugriffe auf Mitarbeiterdaten werden geloggt (wer, wann, was)
- **Löschkonzept:** Auf Anfrage vollständige Datenlöschung möglich (Soft-Delete → Hard-Delete nach Frist)
- **Datenweitergabe:** Keine Weitergabe an Dritte ohne explizite Einwilligung
- **Auftragsverarbeitung:** Falls externe Dienste genutzt werden → AVV erforderlich
- **Datenschutzerklärung:** Vor Go-Live erstellen

## Threat Model (STRIDE — Kurzfassung)

| Bedrohung | Maßnahme |
|-----------|---------|
| Spoofing (gefälschte Identität) | JWT-Signatur-Verifikation |
| Tampering (Daten-Manipulation) | Zod-Validierung, DB-Constraints |
| Repudiation (Abstreitbarkeit) | Audit-Log für kritische Aktionen |
| Info Disclosure (Datenleck) | RLS, minimale API-Responses, kein Stack-Trace |
| DoS | Rate Limiting, Pagination |
| Elevation of Privilege | RLS, RBAC (wenn multi-role), minimale DB-Rechte |
