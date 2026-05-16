#!/usr/bin/env node
// scripts/linear-tech-debt-issues.mjs
//
// Legt die 6 aufgeschobenen Tech-Debt-Themen aus dem Architecture-Review
// 2026-05-16 als Linear-Issues an (Status: Backlog).
//
// Verwendung:
//   node scripts/linear-tech-debt-issues.mjs dry-run
//   node scripts/linear-tech-debt-issues.mjs apply

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const envContent = readFileSync(path.join(PROJECT_ROOT, '.env'), 'utf8');
const keyMatch = envContent.match(/^\s*LINEAR_API_KEY\s*=\s*(.+?)\s*$/m);
if (!keyMatch) {
  console.error('FEHLER: LINEAR_API_KEY nicht in .env');
  process.exit(1);
}
const LINEAR_API_KEY = keyMatch[1].replace(/^["']|["']$/g, '');

async function gql(query, variables = {}) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: LINEAR_API_KEY },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.errors) throw new Error(`GraphQL: ${JSON.stringify(data.errors, null, 2)}`);
  return data.data;
}

const TEAM_ID = '9b49011f-e099-4acf-809e-bc0bb5e2efa6';
const PROJECT_ID = 'e44df04d-c7b9-456b-bede-e91b868c35be';
const BACKLOG_STATE = '2a45168a-e6b0-41ad-967d-3d7a76af5f3c';

const LABELS = {
  architecture: 'd66693f5-2e17-41b8-bf20-4c00cc903feb',
  feature: '1d2e1441-283e-4165-a6ec-cac677b0f258',
  infra: '4ec33857-79ed-48b4-8af7-3ba36ef73cb6',
  docs: '91070e0c-2d2e-4a4a-9644-1fa6b66666fe',
  privacy: '8914533d-ae68-4910-a543-925ee2a45f5b',
};

