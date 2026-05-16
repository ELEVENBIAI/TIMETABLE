#!/usr/bin/env python3
"""Initialisiert eine neue Skill-Verzeichnisstruktur mit Template-Dateien."""

import argparse
import os
import sys
from pathlib import Path


def create_skill(name: str, output_path: str) -> Path:
    """Erstellt die Skill-Verzeichnisstruktur."""
    skill_dir = Path(output_path) / name

    if skill_dir.exists():
        print(f"Fehler: Verzeichnis '{skill_dir}' existiert bereits.", file=sys.stderr)
        sys.exit(1)

    # Verzeichnisse erstellen
    for subdir in ["scripts", "references", "assets"]:
        (skill_dir / subdir).mkdir(parents=True, exist_ok=True)

    # SKILL.md Template
    skill_md = f"""---
name: {name}
description: |
  TODO: Beschreibe was der Skill tut UND wann er ausgeloest werden soll.
  Beispiel: "Erstellt X. Verwenden wenn der Nutzer nach Y fragt oder Z benoetigt."
version: 1.0.0
---

# {name.replace('-', ' ').title()}

TODO: Anweisungen fuer die Nutzung des Skills.

## Workflow

1. TODO: Schritt 1
2. TODO: Schritt 2
3. TODO: Schritt 3

## Ressourcen

- Scripts: `scripts/` - TODO: Beschreibung oder loeschen
- Referenzen: `references/` - TODO: Beschreibung oder loeschen
- Assets: `assets/` - TODO: Beschreibung oder loeschen
"""
    (skill_dir / "SKILL.md").write_text(skill_md)

    # Beispiel-Dateien
    (skill_dir / "scripts" / "beispiel.py").write_text(
        '#!/usr/bin/env python3\n"""TODO: Beispiel-Script - anpassen oder loeschen."""\n\nprint("Hallo vom Skill!")\n'
    )
    (skill_dir / "references" / "beispiel.md").write_text(
        "# Beispiel-Referenz\n\nTODO: Referenzmaterial hier einfuegen oder Datei loeschen.\n"
    )
    (skill_dir / "assets" / ".gitkeep").write_text("")

    print(f"Skill '{name}' erstellt unter: {skill_dir}")
    print(f"\nStruktur:")
    for root, dirs, files in os.walk(skill_dir):
        level = root.replace(str(skill_dir), "").count(os.sep)
        indent = "  " * level
        print(f"{indent}{os.path.basename(root)}/")
        subindent = "  " * (level + 1)
        for file in files:
            print(f"{subindent}{file}")

    return skill_dir


def main():
    parser = argparse.ArgumentParser(description="Neuen Skill initialisieren")
    parser.add_argument("name", help="Skill-Name (hyphen-case, z.B. 'mein-skill')")
    parser.add_argument(
        "--path",
        default=os.path.expanduser("~/.claude/skills"),
        help="Ausgabeverzeichnis (Standard: ~/.claude/skills)",
    )
    args = parser.parse_args()

    # Name validieren
    if not all(c.isalnum() or c == "-" for c in args.name):
        print("Fehler: Skill-Name darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.", file=sys.stderr)
        sys.exit(1)
    if args.name != args.name.lower():
        print("Fehler: Skill-Name muss kleingeschrieben sein.", file=sys.stderr)
        sys.exit(1)

    create_skill(args.name, args.path)


if __name__ == "__main__":
    main()
