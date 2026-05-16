# SKILL.md Schreibanleitung

## Frontmatter-Felder

### Erforderlich

```yaml
---
name: mein-skill              # Bindestrich-Schreibweise, entspricht dem Verzeichnisnamen
description: |                # Was der Skill tut UND wann er ausgeloest wird
  Beschreibung des Skills. Verwenden wenn der Nutzer nach X fragt.
  Ausloeser sind Anfragen wie "mache X", "hilf bei Y".
version: 1.0.0                # Semantische Versionierung
---
```

### Optional

```yaml
requires_secrets:              # Benoetigte API-Schluessel
  - key: API_KEY_NAME
    service: Dienstname
    url: https://beispiel.de/api-keys
    description: Wofuer der Schluessel ist
    hint: "Beginnt mit 'sk-', 40 Zeichen"
    instructions: |
      1. Gehe zu beispiel.de
      2. Erstelle einen API-Schluessel
      3. Kopiere ihn
    required: true

agent: general-purpose         # In Subagent ausfuehren (general-purpose|Explore|Plan|Bash)
model: sonnet                  # Subagent-Modell (sonnet|opus|haiku)
context: fork                  # Vollen Kontext an Subagent weitergeben
user-invocable: false          # Aufruf per Slash-Befehl verhindern
disable-model-invocation: true # Automatisches Ausloesen verhindern
```

## Body-Richtlinien

- Imperativ/Infinitiv verwenden ("Die Datei erstellen" statt "Du solltest die Datei erstellen")
- Unter 300 Zeilen halten - Details in `references/` auslagern
- Nur einbeziehen, was Claude nicht schon weiss
- Knappe Beispiele statt ausfuehrlicher Erklaerungen bevorzugen

## API-Schluessel-Muster fuer Scripts

Scripts, die API-Schluessel benoetigen, sollten eine eingebettete `load_env()` enthalten:

```python
import os
from pathlib import Path

def load_env():
    current = Path(__file__).resolve()
    for _ in range(10):
        current = current.parent
        env_path = current / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, value = line.split("=", 1)
                        os.environ.setdefault(key.strip(), value.strip().strip('"\''))
            return True
    return False
```

## Stufenweise Offenlegungs-Patterns

### Pattern 1: Ueberblick mit Referenzen

```markdown
## Schnellstart
[Kern-Workflow]

## Erweiterte Funktionen
- **Funktion A**: Siehe [references/funktion-a.md](references/funktion-a.md)
- **Funktion B**: Siehe [references/funktion-b.md](references/funktion-b.md)
```

### Pattern 2: Fachbereichs-Organisation

```
skill/
├── SKILL.md (Ueberblick + Navigation)
└── references/
    ├── bereich-a.md
    ├── bereich-b.md
    └── bereich-c.md
```

Claude liest nur die relevante Referenzdatei.

### Pattern 3: Bedingte Details

```markdown
## Grundnutzung
[einfache Anweisungen]

**Fuer fortgeschrittene Faelle**: Siehe [references/fortgeschritten.md](references/fortgeschritten.md)
```

## Haeufige Fehler vermeiden

- Beschreibung zu vage (muss Ausloeser-Bedingungen enthalten)
- SKILL.md zu lang (>300 Zeilen - in References aufteilen)
- Tief verschachtelte Referenzen (maximal eine Ebene tief von SKILL.md aus)
- README.md oder andere menschenlesbare Doku einschliessen
- Informationen zwischen SKILL.md und References duplizieren
- Name mit Leerzeichen oder Grossbuchstaben (Bindestrich-Schreibweise verwenden)
