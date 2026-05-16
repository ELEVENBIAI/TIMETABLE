# ADR-16: i18n-Strategie (Mehrsprachigkeit)

**Status:** Active
**Datum:** 2026-05-16
**Kontext:** Bei Bootstrap übersehen. Nachgetragen nach ELE-169. Mitarbeiter sprechen unterschiedliche Sprachen — System muss sowohl deutsche als auch internationale Nutzer unterstützen.

## Entscheidung

### Locale-Codes: BCP 47, kurz

Wir nutzen **2-Buchstaben-Locale-Codes** nach BCP 47 / ISO 639-1.

| Code                     | Sprache                     | Status                           |
| ------------------------ | --------------------------- | -------------------------------- |
| `en`                     | Englisch                    | **Default** + Fallback           |
| `de`                     | Deutsch                     | Erste implementierte Übersetzung |
| zukünftig: `fr`, `it`, … | Französisch, Italienisch, … | Welle 6+, nach Markt-Erweiterung |

**Begründung kurz statt voll:** `en` reicht für jetzt — wenn US-vs-UK unterschieden werden soll später, erweitern wir zu `en-US`/`en-GB`. Aktuell kein Bedarf.

### Tool-Wahl: i18next (überall)

- **Frontend:** `react-i18next` + `i18next-browser-languagedetector` (de-facto-Standard, JSON-Files pro Locale)
- **Backend:** `i18next` für API-Error-Messages (gleicher Mechanismus, geteilte Konventionen)
- **Storage:** JSON-Files pro Locale + Namespace (z.B. `frontend/src/locales/de/common.json`, `backend/src/locales/de/errors.json`)

**Verworfen:**

- **Eigene Translation-Funktion**: Reinventing the wheel, kein Plural/Format-Support.
- **next-intl**: nur Next.js — wir nutzen Vite.
- **Lingui**: zu nischig, kleine Community.

### Locale-Quelle (Priorität)

Pro Request wird die Locale in dieser Reihenfolge ermittelt:

1. **`users.locale`** aus DB (für authentifizierte User — höchste Priorität)
2. **`Accept-Language`** HTTP-Header (für nicht-authentifizierte Requests, z.B. Login-Page)
3. **Fallback `en`** (wenn weder noch oder ungültige Locale)

### Datenmodell

**`users.locale`** als neue Spalte (Migration 0006):

```sql
ALTER TABLE users
  ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'en'
  CHECK (locale IN ('en', 'de'));
```

**Default `en`** für alle Bestands-User. CHECK-Constraint hält die Liste klein und whitelistet sie explizit. Bei neuen Locales: Migration anhängen + CHECK erweitern.

### JWT-Payload

Locale wandert mit ins JWT (Pflicht-Claim), damit das Frontend nicht bei jedem Request die User-Locale neu fetchen muss:

```typescript
interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  locale: 'en' | 'de'; // NEU
}
```

Wenn der User seine Locale ändert, bekommt er beim nächsten Login einen neuen Token. Aktiv eingeloggte Tokens behalten die alte Locale bis Expiry — pragmatisch, kein force-refresh nötig.

### Backend — API-Errors

Strukturierte Errors haben jetzt **`messageKey`** zusätzlich zu `message`:

```typescript
class UnauthorizedError extends HttpError {
  constructor(message = 'Nicht autorisiert', messageKey = 'errors.unauthorized') {
    super(401, 'UNAUTHORIZED', message, messageKey);
  }
}
```

- `code` (Maschinenlesbar): bleibt wie bisher, z.B. `'UNAUTHORIZED'` — gut für Client-Logik
- `message` (Menschenlesbar): wird im Server-Locale-Kontext übersetzt
- `messageKey`: Frontend kann selbst übersetzen falls gewünscht (Frontend wird's meistens mit `code` und eigener Resource lösen)

Mini-Implementation jetzt: `backend/src/lib/i18n.ts` mit en/de für API-Errors. Voll-Implementation mit i18next-Plugin: separates Issue.

### Frontend — Resource-Layout

```
frontend/src/locales/
├── en/
│   ├── common.json    # Buttons, Labels, generic Strings
│   ├── auth.json      # Login, Logout, Passwort-Texte
│   ├── schedule.json  # Wochenplan-Spezifisches
│   └── errors.json    # 1:1 Mapping zu Backend-error.code
└── de/
    ├── common.json
    ├── auth.json
    ├── schedule.json
    └── errors.json
```

**Konvention:**

- Keys mit Namespace-Prefix: `'common.save'`, `'auth.loginFailed'`
- Plural via i18next-ICU: `{ count } Mitarbeiter` → wird automatisch zu `1 Mitarbeiter` / `5 Mitarbeiter`
- Datums-Formate: `i18next-icu` mit `Intl.DateTimeFormat` Backend
- **Keine Inline-Strings im JSX** — alles über `t('key')`

### User-Profil: Locale-Wechsel

Im Profile-View (kommt mit ELE-170 Users-CRUD) gibt es ein Locale-Dropdown:

- Aktuell hinterlegte Locale wird angezeigt
- Wechsel → `PATCH /api/users/me/locale` (kommt in separater Story)
- UI wechselt sofort (i18next + Locale-Detector im LocalStorage)
- Beim nächsten Login wird neuer JWT mit neuer Locale ausgestellt

### Out of Scope für diesen Nachtrag

- Komplette Übersetzungs-Files (kommt mit jedem Feature einzeln)
- Plural-Rules, Datums-/Number-Formate (i18next bringt's mit, integrieren wir bei Bedarf)
- Locale-spezifische Sortierung
- RTL-Sprachen (Welle 8+)
- Automatische maschinelle Übersetzung (manuelle Übersetzung reicht für überschaubaren UI-Umfang)

## Konsequenzen

- **Migration 0006** ergänzt USERS um `locale`-Spalte
- **JWT-Payload** um `locale` erweitert — alle bestehenden Tokens müssen neu ausgestellt werden (Pilot-User: kein Problem da `must_change_password=true`)
- **Login-Endpoint** liefert `locale` aus DB im JWT
- **Backend-i18n-Modul** als Mini-Implementation (Map-basiert) jetzt, später durch i18next-Plugin ersetzen
- **2 Folge-Issues** in Linear: Backend-Full + Frontend (mit react-i18next)
- **Spec-Template** ergänzen: bei jedem Feature mit User-facing Strings → `## i18n-Impact` Sektion (welche Keys?)
- **Frontend-Komponenten** dürfen keine String-Literale enthalten ab Welle 1 (CRUDs)

## Verworfen

- **English-Only-MVP**: kein Pilot in Deutschland akzeptabel — Robert / Mitarbeiter sprechen Deutsch
- **Datenbank-gestützte Translations** (für jeden String ein DB-Eintrag): Overengineering für einen Service mit ~500 UI-Strings. JSON-Files reichen.
- **Browser-only-i18n**: Backend braucht es auch für API-Error-Messages und (später) E-Mail-Templates.
