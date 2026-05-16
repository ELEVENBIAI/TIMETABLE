#!/usr/bin/env node
// scripts/linear-bootstrap-mvp.mjs
//
// Einmaliger Bulk-Setup: Legt die 24 MVP-Specs als Linear-Issues an.
// Liest jede specs/TT-*.md, mapped auf das Linear-Projekt "Timetable",
// vergibt passende Labels, schreibt ein mapping.json mit TT → ELE Zuordnung.
//
// Verwendung:
//   node scripts/linear-bootstrap-mvp.mjs dry-run     — zeigt was angelegt würde
//   node scripts/linear-bootstrap-mvp.mjs apply        — legt wirklich an

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ─── Linear-API (inline, statt Import des Helper-Scripts) ────────────────────

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

// ─── Konstanten (aus Discovery) ──────────────────────────────────────────────

const TEAM_ID = '9b49011f-e099-4acf-809e-bc0bb5e2efa6'; // ELEVENBI
const PROJECT_ID = 'e44df04d-c7b9-456b-bede-e91b868c35be'; // Timetable

const STATES = {
  Backlog: '2a45168a-e6b0-41ad-967d-3d7a76af5f3c',
  Todo: '70c3bb67-9f51-4cca-ab53-707219b18a1b',
  'In Progress': '71afd024-6331-436d-bcb1-b226a0991acf',
  Done: 'b700f52a-4201-4498-8606-3bbfa140dbe4',
};

const LABELS = {
  architecture: 'd66693f5-2e17-41b8-bf20-4c00cc903feb',
  feature: '1d2e1441-283e-4165-a6ec-cac677b0f258',
  refactor: '16eaf812-73e2-44f2-94f5-7411a9c1bce6',
  docs: '91070e0c-2d2e-4a4a-9644-1fa6b66666fe',
  infra: '4ec33857-79ed-48b4-8af7-3ba36ef73cb6',
  privacy: '8914533d-ae68-4910-a543-925ee2a45f5b',
  bug: 'ce127673-a9c8-468a-9f09-eb521927ea03',
};

// ─── Spec → Issue Mapping ────────────────────────────────────────────────────
// Reihenfolge ist relevant — Linear vergibt IDs sequenziell.

