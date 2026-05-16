# Timetable — Learnings

> L1 Learning-Loop. Wird nach jedem Sprint-Review befüllt (Pflicht).
> Gelesen von /ideation als Anti-Pattern-Warnung.

---

## Sprint 0 — Setup (2026-05-16)

### Was hat funktioniert

- Bootstrap mit OpenCLAW Governance Framework
- 3-Schichten-Doku (Repo + Obsidian) von Anfang an eingerichtet

### Was nicht funktioniert hat / Probleme

- (noch keine — erster Sprint)

### Nächste Experimente

- Erste Story via /ideation starten
- Governance-Hooks im realen Commit-Flow testen

---

## Sprint 1 — Wave-1 Backend komplett (2026-05-16)

**Ergebnis:** 22 Issues Done (ELE-163..ELE-186 + ELE-194 + ELE-197). DB-Schichten 1-5 + Auth + 16 Stammdaten-CRUDs + Frequenz-Engine + Plan-Generator + Schedule-Templates + Absences mit Side-Effects. 316/316 Tests grün. VERSION 0.1.0 → 0.3.3. Backlog-Hygiene: ELE-196 (Wave 3), ELE-198 (Doku-Backlog) angelegt; TT-21-Verweis aufgelöst.

### Was hat funktioniert

- **Eines nach dem anderen** statt Cluster-Implementation: einmal von Cluster auf Single-Issue-Modus umgeschwenkt (Operator-Feedback nach ELE-178), hat die Qualität sichtbar verbessert. Pro Issue: Spec → Plan → Operator-Freigabe → Implementation → Tests → Doku → Commit → Linear-Done.
- **Pure Functions konsequent separieren** (services/scheduling/\*-pure.ts): Frequenz-Engine + Plan-Generator + Conflict-Check ohne DB-Zugriff testbar. `frequency-engine.test.ts` schaffte 100% Coverage in 23 Tests. Macht Failure-Modes lokal reproduzierbar.
- **Cross-Tenant-FK-Checks im Route-Layer, nicht im Service**: `assertFksInTenant()` als wiederverwendbares Pattern macht RLS sichtbar überprüfbar — wenn ein Test ohne Cross-Tenant-Check geschrieben wird, ist es sofort erkennbar.
- **i18n-Strategie früh festklopfen (ADR-16) zahlt sich aus**: `messageKey` in Errors statt fest übersetzter Texte ermöglicht Late-Binding der Sprache aus JWT/Accept-Language. Bei Locale-Bug-Fix einer einzigen Stelle ist die ganze API betroffen.
- **Atomare Transactions als Default für Multi-Step-Operationen**: Plan-Generator (6 Phasen) + Absence-Side-Effects (POST/DELETE) laufen alle in BEGIN/COMMIT/ROLLBACK. Tests verifizieren explizit dass Rollback bei Conflict greift — kein partial state möglich.
- **Spec-Files BEVOR Code**: spec-gate.sh blockt Commits ohne Spec, das hat in Sprint 1 keine Ausnahme erzwungen — alle 24 Specs sind vorhanden. Der erzwungene Workflow ist gewöhnungsbedürftig aber funktioniert.

### Was nicht funktioniert hat / Probleme

- **ARCHITECTURE_DESIGN.md hatte Strukturlücken (§4-§8) die erst beim Sprint-Review aufgefallen sind.** Der Architecture-Review-Skill verlangt 8 Sektionen, vorhanden waren §1-§3 + §9. Lesson: Bootstrap-Templates der Skills sollten die 8-Sektionen-Skelett-Struktur erzeugen, sonst entsteht die Lücke unbemerkt. Fix: ELE-197 (§4-§6 done), ELE-198 (§7+§8 Backlog).
- **SYSTEM_ARCHITECTURE.md-Status-Tabelle ist beim Sprint-Review nicht aktualisiert worden** — Datenbank stand als "planned (ELE-164 in progress)" obwohl alle Schichten done sind. Status-Tabellen mit dynamischem Inhalt veraltern still. Lösung-Idee: implement-Skill T_last muss Status-Tabellen-Update verpflichtend nachziehen.
- **Coverage-Ordner versehentlich committet** (ELE-184, Commit `c20691a` als Cleanup nötig). `.gitignore` enthielt `coverage/` nicht initial. Lesson: bei `vitest --coverage` produzierte Artifacts vorab in .gitignore aufnehmen — passt jetzt.
- **Verwaiste Referenz "TT-21"** in ELE-185-Spec entstand beim TT-XX→ELE-XXX-Rename — der Reassignment-Engine-Codename wurde nicht migriert. Lesson: bei Bulk-Renames durch komplette spec/\*.md-Referenzen grep-en, nicht nur Datei-Namen. Fix in diesem Sprint via ELE-196.
- **Pg-Connection-Terminierungs-Errors im vitest-Run**: Testcontainer-Shutdown wirft `terminating connection due to administrator command` als "Unhandled Error" obwohl Tests grün sind. Sieht wie 23 Failures aus, sind aber nur Cleanup-Artifacts. Lesson: nicht in Panik geraten, Tests-passed-Zahl prüfen, nicht die "Errors"-Spalte.

### Nächste Experimente (Sprint 2)

- **Frontend-Bootstrap-Issue separat von ELE-180** anlegen. ELE-180 ist als "Wochenplan-Grid" geschnitten, aber `frontend/src/` ist leer — Vite + Tailwind + PWA-Manifest + Router + react-i18next müssen davor. Sonst wird ELE-180 zum Mehrfach-Issue. → ggf. ELE-199 als "Frontend-Bootstrap" anlegen wenn ELE-180 startet.
- **Pre-Pilot-Lücken angehen**: ELE-187 (DSGVO-Workflows) + ELE-188 (JWT-Rotation) + ELE-189 (Error-Tracking) sind technische Blocker vor Production-Deploy. ELE-187 hat den höchsten Compliance-Druck und sollte als nächstes Backend-Issue laufen.
- **KPI-Baseline VOR Frontend** (ELE-192): wenn Frontend ohne Baseline live geht, ist kein Vorher-Nachher messbar.
- **doc-version-sync.sh um Status-Tabellen-Check erweitern**: idee, im Hook zu prüfen ob SYSTEM_ARCHITECTURE.md "planned"-Einträge mit Linear-State "Done" kollidieren. Würde stille Doku-Drift verhindern.
- **DELETE-Hook für DocSync**: bei Issue-Done nicht nur Spec-Status updaten, sondern die Komponente-Doc im Obsidian-Vault auto-syncen. Aktuell manuell.

---

<!-- Template für folgende Sprints:

## Sprint N — [Thema] ([Datum])

### Was hat funktioniert
-

### Was nicht funktioniert hat / Probleme
-

### Nächste Experimente
-

-->
