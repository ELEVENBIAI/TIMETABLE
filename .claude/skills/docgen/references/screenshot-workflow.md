# Screenshot-Workflow (Playwright MCP)

## Voraussetzungen

- Die Applikation muss lokal laufen (oder eine zugaengliche URL haben)
- Der Nutzer muss die Base-URL angeben (z.B. `http://localhost:3000`)
- Falls Login noetig: Zugangsdaten erfragen

## Schritt-fuer-Schritt

### 1. Verzeichnis vorbereiten

```bash
mkdir -p docs/screenshots
```

### 2. Browser starten und navigieren

```
mcp__playwright__browser_navigate → Base-URL aufrufen
```

### 3. Login (falls erforderlich)

```
mcp__playwright__browser_snapshot → Login-Formular identifizieren
mcp__playwright__browser_fill_form → Zugangsdaten eingeben
mcp__playwright__browser_click → Login-Button klicken
mcp__playwright__browser_wait_for → Warten bis Dashboard geladen
```

### 4. Fuer jede Seite im Screenshot-Plan

```
mcp__playwright__browser_navigate → Zur Seite navigieren
mcp__playwright__browser_wait_for → Warten bis Inhalt geladen
mcp__playwright__browser_resize → Viewport auf 1280x800 setzen (konsistente Screenshots)
mcp__playwright__browser_take_screenshot → Screenshot erstellen
```

Den Screenshot unter `docs/screenshots/NN-seitenname.png` speichern.

### 5. Spezialfaelle

**Modals/Dialoge**: Erst den Trigger-Button klicken, dann Screenshot.

```
mcp__playwright__browser_click → Modal oeffnen
mcp__playwright__browser_wait_for → Warten bis Modal sichtbar
mcp__playwright__browser_take_screenshot → Screenshot mit Modal
```

**Formulare**: Screenshot im leeren Zustand UND mit Beispieldaten.

**Dropdown-Menues**: Menu oeffnen, dann Screenshot.

**Responsive Ansichten** (optional):
```
mcp__playwright__browser_resize → 375x812 (Mobile)
mcp__playwright__browser_take_screenshot → Mobile-Screenshot
mcp__playwright__browser_resize → 1280x800 (zuruecksetzen)
```

### 6. Browser schliessen

```
mcp__playwright__browser_close
```

## Benennung

Format: `NN-beschreibung.png`

- `01-login.png`
- `02-dashboard.png`
- `03-settings-general.png`
- `04-settings-users.png`
- `05-modal-create-item.png`

Nummerierung entspricht der logischen Reihenfolge in der User-Doku.

## Tipps

- Vor jedem Screenshot 1-2 Sekunden warten (Animationen, Lazy-Loading)
- Viewport konsistent bei 1280x800 halten
- Dark-Mode vermeiden (sofern nicht explizit gewuenscht)
- Keine persoenlichen Daten in Screenshots — Testdaten verwenden
