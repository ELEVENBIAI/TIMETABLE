# Datenschutzerklärung — Timetable (Mandant: `<TENANT_NAME>`)

> **Vorlage v0.5.3 (ELE-187)** — alle `<Platzhalter>` durch konkrete Werte ersetzen.
> Diese Vorlage ist generisch; sie ersetzt **keine** anwaltliche Prüfung im konkreten Pilot-Fall.

## 1. Verantwortlicher

`<Firmenname>`
`<Straße + Hausnummer>`
`<PLZ + Ort>`
`<Land>`

Vertreten durch: `<Geschäftsführung>`
Telefon: `<Tel>`
E-Mail: `<Kontakt-E-Mail>`

## 2. Datenschutzbeauftragte/r

`<DSB Name>` · `<DSB E-Mail>` · `<DSB Telefon>`
(Bei < 20 Personen-Datenverarbeitenden: ggf. nicht verpflichtend — Rechtsprüfung beachten.)

## 3. Verarbeitungszwecke und Rechtsgrundlagen

| Zweck                             | Daten                                                                            | Rechtsgrundlage                                                  |
| --------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Mitarbeiter-Wochenplanung         | Vor-/Nachname, Anstellungsart, Wochenstunden, Qualifikationen, Tel.-Nr., Adresse | Art. 6 Abs. 1 lit. b DSGVO (Vertragsdurchführung Arbeitsvertrag) |
| Zeiterfassung (geplant)           | Soll-/Ist-Zeiten je Schicht, ggf. GPS-Koordinaten                                | Art. 6 Abs. 1 lit. c DSGVO (Arbeitszeitgesetz)                   |
| Auftragsabwicklung Hausverwaltung | Property-Manager-Daten, Vertragsnummern                                          | Art. 6 Abs. 1 lit. b DSGVO                                       |
| Audit-Trail (DSGVO Art. 30)       | User-ID, Aktion, Ziel-ID, Zeitstempel, IP-Adresse, User-Agent                    | Art. 6 Abs. 1 lit. c DSGVO (Rechenschaftspflicht)                |
| Routing / Navigation              | Adressen → an OpenRouteService gesendet                                          | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse, AVV)         |

## 4. Datenempfänger / Auftragsverarbeiter

- **Hosting-Provider** `<Provider>` — siehe AVV `docs/dsgvo/avv/hosting.md`
- **OpenRouteService (HeiGIT)** — siehe AVV `docs/dsgvo/avv/openrouteservice.md`
- Keine Weitergabe an Drittländer (außerhalb EU/EWR) **außer** wenn unter "Hosting-Provider" explizit benannt mit Schutzmaßnahmen.

## 5. Aufbewahrungsfristen

Konfiguriert in `lib/config.js DSGVO_RETENTION` (technische Umsetzung):

| Datenart                       | Frist      | Mechanismus                                     |
| ------------------------------ | ---------- | ----------------------------------------------- |
| Mitarbeiterdaten nach Austritt | 30 Tage    | Soft-Delete → Hard-Delete via Cron              |
| Zeiterfassungs-Logs (Klartext) | 365 Tage   | Anonymisierung nach Frist                       |
| GPS-Koordinaten                | 90 Tage    | Auf NULL gesetzt durch Cron                     |
| Audit-Log                      | 5 Jahre    | Compliance (HGB + DSGVO Art. 30)                |
| Schedule-Entries (Historie)    | Unbegrenzt | Anonymisierter Personenbezug nach User-Löschung |

## 6. Rechte der betroffenen Person

| Recht                          | Wie auszuüben                                                                |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Auskunft (Art. 15)             | Self-Service: `/settings/data-export` im Mitarbeiter-Account                 |
| Berichtigung (Art. 16)         | Anfrage an `<DSB E-Mail>` oder über Vorgesetzten                             |
| Löschung (Art. 17)             | Self-Service via Profil oder schriftliche Anfrage an `<DSB E-Mail>`          |
| Einschränkung (Art. 18)        | Anfrage an `<DSB E-Mail>`                                                    |
| Datenübertragbarkeit (Art. 20) | `/settings/data-export` liefert ein maschinenlesbares ZIP (JSON + Markdown)  |
| Widerspruch (Art. 21)          | Anfrage an `<DSB E-Mail>`                                                    |
| Beschwerde Aufsichtsbehörde    | Landesdatenschutzbeauftragte/r — Kontaktdaten unter https://www.bfdi.bund.de |

## 7. Cookies und Tracking

Timetable speichert **technisch erforderliche** Daten im `localStorage` des Browsers:

- JWT-Token (Authentifizierung)
- Sprach- und Theme-Präferenz (UX)
- Auth-Flags (Forced-Password-Change-Status)

Keine Analytics-Cookies, keine Drittanbieter-Tracker.

## 8. Sicherheit

- HTTPS verpflichtend (TLS 1.2+)
- Passwort-Hash bcrypt cost 12
- JWT-Secret rotiert (siehe ELE-188)
- Audit-Log Append-Only via DB-GRANT
- RLS-Multi-Tenancy (siehe ADR-02)
- Backups: `<Backup-Strategie laut ADR-12>`

## 9. Stand und Änderungen

Stand: `<DATUM>`
Letzte Änderung: ELE-187 (DSGVO-Workflows) — 2026-05-17
Versions-Tracking: `lib/config.js VERSION`

---

**Hinweise zur Verwendung:**

- Vor Pilot-Launch: rechtliche Prüfung durch Anwalt/DSB
- Im Pilot-Tenant unter `/settings/data-export` als Anhang verlinken
- Bei Cookie-Banner-Pflicht: separate Cookie-Notice ergänzen (technisch erforderlich = kein Banner)