const SPECS = [
  {
    spec: 'TT-00',
    title: 'Test-Infrastruktur (Vitest + Playwright + Testcontainers + CI)',
    labels: ['infra'],
    initialState: 'Done',
  },
  {
    spec: 'TT-01a',
    title: 'DB-Schicht 1 — Grunddaten + RLS + DB-Rollen',
    labels: ['infra'],
    initialState: 'In Progress',
  },
  {
    spec: 'TT-01b',
    title: 'DB-Schicht 2 — Fähigkeiten (Qualifikationen, Equipment)',
    labels: ['infra'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-01c',
    title: 'DB-Schicht 3 — Leistungen + Mülltonnen',
    labels: ['infra'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-01d',
    title: 'DB-Schicht 4 — Planung (Templates, Schedules, Absences)',
    labels: ['infra'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-01e',
    title: 'DB-Schicht 5 + Seed inkl. Pilot-Tenant',
    labels: ['infra'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-02',
    title: 'Backend-Skeleton — Fastify + TypeScript + Auth + Swagger',
    labels: ['infra'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-03',
    title: 'Tenants + Users CRUD (inkl. 6 Rollen)',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  { spec: 'TT-04', title: 'Service-Types CRUD', labels: ['feature'], initialState: 'Backlog' },
  {
    spec: 'TT-05',
    title: 'Qualification + Equipment Types CRUD',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-06',
    title: 'Employees CRUD',
    labels: ['feature', 'privacy'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-07',
    title: 'Employee Skills — Qualifications, Equipment, Availability',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-08',
    title: 'Property Managers + Contracts CRUD',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-09',
    title: 'Properties + Property Zones CRUD',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-10',
    title: 'Property Services (Leistungsverzeichnis)',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-11',
    title: 'Waste Bin Types + Waste Schedules',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-12',
    title: 'Schedules + Schedule Entries CRUD',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-13',
    title: 'Wochenplan-Grid-Ansicht (Frontend)',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  { spec: 'TT-14', title: 'Drag-&-Drop-Umplanung', labels: ['feature'], initialState: 'Backlog' },
  {
    spec: 'TT-15',
    title: 'Mobile-Tagesansicht (PWA) — Wave 1 vorgezogen',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-16',
    title: 'Schedule Templates + Template Entries CRUD',
    labels: ['feature'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-17',
    title: 'Frequenz-Engine (Pure Functions)',
    labels: ['feature', 'architecture'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-18',
    title: 'Plan-Generator — Woche aus Template erzeugen (MVP-CUT)',
    labels: ['feature', 'architecture'],
    initialState: 'Backlog',
  },
  {
    spec: 'TT-19',
    title: 'Abwesenheitsverwaltung — ABSENCE_RECORDS CRUD',
    labels: ['feature'],
    initialState: 'Backlog',
  },
];

// ─── Build Description aus Spec-File ─────────────────────────────────────────

function buildDescription(spec) {
  const specPath = path.join(PROJECT_ROOT, 'specs', `${spec}.md`);
  if (!existsSync(specPath)) {
    return `**Spec-File:** \`specs/${spec}.md\` (noch nicht angelegt)`;
  }
  const content = readFileSync(specPath, 'utf8');
  // Linear hat Limit ~32k Zeichen. Kürzen wenn nötig.
  const header = `> **Spec-File (Single Source of Truth):** \`specs/${spec}.md\` im Repo\n> Diese Beschreibung ist eine Kopie — bei Konflikten gilt das Spec-File.\n\n---\n\n`;
  const trimmed =
    content.length > 30000 ? content.slice(0, 30000) + '\n\n…(gekürzt — siehe Spec-File)' : content;
  return header + trimmed;
}

// ─── Issue-Erstellung ────────────────────────────────────────────────────────

async function createIssue(spec, dryRun) {
  const labelIds = spec.labels.map((name) => LABELS[name]).filter(Boolean);
  const stateId = STATES[spec.initialState] ?? STATES.Backlog;
  const description = buildDescription(spec.spec);
  const title = `${spec.spec}: ${spec.title}`;

  if (dryRun) {
    return {
      dryRun: true,
      title,
      labels: spec.labels,
      state: spec.initialState,
      descLen: description.length,
    };
  }

  const data = await gql(
    `mutation($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier title url }
      }
    }`,
    {
      input: {
        teamId: TEAM_ID,
        projectId: PROJECT_ID,
        stateId,
        title,
        description,
        labelIds,
      },
    }
  );

  if (!data.issueCreate.success) {
    throw new Error(`Issue-Create failed for ${spec.spec}`);
  }
  return data.issueCreate.issue;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const mode = process.argv[2];
if (!['dry-run', 'apply'].includes(mode)) {
  console.error('Usage: node scripts/linear-bootstrap-mvp.mjs <dry-run|apply>');
  process.exit(1);
}

const dryRun = mode === 'dry-run';
console.log(
  `Modus: ${dryRun ? 'DRY-RUN (nichts wird gespeichert)' : 'APPLY (Issues werden angelegt)'}`
);
console.log(`Specs: ${SPECS.length}`);
console.log('');

const results = [];

for (const spec of SPECS) {
  process.stdout.write(`  ${spec.spec.padEnd(8)} → `);
  try {
    const issue = await createIssue(spec, dryRun);
    if (dryRun) {
      console.log(
        `[dry] "${issue.title}" labels=${issue.labels.join(',')} state=${issue.state} desc=${issue.descLen}ch`
      );
    } else {
      console.log(`${issue.identifier} ✓ ${issue.url}`);
    }
    results.push({ spec: spec.spec, ...issue });
    // Linear rate-limit-safe pause (50 req/sec laut Docs — wir gehen sehr defensiv vor)
    await new Promise((r) => setTimeout(r, 150));
  } catch (err) {
    console.log(`FEHLER: ${err.message}`);
    results.push({ spec: spec.spec, error: err.message });
    break;
  }
}

// Mapping speichern (nur bei apply)
if (!dryRun) {
  const mapping = {};
  results.forEach((r) => {
    if (r.identifier) {
      mapping[r.spec] = { identifier: r.identifier, id: r.id, url: r.url };
    }
  });
  const out = path.join(PROJECT_ROOT, 'scripts', 'linear-mvp-mapping.json');
  writeFileSync(out, JSON.stringify(mapping, null, 2));
  console.log(`\nMapping gespeichert: ${out}`);
}

console.log('\nFertig.');
