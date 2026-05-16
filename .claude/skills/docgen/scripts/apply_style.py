"""
Wendet Corporate Styling aus docgen-style.yaml auf ein Pandoc Reference-Doc an.

Abhaengigkeiten: pip install python-docx pyyaml Pillow

Aufruf:
    python apply_style.py --style docs/docgen-style.yaml --reference docs/reference.docx
"""

import argparse
import sys
from pathlib import Path

def load_env():
    """Load .env from project root (traverse upward)."""
    current = Path(__file__).resolve()
    for _ in range(10):
        current = current.parent
        env_path = current / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        import os
                        key, value = line.split("=", 1)
                        os.environ.setdefault(key.strip(), value.strip().strip('"\''))
            return True
    return False


def parse_color(hex_color: str):
    """Convert '#1a73e8' to RGBColor."""
    from docx.shared import RGBColor
    hex_color = hex_color.lstrip("#")
    return RGBColor(int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16))


def apply_heading_colors(doc, color):
    """Set color for Heading 1-4 styles."""
    from docx.shared import RGBColor
    rgb = parse_color(color)
    for i in range(1, 5):
        style_name = f"Heading {i}"
        try:
            style = doc.styles[style_name]
            style.font.color.rgb = rgb
        except KeyError:
            pass


def apply_fonts(doc, heading_font: str, body_font: str):
    """Set fonts for headings and body text."""
    # Body / Normal
    try:
        normal = doc.styles["Normal"]
        normal.font.name = body_font
    except KeyError:
        pass

    # Headings
    for i in range(1, 5):
        try:
            style = doc.styles[f"Heading {i}"]
            style.font.name = heading_font
        except KeyError:
            pass


def set_footer(doc, text: str):
    """Set footer text on all sections."""
    for section in doc.sections:
        footer = section.footer
        footer.is_linked_to_previous = False
        if footer.paragraphs:
            footer.paragraphs[0].text = text
        else:
            footer.add_paragraph(text)


def insert_logo_header(doc, logo_path: str, width_px: int = 150):
    """Insert logo into document header."""
    from docx.shared import Px
    logo = Path(logo_path)
    if not logo.exists():
        print(f"WARNUNG: Logo nicht gefunden: {logo_path}", file=sys.stderr)
        return

    for section in doc.sections:
        header = section.header
        header.is_linked_to_previous = False
        paragraph = header.paragraphs[0] if header.paragraphs else header.add_paragraph()
        run = paragraph.add_run()
        run.add_picture(str(logo), width=Px(width_px))


def create_cover_page(doc, config: dict, title: str, subtitle: str):
    """Insert a simple cover page at the beginning."""
    from docx.shared import Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH

    # Insert paragraphs at the start
    cover_elements = []

    # Spacer
    for _ in range(6):
        p = doc.add_paragraph("")
        cover_elements.append(p)

    # Title
    p = doc.add_paragraph(title)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.runs[0]
    run.font.size = Pt(28)
    run.bold = True
    if "colors" in config and "primary" in config["colors"]:
        run.font.color.rgb = parse_color(config["colors"]["primary"])
    cover_elements.append(p)

    # Subtitle
    p = doc.add_paragraph(subtitle)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.runs[0]
    run.font.size = Pt(16)
    cover_elements.append(p)

    # Company name
    if "company" in config and "name" in config["company"]:
        p = doc.add_paragraph("")
        p = doc.add_paragraph(config["company"]["name"])
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.runs[0]
        run.font.size = Pt(12)
        cover_elements.append(p)

    # Page break after cover
    from docx.oxml.ns import qn
    from docx.oxml import OxmlElement
    p = doc.add_paragraph("")
    run = p.add_run()
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    run._element.append(br)

    # Move cover elements to beginning of document
    body = doc.element.body
    for elem in reversed(cover_elements):
        body.insert(0, elem._element)


def main():
    parser = argparse.ArgumentParser(description="Apply corporate styling to Pandoc reference doc")
    parser.add_argument("--style", required=True, help="Path to docgen-style.yaml")
    parser.add_argument("--reference", required=True, help="Path to reference.docx")
    parser.add_argument("--output", help="Output path (default: overwrite reference)")
    parser.add_argument("--title", default="Dokumentation", help="Document title for cover")
    parser.add_argument("--subtitle", default="", help="Document subtitle for cover")
    args = parser.parse_args()

    try:
        import yaml
        from docx import Document
    except ImportError:
        print("Fehlende Abhaengigkeiten. Bitte installieren:", file=sys.stderr)
        print("  pip install python-docx pyyaml Pillow", file=sys.stderr)
        sys.exit(1)

    # Load style config
    style_path = Path(args.style)
    if not style_path.exists():
        print(f"Style-Datei nicht gefunden: {args.style}", file=sys.stderr)
        sys.exit(1)

    with open(style_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    # Load or create reference doc
    ref_path = Path(args.reference)
    if ref_path.exists():
        doc = Document(str(ref_path))
    else:
        doc = Document()

    # Apply colors
    if "colors" in config:
        if "primary" in config["colors"]:
            apply_heading_colors(doc, config["colors"]["primary"])

    # Apply fonts
    if "fonts" in config:
        apply_fonts(
            doc,
            heading_font=config["fonts"].get("heading", "Calibri"),
            body_font=config["fonts"].get("body", "Calibri"),
        )

    # Insert logo
    if "company" in config and "logo" in config["company"]:
        logo_path = config["company"]["logo"]
        width = int(config["company"].get("logo_width", "150").replace("px", ""))
        insert_logo_header(doc, logo_path, width)

    # Set footer
    if "footer" in config and "text" in config["footer"]:
        set_footer(doc, config["footer"]["text"])

    # Save
    output_path = args.output or args.reference
    doc.save(output_path)
    print(f"Reference-Doc gespeichert: {output_path}")


if __name__ == "__main__":
    main()
