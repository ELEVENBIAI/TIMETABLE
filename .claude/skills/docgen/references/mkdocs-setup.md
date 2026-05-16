# MkDocs-Site Generierung

## Voraussetzungen

MkDocs und Material-Theme muessen installiert sein:

```bash
pip install mkdocs mkdocs-material
```

## Generierte Struktur

```
docs/
├── mkdocs.yml                    ← MkDocs-Konfiguration
├── mkdocs-src/
│   ├── index.md                  ← Startseite
│   ├── user-guide/
│   │   ├── index.md              ← User-Guide Uebersicht
│   │   ├── erste-schritte.md
│   │   ├── funktionen.md
│   │   └── faq.md
│   ├── admin-guide/
│   │   ├── index.md              ← Admin-Guide Uebersicht
│   │   ├── installation.md
│   │   ├── konfiguration.md
│   │   ├── betrieb.md
│   │   └── troubleshooting.md
│   ├── screenshots/              ← Symlink oder Kopie
│   └── assets/
│       └── logo.png              ← Falls vorhanden
```

## mkdocs.yml Template

```yaml
site_name: "[App-Name] Dokumentation"
site_description: "User- und Admin-Dokumentation"
docs_dir: mkdocs-src

theme:
  name: material
  language: de                      # oder en
  palette:
    - scheme: default
      primary: custom               # Falls Corporate Styling
      accent: custom
  logo: assets/logo.png            # Falls vorhanden
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - search.suggest
    - search.highlight
    - content.code.copy

nav:
  - Start: index.md
  - Benutzerhandbuch:
    - Uebersicht: user-guide/index.md
    - Erste Schritte: user-guide/erste-schritte.md
    - Funktionen: user-guide/funktionen.md
    - FAQ: user-guide/faq.md
  - Administrationshandbuch:
    - Uebersicht: admin-guide/index.md
    - Installation: admin-guide/installation.md
    - Konfiguration: admin-guide/konfiguration.md
    - Betrieb: admin-guide/betrieb.md
    - Troubleshooting: admin-guide/troubleshooting.md

markdown_extensions:
  - admonition
  - pymdownx.details
  - pymdownx.superfences
  - pymdownx.tabbed:
      alternate_style: true
  - attr_list
  - md_in_html
  - tables

plugins:
  - search
```

## Corporate Styling in MkDocs

Wenn `docs/docgen-style.yaml` existiert, eine `extra.css` generieren:

```
docs/mkdocs-src/assets/extra.css
```

Inhalt aus der Style-Config ableiten:

```css
:root {
  --md-primary-fg-color: #1a73e8;       /* colors.primary */
  --md-accent-fg-color: #34a853;        /* colors.secondary */
}

.md-header, .md-tabs {
  background-color: var(--md-primary-fg-color);
}
```

Und in mkdocs.yml referenzieren:

```yaml
extra_css:
  - assets/extra.css
```

## Befehle fuer den Nutzer

```bash
# Lokale Vorschau
cd docs && mkdocs serve
# → http://localhost:8000

# Statische Site bauen
cd docs && mkdocs build
# → Ausgabe in docs/site/

# Auf GitHub Pages deployen
cd docs && mkdocs gh-deploy
```
