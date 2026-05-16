# Timetable — Architecture Design

**Version:** 0.1.0 | **Stand:** 2026-05-16

## Übersicht

Hausmeister services Wochenplan erstellen — Full-Stack PWA mit Fastify-Backend, React-Frontend, PostgreSQL + RLS.

## Quality Attributes

| Attribut | Priorität | Beschreibung |
|----------|-----------|-------------|
| Reliability | Hoch | Wochenplan-Daten müssen konsistent und verfügbar sein |
| Data Integrity | Hoch | PostgreSQL-Constraints + Zod-Validierung |
| Security | Hoch | JWT Auth, RLS Multi-Tenancy, Rate Limiting |
| Performance | Mittel | Fastify (schnellstes Node.js-Framework), Vite-Bundle |
| Observability | Mittel | Structured Logging, OpenAPI-Doku |
| Maintainability | Mittel | TypeScript end-to-end, klare Layer-Trennung |
| Privacy / DSGVO | Hoch | Mitarbeiterdaten sind personenbezogen — DSGVO-konform verarbeiten |
| Cost Efficiency | Mittel | Bewusster LLM/SaaS-Einsatz, Ressourcen im Blick |
| Signal Quality | Mittel | Planungsqualität und Abweichungen messbar machen |

## ADRs (Architecture Decision Records)

| Nr | Datum | Titel | Status |
|----|-------|-------|--------|
| ADR-01 | 2026-05-16 | Monolith mit Fastify + React statt Microservices | Active |
| ADR-02 | 2026-05-16 | PostgreSQL RLS für Multi-Tenancy | Active |
| ADR-03 | 2026-05-16 | Zod als einheitliche Validierungsschicht (Client + Server) | Active |

### ADR-01: Monolith mit Fastify + React
**Kontext:** Hausmeister-Wochenplan-App, Team-Größe < 10, < 100k Nutzer erwartet.
**Entscheidung:** Single Fastify-Prozess + React-SPA. Kein Microservices-Overhead.
**Verworfen:** Express (langsamer), Microservices (zu früh), NestJS (zu viel Overhead).

### ADR-02: PostgreSQL RLS für Multi-Tenancy
**Kontext:** Mehrere Kunden / Standorte müssen strikt getrennt sein.
**Entscheidung:** Row Level Security auf DB-Ebene — sicherster Ansatz, kein App-Layer-Overhead.
**Verworfen:** Separate Datenbanken pro Mandant (Ops-Aufwand).

### ADR-03: Zod für Validierung
**Kontext:** TypeScript end-to-end — gleiche Schemas auf Client und Server.
**Entscheidung:** Zod für alle API-Request-Schemas + Frontend-Forms.
**Verworfen:** Joi (kein TypeScript-First), Yup (langsamer).

## 9. Referenzen (alle Dateien)

> **Pflicht:** Jede neue Datei sofort hier eintragen — vor dem git commit.
> (Erzwungen durch `orphan-check.sh`)

### Docs (Repo)

| Datei | Zweck |
|-------|-------|
| `CLAUDE.md` | AI-Kontext, Regeln, Governance |
| `SYSTEM_ARCHITECTURE.md` | Komponenten-Tabelle, Flows, Config |
| `ARCHITECTURE_DESIGN.md` | ADRs, Quality Attributes, Referenzen (Hub) |
| `INDEX.md` | Alle Docs kategorisiert |
| `COMPONENT_INVENTORY.md` | Alle Komponenten mit Status |
| `GOVERNANCE.md` | Entwicklungs-Prozess, Regeln |
| `DEVELOPMENT_PROCESS.md` | Verweis auf Governance |
| `SECURITY.md` | Security-Policy, DSGVO, API-Key-Regeln |
| `CHANGELOG.md` | Version-History |
| `specs/TEMPLATE.md` | Story-Template |
| `lib/config.js` | SSoT alle Parameter |

### Docs (Obsidian SecondBrain)

| Pfad | Zweck |
|------|-------|
| `TIMETABLE/TIMETABLE - PMO HUB.md` | Projekt-Hub |
| `TIMETABLE/Architektur-Vorgaben.md` | Konsolidierte Stack-Entscheidungen |
| `TIMETABLE/Components/frontend.md` | Frontend-Komponente (React + Vite + Tailwind + PWA) |
| `TIMETABLE/Components/backend.md` | Backend-Komponente (Fastify + TypeScript) |
| `TIMETABLE/Components/api.md` | API-Layer (REST + OpenAPI + Zod) |
| `TIMETABLE/Components/db.md` | Datenbank (PostgreSQL + Drizzle + RLS) |
| `TIMETABLE/Components/auth.md` | Auth-Komponente (JWT + bcryptjs) |
