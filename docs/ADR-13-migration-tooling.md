# ADR-13: Migration-Tooling — Drizzle Kit

**Status:** Active
**Datum:** 2026-05-16
**Kontext:** DB-Migration-Strategie war nicht spezifiziert. Bei ELE-164 müssen wir wissen: wie wird das Schema versioniert und reversibel angelegt.

## Entscheidung

### Tool: Drizzle Kit

- Migrations in `backend/src/db/migrations/` als versioniertes SQL (numerisch sortiert: `0001_init.sql`, `0002_*.sql`, …)
- Drizzle Kit generiert Migrations aus Schema-Definitionen oder akzeptiert hand-geschriebenes SQL
- Migration-Lauf via `drizzle-kit migrate` (im Owner-Pool, BYPASSRLS)
- Snapshot pro Migration in `__drizzle_migrations` Tabelle

### Anwendung

**ELE-164 (DB-Schicht 1):**

- Schema-Files unter `backend/src/db/schema/01-schicht1.sql` werden als **erste Migration** `0001_schicht1.sql` registriert
- Folgende Schichten als eigene Migrations (`0002_schicht2.sql`, …)
- **Keine Drizzle-ORM-Schema-Definitionen** zwingend — raw SQL ist OK, Drizzle Kit kümmert sich nur um Ausführung + Tracking

**Reversibilität:**

- Jede Migration hat eine `up`-Datei (Pflicht) und `down`-Datei (Pflicht für reversible Migrations)
- Destruktive Migrations (DROP TABLE etc.) brauchen explizite Begründung im Commit
- Rollback-Test im Vitest-Setup (Integration-Test) — Migration up → Migration down → up → konsistenter Endzustand

### Reihenfolge bei Deployment

```
1. Deploy neuer Code (mit kompatibler Migration-Logic, kann altes Schema noch lesen)
2. Run migrations (drizzle-kit migrate)
3. Verify (Health-Check + Smoke-Test)
4. (Optional) Run cleanup-Migration die alte Spalten droppt
```

### Verworfen

- **Knex Migrations** (älteres Tool, keine TypeScript-First-Story)
- **node-pg-migrate** (funktioniert, aber kein Schema-Inference)
- **Hand-gerollte Migrations** (kein Tracking → Production-Risiko)
- **Drizzle ORM voll** (nicht zwingend — wir nutzen Drizzle nur für Migration-Tracking, Query-Code kann raw `pg` bleiben)

### Konfiguration

```typescript
// backend/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/*.sql', // Wir nutzen SQL direkt, keine TS-Schemas
  out: './src/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL_OWNER!, // Owner-Connection für Migrations
  },
  strict: true,
});
```

## Konsequenzen

- **ELE-164 erweitern:** Drizzle Kit als Dev-Dependency installieren, `drizzle.config.ts` anlegen, Schema-File als `0001_schicht1.sql` ausführen, in `__drizzle_migrations` registrieren
- `npm run db:migrate` Script in `backend/package.json` ergänzen
- `db-reset.sh` muss Drizzle-Migration-Lauf nutzen (nicht direkten `psql` Schema-Import)
- Migration-Up/Down-Tests in `backend/tests/db/migrations.test.ts` als Integration-Test

## Offene Punkte

- Bei Schema-Änderungen in Wave 2+ (z.B. neue Spalten): wer schreibt das Down-File? — Antwort: Spec-File jeder Story muss explizit Migration-Strategie nennen (`## Migration`-Sektion ergänzen in `specs/TEMPLATE.md`).
