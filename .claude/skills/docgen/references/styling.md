# Corporate Styling

## Style-Konfiguration: `docs/docgen-style.yaml`

Der Nutzer kann im Projekt eine Datei `docs/docgen-style.yaml` ablegen, die das
Erscheinungsbild aller generierten Dokumente steuert.

### Format

```yaml
# docs/docgen-style.yaml
company:
  name: "ACME Corp"
  logo: "docs/assets/logo.png"          # Pfad relativ zum Projekt-Root
  logo_width: "150px"                    # Breite im Dokument

colors:
  primary: "#1a73e8"                     # Hauptfarbe (Ueberschriften, Links)
  secondary: "#34a853"                   # Akzentfarbe
  background: "#ffffff"                  # Hintergrund
  text: "#333333"                        # Textfarbe

fonts:
  heading: "Roboto"                      # Ueberschriften-Schrift
  body: "Open Sans"                      # Fliesstext-Schrift
  code: "Fira Code"                      # Code-Schrift

footer:
  text: "© 2026 ACME Corp — Vertraulich"
  show_date: true                        # Erstellungsdatum im Footer
  show_version: true                     # Projekt-Version im Footer

cover:
  title: ""                              # Leer = App-Name aus package.json
  subtitle: "Benutzerhandbuch"           # Wird fuer jedes Dokument angepasst
  background_color: "#1a73e8"            # Cover-Hintergrund
  text_color: "#ffffff"                  # Cover-Textfarbe
```

### Wo wird das Styling angewendet?

| Feld | Markdown | MkDocs | Word |
|------|----------|--------|------|
| Logo | Header-Bild | Navbar-Logo | Titelseite + Header |
| Farben | — | Theme-Palette | Ueberschriften, Links |
| Fonts | — | Extra-CSS | Dokument-Schriften |
| Footer | Letzte Zeile | Footer-Config | Seitenfuss |
| Cover | — | — | Titelseite |

### Verhalten ohne Style-Datei

Wenn keine `docs/docgen-style.yaml` existiert:
- MkDocs: Standard Material-Theme (blau)
- Word: Pandoc-Standard oder `docs/reference.docx` falls vorhanden
- Markdown: Keine Aenderung (kein Styling moeglich)

### Logo-Anforderungen

- Format: PNG oder SVG bevorzugt
- Aufloesung: Mindestens 300px breit
- Hintergrund: Transparent empfohlen
- Ablage: `docs/assets/logo.png` (Konvention)
