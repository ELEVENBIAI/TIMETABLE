# ADR-19 — Reassignment-Scoring-Gewichte

**Status:** Accepted
**Datum:** 2026-05-17
**Issue:** ELE-190
**Verwandt:** ADR-04 (Regelbasiertes Scoring statt LLM), Wave-3-Story ELE-196 (Reassignment-Engine)
**Stand:** v0.5.6

## Kontext

ADR-04 hat die strategische Entscheidung getroffen: Vertretungsvorschläge bei Krankmeldung kommen aus einem **regelbasierten Scoring**, nicht aus einem LLM. Die fünf Faktoren stehen seit dem ersten Konzept (Kapazität, Nähe, Qualifikation, Erfahrung, Fairness), aber die konkreten **Gewichte** und Skalierungs-Regeln waren bisher nur in ADR-04 als Beifang erwähnt, ohne eigenes Audit-Trail.

Vor der Implementierung der Engine (ELE-196) braucht es:

1. **Eindeutige Gewichte** als Konstanten in `lib/config.js` — kein Magic-Number im Code
2. **Begründung** pro Gewicht — warum 30 für Kapazität, nicht 35? Damit bei späteren Anpassungen klar ist was ursprünglich gemeint war
3. **Anpassungs-Workflow** — wer darf wann ändern, wie testen?
4. **Feedback-Loop** — wie wissen wir ob die Gewichte gut sind?
5. **Equipment-Behandlung** — Hard-Filter vs 6. Faktor?

Tech-Debt-Punkt C aus Architecture-Review 2026-05-16.

## Die fünf Score-Faktoren + Initiale Gewichte

Summe muss = 100 ergeben (`WEIGHT_TOTAL_SANITY` Constraint).

| Faktor            | Gewicht | Skalierung (0-100)                                                                                | Warum dieser Gewicht                                                                                                                                                                                                                   |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kapazität**     | **30**  | `100 - (geplante_stunden / vertragsstunden) * 100`; clamped 0..100                                | Wichtigster Faktor. Wer schon 38/40h hat, dem darf man nichts mehr aufladen. Wer 20/40h hat, ist offen. Überlastung ist die hauptsächliche Quelle für Krankmeldungen → Kapazität führt.                                                |
| **Nähe**          | **25**  | `100 - clamp(haversine_km / MAX_USEFUL_KM, 0, 1) * 100` mit `MAX_USEFUL_KM = 20`                  | Zweitwichtigster. Ein Mitarbeiter der 30 km fahren muss kostet Zeit, Sprit, Frust. Pilot ist Köln (4 Properties innerhalb ~10 km), daher 20 km als Sättigung. Wird mit ELE-191 (Hosting-Decision) ggf. dynamisch pro Region anpassbar. |
| **Qualifikation** | **20**  | `(level_actual / level_max) * 100` wobei `level: BASIC=1, INTERMEDIATE=2, EXPERT=3, MASTER=4`     | Drittwichtigster. Qualifikation muss mindestens BASIC sein (Hard-Filter `MIN_QUALIFICATION_LEVEL`), aber höher = besser. Beispiel: Treppenhaus-Reinigung mit Sachkundenachweis-EXPERT > nur BASIC.                                     |
| **Erfahrung**     | **15**  | `min(monate_im_objekt / 6, 1) * 100` (Sättigung nach 6 Monaten)                                   | Wer die Property schon kennt, braucht keine Einarbeitung. Aber Erfahrung sättigt schnell — nach 6 Monaten weiß der Mitarbeiter die Wege.                                                                                               |
| **Fairness**      | **10**  | `100 - (vertretungen_letzte_4_wochen / MAX_FAIR_VERTRETUNGEN) * 100`, `MAX_FAIR_VERTRETUNGEN = 8` | Anti-Burnout. Wer schon oft eingesprungen ist, soll nicht jedes Mal gefragt werden. Soft-Faktor, niedrigstes Gewicht weil es eher ein Tie-Breaker ist als ein Haupt-Argument.                                                          |

**Score-Formel:**

```
score = (capacity * 30 + proximity * 25 + qualification * 20 + experience * 15 + fairness * 10) / 100
```

