# i18n Backend — Full-Implementation (ADR-16)

## Why

Die Foundation (ADR-16, Migration 0006, JWT-Claim `locale`, Mini-i18n-Map) ist mit dem ELE-169-Nachtrag bereits gelegt. Vor dem CRUD-Build muss die Backend-Seite vollständig auf **i18next** umgestellt werden, sonst sammeln sich deutsche Inline-Strings in jedem neuen Endpoint an und müssen später aufwendig nachgezogen werden.

## What

Backend-i18n von Mini-Map auf produktives **i18next** mit JSON-Resource-Dateien umstellen und alle Error-Messages sowie das `messageKey`-Feld konsequent ausspielen.

### Done-Kriterien

- [ ] `i18next` + `i18next-fs-backend` als Backend-Dependency installiert (statt aktueller Mini-Map in `backend/src/lib/i18n.ts`)
- [ ] Resource-Dateien gemigriert: `backend/src/locales/{en,de}/common.json`, `auth.json`, `errors.json` (JSON statt TypeScript-Objekt)
- [ ] `t(key, locale, vars?)` Helper unterstützt Interpolation (`{{count}}`, `{{email}}`)
- [ ] Plural-Forms via i18next-ICU für `en` und `de`
- [ ] Alle vorhandenen Error-Klassen in `backend/src/lib/errors.ts` haben sinnvolle `messageKey`-Defaults
- [ ] Login + alle Auth-Endpoints geben `messageKey` zurück, Frontend kann übersetzen
- [ ] Request-Locale-Resolution Middleware: `users.locale` (für authentifizierte Requests) → JWT-Claim → `Accept-Language` → `en`
- [ ] Unit-Tests für i18next-Setup (Interpolation, Plural, Fallback-Kette)
- [ ] OpenAPI-Doku Error-Schema erweitert um `messageKey`
- [ ] Spec-File `specs/ELE-194.md` mit Agent-Pattern

## Constraints

- **Must:** Default `en`, erste übersetzte Sprache `de`, BCP 47 Codes
- **Must:** `messageKey` zusätzlich zu `code` und `message` im Error-Response
- **Must Not:** Inline-Strings in neuen Routes oder Services — alles über `t('key')`
- **Out of Scope:** Frontend (siehe ELE-195), weitere Sprachen (es, fr, ...)

## Referenzen

- ADR-16: `docs/ADR-16-i18n-strategy.md`
- Foundation (ELE-169-Nachtrag): `backend/src/lib/i18n.ts`, `backend/src/locales/{en,de}/index.ts`
- Migration 0006: `backend/src/db/migrations/0006_user_locale.sql`
- i18next-Doku: https://www.i18next.com/

## Abhängigkeiten

- Foundation ELE-169 (Backend-Skeleton) — abgeschlossen mit i18n-Nachtrag
- Vor CRUD-Routes (ELE-170+) — sonst Inline-String-Schuld
