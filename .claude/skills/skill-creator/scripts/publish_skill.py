#!/usr/bin/env python3
"""
Veroeffentlicht einen Skill: GitHub-Repo aktualisieren + Obsidian-Dokumentation generieren.

Verwendung:
    python3 publish_skill.py <skill-name> [--message "Aenderungsbeschreibung"]

Beispiel:
    python3 publish_skill.py skill-creator --message "Schreibanleitung auf Deutsch uebersetzt"

Konfiguration (Pfade anpassen):
    GITHUB_REPO_DIR: Lokaler Pfad zum geklonten GitHub-Skills-Repo
    OBSIDIAN_DIR:    Pfad zu deinem Obsidian-Vault (Skills-Ordner)
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Konfiguration — ANPASSEN auf dein System
SKILLS_DIR = Path.home() / ".claude" / "skills"
GITHUB_REPO_DIR = Path.home() / "path" / "to" / "your-skills-repo"   # <-- anpassen
OBSIDIAN_DIR = Path.home() / "path" / "to" / "your-obsidian-vault"   # <-- anpassen (oder weglassen)


def get_frontmatter(skill_dir: Path) -> dict:
    """Liest die Frontmatter-Felder aus SKILL.md."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return {}

    content = skill_md.read_text()
    if not content.startswith("---"):
        return {}

    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}

    fields = {}
    for line in parts[1].strip().split("\n"):
        if ":" in line and not line.startswith(" ") and not line.startswith("#"):
            key, value = line.split(":", 1)
            fields[key.strip()] = value.strip()
    return fields


def bump_version(version: str, bump_type: str = "patch") -> str:
    """Erhoeht die Versionsnummer."""
    parts = version.split(".")
    if len(parts) != 3:
        return "1.0.1"

    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    if bump_type == "major":
        major += 1
        minor = 0
        patch = 0
    elif bump_type == "minor":
        minor += 1
        patch = 0
    else:
        patch += 1

    return f"{major}.{minor}.{patch}"


def update_version_in_skill(skill_dir: Path, new_version: str):
    """Aktualisiert die Version in SKILL.md."""
    skill_md = skill_dir / "SKILL.md"
    content = skill_md.read_text()
    content = re.sub(
        r"^version:\s*.+$",
        f"version: {new_version}",
        content,
        count=1,
        flags=re.MULTILINE,
    )
    skill_md.write_text(content)


def copy_to_github(skill_name: str, skill_dir: Path):
    """Kopiert den Skill ins GitHub-Repo."""
    target = GITHUB_REPO_DIR / skill_name
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(skill_dir, target, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))


def git_commit_and_push(skill_name: str, version: str, message: str):
    """Committed und pusht ins GitHub-Repo."""
    os.chdir(GITHUB_REPO_DIR)

    subprocess.run(["git", "add", skill_name], check=True)

    status = subprocess.run(["git", "diff", "--cached", "--quiet"], capture_output=True)
    if status.returncode == 0:
        print("Keine Aenderungen zum Committen.")
        return False

    commit_msg = f"{skill_name} v{version}: {message}"
    subprocess.run(["git", "commit", "-m", commit_msg], check=True)
    subprocess.run(["git", "push", "origin", "main"], check=True)
    print(f"GitHub aktualisiert: {commit_msg}")
    return True


def get_file_descriptions(skill_dir: Path) -> list[dict]:
    """Sammelt alle Dateien mit Pfad und Beschreibung."""
    files_info = []
    for root, dirs, files in os.walk(skill_dir):
        dirs[:] = [d for d in dirs if d not in {"__pycache__", ".DS_Store"}]
        for f in files:
            if f == ".DS_Store" or f == ".gitkeep":
                continue
            rel_path = os.path.relpath(os.path.join(root, f), skill_dir)
            files_info.append(rel_path)
    return sorted(files_info)


def read_file_summary(filepath: Path, max_lines: int = 5) -> str:
    """Liest die ersten Zeilen einer Datei fuer eine Kurzbeschreibung."""
    try:
        content = filepath.read_text()
        if filepath.suffix == ".py":
            doc_match = re.search(r'"""(.*?)"""', content, re.DOTALL)
            if doc_match:
                return doc_match.group(1).strip().split("\n")[0]
        if filepath.suffix == ".md":
            for line in content.split("\n"):
                if line.startswith("# "):
                    return line.lstrip("# ").strip()
        return ""
    except Exception:
        return ""


