# Word (.docx) Export

## Methode: Pandoc

Pandoc konvertiert Markdown zu Word mit optionalem Style-Template.

### Voraussetzung

```bash
# Windows (winget)
winget install JohnMacFarlane.Pandoc

# Oder: https://pandoc.org/installing.html
```

### Basis-Export (ohne Styling)

```bash
pandoc docs/USER-GUIDE.md \
  -o docs/USER-GUIDE.docx \
  --from markdown \
  --to docx \
  --toc \
  --toc-depth=3 \
  --resource-path=docs

pandoc docs/ADMIN-GUIDE.md \
  -o docs/ADMIN-GUIDE.docx \
  --from markdown \
  --to docx \
  --toc \
  --toc-depth=3 \
  --resource-path=docs
```

### Export mit Corporate Styling (Reference-Doc)

Pandoc nutzt eine `.docx`-Datei als Style-Template ("reference doc").
Darin sind Schriften, Farben, Header/Footer, Titelseite definiert.

```bash
pandoc docs/USER-GUIDE.md \
  -o docs/USER-GUIDE.docx \
  --from markdown \
  --to docx \
  --toc \
  --toc-depth=3 \
  --reference-doc=docs/reference.docx \
  --resource-path=docs
```

## Reference-Doc erstellen

### Option A: Nutzer liefert eigenes `docs/reference.docx`

Der Nutzer legt eine fertig gestylte Word-Vorlage ab. Pandoc uebernimmt daraus:
- Schriftarten und -groessen fuer alle Heading-Ebenen
- Farben fuer Ueberschriften, Links, Code
- Header und Footer (Logo, Seitenzahl, Firmenname)
- Titelseite-Layout
- Seitenraender und Absatzformate

### Option B: Reference-Doc aus Style-Config generieren

Wenn kein `docs/reference.docx` existiert, aber `docs/docgen-style.yaml`:

1. Pandoc-Standard-Reference-Doc extrahieren:
   ```bash
   pandoc -o docs/reference.docx --print-default-data-file reference.docx
   ```

2. Das Reference-Doc per Script anpassen (Farben, Schriften aus Style-Config).
   Dafuer das Script `scripts/apply_style.py` verwenden.

3. Logo einfuegen: In den Header des Reference-Doc.

### Option C: Kein Styling

Ohne `reference.docx` und ohne `docgen-style.yaml` wird der Pandoc-Standard
verwendet (Calibri, blau, kein Logo).

## apply_style.py — Style auf Reference-Doc anwenden

Das Script liest `docs/docgen-style.yaml` und modifiziert `docs/reference.docx`:

Funktionen:
- Ueberschriften-Farben setzen (Heading 1-4)
- Schriftarten aendern (Headings + Body)
- Logo in Header einfuegen
- Footer-Text setzen
- Cover-Seite erstellen (Titel, Untertitel, Logo, Hintergrundfarbe)

Aufruf:
```bash
python docs/scripts/apply_style.py \
  --style docs/docgen-style.yaml \
  --reference docs/reference.docx \
  --output docs/reference.docx
```

Abhaengigkeiten:
```
pip install python-docx pyyaml Pillow
```

## Screenshots in Word

Pandoc bettet Bilder automatisch ein, wenn der `--resource-path` korrekt ist.

Die Markdown-Syntax `![Alt](screenshots/01-dashboard.png)` wird zu einem
eingebetteten Bild im Word-Dokument. Bildgroesse wird von Pandoc automatisch
skaliert — fuer konsistente Groessen im Markdown Breite angeben:

```markdown
![Dashboard](screenshots/01-dashboard.png){width=100%}
```

## Kompletter Workflow

1. Markdown-Docs generieren (Phase 4+5)
2. Falls `docs/docgen-style.yaml` existiert UND kein `docs/reference.docx`:
   → `scripts/apply_style.py` ausfuehren um Reference-Doc zu erstellen
3. Falls `docs/reference.docx` existiert:
   → Pandoc mit `--reference-doc` ausfuehren
4. Sonst:
   → Pandoc ohne Reference-Doc ausfuehren
