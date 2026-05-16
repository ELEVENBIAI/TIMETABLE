#!/usr/bin/env node
// scripts/linear.mjs — Linear API Helper
// Liest LINEAR_API_KEY aus .env, spricht die Linear GraphQL API an.
// Verwendung:
//   node scripts/linear.mjs whoami                       — Auth-Test
//   node scripts/linear.mjs teams                        — Alle Teams auflisten
//   node scripts/linear.mjs labels <team-key>            — Labels eines Teams
//   node scripts/linear.mjs states <team-key>            — Workflow-States eines Teams
//   node scripts/linear.mjs issues <team-key> [state]    — Issues eines Teams (optional gefiltert)
//   node scripts/linear.mjs create-label <team-id> <name> <color>
//   node scripts/linear.mjs create-issue <team-id> <state-id> <title> [labels-comma] [description-file]
//   node scripts/linear.mjs update-issue <issue-id> <field> <value>
//   node scripts/linear.mjs comment <issue-id> <body-file>

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// .env parsen (nur LINEAR_API_KEY, nicht logging)
const envPath = path.join(PROJECT_ROOT, '.env');
if (!existsSync(envPath)) {
  console.error('FEHLER: .env nicht gefunden unter', envPath);
  process.exit(1);
}
const envContent = readFileSync(envPath, 'utf8');
const match = envContent.match(/^\s*LINEAR_API_KEY\s*=\s*(.+?)\s*$/m);
if (!match) {
  console.error('FEHLER: LINEAR_API_KEY nicht in .env gefunden');
  process.exit(1);
}
const LINEAR_API_KEY = match[1].replace(/^["']|["']$/g, '');

const ENDPOINT = 'https://api.linear.app/graphql';

async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: LINEAR_API_KEY,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }

  const data = await res.json();
  if (data.errors) {
    throw new Error(`GraphQL Errors: ${JSON.stringify(data.errors, null, 2)}`);
  }
  return data.data;
}

// ─── Commands ────────────────────────────────────────────────────────────────

const cmd = process.argv[2];
const args = process.argv.slice(3);

