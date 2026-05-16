# 8 Architektur-Dimensionen

Bei jeder Story die relevanten Dimensionen pruefen. Nicht alle sind immer zutreffend — nur die anwenden die fuer die konkrete Aenderung relevant sind.

## 1. Reliability
- Kann das Feature ausfallen ohne das System zu blockieren?
- Graceful Degradation implementiert?
- Self-Healing-Check noetig?
- Kill-Switch vorhanden fuer neue Features?

## 2. Data Integrity
- SSoT (authoritative Datei/Tabelle) korrekt beschrieben?
- Dual-Write (JSONL + Brain DB) beruecksichtigt?
- Race Conditions bei parallelen Agents?
- Atomic Writes wo noetig?

## 3. Security
- API-Keys in .env, nicht im Code?
- Inputs validiert (Webhooks, externe APIs)?
- Tokens sanitized in Logs?
- Webhook-Signierung wo relevant?

## 4. Performance
- Signal-Latenz akzeptabel? (Fast: 5min, Daemon: 30s)
- Rate Limits eingehalten und dokumentiert?
- Memory-Verbrauch im Rahmen? (Node.js Heap)
- WebSocket-Stabilitaet bei Daemons?

## 5. Observability
- Logging implementiert?
- Alert bei Fehler?
- Dashboard-Integration noetig?
- Self-Healing-Check noetig?

## 6. Maintainability
- Code-Duplikation vermieden?
- Config in SSoT?
- Doku muss aktualisiert werden?
- Verstaendlich ohne zusaetzlichen Kontext?

## 7. Cost Efficiency
- API-Kosten kalkuliert?
- LLM-Token-Verbrauch beruecksichtigt?
- Kostenlose Alternative verfuegbar?
- Rate-Limit-Budget nicht ueberschritten?

## 8. Signal Quality
- Verbessert das die Entscheidungsqualitaet?
- Gewichtung im Supervisor sinnvoll?
- Feedback-Loop vorhanden (Attribution, Learning)?
- Contrarian vs. Consensus Logik klar?
