# i18n Frontend — react-i18next + Locale-Selector im Profil (ADR-16)

## Why

Die Backend-Seite stellt mit dem ELE-169-Nachtrag (Foundation) und ELE-194 (Full) die Locale per JWT-Claim, `users.locale`-DB-Feld und `Accept-Language` bereit. Das Frontend muss diese Locale konsumieren, sämtliche UI-Strings übersetzen und dem User erlauben, seine Sprache im Profil-Bildschirm zu ändern.

## What

React-PWA vollständig auf **react-i18next** umstellen, JSON-Resource-Dateien für `en` + `de` anlegen, Locale-Selector in der Profil-Maske bauen und Backend-`messageKey` als Übersetzungsquelle für Error-Toasts nutzen.

### Done-Kriterien

- [ ] `react-i18next` + `i18next` + `i18next-browser-languagedetector` als Frontend-Dependency
- [ ] Resource-Dateien: `frontend/src/locales/{en,de}/{common,auth,schedule,errors,profile}.json`
- [ ] `<App>` mit `I18nextProvider` umschlossen, Initialisierung in `frontend/src/lib/i18n.ts`
- [ ] Locale-Resolution: JWT-Claim `locale` (eingeloggt) → Browser-LanguageDetector → Fallback `en`
- [ ] **Profil-Maske** `frontend/src/pages/profile/LocaleSelector.tsx`:
  - Dropdown mit allen unterstützten Sprachen (en, de)
  - PATCH `/api/users/me/locale` ändert `users.locale` in der DB
  - Nach erfolgreichem Save: i18next live umschalten + Toast „Sprache geändert"
- [ ] Backend-Endpoint `PATCH /api/users/me/locale` (kann mit dieser Story mitkommen oder als Sub-Task)
- [ ] Error-Handler im API-Client: nutzt `error.messageKey` aus Response für Toast-Übersetzung, Fallback auf `error.message`
- [ ] **Keine Inline-Strings im JSX** — Linter-Regel (ESLint `react/jsx-no-literals` oder eigener Check)
- [ ] Alle bestehenden UI-Strings (Login, Layout, Navigation) in Resource-Files überführt
- [ ] E2E-Test (Playwright) pro Locale: Login → Profile → Sprache wechseln → UI zeigt neue Sprache
- [ ] Spec-File `specs/ELE-195.md` mit Agent-Pattern

## Constraints

- **Must:** Default `en`, erste übersetzte Sprache `de`
- **Must:** Persistenz der User-Wahl in `users.locale` — nicht nur localStorage
- **Must:** Bei JWT-Refresh muss neue Locale aus dem Token greifen
- **Must Not:** Inline-Strings im JSX — ESLint blockiert
- **Out of Scope:** Datums-/Zahlenformate (separate Story), weitere Sprachen, RTL-Languages

## Referenzen

- ADR-16: `docs/ADR-16-i18n-strategy.md`
- Backend-Full: ELE-194
- react-i18next: https://react.i18next.com/
- i18next-browser-languagedetector: https://github.com/i18next/i18next-browser-languageDetector

## Abhängigkeiten

- ELE-194 (Backend Full) — liefert finale `messageKey`-Struktur
- ELE-170 (User-CRUD) — falls noch nicht da, Endpoint `PATCH /api/users/me/locale` separat
