# Aenderungs-Checkliste

PFLICHT bei jeder Code-Aenderung, egal wie klein.

## 1. Dokumentation aktualisieren — Layer-Impact-Map

**Schritt:** Welche Layer/Komponenten wurden geaendert? → Entsprechende Docs pruefen.

| Geaenderter Bereich | Docs die IMMER geprueft werden muessen |
|---------------------|----------------------------------------|
| **L1 Signal-Agent** (neu/geaendert/entfernt) | `SIGNAL_SOURCES_INVENTORY.md`, `COMPONENT_INVENTORY.md`, `CLAUDE.md §9`, `SYSTEM_ARCHITECTURE.md` Agent-Tabelle |
| **L2 Scoring/Supervisor** (Gewichte, Score-Logik, Veto) | `docs/SUPERVISOR_DECISION_LOGIC.md`, `TRADING_RULES.md`, `CLAUDE.md §7` |
| **L3 LLM/Arbiter** (Debate, Risk Manager, LLM-Calls) | `docs/SUPERVISOR_DECISION_LOGIC.md`, `CLAUDE.md §3` |
| **L4 Execution** (trader, adapters, router, pool) | `ARCHITECTURE_DESIGN.md`, `COMPONENT_INVENTORY.md`, `SECURITY.md`, `docs/TRADE_LIFECYCLE.md` |
| **L5 Monitoring/Self-Healing** (neuer Check, Schwellwert) | `CLAUDE.md §13`, `SYSTEM_ARCHITECTURE.md` Self-Healing Tabelle |
| **L6 Brain-DB** (neue Tabelle, Schema-Version, Writer) | Spezial-Checkliste unten: "Brain DB aendern" |
| **L7 Presentation** (Dashboard, Telegram, Briefing) | Messaging-Doku, Dashboard-Doku |
| **Config / Kill-Switch** | `docs/KILL_SWITCHES.md`, `CLAUDE.md §6` |
| **Neuer ADR** | `ARCHITECTURE_DESIGN.md §3`, `INDEX.md`, ggf. neues Guard-Story-Kandidat pruefen |
| **Neue API-Integration** | `API_INVENTORY.md`, `SECURITY.md`, Spezial-Checkliste unten: "Neue API" |
| **Neue externe Datenquelle** | `SIGNAL_SOURCES_INVENTORY.md`, `API_INVENTORY.md`, ADR-Klassifikation (Composite vs. Standalone) |

**Immer gilt:**
- Alle geaenderten Docs auf aktuelle `VERSION` in config.js bringen
- `CHANGELOG.md` Eintrag mit Version + Beschreibung
- `CLAUDE.md` wenn Systemverhalten sich aendert (neue Pfade, neue Kill-Switches, neue Thresholds)

---

## 2. Git Commit + Push

- Code UND Doku-Aenderungen committen
- Pro Task: `git commit -m "T{N}: [STORY-XXX] — [Titel]"`

---

## 3. Obsidian Change-Log

- `linear.writeChangeLog()` mit Version + Beschreibung

---

## Spezial-Checklisten

### Agent hinzufuegen/entfernen:
- [ ] config.js → `AGENT_REGISTRY` (einzige SSoT — Weights/SignalFiles/Daemon-Restart werden abgeleitet)
- [ ] run-parallel.sh → Tier-Liste (FAST/MEDIUM/SLOW) falls nicht ueber AGENT_REGISTRY
- [ ] CLAUDE.md → Agent-Tabelle
- [ ] Signal-Datei initial erstellen
- [ ] SIGNAL_SOURCES_INVENTORY.md Eintrag
- [ ] COMPONENT_INVENTORY.md Eintrag

### Gewichte aendern:
- [ ] Summe aller AGENT_WEIGHTS = 1.00 (exakt)
- [ ] optimized-weights.json loeschen/resetten
- [ ] Weight-Optimizer Constraints pruefen
- [ ] ADR-Klassifikation pruefen (Composite vs. Standalone, kein Double-Counting)

### Trade-Logik aendern:
- [ ] config.js Thresholds (TEST_MODE vs PRODUCTION)
- [ ] trader.js importiert aus config.js (keine Hardcodes)
- [ ] SL/TP Ranges in config.js
- [ ] docs/TRADE_LIFECYCLE.md aktualisieren
- [ ] TRADING_RULES.md aktualisieren
- [ ] CLAUDE.md Regelwerk aktualisieren

### Neue API integrieren:
- [ ] Rate Limiting implementieren
- [ ] API-Key in .env eintragen (NICHT im Code)
- [ ] config.js: ENV-Variable sauber einbinden
- [ ] Error-Logging: Keys sanitizen (keine Secrets in Logs)
- [ ] Timeout setzen (max 15s kritisch, 60s Research)
- [ ] Fallback bei API-Ausfall (Graceful Degradation)
- [ ] API_INVENTORY.md aktualisieren
- [ ] SECURITY.md relevante Sektionen aktualisieren

### Neuen ADR hinzufuegen:
- [ ] ARCHITECTURE_DESIGN.md §3 neuer ADR-Block
- [ ] INDEX.md Referenz pruefen
- [ ] Enforcement-Frage stellen: "Ist dieser Entscheid maschinell erzwungen oder nur dokumentiert?"
  - Nur dokumentiert → Guard-Story-Kandidat pruefen (Self-Healing Check? Commit-Hook?)
- [ ] CHANGELOG.md Eintrag

### Brain DB aendern (neue Tabelle, neuer Writer, neuer Reader):
- [ ] Writer-Tabelle in SYSTEM_ARCHITECTURE.md §9.2.1 ergaenzen
- [ ] Reader-Tabelle in SYSTEM_ARCHITECTURE.md §9.2.2 ergaenzen
- [ ] Impact-Matrix pruefen/aktualisieren
- [ ] Bei neuer Tabelle: Migration in DB-Modul (naechste Schema-Version)
- [ ] Bei neuer Tabelle: `getHealth()` Tabellen-Array erweitern
- [ ] Bei neuer Tabelle: `DOCUMENTED_TABLES` in Self-Healing erweitern
- [ ] Bei neuem Writer: Dedup-Strategie (INSERT OR IGNORE / UNIQUE INDEX)
- [ ] Schema-Version in SYSTEM_ARCHITECTURE.md aktualisieren

### Security-Feature aendern:
- [ ] SECURITY.md relevante Sektion aktualisieren
- [ ] Threat-Response-Matrix pruefen
- [ ] Bei neuem Inbound Webhook: HMAC-SHA256 Pflicht, Replay-Schutz, Rate-Limit, Body-Limit

### Governance, Skills oder Checklisten aendern:
- [ ] RUNBOOK.md aktualisieren (betroffene Sektion synchronisieren)
- [ ] Betrifft: GOVERNANCE.md, .claude/skills/*/SKILL.md, .claude/skills/*/references/*.md
