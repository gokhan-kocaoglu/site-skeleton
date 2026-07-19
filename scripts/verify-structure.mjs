#!/usr/bin/env node
/**
 * Cumulative structure checker for the site-skeleton repo.
 * Manifest-driven: scripts/structure-manifest.json grows with each build phase.
 * Node stdlib only. Exit 0 = PASS, exit 1 = FAIL.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'scripts', 'structure-manifest.json');
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

const failures = [];
let checks = 0;

function check(condition, label) {
  checks++;
  if (!condition) failures.push(label);
}

const p = (rel) => path.join(ROOT, rel);

// 1. Required directories
for (const dir of manifest.requiredDirs ?? []) {
  check(existsSync(p(dir)) && statSync(p(dir)).isDirectory(), `missing directory: ${dir}`);
}

// 2. Required files
for (const file of manifest.requiredFiles ?? []) {
  check(existsSync(p(file)) && statSync(p(file)).isFile(), `missing file: ${file}`);
}

// 3. Line budgets
for (const [file, max] of Object.entries(manifest.maxLines ?? {})) {
  if (!existsSync(p(file))) {
    check(false, `maxLines target missing: ${file}`);
    continue;
  }
  const lines = readFileSync(p(file), 'utf8').split('\n').length;
  check(lines <= max, `${file}: ${lines} lines (max ${max})`);
}

// 4. No UTF-8 BOM
for (const file of manifest.noBom ?? []) {
  if (!existsSync(p(file))) {
    check(false, `noBom target missing: ${file}`);
    continue;
  }
  const buf = readFileSync(p(file));
  const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  check(!hasBom, `${file}: has UTF-8 BOM`);
}

// 5. Valid JSON
for (const file of manifest.validJson ?? []) {
  checks++;
  try {
    JSON.parse(readFileSync(p(file), 'utf8'));
  } catch (e) {
    failures.push(`${file}: invalid JSON (${e.message})`);
  }
}

// 6. YAML lite check (exists, non-empty, no tab indentation)
for (const file of manifest.yamlLite ?? []) {
  if (!existsSync(p(file))) {
    check(false, `yaml target missing: ${file}`);
    continue;
  }
  const text = readFileSync(p(file), 'utf8');
  check(text.trim().length > 0, `${file}: empty YAML`);
  check(!/^\t/m.test(text), `${file}: tab indentation in YAML`);
}

// 7. Frontmatter checks (markdown files with YAML frontmatter)
for (const rule of manifest.frontmatter ?? []) {
  for (const file of rule.files) {
    if (!existsSync(p(file))) {
      check(false, `frontmatter target missing: ${file}`);
      continue;
    }
    const text = readFileSync(p(file), 'utf8');
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) {
      check(false, `${file}: no YAML frontmatter`);
      continue;
    }
    for (const key of rule.requiredKeys) {
      check(
        new RegExp(`^${key}\\s*:`, 'm').test(m[1]),
        `${file}: frontmatter missing key "${key}"`
      );
    }
  }
}

// 7b. Agent skills preload (Faz 8.1, audit #3): every agent frontmatter must
// declare a skills key (enforced via frontmatter rules above) AND every listed
// skill must actually exist as .claude/skills/<name>/SKILL.md.
if (manifest.agentSkills) {
  const { agentsDir, skillsDir } = manifest.agentSkills;
  for (const entry of readdirSync(p(agentsDir))) {
    if (!entry.endsWith('.md')) continue;
    const rel = `${agentsDir}/${entry}`;
    const text = readFileSync(p(rel), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue; // frontmatter presence is asserted by section 7
    const skillsMatch = fm[1].match(/^skills\s*:(.*)$((?:\r?\n[ \t]+-[ \t]*\S+.*$)*)/m);
    if (!skillsMatch) {
      check(false, `${rel}: no parseable skills field`);
      continue;
    }
    const inline = skillsMatch[1].trim();
    const names = [];
    if (inline && inline !== '[]') {
      for (const s of inline.replace(/^\[|\]$/g, '').split(',')) {
        if (s.trim()) names.push(s.trim());
      }
    }
    for (const line of (skillsMatch[2] || '').split(/\r?\n/)) {
      const item = line.match(/^[ \t]+-[ \t]*(\S+)/);
      if (item) names.push(item[1]);
    }
    for (const name of names) {
      check(
        existsSync(p(`${skillsDir}/${name}/SKILL.md`)),
        `${rel}: preloaded skill does not exist: ${name}`
      );
    }
  }
}

// 7c. Installed-baseline drift (Faz 8.1, audit #14): every package CLAUDE.md
// lists as installed must exist in its package file; approved defaults must
// NOT be installed until promoted into the baseline list.
for (const entry of manifest.installedBaseline ?? []) {
  if (!existsSync(p(entry.file))) {
    check(false, `installedBaseline target missing: ${entry.file}`);
    continue;
  }
  const text = readFileSync(p(entry.file), 'utf8');
  if (entry.type === 'npm') {
    let pkg;
    try {
      pkg = JSON.parse(text);
    } catch {
      check(false, `${entry.file}: invalid JSON for installedBaseline`);
      continue;
    }
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    for (const name of entry.packages ?? []) {
      check(name in deps, `${entry.file}: installed-baseline package missing: ${name}`);
    }
    for (const name of entry.mustBeAbsent ?? []) {
      check(
        !(name in deps),
        `${entry.file}: approved-default "${name}" is installed — CLAUDE.md baseline listesine taşı`
      );
    }
  } else if (entry.type === 'maven') {
    for (const a of entry.artifacts ?? []) {
      check(
        text.includes(`<artifactId>${a}</artifactId>`),
        `${entry.file}: installed-baseline artifact missing: ${a}`
      );
    }
    for (const a of entry.mustBeAbsent ?? []) {
      check(
        !text.includes(`<artifactId>${a}`),
        `${entry.file}: approved-default "${a}" is installed — CLAUDE.md baseline listesine taşı`
      );
    }
  }
}

// 7d. Handoff targets (Faz 8.2, brief 1.1): every `HANDOFF → <target>` in
// governance markdown must name an agent the manifest declares valid, so a
// report can never be handed to a non-existent role (team-lead regression).
if (manifest.handoffTargets) {
  const { dirs, validAgents } = manifest.handoffTargets;
  const valid = new Set(validAgents);
  const mdFiles = [];
  const collect = (dir) => {
    for (const entry of readdirSync(p(dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) collect(rel);
      else if (entry.name.endsWith('.md')) mdFiles.push(rel);
    }
  };
  for (const dir of dirs) {
    if (existsSync(p(dir))) collect(dir);
  }
  for (const rel of mdFiles) {
    const text = readFileSync(p(rel), 'utf8');
    for (const m of text.matchAll(/HANDOFF\s*→\s*([a-z-]+)/g)) {
      check(valid.has(m[1]), `${rel}: HANDOFF hedefi geçersiz ajan: ${m[1]}`);
    }
  }
}

// 7f. Activation gates (Faz 8.2, brief 3.2/R5): a template activated under
// apps/ must carry a fully ticked ACTIVATION.md hardening checklist (zero
// "- [ ]", exactly the declared number of "- [x]"). Detection is deliberately
// limited to apps/ — the pristine, unticked template under templates/ never
// trips this rule.
for (const gate of manifest.activationGates ?? []) {
  const appsDir = p('apps');
  if (!existsSync(appsDir)) continue;
  for (const entry of readdirSync(appsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let activated = entry.name === gate.name;
    if (!activated) {
      const pkgPath = path.join(appsDir, entry.name, 'package.json');
      if (existsSync(pkgPath)) {
        try {
          activated = JSON.parse(readFileSync(pkgPath, 'utf8')).name === gate.name;
        } catch {
          /* invalid package.json is caught by its own checks */
        }
      }
    }
    if (!activated) continue;
    const actRel = `apps/${entry.name}/ACTIVATION.md`;
    if (!existsSync(p(actRel))) {
      check(false, `apps/${entry.name}: aktive şablon ACTIVATION.md olmadan (hardening checklist zorunlu)`);
      continue;
    }
    const text = readFileSync(p(actRel), 'utf8');
    const unchecked = (text.match(/- \[ \]/g) ?? []).length;
    const ticked = (text.match(/- \[x\]/gi) ?? []).length;
    check(unchecked === 0, `${actRel}: ${unchecked} işaretsiz checklist maddesi (- [ ]) var`);
    check(
      ticked === gate.checklistItems,
      `${actRel}: ${ticked} işaretli madde (beklenen ${gate.checklistItems})`
    );
  }
}

