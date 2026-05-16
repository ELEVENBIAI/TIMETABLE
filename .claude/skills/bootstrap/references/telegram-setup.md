# Telegram Setup — Bot-Alerts + Linear-Webhook-Integration

> **Zweck:** Telegram dient als Echtzeit-Alert-Kanal fuer Self-Healing-Meldungen, Incident-Alerts
> und optionale Linear-Webhook-Notifications. Kein MCP-Server — Calls laufen direkt via
> Telegram Bot API aus `agents/self-healing.js` und `lib/telegram.js`.

---

## Uebersicht: Was kann Telegram machen?

| Funktion | Wie | Wann |
|---------|-----|------|
| Self-Healing Alerts | `agents/self-healing.js` → Bot API | Bei Check-Fehler |
| Incident-Meldungen | `/breakfix` Skill → Bot API | Bei Incident-Open |
| Linear-Webhook Notifications | Webhook → Server-Endpoint → Bot API | Bei Issue-Status-Aenderung |
| Manuelle Test-Nachrichten | `node -e "..."` | Debug / Setup-Test |

---

## Teil 1: Telegram Bot erstellen (BotFather)

### Schritt 1 — BotFather oeffnen

In Telegram: Suche nach `@BotFather` → Chat oeffnen.

### Schritt 2 — Neuen Bot erstellen

```
/newbot
```

BotFather fragt:
1. **Name des Bots** (Anzeigename, z.B. "MyProject Alerts")
2. **Username** (muss auf `bot` enden, z.B. `myproject_alerts_bot`)

Nach erfolgreicher Erstellung gibt BotFather aus:
```
Done! Congratulations on your new bot. You will find it at t.me/myproject_alerts_bot.
Use this token to access the HTTP API:
7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Keep your token secure and store it safely.
```

**Diesen Token sofort in `.env` eintragen:**
```
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Schritt 3 — Bot-Token validieren

```bash
curl -s "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getMe" \
  | jq '.result | {username, first_name}'
```

Erwartet:
```json
{
  "username": "myproject_alerts_bot",
  "first_name": "MyProject Alerts"
}
```

---

## Teil 2: Chat-ID ermitteln

Der Bot muss wissen, an wen er schreibt. Dazu brauchen wir die Chat-ID.

### Option A — Persoenlicher Chat (empfohlen fuer Einzel-Operator)

**Schritt 1:** Im Telegram den eigenen Bot suchen und `/start` schicken.

**Schritt 2:** Nachrichten abrufen:
```bash
curl -s "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getUpdates" \
  | jq '.result[].message | {chat_id: .chat.id, from: .from.username}'
```

Erwartet:
```json
{
  "chat_id": 123456789,
  "from": "dein_username"
}
```

**Chat-ID in `.env` eintragen:**
```
TELEGRAM_CHAT_ID=123456789
```

### Option B — Gruppen-Chat (fuer Teams)

**Schritt 1:** Gruppe in Telegram anlegen (z.B. "MyProject Alerts").

**Schritt 2:** Bot zur Gruppe hinzufuegen (Bot-Username in Gruppen-Mitglieder suchen).

**Schritt 3:** Irgendjemand schreibt eine Nachricht in die Gruppe.

**Schritt 4:** Updates abrufen — die Chat-ID der Gruppe ist negativ:
```bash
curl -s "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getUpdates" \
  | jq '.result[].message | {chat_id: .chat.id, chat_title: .chat.title}'
```

Erwartet:
```json
{
  "chat_id": -100123456789,
  "chat_title": "MyProject Alerts"
}
```

---

## Teil 3: Erste Test-Nachricht senden

```bash
curl -s -X POST \
  "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": $(grep TELEGRAM_CHAT_ID .env | cut -d= -f2),
    \"text\": \"✅ Bootstrap Test — Telegram Alert funktioniert!\",
    \"parse_mode\": \"Markdown\"
  }" | jq '.ok'
```

Erwartet: `true`

Wenn `false`: Token oder Chat-ID pruefen.

---

## Teil 4: Self-Healing Integration

In `agents/self-healing.js` den Telegram-Alert aktivieren:

```javascript
// In self-healing.js — Telegram Alert Funktion
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return; // Skip wenn nicht konfiguriert
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error('[Telegram] Alert failed:', err.message);
    // NIEMALS throw — Alert-Fehler soll Self-Healing nicht stoppen
  }
}

