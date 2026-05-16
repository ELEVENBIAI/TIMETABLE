# Learning-Loop — L1/L2/L3 Design

Ein portabler Learning-Loop, der ueber Projekte hinweg funktioniert. Drei Levels — je nach Projekt-Dauer und Metrik-Bedarf. Trigger ist `/sprint-review`. Speicherort ist projekt-agnostisch (kein SQLite-Lock-in ausser bei L3).

## Leitprinzip

**Der Loop erfasst systematisch dreierlei:**
1. **Was hat funktioniert** — wiederholen, zum Pattern ausbauen
2. **Was nicht funktioniert** — Root-Cause, Anti-Pattern dokumentieren
3. **Naechster Experiment / Change** — konkret, messbar

**Der Loop schliesst sich** durch:
- `/sprint-review` schreibt nach jedem Review den Eintrag
- `/ideation` liest beim Start neuer Stories die letzten Eintraege und warnt bei Anti-Pattern-Match
- Nach 5-10 Sprints: Muster werden sichtbar (L2 via Dataview, L3 via SQL-Query)

## L1 — Einfach (default, fuer kurze Projekte)

**Charakteristik:** Eine einzige MD-Datei, frei formatierte Bullet-Points mit Datum. Kein Frontmatter, keine Struktur-Pflicht.

**Speicherorte:**
- Primary: `{PROJECT_PATH}/journal/learnings.md` (git-versioniert)
- Mirror (wenn Obsidian aktiv): `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/learnings.md` (Wikilink vom PMO-Hub)

**Datei-Template:**
```markdown
# Learnings — {{PROJECT_NAME}}

> Sprint-by-sprint Lessons-Learned. Format: Datum + 3 Kategorien.
> Gespeist von /sprint-review. Gelesen von /ideation.

## {{TODAY}} — Sprint-Review

### Was funktionierte
- [Bullet-Point mit Kontext + Link zu Story wenn relevant]

### Was nicht funktionierte
- [Bullet + Root-Cause + welche Story betroffen]

### Naechster Experiment / Change
- [Konkret, messbar, zugeordnet zu kommender Story]
```

**Wann gelernt wird (Trigger-Punkte):**

1. **Schreiben:** `/sprint-review` Schritt 7 (siehe sprint-review/SKILL.md nach v3-Alignment):
   - Skill fragt am Ende des Reviews explizit: *"Was willst du als Learnings festhalten?"*
   - Operator diktiert 3 Bullets pro Kategorie
   - Skill haengt mit Datums-Header an `learnings.md` an

2. **Lesen:** `/ideation` Schritt 0.5:
   - Skill liest die letzten 3 Learnings-Eintraege
   - Wenn "was nicht funktionierte" thematisch zur Story-Idee passt: Operator warnen
     *"Im letzten Retro hat X nicht funktioniert. Beeinflusst das diese Story?"*
   - Ergebnis in Story `Current State` festhalten

**Upgrade-Pfad zu L2:** Wenn nach ~10 Sprints das L1-File zu lang wird oder Muster-Erkennung wichtig wird → Migration zu L2 ohne Daten-Verlust (siehe unten).

## L2 — Strukturiert (empfohlen ab 10+ Sprints)

**Charakteristik:** Ein File pro Sprint-Review mit Frontmatter. Metadaten machen Obsidian-Dataview-Aggregation moeglich. Trends werden sichtbar.

**Speicherorte:**
- Primary: `{PROJECT_PATH}/journal/sprint-{YYYY-MM-XX}.md` (pro Sprint, git-versioniert)
- Mirror (wenn Obsidian aktiv): `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/sprints/sprint-{YYYY-MM-XX}.md`

