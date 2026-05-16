# Optional-Komponenten — Block D

Block D ist der **End-Block** des Bootstrap-Interviews. Alle hier abgefragten Komponenten sind **optional**. Der Operator kann sie bewusst jetzt installieren oder spaeter nachziehen.

Jede Frage wird einzeln gestellt, mit klarer Empfehlung und Default.

## D.1 — Self-Healing-Agent

**Frage:**
```
Self-Healing-Agent einrichten?

Was das macht: Cron-Job laeuft alle 15 Min und prueft:
  - Sind alle DOC_FILES auf der gleichen Version wie lib/config.js?
  - Existieren alle in COMPONENT_INVENTORY.md gelisteten Dateien?
  - Laufen konfigurierte Daemon-Prozesse?
Bei Drift/Ausfall: Auto-Korrektur oder Alert (via Telegram wenn Token gesetzt).

Empfohlen: ab mehreren Mitwirkenden, oder wenn Doku-Drift geschaeftskritisch waere.
Solo-Projekt mit <10 Stories: meist nicht noetig.

Jetzt installieren?
  [ja]  Skill legt agents/self-healing.js an, generiert Cron-Eintrag
  [nein] (default) — kann spaeter nachgezogen werden
```

**Wenn ja:**
- Template `references/self-healing-template.js` rendern mit `PROJECT_PATH`, `OBSIDIAN_VAULT`, Telegram-Token falls vorhanden
- In `agents/self-healing.js` schreiben
- Cron-Eintrag generieren und Operator zeigen:
  ```
  */15 * * * * cd {PROJECT_PATH} && node agents/self-healing.js >> /var/log/self-healing-{slug}.log 2>&1
  ```
- Operator bestaetigt Cron-Eintrag selbst (`crontab -e`)

## D.2 — DocSync zum Obsidian-Vault

**Frage:**
```
DocSync zum Obsidian-Vault aktivieren?

Was das macht: Bei jedem /implement T_last-Task werden Component-Docs
aus {PROJECT_PATH}/docs/components/ oder {PROJECT_PATH} in den Obsidian-Vault
gespiegelt. Kein Cron — laeuft als Manuelle-Aufforderung (implement-Skill T_last).

Empfohlen: wenn Obsidian-Vault gesetzt wurde (Block B.3 = ja).

Jetzt installieren?
  [ja]  (default wenn Vault gesetzt) — Skill legt lib/doc-sync.js an
  [nein] — bei jedem /implement musst du manuell updaten
```

**Wenn ja:**
- Template `references/doc-sync-template.js` rendern mit `PROJECT_PATH`, `OBSIDIAN_VAULT`, Projekt-Name
- Mapping Repo → Vault konfigurieren:
  ```javascript
  const MAPPINGS = [
    {
      src: '{PROJECT_PATH}/docs/components/',
      dst: '{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/Components/'
    },
    {
      src: '{PROJECT_PATH}/ARCHITECTURE_DESIGN.md',
      dst: '{OBSIDIAN_VAULT}/02 Projekte/{PROJECT_NAME}/.architecture-hub.md'  // mirror
    }
  ];
  ```
- In `lib/doc-sync.js` schreiben
- `implement`-Skill T_last-Task verweist auf `node lib/doc-sync.js`

## D.3 — Automation-Daemon (Linear-Webhook-Listener)

**Frage:**
```
Automation-Daemon einrichten?

Was das macht: Nimmt Linear-Webhook-Events entgegen und triggert /implement
vollautomatisch bei Story-Status-Aenderung ("In Progress" → Skill laeuft).

Empfohlen: NUR fuer fortgeschrittene Setups mit Vertrauen in die Pipeline.
Sicherheits-Implikationen:
  - Jeder Webhook kann Code-Aenderungen ausloesen
  - --dangerously-skip-permissions noetig
  - HMAC-Verifikation Pflicht

Jetzt einrichten?
  [ja]  Skill legt agents/linear-automation-daemon.js an
  [nein] (default) — Operator-Freigabe-Modus bleibt aktiv
```

