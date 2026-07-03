'use strict';
/**
 * Session close validator — two modes.
 *
 * 1) CLI mode (validator, NOT fail-safe — nonzero exit on failure):
 *      node .claude/hooks/session-close-validator.js --project <ProjeAdi>
 *      node .claude/hooks/session-close-validator.js --file <path/to/Current Status.md>
 *    Checks the 6 mandatory Current Status headings + commit evidence.
 *
 * 2) Stop-hook mode (stdin JSON, fail-safe): only bites when /finish-session
 *    has armed the close flag (.claude/hooks/.session-close-pending, content =
 *    project name; override path via SESSION_CLOSE_FLAG for tests). No flag ->
 *    exit 0. Flag + invalid status -> {"decision":"block"}. Valid -> flag is
 *    removed and the session may close.
 */
const fs = require('node:fs');
const path = require('node:path');
const { readStdinJson, safeRun, stopBlock, projectRoot } = require('./lib/common');

const ROOT = projectRoot();
const PROJECTS_DIR = path.join(ROOT, 'project-memory', 'ClaudeTeamMemory', '01_Projects');

const REQUIRED_HEADINGS = [
  '## Aşama',
  '## Son Tamamlanan Görev',
  '## Aktif Görev',
  '## Blocker',
  '## Sonraki 3 Adım',
  '## Son Commit Kanıtı',
];

/** Returns a list of problems; empty list = valid. */
function validateStatusFile(filePath) {
  const problems = [];
  if (!fs.existsSync(filePath)) {
    return [`Current Status dosyası yok: ${filePath}`];
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const heading of REQUIRED_HEADINGS) {
    if (!new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(text)) {
      problems.push(`Eksik zorunlu başlık: "${heading}"`);
    }
  }
  const idx = text.indexOf('## Son Commit Kanıtı');
  if (idx !== -1) {
    const rest = text.slice(idx + '## Son Commit Kanıtı'.length);
    const section = rest.split(/^## /m)[0];
    if (!/\b[0-9a-f]{7,40}\b/.test(section)) {
      problems.push('Son Commit Kanıtı bölümünde commit hash yok (git log --oneline -1 çıktısını yaz)');
    }
  }
  return problems;
}

function resolveStatusPath(argv) {
  const fileIdx = argv.indexOf('--file');
  if (fileIdx !== -1 && argv[fileIdx + 1]) {
    return path.resolve(process.cwd(), argv[fileIdx + 1]);
  }
  const projIdx = argv.indexOf('--project');
  if (projIdx !== -1 && argv[projIdx + 1]) {
    return path.join(PROJECTS_DIR, argv[projIdx + 1], 'Current Status.md');
  }
  return null;
}

const argv = process.argv.slice(2);
const cliTarget = resolveStatusPath(argv);

if (cliTarget) {
  // CLI validator mode: honest exit codes.
  const problems = validateStatusFile(cliTarget);
  if (problems.length > 0) {
    console.log(`FAIL — ${cliTarget}`);
    for (const p of problems) console.log(`  x ${p}`);
    process.exit(1);
  }
  console.log(`PASS — ${cliTarget} (6 başlık + commit kanıtı tamam)`);
  process.exit(0);
}

// Stop-hook mode: fail-safe.
safeRun('session-close-validator', async () => {
  const input = await readStdinJson();
  if (input && input.stop_hook_active === true) return; // never loop on our own block

  const flagPath = process.env.SESSION_CLOSE_FLAG
    ? path.resolve(ROOT, process.env.SESSION_CLOSE_FLAG)
    : path.join(__dirname, '.session-close-pending');
  if (!fs.existsSync(flagPath)) return; // no close pending -> normal stop

  const project = fs.readFileSync(flagPath, 'utf8').trim();
  if (!project) return;

  const statusPath = path.join(PROJECTS_DIR, project, 'Current Status.md');
  const problems = validateStatusFile(statusPath);
  if (problems.length > 0) {
    stopBlock(
      `Oturum kapanışı reddedildi (${project}): ${problems.join('; ')}. ` +
        'Current Status 6 zorunlu başlıkla güncellenmeli ve commit kanıtı içermeli — bkz. /finish-session.'
    );
    return;
  }

  try {
    fs.unlinkSync(flagPath); // validated: disarm so the next stop is free
  } catch {
    /* flag cleanup is best-effort */
  }
});
