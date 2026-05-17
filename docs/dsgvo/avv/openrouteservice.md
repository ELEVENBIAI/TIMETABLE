# AVV-Template — OpenRouteService (HeiGIT)

> **Vorlage v0.5.3 (ELE-187)** — vor Vertragsabschluss durch DSB/Anwalt prüfen lassen.
> Diese Vorlage stellt die Mindestanforderungen nach Art. 28 DSGVO dar, ist aber kein finaler Vertragstext.

## Parteien

**Verantwortlicher (Auftraggeber):**
`<Firmenname>`, `<Anschrift>`, vertreten durch `<GF>`

**Auftragsverarbeiter:**
Heidelberg Institute for Geoinformation Technology (HeiGIT) gGmbH
Schloss-Wolfsbrunnenweg 33, 69118 Heidelberg, Deutschland
Vertreter laut Impressum unter https://openrouteservice.org/

## 1. Gegenstand und Dauer

**Gegenstand:** Berechnung von Routen, Distanzen und Zeitschätzungen für Service-Aufträge anhand vom Auftraggeber übermittelter Adressdaten via OpenRouteService-API.

**Dauer:** Solange der Auftraggeber den Dienst nutzt; Kündigung jederzeit durch Beendigung der API-Nutzung.

## 2. Art und Zweck der Datenverarbeitung

- **Art:** Übermittlung von Adresskoordinaten an die ORS-API, Empfang von Routing-Antworten
- **Zweck:** Routenberechnung für Wochenplanung der Hausmeister-Tätigkeiten

## 3. Kategorien betroffener Personen

- Mitarbeiter des Auftraggebers (Start-/Ziel-Adressen)
- Eigentümer/Mieter der bedienten Liegenschaften (Ziel-Adressen)

## 4. Kategorien personenbezogener Daten

- Adressen (Straße, PLZ, Ort) zur Geocodierung
- Geokoordinaten

Keine direkten Personen-Identifikatoren (Name, E-Mail, Tel.) — nur indirekt über Adresse.

## 5. Pflichten des Auftragsverarbeiters

Der Auftragsverarbeiter verpflichtet sich:

a) Daten nur nach Weisung des Auftraggebers zu verarbeiten
b) Zur Vertraulichkeit verpflichtete Mitarbeiter einzusetzen
c) Technisch-organisatorische Maßnahmen nach Art. 32 DSGVO zu treffen
d) Bei Subunternehmern (Sub-Auftragsverarbeitern) den Auftraggeber zu informieren und gleichwertige Verpflichtungen weiterzugeben
e) Datenschutzverletzungen unverzüglich (binnen 72h) zu melden
f) Nach Vertragsende personenbezogene Daten zu löschen oder zurückzugeben

## 6. Technisch-organisatorische Maßnahmen

Siehe ORS-Datenschutzhinweise unter https://openrouteservice.org/privacy/ (Stand prüfen!).

Kern:

- TLS-Verschlüsselung für API-Calls
- API-Logs ≤ 30 Tage
- Hosting in Deutschland (Heidelberg)

## 7. Unterauftragsverarbeiter

Falls ORS Subdienste nutzt: aktuelle Liste vom Auftragsverarbeiter einzuholen und im internen Verarbeitungsverzeichnis zu pflegen.

## 8. Rechte der betroffenen Personen

Auftragsverarbeiter unterstützt Auftraggeber bei Auskunft, Berichtigung, Löschung, Einschränkung, Übertragbarkeit und Widerspruch.

## 9. Datenschutz-Folgenabschätzung (DPIA)

Bei Bedarf unterstützt der Auftragsverarbeiter den Auftraggeber bei der DPIA gem. Art. 35 DSGVO.

## 10. Beendigung des Auftrags

Nach Ende der API-Nutzung werden keine personenbezogenen Daten beim Auftragsverarbeiter weiter gespeichert (sofern keine gesetzliche Aufbewahrungspflicht).

## 11. Haftung

Gemäß Art. 82 DSGVO. Auftragsverarbeiter haftet für Schäden aus der Verarbeitung nur, wenn er DSGVO-Pflichten verletzt oder gegen Weisungen des Auftraggebers gehandelt hat.

## 12. Schlussbestimmungen

Gerichtsstand: `<Sitz des Auftraggebers oder Heidelberg>`
Bei Widersprüchen zwischen diesem AVV und dem Hauptvertrag: AVV geht vor.

---

**Unterschriften:**

`<Datum / Auftraggeber>` ************\_\_\_\_************

`<Datum / Auftragsverarbeiter>` ************\_\_\_\_************
