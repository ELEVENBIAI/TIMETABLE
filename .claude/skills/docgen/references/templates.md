# Dokumentations-Templates

## User-Guide Template

```markdown
# [App-Name] — Benutzerhandbuch

## Uebersicht

[1-2 Saetze: Was die App tut und fuer wen sie gedacht ist]

## Erste Schritte

### Anmeldung

[Login-Prozess beschreiben]

![Login-Seite](screenshots/01-login.png)

### Dashboard

[Dashboard-Uebersicht beschreiben]

![Dashboard](screenshots/02-dashboard.png)

## Funktionen

### [Funktion 1]

[Beschreibung: Was die Funktion tut]

**So geht's:**

1. Schritt 1 — [Beschreibung]
2. Schritt 2 — [Beschreibung]
3. Schritt 3 — [Beschreibung]

![Funktion 1](screenshots/03-funktion-1.png)

> **Tipp:** [Nuetzlicher Hinweis fuer den Nutzer]

### [Funktion 2]

[Gleiche Struktur wie oben]

## Haeufige Fragen (FAQ)

### Wie kann ich mein Passwort aendern?

[Antwort]

### [Weitere Fragen]

[Antwort]
```

### Richtlinien fuer User-Guide

- Einfache Sprache, keine technischen Fachbegriffe
- Jede Funktion mit Screenshot illustrieren
- Schritt-fuer-Schritt-Anleitungen fuer alle Workflows
- Tipps und Hinweise in Blockquotes
- FAQ-Bereich am Ende fuer haeufige Fragen
- Zielgruppe: Endanwender ohne technisches Wissen

---

## Admin-Guide Template

```markdown
# [App-Name] — Administrationshandbuch

## Systemvoraussetzungen

| Komponente | Minimum | Empfohlen |
|-----------|---------|-----------|
| OS | [z.B. Ubuntu 22.04] | [z.B. Ubuntu 24.04] |
| RAM | [z.B. 2 GB] | [z.B. 4 GB] |
| Disk | [z.B. 10 GB] | [z.B. 20 GB] |
| [Runtime] | [z.B. Node 18] | [z.B. Node 22] |

## Installation

### Schnellstart (Docker)

\`\`\`bash
git clone <repo-url>
cd <project>
cp .env.example .env
# .env anpassen (siehe Konfiguration)
docker compose up -d
\`\`\`

### Manuelle Installation

1. Repository klonen
2. Dependencies installieren
3. Datenbank einrichten
4. Konfiguration anpassen
5. App starten

## Konfiguration

### Umgebungsvariablen

| Variable | Beschreibung | Standard | Pflicht |
|----------|-------------|----------|---------|
| `DATABASE_URL` | DB-Verbindungsstring | — | Ja |
| `PORT` | Server-Port | `3000` | Nein |
| `SECRET_KEY` | JWT/Session-Secret | — | Ja |

> **Sicherheitshinweis:** `SECRET_KEY` muss ein zufaelliger, langer String sein.
> Generieren mit: `openssl rand -hex 32`

### [Weitere Config-Bereiche]

## Datenbank

### Schema-Uebersicht

[Wichtigste Tabellen/Collections und ihre Beziehungen]

### Migrationen

\`\`\`bash
[Migrations-Befehl]
\`\`\`

### Backup & Restore

\`\`\`bash
# Backup
[Backup-Befehl]

# Restore
[Restore-Befehl]
\`\`\`

## Betrieb

### Starten / Stoppen

\`\`\`bash
# Starten
[Start-Befehl]

# Stoppen
[Stop-Befehl]

# Neustart
[Restart-Befehl]
\`\`\`

### Logs

\`\`\`bash
[Log-Befehl]
\`\`\`

### Health-Check

\`\`\`bash
[Health-Check-Befehl oder URL]
\`\`\`

### Monitoring

[Monitoring-Setup beschreiben, falls vorhanden]

## Updates

\`\`\`bash
# 1. Backup erstellen
[Backup-Befehl]

# 2. Update holen
git pull origin main

# 3. Dependencies aktualisieren
[Install-Befehl]

# 4. Migrationen ausfuehren
[Migration-Befehl]

# 5. Neustart
[Restart-Befehl]
\`\`\`

## Troubleshooting

### [Problem 1]

**Symptom:** [Was der Nutzer sieht]
**Ursache:** [Warum es passiert]
**Loesung:** [Was zu tun ist]

### [Problem 2]

[Gleiche Struktur]

## Sicherheit

- [ ] HTTPS konfiguriert
- [ ] Firewall-Regeln gesetzt
- [ ] SECRET_KEY generiert
- [ ] Standard-Passwoerter geaendert
- [ ] Backup-Routine eingerichtet
```

### Richtlinien fuer Admin-Guide

- Technisch praezise, mit Copy-Paste-faehigen Befehlen
- Alle ENV-Variablen dokumentieren (nie echte Werte!)
- Backup/Restore immer einbeziehen
- Troubleshooting-Bereich mit konkreten Symptom/Loesung-Paaren
- Sicherheits-Checkliste am Ende
- Zielgruppe: DevOps/Admins mit Linux/Docker-Kenntnissen
