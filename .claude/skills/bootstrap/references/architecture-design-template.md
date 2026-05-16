# Architecture Design Template

> **Verwendung:** Dieses Template wird in Phase 1 des `/bootstrap` Skills erzeugt.
> Alle `{{PLATZHALTER}}` werden mit Projekt-Infos aus Phase 0 befüllt.
> `ARCHITECTURE_DESIGN.md` ist laut CLAUDE.md das **Einstiegsdokument** — jede neue
> Komponente wird zuerst hier eingetragen, vor dem git commit.

---

# {{PROJECT_NAME}} — Architecture Design

**Version:** {{VERSION_START}} | **Stand:** {{TODAY}}
**Besitzer:** {{OWNER_NAME}}

> **Einstiegsdokument.** Jede neue Komponente und jedes neue File wird hier zuerst
> eingetragen — vor dem git commit.

---

## Big Picture

[Systemkarte — Übersicht aller Komponenten und ihrer Verbindungen.
ASCII-Diagramm oder beschreibender Text wenn das System noch klein ist.]

```
[Komponente A] → [Komponente B] → [Output]
      ↑
[Externe API]
```

---

## Design-Rationale ("Das Warum")

[Begründung der wesentlichen Architekturentscheidungen.
Warum dieser Stack? Warum diese Struktur?
Beantwortet "Warum haben wir X so gebaut?" für neue Entwickler und KI-Assistenten.]

| Entscheidung | Begründung | Alternative verworfen |
|-------------|------------|----------------------|
| [z.B. Node.js statt Python] | [Begründung] | [Was wurde verworfen und warum] |

---

## ADR — Architecture Decision Records

> ADRs dokumentieren wichtige Architekturentscheidungen mit Kontext, Entscheidung und Konsequenzen.
> **Status:** Proposed → Active → Deprecated

| ADR | Titel | Status | Datum |
|-----|-------|--------|-------|
| ADR-01 | [Erste Architekturentscheidung] | Active | {{TODAY}} |

### ADR-01: [Titel]

**Status:** Active | **Datum:** {{TODAY}}

**Kontext:** [Welches Problem oder welche Situation hat diese Entscheidung erzwungen?]

**Entscheidung:** [Was wurde entschieden?]

**Konsequenzen:**
- ✅ [Positiver Effekt]
- ⚠️ [Einschränkung oder Trade-off]

---

## Komponenten-Übersicht

> Jede neue Komponente MUSS hier eingetragen werden — vor dem git commit.

| Komponente | Datei/Pfad | Verantwortlichkeit | Abhängigkeiten |
|-----------|-----------|-------------------|----------------|
| Config (SSoT) | `lib/config.js` | VERSION, DOC_FILES, Projekt-Config | — |
| [Neue Komponente] | `[Pfad]` | [Was macht sie?] | [Welche anderen Komponenten braucht sie?] |

---

## Qualitäts-Dimensionen

> Bei jeder Story gegen diese Dimensionen prüfen (Architecture Review):

| # | Dimension | Fragen für dieses Projekt |
|---|-----------|--------------------------|
| 1 | **Reliability** | Graceful Degradation? Kill-Switch vorhanden? |
| 2 | **Data Integrity** | SSoT eingehalten? Kein Dual-Write? |
| 3 | **Security** | API-Keys in .env? Inputs validiert? |
| 4 | **Performance** | Latenz akzeptabel? Rate Limits? Memory stabil? |
| 5 | **Observability** | Logging? Alerts konfiguriert? |
| 6 | **Maintainability** | Keine Code-Duplikation? Config SSoT? Doku aktuell? |
| 7 | **Cost Efficiency** | API-Kosten kalkuliert? Günstigere Alternative? |
| 8 | **Domain Quality** | Verbessert Kern-Qualität des Projekts? |

---

## Referenzen

> Links zu allen verknüpften Architecture-Dokumenten — SSoT für Querverweise.

| Dokument | Pfad | Inhalt |
|----------|------|--------|
| System-Architektur | `SYSTEM_ARCHITECTURE.md` | Komponenten, Datenfluss |
| Komponenten-Inventar | `COMPONENT_INVENTORY.md` | Detaillierte Komponentenliste |
| Governance | `GOVERNANCE.md` | Framework-Regeln, ADRs |
| API-Inventar | `API_INVENTORY.md` | Externe APIs (Update-Pflicht!) |
| Prozess-Katalog | `PROCESS_CATALOG.md` | Wie das System arbeitet |

---

*Aktualisiert bei jeder Architekturentscheidung durch Claude Code.*
