# AVV-Template — Hosting-Provider

> **Vorlage v0.5.3 (ELE-187)** — Hosting-Entscheidung steht aus (ELE-191).
> Dieses Template wird parametrisiert sobald der Pilot-Hoster feststeht (Hetzner / Fly.io / Railway / etc.).

## Parteien

**Verantwortlicher (Auftraggeber):**
`<Firmenname>`, `<Anschrift>`

**Auftragsverarbeiter (Hosting-Provider):**
`<Provider-Name>`, `<Provider-Anschrift>`, `<HRB/Vertreter>`

## 1. Gegenstand und Dauer

**Gegenstand:** Bereitstellung von Server-, Datenbank- und Speicher-Infrastruktur für den Betrieb der Timetable-Anwendung. Provider verarbeitet personenbezogene Daten ausschließlich für den Auftraggeber.

**Dauer:** Vertragslaufzeit gem. Hauptvertrag.

## 2. Art und Zweck der Datenverarbeitung

- **Art:** Hosting (Compute, DB, Storage, Logs, Backups)
- **Zweck:** Bereitstellung der Anwendung "Timetable" zur Wochenplanung von Hausmeisterdienstleistungen

## 3. Kategorien betroffener Personen

- Mitarbeiter des Auftraggebers
- Verwaltete Liegenschaften (Eigentümer, Mieter)
- Kunden/Property-Manager des Auftraggebers

## 4. Kategorien personenbezogener Daten

- Stammdaten (Name, Adresse, Tel., E-Mail)
- Beschäftigungsdaten (Anstellungsart, Stunden, Qualifikationen)
- Plan-/Zeiterfassungsdaten
- Auth-Daten (E-Mail, Passwort-Hash)
- Audit-Logs (Zugriffe, IP-Adressen)

## 5. Pflichten des Auftragsverarbeiters

a) Verarbeitung nur nach dokumentierter Weisung
b) Verpflichtung der Mitarbeiter zur Vertraulichkeit
c) TOM nach Art. 32 DSGVO inkl.:

- Verschlüsselung at-rest und in-transit
- Zugriffskontrollen mit MFA
- Backup-Strategie (mind. tägliches Snapshot)
- Incident-Response < 24h
  d) Subprozessoren-Liste pflegen und Auftraggeber bei Änderungen informieren (mind. 30 Tage vorher)
  e) DSGVO-Verletzungen binnen 72h melden
  f) Datenlöschung/-rückgabe nach Vertragsende (binnen 30 Tagen)

## 6. Technisch-organisatorische Maßnahmen

Siehe Anhang `<TOM-Beschreibung des Providers>`. Mindeststandard:

- **Zutrittskontrolle:** Rechenzentrum-Zugang nur autorisiertes Personal
- **Zugangskontrolle:** Account-Authentifizierung mit MFA
- **Zugriffskontrolle:** Least-Privilege-Prinzip, Audit-Trail
- **Weitergabekontrolle:** TLS 1.2+ für alle Verbindungen
- **Eingabekontrolle:** Audit-Log aller administrativen Aktionen
- **Verfügbarkeitskontrolle:** Backup, Disaster Recovery, SLA
- **Trennungskontrolle:** Logische Mandantentrennung (RLS in der DB)

## 7. Subprozessoren

Aktuelle Liste vom Auftragsverarbeiter einholen und im Verarbeitungsverzeichnis pflegen.

## 8. Rechte der betroffenen Personen

Auftragsverarbeiter unterstützt Auftraggeber bei Auskunfts-, Berichtigungs-, Löschungs- und Übertragbarkeits-Anfragen.

## 9. Drittländer-Transfer

Verarbeitung **ausschließlich** in der EU/EWR. Falls Subprozessoren außerhalb: nur mit Standardvertragsklauseln (SCC) und Transfer-Impact-Assessment.

## 10. Beendigung

Nach Vertragsende: vollständige Datenlöschung beim Auftragsverarbeiter binnen 30 Tagen, Bestätigung auf Anforderung schriftlich.

## 11. Haftung und Gerichtsstand

Gem. Art. 82 DSGVO. Gerichtsstand: `<Sitz Auftraggeber>`.

---

**Unterschriften:**

`<Datum / Auftraggeber>` ************\_\_\_\_************

`<Datum / Auftragsverarbeiter>` ************\_\_\_\_************
