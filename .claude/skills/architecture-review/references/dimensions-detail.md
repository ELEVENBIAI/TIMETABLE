# 8 Architektur-Dimensionen — Detail

## 1. Reliability
**Pruefen wenn:** Neuer Agent, neuer Daemon, neuer Trade-Pfad, externe API-Abhaengigkeit.
- Graceful Degradation: Laeuft das System weiter wenn dieses Feature ausfaellt?
- Kill-Switch: Kann das Feature per Config deaktiviert werden?
- Self-Healing: Braucht es einen neuen Check?
- Restart-Verhalten: flock-gesichert? PID-Tracking? Backoff?

## 2. Data Integrity
**Pruefen wenn:** Schreibzugriff auf Journal-Dateien, Brain DB, Signal-Files, Config.
- SSoT respektiert? Journal (JSONL) ist authoritative, Cache-Dateien sind abgeleitet
- Dual-Write: JSONL + Brain DB konsistent?
- Atomic Writes: write-then-rename bei kritischen Dateien?
- Race Conditions: Parallele Agents die gleiche Datei schreiben?

## 3. Security
**Pruefen wenn:** Neue API, neuer Webhook-Endpoint, externer Input, neue .env-Variable.
- API-Keys nur in .env, nie im Code oder in Logs
- Input-Validation bei Webhooks (HMAC, Replay-Schutz, Size-Limit)
- Token-Sanitization in Error-Logs (keine Keys, Tokens, Session-IDs)
- Rate-Limiting bei eingehenden Requests

## 4. Performance
**Pruefen wenn:** Neue API mit Rate Limits, WebSocket-Verbindung, Memory-intensive Ops.
- Rate Limits: Dokumentiert und eingehalten? Buffer eingeplant?
- Signal-Latenz: Fast-Tier (5min), Daemon (30s) — passt das Feature?
- Memory: Node.js Heap bei Long-Running Daemons (MAX_TRADES, Buffer-Limits)
- WebSocket: Reconnect-Logik? Heartbeat? Cleanup bei Shutdown?

## 5. Observability
**Pruefen wenn:** Jedes Feature das stumm fehlschlagen koennte.
- Logging: Sinnvolle Log-Level? Kein Raw-API-Response Logging (Key-Leak)?
- Telegram-Alert: Bei Fehlern die den Operator betreffen?
- Dashboard: Neuer API-Endpoint noetig?
- Self-Healing: Neuer Check noetig?

## 6. Maintainability
**Pruefen bei:** Jeder Aenderung.
- Code-Duplikation: Gibt es schon eine aehnliche Funktion?
- Config-SSoT: Alle Konstanten in config.js? Keine Hardcodes?
- Dokumentation: Welche Docs muessen aktualisiert werden?
- Verstaendlichkeit: Versteht man den Code ohne Zusatzkontext?

## 7. Cost Efficiency
**Pruefen wenn:** Neue API mit Kosten, LLM-Aufrufe, neue Dependencies.
- API-Kosten: Free Tier ausreichend? Kosten bei Produktionslast?
- LLM-Token: Ist ein LLM noetig oder reicht regelbasiert?
- Alternativen: Gibt es eine kostenlose Alternative?
- Daily-Limit: Max-Calls pro Tag definiert?

## 8. Signal Quality
**Pruefen wenn:** Neuer Signal-Agent, geaenderte Gewichtung, neue Datenquelle.
- Trade-Verbesserung: Verbessert das die Entscheidungsqualitaet messbar?
- Gewichtung: Passt das Weight im Supervisor? (AGENT_WEIGHTS Summe = 1.0)
- Feedback-Loop: Attribution + Learning Agent koennen den Impact messen?
- Correlation: Korreliert der neue Agent stark mit bestehenden? (Redundanz)
