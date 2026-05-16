/**
 * lib/doc-sync.js — Timetable Documentation Sync
 *
 * Spiegelt Component-Docs und Kern-Docs in den Obsidian-Vault.
 * Aufruf: node lib/doc-sync.js [targetVersion]
 * Pflicht-Task: T_last jeder Story (nach Implementierung)
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const PROJECT_PATH   = process.env.PROJECT_PATH || path.join(__dirname, '..');
const OBSIDIAN_VAULT = 'C:\\Users\\RenéGoebels-ELEVENBI\\OneDrive - -\\Dokumente\\Obsidian\\TIMETABLE\\TIMETABLE';
const config         = require(path.join(PROJECT_PATH, 'lib/config'));

// ─── Mapping: Repo → Obsidian ─────────────────────────────────────────────────

const OBSIDIAN_MAPPING = {
  'ARCHITECTURE_DESIGN.md': path.join(OBSIDIAN_VAULT, '.architecture-hub.md'),
  'CHANGELOG.md':           path.join(OBSIDIAN_VAULT, 'CHANGELOG.md'),
};

// Component-Docs: docs/components/ → Obsidian/Components/
const COMPONENT_SRC_DIR = path.join(PROJECT_PATH, 'docs', 'components');
const COMPONENT_DST_DIR = path.join(OBSIDIAN_VAULT, 'Components');

// ─── Changelog ────────────────────────────────────────────────────────────────

const CHANGELOG_PATH = path.join(PROJECT_PATH, 'CHANGELOG.md');

function appendChangelog(version, description) {
  if (!fs.existsSync(CHANGELOG_PATH)) return;
  const today   = new Date().toISOString().slice(0, 10);
  const entry   = `\n## v${version} — ${today}\n\n${description}\n`;
  const content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  if (!content.includes(`## v${version}`)) {
    fs.writeFileSync(CHANGELOG_PATH, entry + content);
    console.log(`[DocSync] Changelog entry added for v${version}`);
  }
}

// ─── Obsidian: Frontmatter Injection ─────────────────────────────────────────

function injectFrontmatter(content, filename, version) {
  const timestamp = new Date().toISOString();
  const frontmatter = [
    '---',
    `sync_source: "${filename}"`,
    `sync_version: "${version}"`,
    `sync_timestamp: "${timestamp}"`,
    '---',
    '',
  ].join('\n');

  const withoutFm = content.startsWith('---')
    ? content.replace(/^---[\s\S]*?---\n/, '')
    : content;

  return frontmatter + withoutFm;
}

// ─── Core: Sync DOC_FILES ─────────────────────────────────────────────────────

async function syncAllDocs(targetVersion) {
  const { DOC_FILES } = config;
  if (!DOC_FILES) {
    console.error('[DocSync] DOC_FILES not found in config.js');
    return 0;
  }

  let synced = 0;
  let obsidianSynced = 0;

  for (const [name, def] of Object.entries(DOC_FILES)) {
    const filePath = path.join(PROJECT_PATH, def.path);
    if (!fs.existsSync(filePath)) {
      console.warn(`[DocSync] File not found, skipping: ${filePath}`);
      continue;
    }

    const original = fs.readFileSync(filePath, 'utf8');
    const updated  = original.replace(def.versionPattern, (match, oldVer) =>
      match.replace(oldVer, targetVersion)
    );

    if (updated !== original) {
      fs.writeFileSync(filePath, updated, 'utf8');
      synced++;
      console.log(`[DocSync] Updated ${name} → v${targetVersion}`);
    } else {
      console.log(`[DocSync] ${name}: already at v${targetVersion} ✓`);
    }

    if (OBSIDIAN_MAPPING[name]) {
      try {
        const vaultPath    = OBSIDIAN_MAPPING[name];
        const vaultContent = injectFrontmatter(updated, name, targetVersion);
        fs.mkdirSync(path.dirname(vaultPath), { recursive: true });
        fs.writeFileSync(vaultPath, vaultContent, 'utf8');
        obsidianSynced++;
        console.log(`[DocSync] Mirrored ${name} → Obsidian`);
      } catch (err) {
        console.warn(`[DocSync] Obsidian mirror failed for ${name}: ${err.message}`);
      }
    }
  }

  // Component-Docs spiegeln (falls vorhanden)
  if (fs.existsSync(COMPONENT_SRC_DIR)) {
    const components = fs.readdirSync(COMPONENT_SRC_DIR).filter(f => f.endsWith('.md'));
    for (const comp of components) {
      try {
        const src     = path.join(COMPONENT_SRC_DIR, comp);
        const dst     = path.join(COMPONENT_DST_DIR, comp);
        const content = fs.readFileSync(src, 'utf8');
        fs.mkdirSync(COMPONENT_DST_DIR, { recursive: true });
        fs.writeFileSync(dst, content, 'utf8');
        obsidianSynced++;
        console.log(`[DocSync] Component mirrored: ${comp} → Obsidian/Components/`);
      } catch (err) {
        console.warn(`[DocSync] Component mirror failed for ${comp}: ${err.message}`);
      }
    }
  }

  const total = Object.keys(DOC_FILES).length;
  console.log(`[DocSync] Done: ${synced}/${total} files updated to v${targetVersion}` +
    (obsidianSynced > 0 ? ` | ${obsidianSynced} mirrored to Obsidian` : ''));

  if (synced > 0) {
    appendChangelog(targetVersion, `- Dokumentation auf v${targetVersion} synchronisiert`);
  }

  return synced;
}

// ─── Export + CLI ─────────────────────────────────────────────────────────────

module.exports = { syncAllDocs };

if (require.main === module) {
  const targetVersion = process.argv[2] || config.VERSION;
  if (!targetVersion) {
    console.error('Usage: node lib/doc-sync.js [version]');
    process.exit(1);
  }
  syncAllDocs(targetVersion)
    .then(count => {
      console.log(`[DocSync] CLI complete — ${count} files updated`);
      process.exit(0);
    })
    .catch(err => {
      console.error('[DocSync] Error:', err);
      process.exit(1);
    });
}
