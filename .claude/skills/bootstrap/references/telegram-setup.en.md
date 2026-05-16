# Telegram setup — bot alerts + Linear webhook integration

> **Purpose:** Telegram is used as a real-time alert channel for self-healing messages,
> incident alerts, and optional Linear webhook notifications. No MCP server — calls run
> directly via the Telegram Bot API from `agents/self-healing.js` and `lib/telegram.js`.

---

## Overview: what can Telegram do?

| Function | How | When |
|----------|-----|------|
| Self-healing alerts | `agents/self-healing.js` → Bot API | On check failure |
| Incident notifications | `/breakfix` skill → Bot API | On incident open |
| Linear webhook notifications | Webhook → server endpoint → Bot API | On issue-status change |
| Manual test messages | `node -e "..."` | Debug / setup test |

---

## Part 1: Create a Telegram bot (BotFather)

### Step 1 — open BotFather

In Telegram: search for `@BotFather` → open chat.

### Step 2 — create a new bot

```
/newbot
```

BotFather asks:
1. **Bot name** (display name, e.g. "MyProject Alerts")
2. **Username** (must end in `bot`, e.g. `myproject_alerts_bot`)

After successful creation, BotFather returns:
```
Done! Congratulations on your new bot. You will find it at t.me/myproject_alerts_bot.
Use this token to access the HTTP API:
7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Keep your token secure and store it safely.
```

**Immediately enter this token in `.env`:**
```
TELEGRAM_BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3 — validate the bot token

```bash
curl -s "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getMe" \
  | jq '.result | {username, first_name}'
```

Expected:
```json
{
  "username": "myproject_alerts_bot",
  "first_name": "MyProject Alerts"
}
```

---

## Part 2: Obtain the chat ID

The bot needs to know who to write to. For this we need the chat ID.

### Option A — personal chat (recommended for single operator)

**Step 1:** in Telegram, find your own bot and send `/start`.

**Step 2:** fetch updates:
```bash
curl -s "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getUpdates" \
  | jq '.result[].message | {chat_id: .chat.id, from: .from.username}'
```

Expected:
```json
{
  "chat_id": 123456789,
  "from": "your_username"
}
```

**Add chat ID to `.env`:**
```
TELEGRAM_CHAT_ID=123456789
```

### Option B — group chat (for teams)

**Step 1:** create a group in Telegram (e.g. "MyProject Alerts").

**Step 2:** add the bot to the group (search for bot username in group members).

**Step 3:** someone writes a message in the group.

**Step 4:** fetch updates — the chat ID of the group is negative:
```bash
curl -s "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/getUpdates" \
  | jq '.result[].message | {chat_id: .chat.id, chat_title: .chat.title}'
```

Expected:
```json
{
  "chat_id": -100123456789,
  "chat_title": "MyProject Alerts"
}
```

---

## Part 3: Send the first test message

```bash
curl -s -X POST \
  "https://api.telegram.org/bot$(grep TELEGRAM_BOT_TOKEN .env | cut -d= -f2)/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{
    \"chat_id\": $(grep TELEGRAM_CHAT_ID .env | cut -d= -f2),
    \"text\": \"✅ Bootstrap test — Telegram alert works!\",
    \"parse_mode\": \"Markdown\"
  }" | jq '.ok'
```

Expected: `true`

If `false`: check the token or chat ID.

---

## Part 4: Self-healing integration

In `agents/self-healing.js` activate the Telegram alert:

```javascript
// In self-healing.js — Telegram alert function
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

async function sendTelegramAlert(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return; // skip if not configured
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
    // NEVER throw — alert failure must not stop self-healing
  }
}

// Call on check failure:
await sendTelegramAlert(`🔴 *Self-healing alert*\nCheck: ${checkName}\nError: ${errorMessage}`);
```

**IMPORTANT:** always `await` Telegram calls — never fire-and-forget in short-lived processes.

---

## Part 5: Linear webhook integration (optional)

When issue-status changes should appear in Telegram (e.g. "Issue PROJ-42 → Done").

### Step 1 — create the webhook endpoint in the project

Create `agents/linear-webhook.js`:

```javascript
'use strict';
const http    = require('http');
const crypto  = require('crypto');

const PORT   = process.env.LINEAR_WEBHOOK_PORT || 3456;
const SECRET = process.env.LINEAR_WEBHOOK_SECRET;
const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHAT   = process.env.TELEGRAM_CHAT_ID;

function verifySignature(body, signature) {
  if (!SECRET) return true; // skip if no secret configured
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

    // Issue status change → Telegram
    if (type === 'Issue' && action === 'update' && data?.state?.name) {
      const msg = `📋 *Linear update*\n` +
        `Issue: *${data.identifier}* — ${data.title}\n` +
        `Status: → *${data.state.name}*`;
      await notifyTelegram(msg);
    }

    res.writeHead(200); res.end('OK');
  });
});

server.listen(PORT, () => console.log(`[LinearWebhook] Listening on :${PORT}`));
```

### Step 2 — configure webhook in Linear

1. Linear → Settings → API → Webhooks → "New Webhook"
2. **URL:** `https://{YOUR_VPS_IP}:{PORT}/webhook/linear`
   - For local development: use ngrok or Cloudflare Tunnel
3. **Enable events:** `Issue` (created, updated)
4. **Generate secret** (any string) → add to `.env` as `LINEAR_WEBHOOK_SECRET=...`

```
LINEAR_WEBHOOK_PORT=3456
LINEAR_WEBHOOK_SECRET=a_random_secret_string
```

### Step 3 — start the webhook server

```bash
node agents/linear-webhook.js &
echo $! > .linear-webhook.pid
```

For production: systemd service (like obsidian-headless in `bootstrap/SKILL.md`).

### Step 4 — test the webhook connection

In Linear: change an issue status → Telegram message should appear.

Or a manual test call:
```bash
curl -s -X POST http://localhost:3456/webhook/linear \
  -H "Content-Type: application/json" \
  -d '{"type":"Issue","action":"update","data":{"identifier":"PROJ-1","title":"Test Issue","state":{"name":"Done"}}}' \
  | cat
```

Expected: `OK` + Telegram message appears.

---

## Summary: checklist

```
[ ] BotFather → /newbot → token noted
[ ] TELEGRAM_BOT_TOKEN entered in .env
[ ] /start sent in bot chat
[ ] Chat ID obtained via getUpdates
[ ] TELEGRAM_CHAT_ID entered in .env
[ ] Test message sent successfully (jq .ok = true)
[ ] self-healing.js integrated with sendTelegramAlert()
[ ] (optional) linear-webhook.js created + Linear webhook configured
[ ] (optional) LINEAR_WEBHOOK_SECRET in .env + registered in Linear
```

---

## Common errors

| Error | Cause | Fix |
|-------|-------|-----|
| `{"ok":false,"error_code":404}` | Wrong token | Check token in BotFather: `/mybots` |
| `{"ok":false,"error_code":400,"description":"chat not found"}` | Bot hasn't seen the group yet | `/start` in chat, retry |
| Webhook doesn't arrive | Firewall blocks port | Open port in VPS panel |
| Duplicate messages | Webhook registered multiple times | Delete old webhooks in Linear |
| `getUpdates` returns empty list | Bot received no messages | Send `/start` again |
