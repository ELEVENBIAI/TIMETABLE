#!/usr/bin/env python3
"""Validiert und paketiert einen Skill als .skill-Datei (ZIP-Archiv)."""

import argparse
import os
import re
import sys
import zipfile
from pathlib import Path


def validate_skill(skill_dir: Path) -> list[str]:
    """Validiert einen Skill und gibt eine Liste von Fehlern zurueck."""
    errors = []

    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        errors.append("SKILL.md fehlt")
        return errors

    content = skill_md.read_text()

    # Frontmatter pruefen
    if not content.startswith("---"):
        errors.append("SKILL.md muss mit YAML-Frontmatter beginnen (---)")
        return errors

    parts = content.split("---", 2)
    if len(parts) < 3:
        errors.append("SKILL.md Frontmatter nicht korrekt geschlossen (--- ... ---)")
        return errors

    frontmatter = parts[1].strip()

    # Required fields
    for field in ["name", "description", "version"]:
        if not re.search(rf"^{field}:", frontmatter, re.MULTILINE):
            errors.append(f"Frontmatter: '{field}' fehlt")

    # Name validieren
    name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
    if name_match:
        name = name_match.group(1).strip()
        if name != name.lower():
            errors.append(f"Skill-Name muss kleingeschrieben sein: '{name}'")
        if " " in name:
            errors.append(f"Skill-Name darf keine Leerzeichen enthalten: '{name}'")
        if name != skill_dir.name:
            errors.append(f"Skill-Name '{name}' stimmt nicht mit Verzeichnisname '{skill_dir.name}' ueberein")

    # Description pruefen
    desc_match = re.search(r"^description:\s*(.+)$", frontmatter, re.MULTILINE)
    if desc_match:
        desc = desc_match.group(1).strip()
        if len(desc) < 20 and not desc.startswith("|"):
            errors.append("Description zu kurz - muss beschreiben WAS der Skill tut UND WANN er ausgeloest wird")
        if "TODO" in desc:
            errors.append("Description enthaelt noch TODO-Platzhalter")

    # Body pruefen
    body = parts[2].strip()
    if not body:
        errors.append("SKILL.md Body ist leer")
    if "TODO" in body:
        errors.append("SKILL.md Body enthaelt noch TODO-Platzhalter")

    # Zeilenanzahl pruefen
    body_lines = body.count("\n") + 1
    if body_lines > 500:
        errors.append(f"SKILL.md Body hat {body_lines} Zeilen (empfohlen: unter 300, Maximum: 500)")

    # Unerwuenschte Dateien
    unwanted = ["README.md", "CHANGELOG.md", "INSTALLATION_GUIDE.md", "QUICK_REFERENCE.md"]
    for filename in unwanted:
        if (skill_dir / filename).exists():
            errors.append(f"Unerwuenschte Datei: {filename} (Skills brauchen keine Zusatzdokumentation)")

    return errors


def package_skill(skill_dir: Path, output_dir: Path) -> Path:
    """Erstellt eine .skill-Datei aus dem Skill-Verzeichnis."""
    skill_name = skill_dir.name
    output_file = output_dir / f"{skill_name}.skill"

    output_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output_file, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(skill_dir):
            # .git und __pycache__ ueberspringen
            dirs[:] = [d for d in dirs if d not in {".git", "__pycache__", ".DS_Store"}]
            for file in files:
                if file == ".DS_Store":
                    continue
                filepath = Path(root) / file
                arcname = str(filepath.relative_to(skill_dir.parent))
                zf.write(filepath, arcname)

    return output_file


def main():
    parser = argparse.ArgumentParser(description="Skill validieren und paketieren")
    parser.add_argument("skill_path", help="Pfad zum Skill-Verzeichnis")
    parser.add_argument("output_dir", nargs="?", default=".", help="Ausgabeverzeichnis (Standard: aktuelles Verzeichnis)")
    args = parser.parse_args()

    skill_dir = Path(args.skill_path).resolve()
    output_dir = Path(args.output_dir).resolve()

    if not skill_dir.is_dir():
        print(f"Fehler: '{skill_dir}' ist kein Verzeichnis.", file=sys.stderr)
        sys.exit(1)

    print(f"Validiere Skill: {skill_dir.name}")
    print("-" * 40)

    errors = validate_skill(skill_dir)

    if errors:
        print("VALIDIERUNG FEHLGESCHLAGEN:\n")
        for err in errors:
            print(f"  - {err}")
        print(f"\n{len(errors)} Fehler gefunden. Bitte beheben und erneut ausfuehren.")
        sys.exit(1)

    print("Validierung erfolgreich!")
    print()

    output_file = package_skill(skill_dir, output_dir)
    size_kb = output_file.stat().st_size / 1024
    print(f"Paket erstellt: {output_file} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
