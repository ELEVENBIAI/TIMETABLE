# Timetable — System Architecture

**Version:** 0.1.0 | **Stand:** 2026-05-16

## Übersicht

Hausmeister services Wochenplan erstellen — Full-Stack Webanwendung mit PWA-Support.

## Komponenten

| Komponente | Technologie | Pfad | Status |
|-----------|-------------|------|--------|
| Backend API | Fastify + TypeScript | `backend/` | planned |
| Frontend | React + Vite + Tailwind | `frontend/` | planned |
| Datenbank | PostgreSQL 16+ | — | planned |
| Auth | JWT + bcryptjs | `backend/auth/` | planned |
| PWA | manifest + Service Worker | `frontend/public/` | planned |

## Architektur-Prinzip

Monolith mit klaren Layern — kein Microservices-Overhead bei < 100k Nutzern.

```
Browser (React PWA)
    │
    ▼
Fastify REST API  (OpenAPI/Swagger Doku)
    │
    ├── Auth Layer (JWT)
    ├── Rate Limiting (@fastify/rate-limit)
    ├── Validation (Zod)
    │
    ▼
PostgreSQL 16+
    └── RLS (Row Level Security) für Multi-Tenancy
```

## Multi-Tenancy

PostgreSQL Row Level Security (RLS) sorgt dafür, dass Daten verschiedener Mandanten strikt getrennt bleiben.

## Config

Alle Parameter in `lib/config.js`. VERSION ist SSoT.