// 7e. Tracked-forbidden files (Faz 8.2, brief 2.1): build artefacts like
// *.tsbuildinfo regenerate as UNTRACKED files on every build, so a tree walk
// would false-positive; only the git index can say "tracked". Deliberately
// git-based; git missing/failing -> fail-safe skip with a note.
for (const pattern of manifest.trackedForbidden ?? []) {
  const git = spawnSync('git', ['ls-files', pattern], { cwd: ROOT, encoding: 'utf8' });
  if (git.error || git.status !== 0) {
    console.error(`  ! trackedForbidden kontrolü atlandı (git yok/başarısız): ${pattern}`);
    continue;
  }
  const tracked = git.stdout.trim();
  check(
    tracked === '',
    `izlenen yasak dosya [${pattern}]: ${tracked.replace(/\r?\n/g, ', ')} (git rm --cached ile çıkar)`
  );
}

// 8. Forbidden patterns (repo-wide scan of text files). A rule with a
// "modes" array only runs when manifest.mode matches (Faz 8.1, audit #11:
// the skeleton-dev guard patterns must not fire in bootstrapped projects).
const EXCLUDE_DIRS = new Set(manifest.scanExcludeDirs ?? []);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) || EXCLUDE_DIRS.has(rel)) continue;
      yield* walk(abs);
    } else if (entry.isFile()) {
      yield rel;
    }
  }
}

const allFiles = [...walk(ROOT)];
const MODE = manifest.mode ?? 'skeleton-dev';
for (const rule of manifest.forbiddenPatterns ?? []) {
  if (rule.modes && !rule.modes.includes(MODE)) continue;
  const re = new RegExp(rule.pattern, rule.flags ?? '');
  for (const rel of allFiles) {
    if (rule.excludePaths?.some((ex) => rel === ex || rel.startsWith(ex))) continue;
    if (rule.extensions && !rule.extensions.some((ext) => rel.endsWith(ext))) continue;
    const buf = readFileSync(p(rel));
    if (buf.includes(0)) continue; // binary
    checks++;
    if (re.test(buf.toString('utf8'))) {
      failures.push(`forbidden pattern /${rule.pattern}/ in ${rel}`);
    }
  }
}

// Report
if (failures.length) {
  console.error(`FAIL — ${failures.length} problem(s) out of ${checks} checks:`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
} else {
  console.log(`PASS — ${checks} checks OK (manifest: scripts/structure-manifest.json)`);
}
