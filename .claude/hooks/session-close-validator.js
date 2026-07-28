'use strict';
/**
 * Session close validator — two modes.
 *
 * 1) CLI mode (validator, NOT fail-safe — nonzero exit on failure):
 *      node .claude/hooks/session-close-validator.js --project <ProjeAdi>
 *      node .claude/hooks/session-close-validator.js --file <path/to/Current Status.md>
 *      ... add --closure to also assert the post-merge closure CONTEXT.
 *    Checks the 7 mandatory Current Status headings + commit evidence.
 *
 * 2) Stop-hook mode (stdin JSON, fail-safe): only bites when /finish-session
 *    has armed the close flag (.claude/hooks/.session-close-pending, content =
 *    project name; override path via SESSION_CLOSE_FLAG for tests). No flag ->
 *    exit 0. Flag + invalid status -> {"decision":"block"}. Valid -> flag is
 *    removed and the session may close. An armed flag IS the closure moment,
 *    so this mode always runs the closure-context layer.
 *
 * Faz 8.1 Sprint 3 (audit #8, #9):
 *  - Missing status file errors now list the valid project folders under
 *    01_Projects (evidence reproducibility: the behaviour claimed in the
 *    2026-07-02 session log Test 2 is now real, asserted by fixtures).
 *  - "## Son Commit Kanıtı" is split into "## Son Uygulama Commiti" (hash
 *    required) and "## Memory Closure Commiti" (hash, or PENDING because the
 *    closure commit is created only after this file is written).
 *
 * Faz 8.3 PR-D (brief P0-4): memory closure moved AFTER the feature merge, so
 * the validator gained two semantic layers — stale operational state (always)
 * and closure context: branch, dirty paths, implementation-commit ancestry
 * (closure mode only). Both live in lib/closure-guard.js.
 */
const fs = require('node:fs');
const path = require('node:path');
const { readStdinJson, safeRun, stopBlock, projectRoot } = require('./lib/common');
const { staleProblems, closureContextProblems } = require('./lib/closure-guard');

const ROOT = projectRoot();
const PROJECTS_DIR = path.join(ROOT, 'project-memory', 'ClaudeTeamMemory', '01_Projects');

const REQUIRED_HEADINGS = [
  '## Aşama',
  '## Son Tamamlanan Görev',
  '## Aktif Görev',
  '## Blocker',
  '## Sonraki 3 Adım',
  '## Son Uygulama Commiti',
  '## Memory Closure Commiti',
];

const HASH_RE = /\b[0-9a-f]{7,40}\b/;

/** Directories under 01_Projects that are real projects (template excluded). */
function listValidProjects() {
  try {
    return fs
      .readdirSync(PROJECTS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name !== '_TEMPLATE')
      .map((e) => e.name);
  } catch {
    return [];
  }
}

function missingFileProblem(filePath) {
  const projects = listValidProjects();
  const list =
    projects.length > 0
      ? `Geçerli projeler: ${projects.join(', ')}`
      : 'Hiç proje klasörü yok — projeyi /new-project ile aç';
  return (
    `Current Status dosyası yok: ${filePath}. ` +
    `Proje klasörü adı PascalCase ve boşluksuzdur (örn. SiteSkeleton). ${list}`
  );
}

/** Text of one "## ..." section (from its heading to the next "## "). */
function sectionOf(text, heading) {
  const idx = text.indexOf(heading);
  if (idx === -1) return null;
  return text.slice(idx + heading.length).split(/^## /m)[0];
}

/**
 * Returns a list of problems; empty list = valid.
 * `closureMode` adds the git-context layer (branch / dirty paths / ancestry).
 */
function validateStatusFile(filePath, closureMode = false) {
  const problems = [];
  if (!fs.existsSync(filePath)) {
    return [missingFileProblem(filePath)];
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const heading of REQUIRED_HEADINGS) {
    if (!new RegExp(`^${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(text)) {
      problems.push(`Eksik zorunlu başlık: "${heading}"`);
    }
  }
  const impl = sectionOf(text, '## Son Uygulama Commiti');
  if (impl !== null && !HASH_RE.test(impl)) {
    problems.push(
      'Son Uygulama Commiti bölümünde commit hash yok (git log --oneline -1 çıktısını yaz)'
    );
  }
  const closure = sectionOf(text, '## Memory Closure Commiti');
  if (closure !== null && !HASH_RE.test(closure) && !/\bPENDING\b/.test(closure)) {
    problems.push(
      'Memory Closure Commiti bölümünde hash veya PENDING yok ' +
        '(kapanış commiti sonra atılacaksa "PENDING — <not>" yaz)'
    );
  }
  if (closure !== null && /\bPENDING\b/.test(closure)) {
    // Faz 8.2 (brief 1.4): blok OLMAYAN hatırlatma — PENDING bir sonraki
    // kapanışta gerçek closure hash'iyle mühürlenmek zorundadır. Bu bölüm,
    // bayat-durum taramasının dışında tutulur (closure-guard).
    console.error(
      'UYARI — Memory Closure Commiti PENDING: bir sonraki kapanışta mühür zorunlu ' +
        '(chore(memory): seal <session> — closure hash <hash>)'
    );
  }
  problems.push(...staleProblems(text));
  if (closureMode) {
    const { problems: ctx, warnings } = closureContextProblems(ROOT, text);
    for (const w of warnings) console.error(w);
    problems.push(...ctx);
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
  const closureMode = argv.includes('--closure');
  const problems = validateStatusFile(cliTarget, closureMode);
  if (problems.length > 0) {
    console.log(`FAIL — ${cliTarget}`);
    for (const p of problems) console.log(`  x ${p}`);
    process.exit(1);
  }
  const scope = closureMode ? '7 başlık + kanıt + closure bağlamı' : '7 başlık + commit kanıtı';
  console.log(`PASS — ${cliTarget} (${scope} tamam)`);
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
  // An armed flag means /finish-session is closing the session for real, so the
  // post-merge closure context is asserted here too (Faz 8.3 PR-D).
  const problems = validateStatusFile(statusPath, true);
  if (problems.length > 0) {
    stopBlock(
      `Oturum kapanışı reddedildi (${project}): ${problems.join('; ')}. ` +
        'Current Status 7 zorunlu başlıkla güncellenmeli, bekleyen-iş ifadesi kalmamalı ve ' +
        'kapanış merge sonrası closure dalında yapılmalı — bkz. /finish-session.'
    );
    return;
  }

  try {
    fs.unlinkSync(flagPath); // validated: disarm so the next stop is free
  } catch {
    /* flag cleanup is best-effort */
  }
});