const TECH_DEBT = [
  {
    code: 'TD-A',
    title: 'JWT-Secret-Rotation-Strategie (Pre-Pilot)',
    labels: ['architecture', 'infra'],
    body: `
**Wave:** 4 (vor Pilot-Launch) — Hard-Gate
**Aus:** Architecture-Review 2026-05-16, Tech-Debt Punkt A
**Verbunden mit:** ELE-169 (Backend-Skeleton), ELE-170 (Tenants+Users)

## Why

Bei JWT-Secret-Leak gibt es aktuell kein dokumentiertes Verfahren. Folge: Total-Logout aller User, manuelles Rolling, Compliance-Risiko. Vor Pilot mit Echt-Mitarbeitern muss eine Rotation-Strategie stehen.

## What

ADR-16: JWT-Secret-Rotation mit Multi-Secret-Support.

- \`JWT_SECRET_CURRENT\` (Sign + Verify)
- \`JWT_SECRET_PREVIOUS\` (nur Verify, für Übergangszeit ~7 Tage)
- Rotations-Skript \`scripts/rotate-jwt-secret.mjs\` (generiert neues Secret, schiebt current → previous)
- Operator-Doku im README + GOVERNANCE.md
- Optional: Forced-Logout-Endpoint für Notfall

## Akzeptanzkriterien

- [ ] ADR-16 angelegt
- [ ] Backend akzeptiert beide Secrets während Übergang
- [ ] Rotation-Skript getestet (Dry-Run + Apply)
- [ ] Doku im GOVERNANCE.md: Operator-Schritte bei Verdacht / planmäßiger Rotation
- [ ] Vitest: Test dass altes + neues Secret beide funktionieren

## Out of Scope

- Automatische Rotation per Cron (manuell reicht für Pilot)
- HSM / Vault-Integration (Welle 6+)
`.trim(),
  },
  {
    code: 'TD-B',
    title: 'Error-Tracking einrichten (Sentry / GlitchTip / eigenes)',
    labels: ['infra', 'architecture'],
    body: `
**Wave:** 3
**Aus:** Architecture-Review 2026-05-16, Tech-Debt Punkt B
**Verbunden mit:** ELE-169 (Backend-Skeleton)

## Why

Aktuell kein Error-Tracking spezifiziert. Pino-Logs gehen auf stdout — bei Production keine zentrale Sammlung, kein Alarm bei 5xx-Spike, kein Stacktrace-Dedup. Vor Pilot brauchen wir Sichtbarkeit.

## What

Provider-Evaluierung + Setup:

| Option | Pro | Contra |
|--------|-----|--------|
| Sentry SaaS | Best-in-class, Free Tier 5k Errors/Monat | DSGVO: USA-Server, AVV nötig |
| GlitchTip (Sentry-kompatibel, self-hosted) | DSGVO-freundlich, Free | Ops-Overhead |
| Eigenes (Loki + Grafana) | Bereits geplante Tooling-Stack | Mehr Bauaufwand |

Empfehlung in dieser Reihenfolge prüfen. Default-Vorschlag: **GlitchTip** (selbst gehostet, AVV-frei).

## Akzeptanzkriterien

- [ ] ADR mit Provider-Entscheidung
- [ ] Pino-Transport für Errors → Tracking-Service
- [ ] Source-Maps für Frontend hochgeladen
- [ ] Alert bei 5xx-Spike (> 10 in 5 Min) an Telegram/Email
- [ ] Doku im README: wo finde ich Errors?

## Out of Scope

- Performance-Monitoring (kommt mit Grafana-Stack separat, Wave 4)
- User-Feedback-Widget
`.trim(),
  },
  {
    code: 'TD-C',
    title: 'ADR-17: Scoring-Gewichte für Reassignment-Engine',
    labels: ['architecture', 'docs'],
    body: `
**Wave:** 3 (zusammen mit Reassignment-Scoring-Story)
**Aus:** Architecture-Review 2026-05-16, Tech-Debt Punkt C
**Verbunden mit:** zukünftige Wave-3-Story "Reassignment-Scoring" (TT-21)

## Why

Die Gewichte 30/25/20/15/10 für Kapazität/Nähe/Qualifikation/Erfahrung/Fairness stehen in ADR-04, aber ohne ADR-Trail bei späteren Anpassungen kein Begründungs-Audit. Mit Scoring-Story TT-21 muss eigenes ADR begleitend angelegt werden.

## What

ADR-17: Scoring-Gewichte + Begründung + Anpassungsregeln.

- Gewichte initial: 30/25/20/15/10 (Summe 100)
- Equipment als 6. Faktor klären (optional Filter vor Scoring oder Faktor)
- A/B-Test-Mechanismus dokumentieren (wie messen wir ob Gewichte gut sind?)
- Feedback-Loop aus REASSIGNMENT_LOG.WAS_ACCEPTED

## Akzeptanzkriterien

- [ ] ADR-17 dokumentiert die initialen Gewichte mit Rationale
- [ ] Equipment-Behandlung entschieden (Filter vs. 6. Faktor)
- [ ] Anpassungs-Workflow definiert (wer darf wann ändern, wie testen)
- [ ] Scoring-Werte als Konstanten in \`lib/config.js\` (kein hardcoded magic numbers)

## Trigger

Wird mit der Reassignment-Scoring-Story (Wave 3, TT-21) zusammen umgesetzt — nicht eigenständig.
`.trim(),
  },
  {
    code: 'TD-D',
    title: 'Hosting-Provider-Entscheidung + Cost-Schätzung',
    labels: ['infra', 'architecture'],
    body: `
**Wave:** 4 (vor Pilot-Launch)
**Aus:** Architecture-Review 2026-05-16, Tech-Debt Punkt D
**Verbunden mit:** ELE-187 (DSGVO-Workflows — Hosting muss DSGVO-konform sein)

## Why

Tool-Beschreibung sagt "Managed Cloud". Konkret nicht entschieden. Vor Pilot brauchen wir:
- Hosting-Adresse (für Mitarbeiter-DNS)
- AVV mit Hoster (DSGVO)
- Cost-Budget für 2 Jahre

## What

ADR-18: Hosting-Provider.

Optionen evaluieren:

| Provider | Cost (MVP) | DSGVO | Skalierung |
|----------|-----------|-------|------------|
| Hetzner Cloud (CX22) | ~5€/Mt | ✅ (EU) | gut |
| IONOS | ~10€/Mt | ✅ (EU) | gut |
| Render / Fly.io | ~20€/Mt | ⚠ (USA) | sehr gut |
| AWS Frankfurt | ~30€/Mt | ✅ (EU, aber USA-Konzern) | exzellent |

Stack: Docker Compose oder Hetzner App (Coolify, Dokploy).
Backup-Ziel: separates Hetzner Storage-Box-Volume (5€/Mt 1TB).

## Akzeptanzkriterien

- [ ] ADR-18 mit konkreter Provider-Wahl + Begründung
- [ ] Server provisioniert (manuelle Setup ist OK für MVP)
- [ ] Domain konfiguriert
- [ ] AVV mit Hoster unterschrieben
- [ ] Deployment-Doku (deploy.sh oder GitHub-Actions Deploy-Job)
- [ ] DNS für Pilot-URL (z.B. pilot.timetable.elevenbi.de)
- [ ] HTTPS via Let's Encrypt

## Out of Scope

- Multi-Region (Welle 6+)
- Kubernetes (zu früh für MVP)
- CDN (Frontend ist klein, kein Bedarf)
`.trim(),
  },
  {
    code: 'TD-E',
    title: 'KPI-Baseline + Messung MVP-Erfolg definieren',
    labels: ['docs', 'architecture'],
    body: `
**Wave:** 4 (vor Pilot-Launch) — Pflicht
**Aus:** Architecture-Review 2026-05-16, Tech-Debt Punkt E

## Why

WAVE_DEFINITION.md hat "DoD Wave 1" mit qualitativen Bullet-Points, aber keine messbaren KPIs. Ohne Baseline können wir am Ende von Wave 1 nicht sagen ob der Pilot erfolgreich war.

## What

KPI-Tabelle in WAVE_DEFINITION.md ergänzen (oder separates KPI-Dokument).

**Vorschläge zur Diskussion:**

| KPI | Baseline (Ist heute) | Target (Pilot-Ende) | Wie messen |
|-----|----------------------|---------------------|-----------|
| Plan-Erstellungs-Zeit | ~3h (Robert Excel) | < 30 Min | Time-Tracking durch Robert |
| Krankheits-Umplanung | ~45 Min Telefon | < 5 Min | Self-Reported |
| Mobile-Adoption Mitarbeiter | 0% | > 70% Pilot-MA installieren PWA | Linear / Beobachtung |
| Plan-Genauigkeit (Soll-Ist) | unbekannt | Delta < 15% nach 4 Wochen | TIME_LOGS Auswertung |
| User-Satisfaction | unbekannt | > 7/10 NPS-Style Umfrage | Manuelle Umfrage Pilot-Ende |

## Akzeptanzkriterien

- [ ] KPI-Tabelle in WAVE_DEFINITION.md committed
- [ ] Operator-Input zu Targets eingeholt
- [ ] Messmethodik pro KPI dokumentiert
- [ ] Baseline-Measurement vor Pilot-Start (Robert misst seine eigene Zeit für 2 Wochen)
- [ ] Pilot-Ende-Review mit Soll-Ist-Vergleich

## Input gefordert

Operator (René) muss Targets festlegen — als technische Issue allein nicht entscheidbar.
`.trim(),
  },
  {
    code: 'TD-H',
    title: 'CI-Cost-Monitoring (GitHub Actions Free Tier)',
    labels: ['infra'],
    body: `
**Wave:** Nach erstem Production-Monat (Wave 4+)
**Aus:** Architecture-Review 2026-05-16, Tech-Debt Punkt H

## Why

GitHub Actions Free Tier: 2000 Minuten/Monat für Private Repos. Bei vielen E2E-Tests (Playwright × 2 Browser × Workflow) könnte das eng werden. Wir wollen kein "Build kostet plötzlich Geld"-Schock.

## What

CI-Cost-Tracking + Optimierung.

- Tracking: Monatlicher Check der GitHub-Actions-Usage (UI oder API)
- Alarm bei > 60% Free-Tier-Verbrauch
- Optimierungen falls nötig:
  - Selective E2E (nur bei UI-Code-Changes, via path-filter)
  - Backend + Frontend Tests parallelisieren
  - Playwright nur auf chromium-desktop in PRs, Mobile nur in main
  - Caching aggressiver

## Akzeptanzkriterien

- [ ] Monatlicher Check-Termin im Kalender (ersten Werktag)
- [ ] Falls > 60%: Selective-E2E-Logik via \`paths-filter\` Action
- [ ] Doku im README "CI-Performance"

## Trigger

Erst nach 4 Wochen aktivem CI-Lauf relevant. Vor dem ersten Pilot brauchen wir es nicht.
`.trim(),
  },
];