**Wenn ja:**
- Daemon-Template rendern (nicht Bestandteil dieses Repos — Operator bekommt Skelett und Anleitung)
- `.env` um `LINEAR_WEBHOOK_SECRET`, `DAEMON_PORT`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1` erweitern
- Linear-Webhook-URL generieren + Operator muss im Linear-Dashboard konfigurieren
- `systemd`/`launchd`-Service-Template zeigen (je nach OS)

**Anmerkung:** Dieser Skill hat (Stand v3.0) noch kein fertiges Daemon-Template — Operator bekommt Skelett und dokumentierte Erweiterungsstrategie.

## D.4 — Learning-Loop-Level

**Frage:**
```
Learning-Loop aktivieren?

Was das macht: Systematische Erfassung von Lessons-Learned — was funktioniert,
was nicht, naechste Experimente. Speist sich aus /sprint-review, wird gelesen
von /ideation (Anti-Pattern-Warnung vor neuen Stories).

Drei Levels:
  L1 — Einfach       (eine learnings.md, Bullet-Points)          empfohlen fuer Solo-Projekte
  L2 — Strukturiert  (Sprint-Journal mit Frontmatter)            empfohlen ab 10+ Sprints
  L3 — SQLite        (quantitative Metriken ueber Zeit)          empfohlen ab 50+ Sprints
  nein               (keine Lessons-Learned-Dokumentation)

Default: L1. Welches Level?
```

**Wenn L1/L2/L3:**
- `{PROJECT_PATH}/.learning-loop` File mit Level-String (`L1`, `L2`, `L3`) — wird von `sprint-review`/`ideation` gelesen
- Journal-Struktur entsprechend anlegen:
  - L1: `journal/learnings.md` mit Skelett-Inhalt
  - L2: `journal/` Ordner + `journal/sprint-template.md` (Template-Copy)
  - L3: `journal/learnings.db` (SQLite initialisiert mit Schema) + `journal/write_sprint.py` (Helper)
- Wenn Obsidian aktiv: Mirror in `04 Ressourcen/{PROJECT_NAME}/` anlegen + Wikilink vom PMO-Hub
- `CLAUDE.md` um Regel erweitern: "Nach jedem Sprint-Review ist der Learning-Loop-Eintrag Pflicht"

**Wenn nein:**
- Kein `.learning-loop` File
- `sprint-review`-Skill laeuft ohne Schritt 7
- `ideation`-Skill liest keine Learnings

**Details:** Siehe `learning-loop.md` fuer die vollstaendige Spezifikation.

## Finalisierung nach Block D

Skill fasst Optional-Komponenten-Status zusammen:

```
Block D Ergebnis:
  ✅ / ⏭  Self-Healing-Agent      — cron installiert / spaeter
  ✅ / ⏭  DocSync zu Obsidian     — lib/doc-sync.js / spaeter
  ✅ / ⏭  Automation-Daemon       — agents/...daemon.js / spaeter
  Learning-Loop: L1 / L2 / L3 / nein
```

## Nachtraegliche Aktivierung

Jede Optional-Komponente kann spaeter aktiviert werden, ohne das ganze Bootstrap erneut zu laufen:

- **Self-Healing:** `bootstrap/references/self-healing-template.js` kopieren und anpassen
- **DocSync:** `bootstrap/references/doc-sync-template.js` kopieren und anpassen
- **Automation-Daemon:** manuell + Linear-Webhook-Setup
- **Learning-Loop:** `.learning-loop` File anlegen, Skill-Pfad siehe `learning-loop.md`

## Anti-Patterns

- ❌ Block D am Anfang des Interviews stellen — Operator hat noch keinen Kontext
- ❌ Alle Optional-Komponenten standardmaessig aktivieren — fuehrt zu Overhead fuer kleine Projekte
- ❌ Self-Healing ohne Obsidian/Telegram-Alert-Ziel — korrigiert still, Operator merkt nichts
- ❌ Learning-Loop aktivieren aber `/sprint-review` nie aufrufen — toter Loop