Ergebnis liegt zwischen 0 und 100. Unter `MIN_SCORE_TO_SUGGEST = 40` wird **kein** Vorschlag gemacht (lieber keine Empfehlung als eine schlechte). Robert bekommt die Top-`MAX_SUGGESTIONS = 3` Kandidaten als Liste mit Score + Begründungstext.

## Equipment-Behandlung — Hard-Filter, kein 6. Faktor

**Entscheidung:** Equipment-Constraints sind **Hard-Filter** vor dem Scoring, kein eigener Score-Faktor.

**Begründung:**

- Equipment ist binär: Mitarbeiter hat die Hochdruckreiniger-Düse für Hofflächenpflege — oder nicht. Eine Score-Skala "wie sehr hat er die Düse?" macht keinen Sinn.
- Wenn man Equipment ins Scoring nimmt: ein hochkapazitiver, naher Mitarbeiter mit ALLE-Equipment-fehlend bekommt trotzdem 70/100 — das wäre irreführend.
- Hard-Filter ist die intuitive Lese-Reihenfolge: "Wer könnte überhaupt? Davon: Wer am besten?"

**Override:** ADMIN bekommt einen "Equipment-Constraint ignorieren"-Toggle in der Vorschlags-Anzeige. Sinnvoll wenn:

- Equipment lässt sich für die Schicht ausleihen
- Der eigentlich Vorgesehene das Equipment dem Vertreter übergibt

Standard ist `EQUIPMENT_HARD_FILTER = true`. ADMIN-Override wird im `REASSIGNMENT_LOG.metadata` festgehalten.

## Qualifikations-Behandlung — Hybrid

**Hard-Filter:** Mindest-Level für die Tätigkeit muss erreicht sein. `MIN_QUALIFICATION_LEVEL = 'BASIC'`. Wer keinen Sachkundenachweis für Hofflächenpflege hat, kommt nicht auf die Liste.

**Score-Faktor:** Über dem Mindest-Level skaliert weiter — INTERMEDIATE ist besser als BASIC, EXPERT besser als INTERMEDIATE. Gewicht 20.

Das ist anders als Equipment weil Qualifikation eine Spektrum-Eigenschaft ist (man kann etwas "gut" oder "sehr gut" können), Equipment dagegen ein Besitz-Zustand.

## Begründungstext-Template

Pro Vorschlag wird neben dem numerischen Score ein **menschenlesbarer Begründungstext** generiert (kein LLM, sondern strukturiertes Template):

```
Anna S. (Score 78/100)
- Kapazität: 22/30 — aktuell 15/20 h verplant, gute Reserve
- Nähe: 21/25 — wohnt 2 km entfernt
- Qualifikation: 13/20 — Treppenhaus-Reinigung INTERMEDIATE
- Erfahrung: 12/15 — kennt das Objekt seit 8 Monaten
- Fairness: 10/10 — letzte Vertretung war vor 5 Wochen
```

Vorteil gegenüber LLM-Begründung: deterministisch, schnell, kostenlos, in beiden Locale-Sprachen (en/de) per i18next-Templates. Implementation kommt mit ELE-196.

## Anpassungs-Workflow

**Wer darf ändern:**

- `SUPER_ADMIN` jederzeit
- `ADMIN` nur via Pull-Request gegen `lib/config.js` (Code-Review-Pflicht)
- Keine Runtime-API zum Ändern der Gewichte — Änderungen erfordern Deploy

**Wie testen:**

1. Pull-Request mit neuen Gewichten + ADR-Update (warum-Änderung)
2. Test gegen historische REASSIGNMENT_LOG-Daten: Wie hätten die neuen Gewichte die letzten 30 Vorschläge sortiert? Welche User hätten andere Empfehlungen bekommen?
3. A/B-Test in Production via Feature-Flag `FEATURES.SCORING_VARIANT` (kommt mit ELE-196 — bis dahin nur ein Set Gewichte)
4. Acceptance-Rate vor/nach vergleichen — gleiche Periode (4 Wochen)
5. Bei Verschlechterung > 5 %: Rollback

**Wann ändern:**

- Nicht häufiger als alle 90 Tage (gibt der Statistik Zeit zu greifen)
- Größere Sprünge (> 10 Punkte pro Faktor) müssen via ADR-Append begründet sein
- Bei Pilot-Wechsel (neue Tenant) — Gewichte können tenant-spezifisch werden (Wave 5+)

## Feedback-Loop aus REASSIGNMENT_LOG