async function createIssue(td, dryRun) {
  const labelIds = td.labels.map((name) => LABELS[name]).filter(Boolean);

  if (dryRun) {
    return {
      dryRun: true,
      code: td.code,
      title: td.title,
      labels: td.labels,
      bodyLen: td.body.length,
    };
  }

  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url project { name } }
      }
    }`,
    {
      input: {
        teamId: TEAM_ID,
        projectId: PROJECT_ID,
        stateId: BACKLOG_STATE,
        title: td.title,
        description: td.body,
        labelIds,
      },
    }
  );
  if (!data.issueCreate.success) throw new Error(`Failed: ${td.code}`);
  return { code: td.code, ...data.issueCreate.issue };
}

const mode = process.argv[2];
if (!['dry-run', 'apply'].includes(mode)) {
  console.error('Usage: node scripts/linear-tech-debt-issues.mjs <dry-run|apply>');
  process.exit(1);
}
const dryRun = mode === 'dry-run';

console.log(`Modus: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
console.log(`Issues: ${TECH_DEBT.length}`);
console.log('');

const results = [];
for (const td of TECH_DEBT) {
  process.stdout.write(`  ${td.code.padEnd(6)} → `);
  try {
    const issue = await createIssue(td, dryRun);
    if (dryRun) {
      console.log(
        `[dry] "${issue.title}" labels=${issue.labels.join(',')} body=${issue.bodyLen}ch`
      );
    } else {
      console.log(`${issue.identifier} ✓ ${issue.url}`);
    }
    results.push({ code: td.code, ...issue });
    await new Promise((r) => setTimeout(r, 150));
  } catch (err) {
    console.log(`FEHLER: ${err.message}`);
    results.push({ code: td.code, error: err.message });
    break;
  }
}

if (!dryRun) {
  const mapping = {};
  results.forEach((r) => {
    if (r.identifier) mapping[r.code] = { identifier: r.identifier, id: r.id, url: r.url };
  });
  const out = path.join(PROJECT_ROOT, 'scripts', 'linear-tech-debt-mapping.json');
  writeFileSync(out, JSON.stringify(mapping, null, 2));
  console.log(`\nMapping gespeichert: ${out}`);
}

console.log('\nFertig.');
