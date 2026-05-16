---
name: research
description: |
  Deep Research Skill: Kombiniert Claude WebSearch + Perplexity via OpenRouter fuer umfassende Recherchen.
  Automatisches 2-Tier-Routing: QUICK (WebSearch) fuer einfache Fakten, DEEP (perplexity/sonar-deep-research
  via OpenRouter + WebSearch Gegencheck) fuer komplexe Analysen. Verwenden wenn der Nutzer "research", "recherchiere",
  "finde heraus", "was wissen wir ueber", "deep research", "analysiere" oder "/research" sagt.
version: 1.1.0
requires_secrets:
  - key: OPENROUTER_API_KEY
    service: OpenRouter
    url: https://openrouter.ai/keys
    description: OpenRouter API Key — routet zu perplexity/sonar-deep-research. Kein separater Perplexity-Key noetig.
    hint: "Eintragen in .env als OPENROUTER_API_KEY"
    required: true
---

# Deep Research

Zwei Suchquellen kombinieren fuer zuverlaessige, quellengestuetzte Recherchen.

## 2-Tier-Routing

Komplexitaet der Frage analysieren, dann automatisch routen:

### QUICK (Default)
- **Wann:** Fakten-Checks, aktuelle Preise/Daten, "Was ist X?", kurze Antworten
- **Quellen:** Claude WebSearch (1-3 parallele Suchen)
- **Dauer:** Sekunden
- **Kosten:** $0 (eingebaut)

### DEEP (bei komplexen Fragen oder explizit "/research deep ...")
- **Wann:** Marktanalysen, Vergleiche, "Wie funktioniert X im Detail?", Multi-Aspekt-Fragen, alles wo der Nutzer explizit "deep" sagt
- **Quellen:** perplexity/sonar-deep-research via OpenRouter PLUS Claude WebSearch parallel (Gegencheck/Ergaenzung)
- **Dauer:** 30-120 Sekunden
- **Kosten:** ~$0.01-0.05 pro Anfrage (OPENROUTER_API_KEY — kein separater Perplexity-Key noetig)

### Routing-Entscheidung
Automatisch DEEP waehlen wenn:
- Frage enthaelt Vergleiche ("X vs Y", "Alternativen zu")
- Frage erfordert Multi-Aspekt-Analyse ("Vor- und Nachteile", "Architektur von")
- Frage betrifft aktuelle Marktdaten mit Kontext ("Wie entwickelt sich X und warum")
- Nutzer sagt explizit "deep", "ausfuehrlich", "im Detail"

## Workflow

### Schritt 1: Fragestellung schaerfen
- Was genau soll recherchiert werden?
- Welcher Kontext ist relevant?
- Falls unklar: Rueckfrage an den Nutzer

### Schritt 2: Tier waehlen + recherchieren

**QUICK:**
1. WebSearch mit 1-3 gezielten Suchbegriffen (parallel)
2. Relevante Ergebnisse extrahieren und zusammenfuehren

**DEEP:**
1. perplexity/sonar-deep-research via OpenRouter aufrufen (siehe [references/perplexity-api.md](references/perplexity-api.md)) — nutzt OPENROUTER_API_KEY
2. Parallel: WebSearch fuer Gegencheck/Ergaenzung (andere Suchbegriffe als Perplexity)
3. Ergebnisse zusammenfuehren, Widersprueche markieren

### Schritt 3: Ergebnis strukturieren

Jede Research-Antwort MUSS enthalten:

1. **Zusammenfassung** — 2-3 Saetze, direkte Antwort auf die Frage
2. **Details** — Strukturiert nach Aspekten der Frage. Bei APIs: Endpoints, Auth, Rate Limits, Kosten. Bei Technologien: Architektur, Vor/Nachteile, Alternativen.
3. **Quellen** — URLs mit Titel, getrennt nach Herkunft:
   - `[WebSearch]` Titel — URL
   - `[OpenRouter/Perplexity]` Titel — URL
4. **Confidence** — high / medium / low (basierend auf Quellenueberein­stimmung)
5. **Tier** — Welcher Tier genutzt wurde und warum

### Schritt 4: Kontext bewahren
- Research-Ergebnisse als Rohdaten + Synthese liefern
- Den laufenden Kontext der uebergeordneten Aufgabe NICHT ueberschreiben
- Wenn der Research-Skill aus `/ideation` heraus genutzt wird: Ergebnisse zurueckgeben, nicht die Story schreiben