// Aufruf bei Check-Fehler:
await sendTelegramAlert(`🔴 *Self-Healing Alert*\nCheck: ${checkName}\nFehler: ${errorMessage}`);
```

**WICHTIG:** Telegram-Calls immer mit `await` — nie fire-and-forget in kurzlebigen Prozessen.

---

## Teil 5: Linear-Webhook-Integration (optional)

Wenn Issue-Status-Aenderungen in Telegram erscheinen sollen (z.B. "Issue PROJ-42 → Done").

### Schritt 1 — Webhook-Endpoint im Projekt erstellen

Erstelle `agents/linear-webhook.js`:

```javascript
'use strict';
const http    = require('http');
const crypto  = require('crypto');

const PORT   = process.env.LINEAR_WEBHOOK_PORT || 3456;
const SECRET = process.env.LINEAR_WEBHOOK_SECRET;
const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHAT   = process.env.TELEGRAM_CHAT_ID;

function verifySignature(body, signature) {
  if (!SECRET) return true; // Skip wenn kein Secret konfiguriert
  const hash = crypto.createHmac('sha256', SECRET).update(body).digest('hex');
  return signature === hash;
}

async function notifyTelegram(text) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT, text, parse_mode: 'Markdown' })
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/webhook/linear') {
    res.writeHead(404); res.end(); return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    const sig = req.headers['linear-signature'];
    if (!verifySignature(body, sig)) {
      res.writeHead(401); res.end('Unauthorized'); return;
    }

    const payload = JSON.parse(body);
    const { action, data, type } = payload;

    // Issue-Status-Aenderung → Telegram
    if (type === 'Issue' && action === 'update' && data?.state?.name) {
      const msg = `📋 *Linear Update*\n` +
        `Issue: *${data.identifier}* — ${data.title}\n` +
        `Status: → *${data.state.name}*`;
      await notifyTelegram(msg);
    }

    res.writeHead(200); res.end('OK');
  });
});

server.listen(PORT, () => console.log(`[LinearWebhook] Listening on :${PORT}`));
```

### Schritt 2 — Webhook in Linear konfigurieren

1. Linear → Settings → API → Webhooks → "New Webhook"
2. **URL:** `https://{DEINE_VPS_IP}:{PORT}/webhook/linear`
   - Fuer lokale Entwicklung: ngrok oder Cloudflare Tunnel nutzen
3. **Events aktivieren:** `Issue` (created, updated)
4. **Secret generieren** (beliebiger String) → in `.env` als `LINEAR_WEBHOOK_SECRET=...`

```
LINEAR_WEBHOOK_PORT=3456
LINEAR_WEBHOOK_SECRET=ein_zufaelliger_geheimer_string
```

### Schritt 3 — Webhook-Server starten

```bash
node agents/linear-webhook.js &
echo $! > .linear-webhook.pid
```

Fuer Produktivbetrieb: systemd-Service (wie obsidian-headless in `bootstrap/SKILL.md`).

### Schritt 4 — Webhook-Verbindung testen

In Linear: Ein Issue-Status aendern → Telegram-Nachricht sollte erscheinen.

Oder manuellen Test-Call:
```bash
curl -s -X POST http://localhost:3456/webhook/linear \
  -H "Content-Type: application/json" \
  -d '{"type":"Issue","action":"update","data":{"identifier":"PROJ-1","title":"Test Issue","state":{"name":"Done"}}}' \
  | cat
```

Erwartet: `OK` + Telegram-Nachricht erscheint.

---

## Zusammenfassung: Checkliste

```
[ ] BotFather → /newbot → Token notiert
[ ] TELEGRAM_BOT_TOKEN in .env eingetragen
[ ] /start im Bot-Chat gesendet
[ ] Chat-ID via getUpdates ermittelt
[ ] TELEGRAM_CHAT_ID in .env eingetragen
[ ] Test-Nachricht erfolgreich gesendet (jq .ok = true)
[ ] self-healing.js mit sendTelegramAlert() integriert
[ ] (optional) linear-webhook.js erstellt + Linear-Webhook konfiguriert
[ ] (optional) LINEAR_WEBHOOK_SECRET in .env + in Linear hinterlegt
```

---

## Haeufige Fehler

| Fehler | Ursache | Loesung |
|--------|---------|---------|
| `{"ok":false,"error_code":404}` | Falscher Token | Token in BotFather pruefen: `/mybots` |
| `{"ok":false,"error_code":400,"description":"chat not found"}` | Bot hat Gruppe noch nicht gesehen | `/start` im Chat, dann erneut testen |
| Webhook kommt nicht an | Firewall blockiert Port | Port im VPS-Panel oeffnen |
| Doppelte Nachrichten | Webhook mehrfach registriert | In Linear alte Webhooks loeschen |
| `getUpdates` liefert leere Liste | Bot hat keine Nachrichten empfangen | `/start` erneut schicken |
