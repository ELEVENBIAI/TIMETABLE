#!/usr/bin/env node
// scripts/rename-specs-to-ele.mjs
//
// Einmaliger Rename: Mapped TT-XX → ELE-XXX in allen relevanten Files.
// Quelle: scripts/linear-mvp-mapping.json (entstanden aus linear-bootstrap-mvp.mjs)
//
// Schritte:
//   1. Specs umbenennen (TT-XX.md → ELE-XXX.md)
//   2. Token-Replace in allen .md / .js / .json / .mjs Files:
//      - TT-00 → ELE-163, TT-01a → ELE-164, ...
//      - "TT-" als Issue-Prefix → "ELE-"
//      - "Prefix `TT-`" → "Prefix `ELE-`"
//      - ISSUE_PREFIX = 'TT-' → ISSUE_PREFIX = 'ELE-'
//
// Verwendung:
//   node scripts/rename-specs-to-ele.mjs dry-run
//   node scripts/rename-specs-to-ele.mjs apply

import {
  readFileSync,
  writeFileSync,
  renameSync,
  existsSync,
  statSync,
  readdirSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const mapping = JSON.parse(readFileSync(path.join(__dirname, 'linear-mvp-mapping.json'), 'utf8'));

// Token-Order: längere Patterns zuerst (TT-01a vor TT-01)
const tokens = Object.keys(mapping).sort((a, b) => b.length - a.length);

// Pattern für Issue-Tokens (Word-Boundary-Safe)
function applyMapping(content) {
  let out = content;

  for (const tt of tokens) {
    const ele = mapping[tt].identifier;
    // Word-Boundary-Replace: TT-01a darf nicht in "TT-01ab" matchen
    // Verwende eine Lookbehind/Lookahead-Negation auf [a-zA-Z0-9-]
    const escapedTt = tt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?<![a-zA-Z0-9-])${escapedTt}(?![a-zA-Z0-9])`, 'g');
    out = out.replace(re, ele);
  }

  // ISSUE_PREFIX 'TT-' → 'ELE-' (nur wenn als Prefix-Wert verwendet)
  out = out.replace(/ISSUE_PREFIX:\s*['"]TT-['"]/g, "ISSUE_PREFIX: 'ELE-'");
  out = out.replace(/`TT-XXX`/g, '`ELE-XXX`');
  out = out.replace(/`TT-`/g, '`ELE-`');
  out = out.replace(/Prefix\s+TT-/g, 'Prefix ELE-');
  // TT-XXX als Generic-Placeholder im TEMPLATE und ISSUE_WRITING_GUIDELINES
  out = out.replace(/TT-XXX/g, 'ELE-XXX');
  // "specs/TT-XXX.md" Bezug
  out = out.replace(/specs\/TT-XXX\.md/g, 'specs/ELE-XXX.md');

  return out;
}

// Sammele alle Files, die wir scannen wollen
function collectFiles(dir, fileList = []) {
  const skipDirs = new Set([
    'node_modules',
    'dist',
    'build',
    'coverage',
    '.git',
    '.husky',
    'playwright-report',
    'test-results',
    'developer_input', // Source-Material — bleibt unverändert
  ]);
  const skipExtraDirs = new Set([path.join(PROJECT_ROOT, '.claude', 'skills')]);

  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (skipExtraDirs.has(full)) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (skipDirs.has(entry)) continue;
      collectFiles(full, fileList);
    } else if (/\.(md|js|mjs|ts|tsx|json|yml|yaml|sh)$/.test(entry)) {
      // Mapping-File selbst überspringen
      if (full === path.join(__dirname, 'linear-mvp-mapping.json')) continue;
      // Auch dieses Rename-Script und das Bootstrap-Script: NICHT verändern
      if (full === path.join(__dirname, 'rename-specs-to-ele.mjs')) continue;
      if (full === path.join(__dirname, 'linear-bootstrap-mvp.mjs')) continue;
      fileList.push(full);
    }
  }
  return fileList;
}

const mode = process.argv[2];
if (!['dry-run', 'apply'].includes(mode)) {
  console.error('Usage: node scripts/rename-specs-to-ele.mjs <dry-run|apply>');
  process.exit(1);
}
const dryRun = mode === 'dry-run';
console.log(`Modus: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);

// ── Phase 1: Spec-Files umbenennen ───────────────────────────────────────────

console.log('\nPhase 1: Spec-Files umbenennen');
for (const [tt, info] of Object.entries(mapping)) {
  const src = path.join(PROJECT_ROOT, 'specs', `${tt}.md`);
  const dst = path.join(PROJECT_ROOT, 'specs', `${info.identifier}.md`);
  if (!existsSync(src)) {
    console.log(`  SKIP ${tt}.md (existiert nicht)`);
    continue;
  }
  if (dryRun) {
    console.log(`  [dry] ${tt}.md → ${info.identifier}.md`);
  } else {
    renameSync(src, dst);
    console.log(`  ${tt}.md → ${info.identifier}.md`);
  }
}

// ── Phase 2: Token-Replace in allen relevanten Files ─────────────────────────

console.log('\nPhase 2: Token-Replace');
const files = collectFiles(PROJECT_ROOT);
let touched = 0;

for (const file of files) {
  const rel = path.relative(PROJECT_ROOT, file);
  const original = readFileSync(file, 'utf8');
  const replaced = applyMapping(original);
  if (replaced === original) continue;
  if (dryRun) {
    const tokenCount = tokens.filter((t) => original.includes(t)).length;
    console.log(`  [dry] ${rel} (${tokenCount} Token-Familien betroffen)`);
  } else {
    writeFileSync(file, replaced, 'utf8');
    console.log(`  ${rel}`);
  }
  touched++;
}

console.log(`\n${touched} Files ${dryRun ? 'wären betroffen' : 'aktualisiert'}.`);
