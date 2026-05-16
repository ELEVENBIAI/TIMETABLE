---
name: docgen
description: |
  Generiert User-Dokumentation und Admin-Dokumentation aus einer Codebase.
  Erstellt automatisch Screenshots via Playwright, MkDocs-Site und Word-Export.
  Verwenden wenn der Operator "Doku erstellen", "Dokumentation", "User Docs",
  "Admin Docs", "docgen" oder "/docgen" sagt.
version: 2.0.0
---

# Docgen — Dokumentations-Generator

Analysiert eine Codebase und generiert zwei Dokumentationen:
- **User-Dokumentation**: Fuer Endanwender (Features, Workflows, UI-Anleitung)
- **Admin-Dokumentation**: Fuer Betrieb/DevOps (Installation, Config, Troubleshooting)

Ausgabeformate:
- **Markdown** (immer) → `docs/USER-GUIDE.md`, `docs/ADMIN-GUIDE.md`
- **MkDocs-Site** (optional) → navigierbare HTML-Doku mit Suche
- **Word (.docx)** (optional) → Corporate-Styling mit Logo und Farben

## Workflow

### Phase 0: Konfiguration erfragen

Dem Nutzer diese Fragen stellen, bevor Phase 1 beginnt:

1. **App-URL** fuer Screenshots (z.B. `http://localhost:3000`), oder Screenshots ueberspringen?
2. **Login-Daten** falls Auth erforderlich
3. **Ausgabeformate** — nur Markdown, oder auch MkDocs und/oder Word?
4. **Corporate Styling** — gibt es eine `docs/docgen-style.yaml`? (Siehe [references/styling.md](references/styling.md))
5. **Sprache** — Deutsch oder Englisch?

### Phase 1: Projekt analysieren

1. `CLAUDE.md`, `README.md`, `package.json` / `docker-compose.yml` lesen
2. Routen/Pages identifizieren (z.B. `src/routes/`, `src/pages/`, `app/`)
3. Datenmodelle finden (Prisma-Schema, Sequelize-Models, SQL-Migrations)
4. Konfiguration erfassen (ENV-Variablen, Config-Dateien, Docker)
5. Authentifizierung/Rollen erkennen
6. Pruefen ob `docs/docgen-style.yaml` vorhanden ist

Ergebnis: Interne Uebersicht aller Features, Seiten, Rollen, Config-Optionen.

### Phase 2: Screenshot-Plan erstellen

Fuer jede identifizierte Seite/Route einen Screenshot-Eintrag planen:

```
Route: /dashboard
Dateiname: 01-dashboard.png
Beschreibung: Hauptuebersicht nach Login
Vorbedingung: Eingeloggt als Standardnutzer
```

Den Plan dem Nutzer zur Freigabe vorlegen, bevor Screenshots erstellt werden.

### Phase 3: Screenshots erstellen (Playwright MCP)

Detaillierter Ablauf: Siehe [references/screenshot-workflow.md](references/screenshot-workflow.md)

Zusammenfassung:
1. Browser oeffnen und zur App navigieren
2. Falls noetig: Login durchfuehren
3. Jede Seite aufrufen und Screenshot speichern
4. Screenshots in `docs/screenshots/` ablegen
5. Benennung: `NN-seitenname.png` (z.B. `01-dashboard.png`)

### Phase 4: User-Dokumentation schreiben

Template und Struktur: Siehe [references/templates.md](references/templates.md)

Quellen fuer User-Doku:
- UI-Komponenten, Formulare, Seiten
- Routen und Navigation
- Screenshots aus Phase 3
- README / vorhandene Doku

Ausgabedatei: `docs/USER-GUIDE.md`

### Phase 5: Admin-Dokumentation schreiben

Template und Struktur: Siehe [references/templates.md](references/templates.md)

Quellen fuer Admin-Doku:
- Docker/Docker-Compose Konfiguration
- ENV-Variablen (aus `.env.example`, Code-Referenzen)
- Datenbank-Schema und Migrations
- CI/CD-Pipelines
- Monitoring/Logging-Setup
- Backup/Restore-Verfahren (falls vorhanden)

Ausgabedatei: `docs/ADMIN-GUIDE.md`

### Phase 6: MkDocs-Site generieren (optional)

Nur ausfuehren wenn der Nutzer MkDocs-Ausgabe gewuenscht hat.
Details: Siehe [references/mkdocs-setup.md](references/mkdocs-setup.md)

Zusammenfassung:
1. `docs/mkdocs.yml` generieren (Material-Theme, Navigation, Suche)
2. Markdown-Dateien in `docs/mkdocs-src/` aufteilen (ein File pro Kapitel)
3. Falls Corporate Styling vorhanden: Farben/Logo in MkDocs-Config uebernehmen
4. Dem Nutzer `mkdocs serve` und `mkdocs build` Befehle zeigen

### Phase 7: Word-Export generieren (optional)

Nur ausfuehren wenn der Nutzer Word-Ausgabe gewuenscht hat.
Details: Siehe [references/word-export.md](references/word-export.md)

Zusammenfassung:
1. Pandoc-Befehl ausfuehren mit Reference-Doc fuer Styling
2. Falls `docs/docgen-style.yaml` vorhanden: Logo und Farben uebernehmen
3. Falls `docs/reference.docx` vorhanden: Als Style-Template verwenden
4. Ausgabe: `docs/USER-GUIDE.docx`, `docs/ADMIN-GUIDE.docx`

### Phase 8: Ergebnis praesentieren

Dem Nutzer eine Zusammenfassung zeigen:

| Dokument | Pfad | Format | Screenshots |
|----------|------|--------|-------------|
| User-Guide | `docs/USER-GUIDE.md` | Markdown | Y |
| Admin-Guide | `docs/ADMIN-GUIDE.md` | Markdown | - |
| User-Guide | `docs/USER-GUIDE.docx` | Word | Y |
| Admin-Guide | `docs/ADMIN-GUIDE.docx` | Word | - |
| MkDocs-Site | `docs/mkdocs-src/` | HTML | Y |

## Wichtige Regeln

- **Sprache**: Dokumentation in der Sprache schreiben, die der Nutzer verwendet
- **Screenshots**: Immer relative Pfade verwenden (`screenshots/01-dashboard.png`)
- **Keine Geheimnisse**: Niemals echte Passwoerter, API-Keys oder Secrets in die Doku schreiben
- **ENV-Variablen**: Nur Platzhalter zeigen (`DB_PASSWORD=<your-password>`)
- **Bestehende Doku**: Vorhandene `docs/` Dateien nicht ueberschreiben ohne Rueckfrage
- **Corporate Styling**: Wenn `docs/docgen-style.yaml` existiert, IMMER anwenden
