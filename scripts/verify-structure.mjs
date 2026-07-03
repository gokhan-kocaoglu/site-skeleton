#!/usr/bin/env node
/**
 * Cumulative structure checker for the site-skeleton repo.
 * Manifest-driven: scripts/structure-manifest.json grows with each build phase.
 * Node stdlib only. Exit 0 = PASS, exit 1 = FAIL.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
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