Die Tabelle `reassignment_log` (Schicht 5, Migration 0005) hat ein Feld `was_accepted BOOLEAN`. Damit kann man messen ob ein Vorschlag tatsächlich angenommen wurde oder Robert lieber jemand anderen gewählt hat.

**KPIs für die Tuning-Diskussion:**

1. **Top-1-Acceptance-Rate:** Wie oft wird der vom System bestplatzierte Vorschlag angenommen? Ziel ≥ 60 %.
2. **Top-3-Acceptance-Rate:** Wie oft ist der angenommene Kandidat unter den Top 3? Ziel ≥ 85 %.
3. **Override-Rate:** Wie oft wählt Robert einen Kandidaten der NICHT vom System vorgeschlagen wurde? Ziel ≤ 10 %.
4. **Faktor-Korrelation:** Welche Faktoren waren bei akzeptierten Vorschlägen stark, welche bei abgelehnten? Hinweis auf Über-/Untergewichtung.

**Aggregation:**

- Wöchentlicher Bericht in `/settings/reassignment-stats` (ADMIN-Page, kommt mit ELE-196)
- Monatlich manueller Review durch SUPER_ADMIN, Anpassungen nur quartalsweise

## Konkrete Konstanten — `lib/config.js`

```js
const REASSIGNMENT_SCORING = {
  // Initiale Gewichte (Summe 100 — geprüft durch WEIGHT_TOTAL_SANITY)
  WEIGHTS: {
    capacity: 30,
    proximity: 25,
    qualification: 20,
    experience: 15,
    fairness: 10,
  },
  WEIGHT_TOTAL_SANITY: 100,

  // Schwellwerte
  MIN_SCORE_TO_SUGGEST: 40, // unter dem: kein Vorschlag
  MAX_SUGGESTIONS: 3, // Top-N für Robert

  // Skalierungs-Sättigungen
  MAX_USEFUL_KM: 20, // Nähe-Score sättigt bei 20 km
  EXPERIENCE_SATURATION_MONTHS: 6, // Erfahrung sättigt nach 6 Mon
  FAIR_LOOKBACK_WEEKS: 4, // Fairness-Fenster
  MAX_FAIR_VERTRETUNGEN: 8, // Fairness-Score-Boden

  // Hard-Filter
  EQUIPMENT_HARD_FILTER: true, // Default; ADMIN-Override pro Vorschlag möglich
  MIN_QUALIFICATION_LEVEL: 'BASIC', // unter dem Level kein Kandidat
};
```

## Konsequenzen

### Positiv

- ADR + Konstanten an einem Ort, kein Magic-Number-Drift
- Spätere Tuning-Diskussion hat eine klare Mess-Grundlage (Acceptance-Rate)
- Equipment-Hard-Filter-Entscheidung dokumentiert, kein Stochern im Dunkeln bei der Engine-Implementierung
- TypeScript-typisierte Konstanten via `backend/src/config.ts`

### Negativ / Risiken

- Initiale Gewichte sind **Hypothesen**, basierend auf Operator-Intuition. Echte Validierung kommt erst nach 50+ Vorschlägen im Pilot.
- A/B-Test-Framework ist noch nicht da → erste Tuning-Iteration ist "All-In" (alle User auf neue Gewichte). Akzeptables Risiko für Pilot-Größe.
- Wenn der Pilot expandiert (mehrere Tenants), könnte tenant-spezifisches Tuning nötig werden — ist im Anpassungs-Workflow erwähnt aber nicht implementiert.

## Verwandte ADRs

- **ADR-04** — Regelbasiertes Scoring statt LLM (übergeordnete Strategie)
- **ADR-12** — Feature-Flags (für späteres A/B-Test-Framework)
- **ADR-15** — Logging (REASSIGNMENT_LOG-Pattern für Feedback-Loop)

## Out of Scope

- **Reassignment-Engine-Implementation** — kommt mit ELE-196
- **A/B-Test-Framework** — ELE-196 oder später (Wave 4+ wenn Pilot-Volumen es rechtfertigt)
- **Tenant-spezifische Gewichte** — Wave 5+ (Franchise-Expansion)
- **ML-basiertes Auto-Tuning** — Wave 6+
- **Begründungs-Templates in i18n** — ELE-196 (Engine bringt die Strings mit)