const commands = {
  async whoami() {
    const data = await gql(`{ viewer { id name email } }`);
    console.log(JSON.stringify(data.viewer, null, 2));
  },

  async teams() {
    const data = await gql(`{ teams { nodes { id name key description } } }`);
    console.log(JSON.stringify(data.teams.nodes, null, 2));
  },

  async labels(teamKey) {
    if (!teamKey) throw new Error('Usage: labels <team-key>');
    const data = await gql(
      `query($key: String!) {
        teams(filter: { key: { eq: $key } }) {
          nodes {
            id
            key
            labels { nodes { id name color } }
          }
        }
      }`,
      { key: teamKey }
    );
    const team = data.teams.nodes[0];
    if (!team) throw new Error(`Team ${teamKey} nicht gefunden`);
    console.log(JSON.stringify({ teamId: team.id, labels: team.labels.nodes }, null, 2));
  },

  async states(teamKey) {
    if (!teamKey) throw new Error('Usage: states <team-key>');
    const data = await gql(
      `query($key: String!) {
        teams(filter: { key: { eq: $key } }) {
          nodes {
            id
            key
            states { nodes { id name type position } }
          }
        }
      }`,
      { key: teamKey }
    );
    const team = data.teams.nodes[0];
    if (!team) throw new Error(`Team ${teamKey} nicht gefunden`);
    console.log(JSON.stringify({ teamId: team.id, states: team.states.nodes }, null, 2));
  },

  async projects() {
    const data = await gql(`{ projects(first: 100) { nodes { id name state slugId } } }`);
    console.log(JSON.stringify(data.projects.nodes, null, 2));
  },

  async createProject(teamId, name, description) {
    if (!teamId || !name) throw new Error('Usage: create-project <team-id> <name> [description]');
    const data = await gql(
      `mutation($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project { id name slugId }
        }
      }`,
      {
        input: {
          teamIds: [teamId],
          name,
          ...(description ? { description } : {}),
        },
      }
    );
    console.log(JSON.stringify(data.projectCreate, null, 2));
  },

  async highestIssue(teamKey) {
    if (!teamKey) throw new Error('Usage: highest-issue <team-key>');
    const data = await gql(
      `{ issues(filter: { team: { key: { eq: "${teamKey}" } } }, orderBy: createdAt, first: 1) {
          nodes { id identifier }
        }
      }`
    );
    console.log(JSON.stringify(data.issues.nodes[0] ?? null, null, 2));
  },

  async issues(teamKey, stateName) {
    if (!teamKey) throw new Error('Usage: issues <team-key> [state-name]');
    const filter = stateName
      ? `{ team: { key: { eq: "${teamKey}" } }, state: { name: { eq: "${stateName}" } } }`
      : `{ team: { key: { eq: "${teamKey}" } } }`;
    const data = await gql(
      `{ issues(filter: ${filter}, first: 100) {
          nodes { id identifier title state { name } labels { nodes { name } } }
        }
      }`
    );
    console.log(JSON.stringify(data.issues.nodes, null, 2));
  },

  async createLabel(teamId, name, color) {
    if (!teamId || !name || !color) {
      throw new Error('Usage: create-label <team-id> <name> <hex-color>');
    }
    const data = await gql(
      `mutation($teamId: String!, $name: String!, $color: String!) {
        issueLabelCreate(input: { teamId: $teamId, name: $name, color: $color }) {
          success
          issueLabel { id name color }
        }
      }`,
      { teamId, name, color }
    );
    console.log(JSON.stringify(data.issueLabelCreate, null, 2));
  },

  async createIssue(teamId, stateId, title, labelsCsv, descFile, projectId) {
    if (!teamId || !stateId || !title) {
      throw new Error(
        'Usage: create-issue <team-id> <state-id> <title> [labels-csv] [description-file] [project-id]'
      );
    }
    const labelIds = labelsCsv ? labelsCsv.split(',').filter(Boolean) : [];
    const description = descFile && existsSync(descFile) ? readFileSync(descFile, 'utf8') : null;

    const data = await gql(
      `mutation($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue { id identifier title url project { name } }
        }
      }`,
      {
        input: {
          teamId,
          stateId,
          title,
          ...(description ? { description } : {}),
          ...(labelIds.length ? { labelIds } : {}),
          ...(projectId ? { projectId } : {}),
        },
      }
    );
    console.log(JSON.stringify(data.issueCreate, null, 2));
  },

  async updateIssue(issueId, field, value) {
    if (!issueId || !field || !value) {
      throw new Error('Usage: update-issue <issue-id> <field> <value>');
    }
    const input = {};
    if (field === 'state') input.stateId = value;
    else if (field === 'title') input.title = value;
    else if (field === 'priority') input.priority = parseInt(value, 10);
    else throw new Error(`Unsupported field: ${field}`);

    const data = await gql(
      `mutation($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue { id identifier title state { name } }
        }
      }`,
      { id: issueId, input }
    );
    console.log(JSON.stringify(data.issueUpdate, null, 2));
  },

  async comment(issueId, bodyFile) {
    if (!issueId || !bodyFile) throw new Error('Usage: comment <issue-id> <body-file>');
    if (!existsSync(bodyFile)) throw new Error(`Body file not found: ${bodyFile}`);
    const body = readFileSync(bodyFile, 'utf8');
    const data = await gql(
      `mutation($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment { id url }
        }
      }`,
      { input: { issueId, body } }
    );
    console.log(JSON.stringify(data.commentCreate, null, 2));
  },
};

// ─── Dispatch ────────────────────────────────────────────────────────────────

const cmdMap = {
  whoami: commands.whoami,
  teams: commands.teams,
  labels: commands.labels,
  states: commands.states,
  issues: commands.issues,
  projects: commands.projects,
  'create-label': commands.createLabel,
  'create-issue': commands.createIssue,
  'create-project': commands.createProject,
  'update-issue': commands.updateIssue,
  'highest-issue': commands.highestIssue,
  comment: commands.comment,
};

if (!cmd || !cmdMap[cmd]) {
  console.log('Verfügbare Commands:');
  Object.keys(cmdMap).forEach((c) => console.log(`  ${c}`));
  process.exit(cmd ? 1 : 0);
}

try {
  await cmdMap[cmd](...args);
} catch (err) {
  console.error('FEHLER:', err.message);
  process.exit(1);
}