def generate_obsidian_doc(skill_name: str, skill_dir: Path, version: str, message: str):
    """Erstellt/aktualisiert die Obsidian-Dokumentation nach dem Doku-Template."""
    if not OBSIDIAN_DIR.exists():
        print(f"Obsidian-Verzeichnis nicht gefunden: {OBSIDIAN_DIR} — Obsidian-Doku uebersprungen.")
        return

    frontmatter = get_frontmatter(skill_dir)
    description = frontmatter.get("description", "Keine Beschreibung vorhanden.")
    today = datetime.now().strftime("%Y-%m-%d")

    files_list = get_file_descriptions(skill_dir)
    files_detail = ""
    for rel_path in files_list:
        full_path = skill_dir / rel_path
        summary = read_file_summary(full_path)
        if summary:
            files_detail += f"- `{rel_path}` — {summary}\n"
        else:
            files_detail += f"- `{rel_path}`\n"

    skill_md_content = (skill_dir / "SKILL.md").read_text()
    parts = skill_md_content.split("---", 2)
    body = parts[2].strip() if len(parts) >= 3 else ""

    scripts_detail = ""
    references_detail = ""
    scripts_dir = skill_dir / "scripts"
    references_dir = skill_dir / "references"

    if scripts_dir.exists():
        for script in sorted(scripts_dir.iterdir()):
            if script.suffix == ".py":
                summary = read_file_summary(script)
                scripts_detail += f"\n#### `{script.name}`\n{summary}\n"

    if references_dir.exists():
        for ref in sorted(references_dir.iterdir()):
            if ref.suffix == ".md":
                summary = read_file_summary(ref)
                references_detail += f"\n#### `{ref.name}`\n{summary}\n"

    requires = frontmatter.get("requires_secrets", "")
    if requires:
        voraussetzungen = "- API-Schluessel (siehe Frontmatter in SKILL.md)\n"
    else:
        voraussetzungen = "- Keine besonderen Voraussetzungen\n- Python 3 (fuer Scripts)\n"

    obsidian_file = OBSIDIAN_DIR / f"{skill_name}.md"

    history_entry = f"- **v{version}** ({today}): {message}"
    existing_history = ""

    if obsidian_file.exists():
        existing_content = obsidian_file.read_text()
        history_match = re.search(
            r"## Versionshistorie\n(.*?)(?=\n## |\Z)",
            existing_content,
            re.DOTALL,
        )
        if history_match:
            existing_history = history_match.group(1).strip()

    full_history = f"{history_entry}\n{existing_history}" if existing_history else history_entry

    doc = f"""---
tags:
  - claude-skill
skill: {skill_name}
version: {version}
aktualisiert: {today}
status: aktiv
---

# {skill_name}

## Ueberblick

{description}

## Aufbau & Dateien

```
{skill_name}/
{chr(10).join(f"├── {f}" for f in files_list)}
```

### Dateibeschreibungen

{files_detail}
{f"### Scripts{scripts_detail}" if scripts_detail else ""}
{f"### Referenzen{references_detail}" if references_detail else ""}

## Voraussetzungen

{voraussetzungen}

## Nutzung

{body}

## Installation

```bash
# Aus GitHub-Repo kopieren
cp -r path/to/skills-repo/{skill_name} ~/.claude/skills/{skill_name}
```

## Versionshistorie

{full_history}
"""

    OBSIDIAN_DIR.mkdir(parents=True, exist_ok=True)
    obsidian_file.write_text(doc)
    print(f"Obsidian-Doku aktualisiert: {obsidian_file}")


def main():
    parser = argparse.ArgumentParser(description="Skill veroeffentlichen (GitHub + Obsidian)")
    parser.add_argument("skill_name", help="Name des Skills (Verzeichnisname unter ~/.claude/skills/)")
    parser.add_argument("--message", "-m", default="Aktualisierung", help="Aenderungsbeschreibung")
    parser.add_argument("--bump", choices=["patch", "minor", "major"], default="patch", help="Versionstyp (Standard: patch)")
    parser.add_argument("--no-version-bump", action="store_true", help="Version nicht erhoehen")
    args = parser.parse_args()

    skill_dir = SKILLS_DIR / args.skill_name

    if not skill_dir.exists():
        print(f"Fehler: Skill '{args.skill_name}' nicht gefunden unter {skill_dir}", file=sys.stderr)
        sys.exit(1)

    if not (skill_dir / "SKILL.md").exists():
        print(f"Fehler: Keine SKILL.md in {skill_dir}", file=sys.stderr)
        sys.exit(1)

    frontmatter = get_frontmatter(skill_dir)
    current_version = frontmatter.get("version", "1.0.0")

    if args.no_version_bump:
        new_version = current_version
    else:
        new_version = bump_version(current_version, args.bump)
        update_version_in_skill(skill_dir, new_version)

    print(f"Veroeffentliche: {args.skill_name} v{new_version}")
    print("=" * 40)

    print("\n1. GitHub aktualisieren...")
    copy_to_github(args.skill_name, skill_dir)
    git_commit_and_push(args.skill_name, new_version, args.message)

    print("\n2. Obsidian-Dokumentation aktualisieren...")
    generate_obsidian_doc(args.skill_name, skill_dir, new_version, args.message)

    print(f"\nFertig! {args.skill_name} v{new_version} veroeffentlicht.")


if __name__ == "__main__":
    main()