**Datei-Template:**
```markdown
---
type: sprint-retro
project: {{PROJECT_NAME}}
sprint: {{SPRINT_NUMBER}}
date: {{TODAY}}
duration_days: {{DAYS_SINCE_LAST_RETRO}}
stories_closed: {{COUNT}}
stories_open: {{COUNT}}
velocity_pct: {{PCT}}
what_worked: [tag1, tag2, tag3]
what_didnt: [tag1, tag2]
next_experiment: {{SHORT_TAG}}
related_issues: [PREFIX-1, PREFIX-2, PREFIX-3]
---

# Sprint {{SPRINT_NUMBER}} — Retro ({{TODAY}})

## Fakten (von Skill vorgefuellt)

- Stories geschlossen: {{COUNT}} / offen: {{COUNT}}
- Velocity: {{PCT}}%
- Grosse Themen: {{TOP_LABELS}}

## Was funktionierte

- [Bullet mit Story-Link]
- [Bullet]

## Was nicht funktionierte (+ Root-Cause)

- [Bullet] — Root-Cause: [warum]
- [Bullet] — Root-Cause: [warum]

## Naechstes Experiment

- **Idee:** [kurz]
- **Messkriterium:** [wie wissen wir obs geklappt hat]
- **Zugeordnete Story:** [PREFIX-XX oder "neu anlegen"]

## Learnings fuer kommende Sprints

- [Meta-Regel die aus den Findings folgt — geht in Projekt-LEARNINGS.md]
```

**Wann gelernt wird:**

1. **Schreiben:** `/sprint-review` Schritt 7:
   - Skill zieht Fakten aus Git-Log + Backlog-API (Linear/M365/GitHub) und befuellt Frontmatter automatisch
   - Operator beantwortet die 4 qualitativen Sektionen (funktionierte / funktionierte nicht / Experiment / Meta-Learnings)
   - Skill speichert beide Copies (Repo + Obsidian) und commitet die Repo-Version

2. **Lesen:** `/ideation` Schritt 0.5:
   - Skill liest die letzten 2-3 Sprint-Retros
   - Dataview-aehnliche Filterung: *"Welche `what_didnt`-Tags sind 2+x aufgetreten?"*
   - Warnt bei Anti-Pattern-Match
   - Ergebnis in Story `Current State`

3. **Meta-Aggregation (SecondBrain Dataview):**
   - `{OBSIDIAN_VAULT}/04 Ressourcen/{PROJECT_NAME}/patterns.md` mit Dataview-Query:
     ```dataview
     TABLE what_worked, what_didnt, next_experiment
     FROM "04 Ressourcen/{{PROJECT_NAME}}/sprints"
     WHERE type = "sprint-retro"
     SORT date DESC
     ```
   - Top-5 haeufigste `what_didnt` → Kandidat fuer Architektur-Aenderung
   - Erfolgreiche `next_experiment` → wiederverwenden

4. **Quartals-Meta-Retro** (automatisch bei jedem 4. Sprint-Review oder bei `/sprint-review --quarterly`):
   - Skill konsolidiert alle Sprint-Retros des Quartals
   - Schreibt `{PROJECT_PATH}/journal/quarterly-{YYYY-QX}.md` mit Trends, Top-Anti-Patterns, erfolgreichen Experimenten
   - PMO-Hub-Eintrag in SecondBrain

## L3 — SQLite-basiert (empfohlen ab 50+ Sprints oder bei Metriken-Bedarf)

**Charakteristik:** Zusaetzlich zu L2-MD-Files eine SQLite-DB fuer quantitative Auswertungen. Nur noetig wenn konkrete Fragen auftauchen wie: *"Sprints mit >3 Privacy-Changes → 40% mehr Blocker?"*

**Speicherort:**
- `{PROJECT_PATH}/journal/learnings.db` (gitignored — lokale Analyse)
- MD-Files werden weiter gepflegt (L2-Format bleibt)

**Schema:**
```sql
CREATE TABLE sprints (
  id INTEGER PRIMARY KEY,
  number INTEGER UNIQUE NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  stories_closed INTEGER,
  stories_open INTEGER,
  velocity_pct REAL
);

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  sprint_id INTEGER REFERENCES sprints(id),
  type TEXT NOT NULL CHECK(type IN ('what_worked', 'what_didnt', 'experiment', 'learning', 'blocker')),
  content TEXT NOT NULL,
  tags TEXT,  -- JSON array
  linked_issue TEXT
);

CREATE TABLE metrics (
  sprint_id INTEGER REFERENCES sprints(id),
  key TEXT NOT NULL,
  value REAL,
  PRIMARY KEY (sprint_id, key)
);

CREATE TABLE experiments (
  id INTEGER PRIMARY KEY,
  proposed_sprint INTEGER REFERENCES sprints(number),
  description TEXT NOT NULL,
  measurement_criterion TEXT,
  result TEXT CHECK(result IN ('pending', 'success', 'failure', 'aborted')),
  result_sprint INTEGER REFERENCES sprints(number)
);
```

