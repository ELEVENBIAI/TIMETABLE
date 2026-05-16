# Story-Template: Feature / Agent

Jede Feature-Story MUSS folgende Struktur haben.

## Pflicht-Sektionen

### 1. Verfuegbare APIs & Datenquellen
- API-Endpunkte mit URL, Auth, Rate Limits, Kosten
- Response-Format (relevante Felder)
- Free Tier vs. Paid — was brauchen wir?

### 2. Code-Beispiele (Projekt-Pattern)
- Konkrete Abruf-Funktionen im Projekt-Stil
- Error Handling, Timeout, Fallback
- Kein npm wenn stdlib reicht

### 3. Signal-Format & Config-Integration
- Signal-Output JSON (`signals/xyz.json`) im Standard-Format:
  `{ timestamp, agent, score, signal, components, flags }`
- Config-Eintraege: AGENT_WEIGHTS, SIGNAL_FILES
- Tier-Zuordnung (fast/medium/slow)
- Scoring-Logik erklaert

### 4. Architektur-Integration
- ASCII-Diagramm: Datenquellen → Agent → Signal → Supervisor
- Weight im Supervisor, Protected-Agents ja/nein

### 5. Phasen-Plan
- Phase 1 (kostenlos) → Phase 2 (Free APIs) → Phase 3 (Paid optional)

### 6. Abhaengigkeiten (PFLICHT)
```markdown
## Abhaengigkeiten
- Benoetigt: [STORY-XX] (muessen vorher fertig sein)
- Beeinflusst: [STORY-YY] (werden durch diese Story veraendert)

## Position im Gesamtplan
- Reihenfolge: #X/Y | Phase: [Phase-Name]
- Vorgaenger: STORY-XX
- Nachfolger: STORY-ZZ
```

### 7. Acceptance Criteria
- Checkboxen, testbar, konkret

### 8. Dependencies
- Nur wenn stdlib nicht reicht
- Begruendung warum
