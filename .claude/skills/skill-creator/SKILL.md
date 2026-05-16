---
name: skill-creator
description: Anleitung zum Erstellen und Paketieren von Claude Code Skills. Verwenden wenn der Nutzer einen neuen Skill erstellen, einen bestehenden Skill aktualisieren oder einen Skill zur Weitergabe paketieren moechte. Ausloeser sind Anfragen wie "erstelle einen Skill", "baue einen Skill", "neuer Skill fuer X", "Skill paketieren".
version: 1.0.1
---

# Skill Creator

Effektive, eigenstaendige Claude Code Skills nach einem strukturierten Prozess erstellen.

## Was sind Skills?

Skills sind modulare Pakete, die Claudes Faehigkeiten mit spezialisiertem Wissen, Workflows und Tools erweitern. Sie liegen in `~/.claude/skills/` und bestehen aus:

```
skill-name/
├── SKILL.md              (erforderlich - Frontmatter + Anweisungen)
├── scripts/              (optional - ausfuehrbarer Code)
├── references/           (optional - Doku, bei Bedarf geladen)
└── assets/               (optional - Vorlagen, Bilder, Schriften)
```

## Erstellungsprozess

Diese 6 Schritte der Reihe nach befolgen:

### Schritt 1: Skill verstehen

Den Nutzer nach konkreten Anwendungsbeispielen fragen:
- Was soll der Skill tun?
- Was wuerde ein Nutzer sagen, um ihn auszuloesen?
- Was sind 2-3 Beispielaufgaben?

Nur ueberspringen, wenn die Anwendungsfaelle bereits klar sind.

### Schritt 2: Ressourcen planen

Fuer jedes Beispiel wiederverwendbare Ressourcen identifizieren:
- **Scripts**: Code, der sonst jedes Mal neu geschrieben wuerde (z.B. `scripts/pdf_drehen.py`)
- **References**: Fachwissen, das Claude benoetigt (z.B. `references/schema.md`)
- **Assets**: Dateien fuer die Ausgabe (z.B. `assets/vorlage.html`)

### Schritt 3: Initialisieren

Das Init-Script ausfuehren, um das Grundgeruest zu erzeugen:

```bash
python3 ~/.claude/skills/skill-creator/scripts/init_skill.py <skill-name> --path <ausgabe-verzeichnis>
```

Erstellt die Verzeichnisstruktur mit einer SKILL.md-Vorlage und Beispiel-Ressourcenordnern.

### Schritt 4: Umsetzen

1. **Mit Ressourcen beginnen** - Scripts, References, Assets aus Schritt 2 erstellen
2. **Scripts testen** durch tatsaechliches Ausfuehren
3. **SKILL.md schreiben** - Siehe [references/schreibanleitung.md](references/schreibanleitung.md) fuer Frontmatter-Felder, Body-Richtlinien und Design-Patterns
4. **Unbenutzte Beispieldateien loeschen** aus der Initialisierung

### Schritt 5: Validieren & Paketieren

```bash
python3 ~/.claude/skills/skill-creator/scripts/package_skill.py <pfad/zum/skill-ordner>
```

Optional Ausgabeverzeichnis angeben:
```bash
python3 ~/.claude/skills/skill-creator/scripts/package_skill.py <pfad/zum/skill-ordner> ./dist
```

Das Script validiert (Frontmatter, Struktur, Benennung) und paketiert dann als `.skill`-Datei.

### Schritt 6: Iterieren

Den Skill bei echten Aufgaben einsetzen, Schwaechen erkennen, SKILL.md oder Ressourcen aktualisieren, erneut testen.

## Kernprinzipien

- **Kuerze ist entscheidend**: Claude ist schlau - nur hinzufuegen, was es nicht schon weiss
- **Stufenweise Offenlegung**: SKILL.md unter 300 Zeilen halten, Details in `references/` auslagern
- **Freiheitsgrad an Fragilitaet anpassen**: Schmale Bruecke = strikte Anweisungen; offenes Feld = flexible Leitlinien
- **Keine Zusatzdoku**: Kein README.md, CHANGELOG.md oder Hilfsdateien - Skills sind fuer KI-Agenten, nicht fuer Menschen