**Wann gelernt wird:**

1. **Schreiben:** `/sprint-review` Schritt 7 schreibt parallel:
   - MD-File (L2-Format) fuer Menschen
   - SQLite-Insert via Python-Helper-Script (`journal/write_sprint.py`)

2. **Lesen:** Separater Helper-Skill `/learnings-query`:
   - Antwortet auf Metrik-Fragen: *"Wie hat sich Velocity ueber die letzten 10 Sprints entwickelt?"*
   - Query-Beispiele:
     ```sql
     -- Top 5 Anti-Patterns
     SELECT json_each.value AS tag, COUNT(*) AS occurrences
     FROM events, json_each(events.tags)
     WHERE events.type = 'what_didnt'
     GROUP BY tag ORDER BY occurrences DESC LIMIT 5;

     -- Experiment-Erfolgsrate
     SELECT result, COUNT(*) FROM experiments GROUP BY result;

     -- Sprints mit Privacy-Changes vs. Blocker-Rate
     SELECT AVG(blocker_count) FROM (
       SELECT s.id,
         (SELECT COUNT(*) FROM events WHERE sprint_id = s.id AND type = 'blocker') AS blocker_count,
         (SELECT COUNT(*) FROM events WHERE sprint_id = s.id AND tags LIKE '%privacy%') AS privacy_count
       FROM sprints s
     ) WHERE privacy_count > 3;
     ```

3. **Lesen durch /ideation:** Wie L2, aber mit zusaetzlichem SQL-Context wenn Stack-Entscheidung ansteht.

## Migration zwischen Levels

**L1 → L2:** Skill-Helper liest bestehende `learnings.md`, spaltet in Pseudo-Sprints auf (Abschnitte nach Datum), legt Frontmatter an. Operator bestaetigt Sprint-Nummerierung. MD-Files werden neu angelegt. `learnings.md` bleibt als Archiv.

**L2 → L3:** SQLite-DB wird initialisiert, alle bestehenden L2-MD-Files werden parsed (Frontmatter + Sections) und als Rows eingefuegt. MD-Files bleiben unveraendert.

**L3 → L2 (Downgrade):** SQLite-DB wird aus dem Git-Ignore entfernt und geloescht. MD-Files bleiben weiter.

## Aktivierung im Bootstrap

In Block D (Optional-Komponenten) waehlt Operator das Level. Skill schreibt in `{PROJECT_PATH}/.learning-loop` den Level als Text (`L1`, `L2`, `L3`). Dieses File wird von `sprint-review` und `ideation` gelesen.

## SecondBrain-Cross-Linking

Wenn Obsidian-Vault aktiv:
- PMO-Hub bekommt Wikilink-Sektion: `## Learnings → [[../../../04 Ressourcen/{{PROJECT_NAME}}/learnings]]`
- Bei L2/L3: SecondBrain zeigt Dataview-Aggregation ueber alle Sprint-Retros
- Wenn `ingest`-Skill aktiv: alle neuen Sprint-Retros werden automatisch ins Vault-Wiki eingehaengt

## Integration in andere Skills

| Skill | Integration |
|-------|-------------|
| `/sprint-review` | **Schreibt** den Learning-Loop-Eintrag als Pflicht-Schritt 7 |
| `/ideation` | **Liest** die letzten 3 Eintraege vor Story-Erstellung (Schritt 0.5) |
| `/architecture-review` | **Referenziert** Learnings wenn Architektur-Entscheidung ansteht |
| `/breakfix` | **Schreibt** Breakfix-Learnings als `what_didnt` mit Root-Cause + Prevention |
| `/wrap-up` | **Liest** offene Experiment-Stati und erinnert Operator daran |

## Anti-Patterns

- ❌ **SQLite fuer Solo-Projekt mit 5 Sprints** — Overkill, L1 reicht
- ❌ **L1 mit 100+ Sprints** — File wird unuebersichtlich, migriere zu L2
- ❌ **Schreiben ohne Lesen** — wenn `/ideation` die Learnings nicht liest, ist der Loop offen
- ❌ **Private Experimente nicht dokumentiert** — auch gescheiterte Experimente schreiben (das ist das wertvollste Learning)
