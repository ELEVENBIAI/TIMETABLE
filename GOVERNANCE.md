# Timetable — Governance

**Version:** 0.6.2 | **Stand:** 2026-05-17

## Entwicklungs-Workflow

### 1. Issue anlegen (Linear)

- Projekt: ELEVENBI (`https://linear.app/elevenbi/`)
- Prefix: `ELE-`
- Pflicht-Labels: mind. 1 Label pro Issue
- Status-Flow: Backlog → In Progress → Done (kein Direktsprung)

### 2. Spec-File anlegen

Vor **jeder** Code-Änderung:

```
specs/ELE-XXX.md  ← aus specs/TEMPLATE.md erstellen
```

Pflichtfelder: Agent-Pattern, Why, What, Constraints, Tasks, Acceptance Criteria.

### 3. Agent-Pattern wählen

| Pattern            | Wann                                        |
| ------------------ | ------------------------------------------- |
| Solo               | 1 abgegrenzte Story, <5 Dateien             |
| Subagent           | Isolierter Task / Recherche                 |
| Agent-Team         | >3 unabhängige Tasks ODER unklare Ursache   |
| Parallel-Subagents | Mehrere unabhängige Recherchen gleichzeitig |

### 4. Implementieren

- Alle Änderungen durch TypeScript-Types abgesichert
- Zod-Validierung für alle API-Inputs
- Keine Hardcoded Values — alles über `lib/config.js`
- Keine Secrets in Code oder Logs

### 5. T_last — Dokumentation

Letzter Task **jeder** Story:

- [ ] `ARCHITECTURE_DESIGN.md §9` um neue Dateien ergänzen
- [ ] `INDEX.md` aktualisieren
- [ ] `COMPONENT_INVENTORY.md` aktualisieren
- [ ] `CHANGELOG.md` Eintrag
- [ ] `config.js` VERSION bumpen
- [ ] Alle DOC_FILES auf neue VERSION setzen
- [ ] Obsidian Component-Doc updaten (T_last)

### 6. Commit + Push

```bash
git add <spezifische-dateien>
git commit -m "feat: ELE-XXX — <Beschreibung>"
git push
```

## Aktivierte Add-ons

### Privacy / DSGVO

- Mitarbeiterdaten (Namen, Zeitpläne) sind personenbezogen gem. Art. 4 DSGVO
- Datenminimierung: Nur notwendige Felder speichern
- Zugriffsprotokoll für Mitarbeiterdaten-Zugriffe
- Löschkonzept: Daten auf Anfrage vollständig entfernbar
- Keine Weitergabe an Dritte ohne Einwilligung

### Cost Efficiency

- LLM-Aufrufe nur wenn notwendig (kein AI-Overkill)
- Datenbankabfragen optimieren (Indexes, Pagination)
- Caching-Strategie vor Skalierung evaluieren

### Signal Quality

- Planungsqualität messbar machen: Soll vs. Ist-Stunden
- Abweichungsreports nach Sprint-Review
- KPIs definieren bevor gemessen wird

## JWT-Secret-Rotation (ELE-188 / ADR-18)

Multi-Secret-Strategie: `JWT_SECRET` (primary, sign+verify) + `JWT_SECRET_PREVIOUS`
(verify-only, 7d Übergangszeit). Details: `docs/ADR-18-jwt-secret-rotation.md`.

### Szenario A — Geplante Rotation (alle 90 Tage)

1. **Skript ausführen:**
   ```bash
   node scripts/rotate-jwt-secret.mjs --dry-run    # Plan ansehen
   node scripts/rotate-jwt-secret.mjs --apply       # Rotation durchführen
   ```
2. **Backend neustarten** — neue Tokens werden mit dem neuen Secret signiert.
3. **Bestehende User:** bleiben eingeloggt — ihre alten Tokens verifizieren über
   `JWT_SECRET_PREVIOUS`, neue Logins/Refreshes nutzen das neue primary.
4. **Cleanup-Termin notieren:** in 7 Tagen `JWT_SECRET_PREVIOUS` aus `.env`
   entfernen + Backend neustarten. Skript schreibt den Termin in stdout.

### Szenario B — Notfall-Rotation (Verdacht auf Leak)

1. **Skript sofort ausführen:** `node scripts/rotate-jwt-secret.mjs --apply`
2. **Backend neustarten.**
3. **Force-Logout aller User** (manuelle SQL — Notbremse):
   ```sql
   UPDATE users SET must_change_password = TRUE, last_login_at = NULL
     WHERE is_deleted = FALSE;
   ```
   → Beim nächsten Request müssen alle ihr Passwort neu setzen. Effekt: alte
   Tokens werden zwar noch verifiziert, aber `must_change_password` zwingt den
   Forced-Change-Flow vor jeder Aktion.
4. **Cleanup-Termin:** Bei Notfall **24h** statt 7 Tage — Geheimnis nicht
   länger als nötig in `.env` halten.
5. **Audit-Log prüfen:** Wer hat in den letzten 30 Tagen welche Endpoints
   genutzt? `/settings/audit-trail` als ADMIN.

### Szenario C — Cleanup nach 7 Tagen

1. `.env` editieren: `JWT_SECRET_PREVIOUS=` (leer setzen oder Zeile löschen).
2. Backend neustarten.
3. Alle Tokens, die mit dem alten Secret signiert wurden, werden ab jetzt
   abgelehnt → betroffene User loggen sich neu ein.

### .env-Sicherheit

- Dateirechte 600 (`chmod 600 .env` auf Linux)
- `.env*.bak`-Backups gehören in `.gitignore`
- Niemals Secrets in Chat, Pull-Request-Beschreibungen oder Issues schreiben
