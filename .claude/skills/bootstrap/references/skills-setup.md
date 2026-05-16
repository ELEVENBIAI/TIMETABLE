# Skills Setup — Neue Projekt-Installation

Skills werden aus dem offiziellen GitHub-Repo via `git clone` in einen Temp-Ordner geholt und in `{PROJECT_PATH}/.claude/skills/` kopiert. Kein Symlink auf VPS-Pfade, kein globales `/root/.claude/skills/`.

## Installation (Standard-Flow)

```bash
# Temp-Ordner anlegen
SKILL_SRC=$(mktemp -d)

# Aktuelles Skills-Repo klonen (shallow)
git clone --depth 1 https://github.com/vibercoder79/KI-Masterclass-Koerting- "$SKILL_SRC"

# Skills-Verzeichnis im Projekt anlegen
cd {PROJECT_PATH}
mkdir -p .claude/skills

# Gewaehlte Skills kopieren
for skill in ideation implement backlog; do
  cp -R "$SKILL_SRC/$skill" ".claude/skills/$skill"
done

# Temp-Ordner aufraeumen
rm -rf "$SKILL_SRC"
```

## Verfuegbare Skills

| Skill | Beschreibung | Tier |
|-------|-------------|------|
| `ideation` | Deep Research + User Story Erstellung | Minimum |
| `implement` | Implementierungs-Workflow mit Governance-Gates | Minimum |
| `backlog` | Sprint Planning + Backlog-Uebersicht | Minimum |
| `architecture-review` | Architektur-Review (Standard-Dimensionen + aktivierte Add-ons) | Standard |
| `sprint-review` | Periodisches Audit + **Learning-Loop-Eintrag** (siehe `learning-loop.md`) | Standard |
| `research` | Deep Research via WebSearch + Perplexity | Standard |
| `security-architect` | Security-Review (STRIDE/OWASP) | Standard |
| `skill-creator` | Neue Skills erstellen + paketieren | Standard |
| `grafana` | Grafana Dashboard-Entwicklung | Optional |
| `cloud-system-engineer` | VPS-Infrastruktur | Optional |
| `visualize` | Architektur-Diagramme in Miro | Optional |
| `design-md-generator` | DESIGN.md aus Website/PDF extrahieren | Optional |

## Skill-Tier-Auswahl im Bootstrap

```
Welche Skills installieren?
  a) Minimum   (ideation, implement, backlog)
  b) Standard  (+ architecture-review, sprint-review, research, security-architect, skill-creator)
  c) Voll      (alle verfuegbaren)
  d) Manuell   (Operator waehlt einzeln)
```

## Anpassung der installierten Skills

**Generisch (Default):** Skills werden unveraendert aus dem Master-Repo kopiert. Die referenzen sind generisch gehalten (keine Projekt-Annahmen) und funktionieren direkt.

**Projekt-spezifisch (nur bei Bedarf):** Wenn das Projekt domain-spezifische Anpassungen braucht (z.B. Component-Docs-Mapping fuer `implement/references/change-checklist.md`), ist der Weg:

1. Die entsprechende Datei im installierten Skill lokal editieren
2. Die Anpassung als projekt-spezifisch dokumentieren (z.B. in `specs/JAR-XXX.md` die erste Story dazu)
3. Optional: Die Anpassung als Skill-Variante via `/skill-creator` paketieren

**Niemals** Master-Skills direkt aus dem Projekt commiten — der Master-Stand bleibt generisch.

## Update-Strategie

Wenn der Master-Skill ein Update bekommt, kann der Operator im Projekt:

```bash
# Neuen Stand holen
SKILL_SRC=$(mktemp -d)
git clone --depth 1 https://github.com/vibercoder79/KI-Masterclass-Koerting- "$SKILL_SRC"

# Diff anzeigen vor Overwrite
diff -r "$SKILL_SRC/<skill>" ".claude/skills/<skill>"

# Gezielt Updates uebernehmen (nicht stumpf ueberschreiben)
# Operator entscheidet pro File
```

Alternativ: Projekt-spezifische Anpassungen erneut anwenden nach Copy.

## Reihenfolge der Skill-Installation

1. `research` — keine Abhaengigkeiten
2. `ideation` — braucht story-templates (im Skill enthalten)
3. `backlog` — braucht Linear/M365/GitHub-Connector
4. `implement` — braucht `change-checklist.md` + Git
5. `architecture-review` — braucht Dimensionen-Referenz
6. `security-architect` — standalone
7. `sprint-review` — braucht `learning-loop.md` falls Learning-Loop aktiv
8. Optional (Voll-Tier): `grafana`, `cloud-system-engineer`, `visualize`, `design-md-generator`
9. `skill-creator` — standalone

## ISSUE_WRITING_GUIDELINES.md

Wird NICHT aus einem externen Pfad kopiert, sondern aus `references/issue-writing-guidelines-template.md` gerendert (Prefix eingesetzt). Siehe SKILL.md Phase 4.3.

## implement-Skill: Governance-Integration

Der aktuelle `implement`-Skill enthaelt diese Pflichtschritte (werden automatisch aktiv wenn der Skill installiert ist):

| Schritt | Was | Governance-Impact |
|---------|-----|-------------------|
| 3 | Kontext — `ARCHITECTURE_DESIGN.md` Hub + Component-Doc lesen | Hub-first-Navigation |
| 3b | Governance-Validation (8 Dimensionen + Security) | Pflicht vor Plan |
| 3c | Spec-File Gate (spec-gate.sh erzwingt es) | Spec pflichtig |
| 5 | Implementation inkl. T_last Doku-Update | Component-Doc + Hub §9 + `lib/config.js` VERSION bump |
| 6a | Linting-Gate (ESLint/Ruff — 0 Errors Pflicht) | Qualitaets-Gate |

## Learning-Loop-Integration (wenn aktiviert)

Wenn Block D = L1/L2/L3, wird:

- `sprint-review`-Skill um Schritt 7 (Learning-Loop-Eintrag) erweitert — siehe `learning-loop.md`
- `ideation`-Skill um Schritt 0.5 (Learnings-Kontext lesen vor Story-Erstellung) erweitert

Aktivierung: `.learning-loop`-File im Projekt-Root mit Inhalt `L1`, `L2` oder `L3`.
