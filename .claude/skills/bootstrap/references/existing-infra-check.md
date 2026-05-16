# Existing-Infra-Check — Block B

Ziel: **Vorhandene Infrastruktur respektieren**. Der Bootstrap-Skill soll sich in Bestehendes einhaengen, nicht blind neu anlegen.

## Die 5 Fragen (einzeln, nicht Batch)

### B.1 — Projekt-Verzeichnis

```
Hast du bereits ein Projekt-Verzeichnis?
  a) Ja, existiert bereits — absoluter Pfad?
  b) Nein, neu anlegen — wo? (absoluter Pfad)
```

**Skill-Verhalten:**
- `a`: Pfad validieren (existiert, ist Ordner). Wenn bereits Files drin → Merge-Modus-Frage (siehe unten).
- `b`: Parent-Ordner pruefen, `mkdir -p` nach Bestaetigung.

### B.2 — GitHub-Repo

```
GitHub-Repo fuer das Projekt?
  a) Ja, existiert — URL? (z.B. github.com/user/repo)
  b) Nein, spaeter anlegen (kein Remote jetzt)
  c) Kein GitHub gewuenscht
```

**Skill-Verhalten:**
- `a`: Remote-URL pruefen (optional: `git ls-remote` mit Timeout). `git remote add origin` wenn lokal noch nicht gesetzt.
- `b`: Kein `git remote add`. Hinweis: "Remote spaeter via `git remote add origin <url>`".
- `c`: Kein Remote-Setup.

### B.3 — Obsidian-Vault

```
Hast du einen Obsidian-Vault fuer Projekt-Dokumentation?
  a) Ja + absoluter Pfad
  b) Nein, nur im Repo dokumentieren (keine SecondBrain-Schicht)
```

**Skill-Verhalten:**
- `a`: Vault-Pfad validieren. Pruefen ob `02 Projekte/` Ordner existiert (wenn nicht → anlegen mit Bestaetigung). Projekt-Ordner `02 Projekte/{PROJECT_NAME}/` pruefen (wenn existiert → Merge-Modus-Frage).
- `b`: Nur Repo-Doku, keine Obsidian-Integration. Block C wird auf "alle Docs im Repo" umgestellt.

### B.4 — Backlog-System

```
Welches Backlog-System nutzt du?
  a) Linear + Team-Slug (z.B. JAR)
  b) Microsoft 365 Planner
  c) GitHub Issues
  d) Keines (nur Specs im Repo)
```

**Skill-Verhalten:**
- `a`: Linear-MCP / API-Key-Check. Skill-Teil, das Labels anlegen kann (Block A Add-ons bestimmen welche).
- `b`: M365-MCP-Check. Manueller Label-Hinweis.
- `c`: GitHub-CLI (`gh`) verfuegbar? Labels per `gh label create`.
- `d`: Keine Backlog-Integration, nur `specs/` im Repo.

### B.5 — .env-Status

```
Hast du bereits eine .env-Datei fuer dieses Projekt?
  a) Ja, existiert mit Keys
  b) Nein, .env.example reicht
```

**Skill-Verhalten:**
- `a`: `.env` nicht anfassen, `.env.example` nur zur Referenz. `.env` in `.gitignore` pruefen.
- `b`: Nur `.env.example` anlegen. Operator wird in Phase 4.7 aufgefordert Keys einzutragen.

## Merge-Modus

Wenn `PROJECT_PATH` oder `OBSIDIAN_VAULT/02 Projekte/{PROJECT_NAME}/` bereits Files enthaelt:

```
Warnung: {PROJECT_PATH} enthaelt bereits Dateien:
  {FILE_LIST}

Wie vorgehen?
  a) Backup anlegen ({PROJECT_PATH}.bak.{TIMESTAMP}) + Bootstrap fortsetzen (ueberschreibt)
  b) Nur fehlende Governance-Dateien ergaenzen (merge — bestehende Dateien bleiben)
  c) Abbruch
```

**Skill-Verhalten:**
- `a`: `cp -R {PROJECT_PATH} {PROJECT_PATH}.bak.{TIMESTAMP}`, dann normaler Flow.
- `b`: Nur fehlende Dateien anlegen (`if [ ! -f ... ]`-Pattern). Bestehende Files nicht ueberschreiben. Operator muss ggf. manuell ergaenzen.
- `c`: Abort. Keine Aenderungen.

## Output — EXISTING_INFRA-Dictionary

Am Ende von Block B wird eine Struktur gemerkt die in Phase 4-7 genutzt wird:

```yaml
EXISTING_INFRA:
  project_path: /Users/tobi/projects/myproject
  project_path_existed: true
  merge_mode: "merge"  # oder "new", "backup"
  github_repo: "github.com/user/myproject"
  github_remote_set: false  # noch nicht lokal gesetzt
  obsidian_vault: /Users/tobi/Obsidian/MyVault
  obsidian_project_path: "02 Projekte/MyProject"
  obsidian_project_existed: false
  backlog_tool: "linear"
  backlog_team: "MYP"
  backlog_labels_creatable: true  # Linear-API verfuegbar
  env_exists: false
  env_gitignored: true
```

## Sicherheits-Hinweise

- **Niemals** ohne Bestaetigung Dateien ueberschreiben. Backup-Modus ist Pflicht wenn Merge nicht gewollt.
- **Niemals** Secrets aus `.env` lesen oder anzeigen. Nur Existenz pruefen.
- Bei fehlenden Rechten auf `PROJECT_PATH` → Abbruch mit klarer Fehlermeldung.
