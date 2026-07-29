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

// Declared up front: mode-aware rules (project memory, forbidden patterns) all
// branch on it, and the first of those runs well before the repo-wide scan.
const MODE = manifest.mode ?? 'skeleton-dev';

// Also up front: the recursive activation scan (7f) needs the same directory
// exclusions as the repo-wide forbidden-pattern scan further down.
const EXCLUDE_DIRS = new Set(manifest.scanExcludeDirs ?? []);

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

// 7d. Handoff targets (Faz 8.2 brief 1.1; widened in Faz 8.3 PR-D / M3): every
// line containing a literal `HANDOFF →` must name one of the nine valid agents.
// The original `[a-z-]+` capture silently SKIPPED the cases that actually hurt —
// `HANDOFF → <sonraki-rol>` and a bare `HANDOFF →` matched nothing, so a
// placeholder shipped as if it were a real target. The line is now anchored
// first and the target extracted afterwards, so an empty or `<...>` target is a
// FAIL, and trailing prose ("HANDOFF → project-manager (ADR linkiyle)") does not
// leak into the target token.
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
    readFileSync(p(rel), 'utf8').split(/\r?\n/).forEach((line, i) => {
      if (!/HANDOFF\s*→/.test(line)) return;
      const where = `${rel}:${i + 1}`;
      // Everything after the arrow, minus markdown/quoting noise, up to the
      // first separator: the target must stand alone as one bare token.
      const rest = line.slice(line.indexOf('→') + 1).replace(/[`*_"']/g, '').trim();
      const target = rest.split(/[\s,.;:()\]]/)[0] ?? '';
      if (target === '') {
        check(false, `${where}: HANDOFF hedefi boş — dokuz geçerli ajandan biri yazılmalı`);
        return;
      }
      check(
        valid.has(target),
        `${where}: HANDOFF hedefi geçersiz ajan: ${target}` +
          (target.startsWith('<') ? ' (yer tutucu bırakılmış)' : '')
      );
    });
  }
}

// 7f. Activation gates (Faz 8.2 brief 3.2/R5; made recursive in Faz 8.3 PR-D /
// M7): a template activated under apps/ must carry a fully ticked ACTIVATION.md
// hardening checklist (zero "- [ ]", exactly the declared number of "- [x]").
//
// The Faz 8.2 version only looked one level deep and only at exact names, so
// `apps/auth-bff/` or a nested `apps/services/admin-bff/` slipped past. Detection
// now walks apps/ at ANY depth and fires on any ONE of three signals:
//   1. directory name contains the fragment (e.g. "bff")
//   2. the directory's package.json name contains the fragment ("@x/admin-bff")
//   3. a file in that directory carries the template signature constant, which
//      survives copy + rename (server.mjs `ADMIN_BFF_TEMPLATE_MARKER`)
// A root found by several signals is verified exactly once (Set).
//
// Scope stays apps/ ONLY: the pristine, unticked template under templates/ is
// dormant by definition and must never trip this rule.
// F4-LOW-05 (ADR-0017): a marker found deep inside a copy used to make its OWN
// directory the activation root, so `apps/x/src/server.mjs` demanded
// `apps/x/src/ACTIVATION.md` — the right FAIL pointed at the wrong place. The
// root is now the NEAREST ancestor carrying a package.json (the hardening unit
// is the package boundary), never `apps` itself or anything above it: the repo
// root has a package.json, so an unbounded walk would collapse every copy onto
// it. Directory-name and package-name signals are untouched.
for (const gate of manifest.activationGates ?? []) {
  const appsRel = 'apps';
  if (!existsSync(p(appsRel))) continue;
  const signalRoots = new Set();
  const markerRoots = new Map(); // activation root -> first marker file seen

  const resolveMarkerRoot = (dirRel) => {
    let cur = dirRel;
    while (cur !== appsRel) {
      if (existsSync(p(`${cur}/package.json`))) return cur;
      const cut = cur.lastIndexOf('/');
      if (cut === -1) break;
      cur = cur.slice(0, cut);
    }
    return dirRel; // no package boundary above it -> previous behaviour
  };

  const packageNameHas = (dirRel, fragment) => {
    const pkgPath = p(`${dirRel}/package.json`);
    if (!existsSync(pkgPath)) return false;
    try {
      return String(JSON.parse(readFileSync(pkgPath, 'utf8')).name ?? '')
        .toLowerCase()
        .includes(fragment);
    } catch {
      return false; // invalid package.json is caught by its own checks
    }
  };

  const scan = (dirRel) => {
    const fragment = (gate.nameFragment ?? '').toLowerCase();
    const base = dirRel.slice(dirRel.lastIndexOf('/') + 1).toLowerCase();
    if (fragment && base.includes(fragment)) signalRoots.add(dirRel);
    if (fragment && packageNameHas(dirRel, fragment)) signalRoots.add(dirRel);
    for (const entry of readdirSync(p(dirRel), { withFileTypes: true })) {
      const rel = `${dirRel}/${entry.name}`;
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name) || EXCLUDE_DIRS.has(rel)) continue;
        scan(rel);
      } else if (entry.isFile() && gate.marker) {
        const buf = readFileSync(p(rel));
        if (!buf.includes(0) && buf.toString('utf8').includes(gate.marker)) {
          const markerRoot = resolveMarkerRoot(dirRel);
          if (!markerRoots.has(markerRoot)) markerRoots.set(markerRoot, rel);
        }
      }
    }
  };
  scan(appsRel);

  // A marker-derived root that is a strict ancestor of another root is a
  // grouping workspace, not the activated module itself: the more specific root
  // already carries the demand, so drop the ancestor. Signal roots never drop.
  const candidates = new Set([...signalRoots, ...markerRoots.keys()]);
  for (const root of [...markerRoots.keys()]) {
    for (const other of candidates) {
      if (other !== root && other.startsWith(`${root}/`)) {
        markerRoots.delete(root);
        break;
      }
    }
  }

  for (const root of [...new Set([...signalRoots, ...markerRoots.keys()])].sort()) {
    const via = markerRoots.has(root) && !signalRoots.has(root)
      ? ` [marker: ${markerRoots.get(root)}]`
      : '';
    const actRel = `${root}/ACTIVATION.md`;
    if (!existsSync(p(actRel))) {
      check(false, `${root}: aktive şablon ACTIVATION.md olmadan (hardening checklist zorunlu)${via}`);
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

// 7j. Optional-module activation registry (AC-29 / F4-MEDIUM-01, ADR-0017).
//
// The repo ships five optional templates but only ONE of them is protected by a
// structural gate, while README generalised that guarantee to every copied
// template. The registry below makes the enforcement scope explicit and — this
// is the point — machine-checked: the declared module set, the enforcement mode
// of each module and the README/CLAUDE prose must agree with each other and
// with the real templates/ tree.
//
// Two deliberate design rules:
//   * The gate loop above (7f) is NOT driven by this registry. Deleting a
//     registry entry can never switch the admin-bff gate off; it only produces
//     a named FAIL here.
//   * The automatic-gate module set and the admin-bff checklist size are pinned
//     in CODE, not in the manifest. Weakening the claim therefore needs a
//     scripts/** change (orchestrator authority + review), not a data edit.
const AUTOMATIC_GATE_MODULES = ['admin-bff'];
const ADMIN_BFF_CHECKLIST_ITEMS = 12;
const ACTIVATION_SECTION_RE =
  /<!--\s*activation-modules:start\s*-->\r?\n([\s\S]*?)<!--\s*activation-modules:end\s*-->/;
// One documented module = a templatePath code span followed by an
// enforcementMode code span with no other code span in between, on one line.
const ACTIVATION_ROW_RE =
  /`(templates\/[a-z0-9][a-z0-9-]*\/)`[^`\n]*`(automatic-gate|manual-hardening)`/g;
const CANONICAL_MANUAL_PHRASES = [
  'no automatic activation gate',
  'outside the core production-ready claim until project-specific hardening',
];

const activationModules = manifest.activationModules;
check(
  Array.isArray(activationModules) && activationModules.length > 0,
  "scripts/structure-manifest.json: activationModules yok veya dizi değil — opsiyonel modül registry'si zorunlu"
);
const registry = Array.isArray(activationModules) ? activationModules : [];
const registryIds = new Set();
const registryPaths = new Set();

for (const [i, mod] of registry.entries()) {
  const id = mod?.id;
  const label = typeof id === 'string' ? id : `#${i}`;
  const idOk = typeof id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(id) && !registryIds.has(id);
  check(idOk, `activationModules[${label}]: id geçersiz veya yinelenmiş (${JSON.stringify(id)})`);
  if (typeof id === 'string') registryIds.add(id);

  const tp = mod?.templatePath;
  const pathOk =
    typeof tp === 'string' && tp === `templates/${id}/` && !registryPaths.has(tp);
  check(
    pathOk,
    `activationModules[${label}]: templatePath geçersiz, id ile uyumsuz veya yinelenmiş (${JSON.stringify(tp)})`
  );
  if (typeof tp === 'string') registryPaths.add(tp);

  check(
    typeof tp === 'string' && existsSync(p(tp)) && statSync(p(tp)).isDirectory(),
    `activationModules[${label}]: templatePath yok veya dizin değil: ${tp}`
  );

  const doc = mod?.activationDocument;
  check(
    typeof doc === 'string' && existsSync(p(doc)) && statSync(p(doc)).isFile(),
    `activationModules[${label}]: activationDocument yok veya dosya değil: ${doc}`
  );

  check(
    typeof mod?.activationTarget === 'string' && mod.activationTarget.length > 0,
    `activationModules[${label}]: activationTarget eksik (kopyanın gerçek hedefi kayıtlı olmalı)`
  );

  const mode = mod?.enforcementMode;
  const gid = mod?.activationGateId;
  let modeOk;
  let modeMsg;
  if (mode === 'automatic-gate') {
    modeOk = typeof gid === 'string' && gid.length > 0;
    modeMsg = `activationModules[${label}]: enforcementMode=automatic-gate ama activationGateId yok`;
  } else if (mode === 'manual-hardening') {
    modeOk = gid === undefined;
    modeMsg =
      `activationModules[${label}]: manual-hardening kayıt activationGateId taşıyor (${JSON.stringify(gid)})` +
      ' — manual-hardening modülde otomatik aktivasyon kapısı YOKTUR';
  } else {
    modeOk = false;
    modeMsg =
      `activationModules[${label}]: geçersiz enforcementMode ${JSON.stringify(mode)}` +
      ' — "automatic-gate" | "manual-hardening"';
  }
  check(modeOk, modeMsg);
}

// Driven by the file system, not by the registry: a new templates/<module>
// directory must be classified before it can ship.
const templatesRel = 'templates';
let templateDirs = null;
if (existsSync(p(templatesRel)) && statSync(p(templatesRel)).isDirectory()) {
  templateDirs = readdirSync(p(templatesRel), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `${templatesRel}/${entry.name}/`)
    .sort();
  for (const tp of templateDirs) {
    check(
      registryPaths.has(tp),
      `${tp}: activationModules registry'sinde kayıtlı değil — manifest + README/CLAUDE bölümlerine ekle`
    );
  }
} else {
  check(false, "templates/ dizini yok — opsiyonel modül registry'si doğrulanamıyor");
}
check(
  templateDirs !== null && templateDirs.join(',') === [...registryPaths].sort().join(','),
  `activationModules: registry kümesi gerçek templates/ dizin kümesiyle eşit değil` +
    ` — registry: [${[...registryPaths].sort().join(', ')}]` +
    ` · dosya sistemi: [${(templateDirs ?? []).join(', ')}]`
);

const gateIds = new Set((manifest.activationGates ?? []).map((g) => g.id));
for (const mod of registry.filter((m) => m?.enforcementMode === 'automatic-gate')) {
  check(
    gateIds.has(mod.activationGateId),
    `activationModules[${mod.id}]: activationGateId ${JSON.stringify(mod.activationGateId)} activationGates içinde yok`
  );
}
for (const gate of manifest.activationGates ?? []) {
  const refs = registry.filter((m) => m?.activationGateId === gate.id).length;
  check(
    refs === 1,
    `activationGates["${gate.id}"]: ${refs} automatic-gate modül referansı (tam 1 olmalı) — orphan veya çift referanslı gate`
  );
}
const automaticIds = registry
  .filter((m) => m?.enforcementMode === 'automatic-gate')
  .map((m) => m.id)
  .sort();
check(
  automaticIds.join(',') === AUTOMATIC_GATE_MODULES.join(','),
  `activationModules: automatic-gate modül kümesi [${automaticIds.join(', ')}]` +
    ` — beklenen [${AUTOMATIC_GATE_MODULES.join(', ')}]`
);
const adminBffGate = (manifest.activationGates ?? []).find((g) => g.id === 'admin-bff');
check(
  adminBffGate?.checklistItems === ADMIN_BFF_CHECKLIST_ITEMS,
  `activationGates["admin-bff"]: checklistItems=${adminBffGate?.checklistItems}` +
    ` (beklenen ${ADMIN_BFF_CHECKLIST_ITEMS} — templates/admin-bff/ACTIVATION.md madde sayısı)`
);

// Declaration <-> enforcement: both documents must list exactly the registered
// modules with exactly the registered enforcement mode. Comparison is on
// sorted rows, so a duplicated or missing row fails too.
const expectedRows = registry
  .filter((m) => typeof m?.templatePath === 'string' && typeof m?.enforcementMode === 'string')
  .map((m) => `${m.templatePath} ${m.enforcementMode}`)
  .sort()
  .join(' | ');
for (const docFile of ['README.md', 'CLAUDE.md']) {
  const text = existsSync(p(docFile)) ? readFileSync(p(docFile), 'utf8') : '';
  const starts = (text.match(/<!--\s*activation-modules:start\s*-->/g) ?? []).length;
  const ends = (text.match(/<!--\s*activation-modules:end\s*-->/g) ?? []).length;
  const section = text.match(ACTIVATION_SECTION_RE);
  check(
    starts === 1 && ends === 1 && section !== null,
    `${docFile}: activation-modules bölümü yok veya marker çifti bozuk (<!-- activation-modules:start/end -->)`
  );
  const rows = [...(section?.[1] ?? '').matchAll(ACTIVATION_ROW_RE)]
    .map((m) => `${m[1]} ${m[2]}`)
    .sort()
    .join(' | ');
  check(
    rows === expectedRows,
    `${docFile}: activation-modules bölümü registry ile uyuşmuyor` +
      ` — bölüm: [${rows}] · registry: [${expectedRows}]`
  );
}
const readmeText = existsSync(p('README.md')) ? readFileSync(p('README.md'), 'utf8') : '';
for (const phrase of CANONICAL_MANUAL_PHRASES) {
  check(
    readmeText.includes(phrase),
    `README.md: manual-hardening semantiği için canonical ifade eksik: "${phrase}"`
  );
}

// 7g. GitHub Actions SHA pins (Faz 8.3 PR-B, ADR-0015): a moving tag can be
// re-pointed by its owner, so every external `uses:` reference — step-level and
// job-level (reusable workflow) alike — must be an immutable 40-hex commit SHA
// carrying an exact release-tag comment on the same line. Local `./` actions are
// exempt: they are already bound to this commit. Negative tests:
// scripts/tests/verify-structure-negative.mjs
if (manifest.githubActionsPins) {
  const cfg = manifest.githubActionsPins;
  const exts = cfg.extensions ?? ['.yml', '.yaml'];
  const EXPECTED = 'owner/repository@<40-hex-sha> # <exact-version-tag>';
  const workflowFiles = [];
  for (const dir of cfg.dirs ?? []) {
    if (!existsSync(p(dir))) continue;
    for (const entry of readdirSync(p(dir), { withFileTypes: true })) {
      if (entry.isFile() && exts.some((ext) => entry.name.endsWith(ext))) {
        workflowFiles.push(`${dir}/${entry.name}`);
      }
    }
  }
  for (const rel of workflowFiles) {
    readFileSync(p(rel), 'utf8').split(/\r?\n/).forEach((line, i) => {
      const m = line.match(/^\s*(?:-\s*)?uses\s*:\s*(\S+)(.*)$/);
      if (!m) return;
      const ref = m[1].replace(/^['"]|['"]$/g, '');
      if (ref.startsWith('./') || ref.startsWith('.\\')) return; // local action
      const where = `${rel}:${i + 1}`;
      const at = ref.lastIndexOf('@');
      if (at === -1) {
        check(false, `${where}: "${ref}" SHA'sız referans — beklenen biçim: ${EXPECTED}`);
        return;
      }
      check(
        /^[0-9a-f]{40}$/.test(ref.slice(at + 1)),
        `${where}: "${ref}" tam 40-hex commit SHA değil — beklenen biçim: ${EXPECTED}`
      );
      if (cfg.requireVersionComment) {
        const tag = line.slice(line.indexOf(m[1]) + m[1].length).match(/#\s*(\S+)/)?.[1];
        check(
          !!tag && /^v?\d+\.\d+/.test(tag),
          `${where}: "${ref}" yanında exact sürüm yorumu yok veya hareketli major alias` +
            ` ("${tag ?? ''}") — beklenen biçim: ${EXPECTED}`
        );
      }
    });
  }
}

// 7h. Next security override alignment (Faz 8.3 PR-B, ADR-0015): pnpm's
// parent-scoped overrides bind to an exact parent version, so a Next patch bump
// silently unhooks them (PR #24 regression: postcss fell back to 8.4.31). The
// manifest pins the safe versions; this rule keeps the selector and the
// installed Next version in lockstep and rejects stale/loose selectors.
if (manifest.nextSecurityOverrides) {
  const cfg = manifest.nextSecurityOverrides;
  const readPkg = (rel) => {
    if (!existsSync(p(rel))) {
      check(false, `nextSecurityOverrides hedefi eksik: ${rel}`);
      return null;
    }
    try {
      return JSON.parse(readFileSync(p(rel), 'utf8'));
    } catch (e) {
      check(false, `${rel}: nextSecurityOverrides için geçersiz JSON (${e.message})`);
      return null;
    }
  };
  const webPkg = readPkg(cfg.webPackage);
  const rootPkg = readPkg(cfg.rootPackage);
  if (webPkg && rootPkg) {
    const next = webPkg.dependencies?.next ?? webPkg.devDependencies?.next ?? '';
    check(
      /^\d+\.\d+\.\d+$/.test(next),
      `${cfg.webPackage}: next sürümü exact x.y.z olmalı (bulunan: "${next}")`
    );
    const overrides = rootPkg.pnpm?.overrides ?? {};
    for (const [dep, safe] of Object.entries(cfg.required)) {
      const key = `next@${next}>${dep}`;
      check(
        overrides[key] === safe,
        `${cfg.rootPackage}: "${key}": "${safe}" override'ı eksik/farklı` +
          ` (bulunan: ${JSON.stringify(overrides[key] ?? null)}) — Next sürümü ilerlediyse selector'ı güncelle`
      );
    }
    for (const key of Object.keys(overrides)) {
      const m = key.match(/^next(?:@([^>]*))?>(.+)$/);
      if (!m || !(m[2] in cfg.required)) continue;
      if (m[1] === undefined) {
        check(false, `${cfg.rootPackage}: sürümsüz Next selector "${key}" — exact "next@${next}>${m[2]}" zorunlu`);
        continue;
      }
      check(
        /^\d+\.\d+\.\d+$/.test(m[1]),
        `${cfg.rootPackage}: exact olmayan/aralıklı Next selector "${key}" — exact x.y.z zorunlu`
      );
      check(
        m[1] === next,
        `${cfg.rootPackage}: stale Next override selector "${key}" (kurulu Next ${next}) — kaldır`
      );
    }
  }
}

// 7i. Project memory namespace (Faz 8.3 PR-C). The vault layout differs by mode
// and the ONLY source of truth for the project folder name is manifest
// `projectSlug` — never a directory counter or "first folder found". In
// skeleton-dev the live SiteSkeleton vault is required; in project mode it must
// have been ARCHIVED (moved, never deleted) and replaced by the generated
// <projectSlug> folder. Negative tests: scripts/tests/verify-structure-negative.mjs
if (manifest.projectMemory) {
  const cfg = manifest.projectMemory;
  const dirExists = (rel) => existsSync(p(rel)) && statSync(p(rel)).isDirectory();
  const template = `${cfg.root}/${cfg.template}`;
  const liveSkeleton = `${cfg.root}/${cfg.skeletonProject}`;
  const archived = `${cfg.root}/${cfg.archiveDir}/${cfg.skeletonProject}`;

  check(dirExists(template), `project memory şablonu yok: ${template}`);

  if (MODE === 'project') {
    const slug = manifest.projectSlug;
    const validSlug = typeof slug === 'string' && /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(slug);
    check(validSlug, `mode=project ama projectSlug yok/geçersiz (${JSON.stringify(slug ?? null)}) — bootstrap tamamlanmamış`);
    if (validSlug) {
      const projectDir = `${cfg.root}/${slug}`;
      const display = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      if (!dirExists(projectDir)) {
        check(false, `project memory klasörü yok: ${projectDir} (manifest projectSlug="${slug}")`);
      } else {
        for (const file of cfg.requiredProjectFiles ?? []) {
          const rel = `${projectDir}/${file}`;
          if (!existsSync(p(rel))) {
            check(false, `project memory dosyası eksik: ${rel}`);
            continue;
          }
          const expected = (cfg.headings ?? {})[file];
          if (!expected) continue;
          const first = readFileSync(p(rel), 'utf8').split(/\r?\n/)[0].trim();
          check(first === `${expected} ${display}`, `${rel}: başlık "${expected} ${display}" değil (bulunan: "${first}")`);
        }
        for (const dir of cfg.requiredProjectDirs ?? []) {
          check(dirExists(`${projectDir}/${dir}`), `project memory alt klasörü eksik: ${projectDir}/${dir}`);
        }
      }
      check(!existsSync(p(liveSkeleton)), `mode=project iken canlı iskelet memory'si kalmamalı: ${liveSkeleton}`);
      check(dirExists(archived), `iskelet memory'si arşivlenmemiş: ${archived} (silinmez, taşınır)`);
    }
  } else {
    check(manifest.projectSlug === undefined, `mode=${MODE} ama projectSlug kayıtlı (${JSON.stringify(manifest.projectSlug ?? null)})`);
    check(dirExists(liveSkeleton), `iskelet memory'si yok: ${liveSkeleton}`);
    for (const file of cfg.requiredSkeletonFiles ?? []) {
      check(existsSync(p(`${liveSkeleton}/${file}`)), `iskelet memory dosyası eksik: ${liveSkeleton}/${file}`);
    }
    check(!existsSync(p(archived)), `mode=${MODE} ama arşiv mevcut: ${archived} (kısmi dönüşüm)`);
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
// EXCLUDE_DIRS is declared at the top of this file (shared with rule 7f).

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

// The file list is git-derived (Faz 8.3 PR-B): tracked files plus untracked
// files git would not ignore. A plain tree walk counted generated, ignored
// artefacts too — `apps/web/next-env.d.ts` exists only after a build/typegen ran,
// so the total check count drifted with local state (899 vs 896). Ignored
// generated files are out of scope for a structural rule; temporary negative-test
// fixtures (untracked, not ignored) stay in scope.
function isExcludedPath(rel) {
  const parts = rel.split('/');
  for (let i = 0; i < parts.length - 1; i++) {
    if (EXCLUDE_DIRS.has(parts[i]) || EXCLUDE_DIRS.has(parts.slice(0, i + 1).join('/'))) return true;
  }
  return false;
}

function listScanFiles() {
  const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (git.error || git.status !== 0) {
    console.error(
      '  ! forbidden-pattern dosya listesi ağaç taramasına düştü (git yok/başarısız):' +
        ' ignore edilen generated dosyalar da taranır, check sayısı ortama göre değişebilir'
    );
    return [...walk(ROOT)];
  }
  return git.stdout
    .split('\0')
    .filter(Boolean)
    .filter((rel) => !isExcludedPath(rel))
    .filter((rel) => existsSync(p(rel)) && statSync(p(rel)).isFile());
}

const allFiles = listScanFiles();
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
