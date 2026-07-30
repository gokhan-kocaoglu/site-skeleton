#!/usr/bin/env node
/**
 * Cumulative structure checker for the site-skeleton repo.
 * Manifest-driven: scripts/structure-manifest.json grows with each build phase.
 * Node stdlib only. Exit 0 = PASS, exit 1 = FAIL.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
// F4-LOW-05 (ADR-0017): a marker deep inside a copy used to make its OWN
// directory the activation root, so `apps/x/src/server.mjs` demanded
// `apps/x/src/ACTIVATION.md` — the right FAIL pointed at the wrong place. The
// root is now the NEAREST ancestor carrying a package.json (hardening unit =
// package boundary), never `apps` itself or above: the repo root has a
// package.json, so an unbounded walk would collapse every copy onto it.
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

  // No root is ever dropped. An earlier revision discarded marker roots that
  // were ancestors of another candidate ("grouping workspace"); the security
  // gate proved that hides a real copy — an unhardened `apps/gw/` went silent
  // behind a decoy `apps/gw/tools/x-bff/`. Extra demands are fail-closed noise;
  // a dropped demand is a false PASS.
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
// The repo ships five optional templates but only ONE is protected by a
// structural gate, while README generalised that guarantee to every copied
// template. The registry makes the enforcement scope explicit and — the point —
// machine-checked: declared module set, per-module enforcement mode and the
// README/CLAUDE prose must agree with each other and with the real templates/
// tree. Two deliberate design rules:
//   * The gate loop above (7f) is NOT driven by this registry. Deleting a
//     registry entry can never switch the admin-bff gate off; it only produces
//     a named FAIL here.
//   * The automatic-gate module set, the checklist size AND the detection
//     signals are pinned in CODE. Blanking `nameFragment`/`marker` in the
//     manifest used to disarm the gate while the gate stayed green; that
//     data-only bypass is now a FAIL.
const AUTOMATIC_GATE_MODULES = ['admin-bff'];
const ADMIN_BFF_CHECKLIST_ITEMS = 12;
const EXPECTED_GATE_SIGNALS = {
  'admin-bff': { nameFragment: 'bff', marker: 'ADMIN_BFF_TEMPLATE_MARKER' },
};
const ACTIVATION_SECTION_RE =
  /<!--\s*activation-modules:start\s*-->\r?\n([\s\S]*?)<!--\s*activation-modules:end\s*-->/;
// Row patterns are anchored to each document's real structure: a loose "two
// code spans on a line" match accepted a reordered table whose Enforcement
// value sat behind arbitrary prose.
const ACTIVATION_DOC_FORMATS = {
  'README.md': {
    row: /^\|\s*`(templates\/[a-z0-9][a-z0-9-]*\/)`\s*\|\s*`(automatic-gate|manual-hardening)`\s*\|/gm,
    header: /^\|\s*Template\s*\|\s*Enforcement\s*\|/m,
    headerLabel: '| Template | Enforcement | ... |',
  },
  'CLAUDE.md': {
    row: /^- `(templates\/[a-z0-9][a-z0-9-]*\/)` · `(automatic-gate|manual-hardening)`/gm,
    header: null,
  },
};
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

// Driven by the file system: a new templates/<module> must be classified first.
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
// The pinned count must stay tied to the real template's item count.
const adminBffChecklist = existsSync(p('templates/admin-bff/ACTIVATION.md'))
  ? (readFileSync(p('templates/admin-bff/ACTIVATION.md'), 'utf8').match(/- \[ \]/g) ?? []).length
  : -1;
check(
  adminBffChecklist === ADMIN_BFF_CHECKLIST_ITEMS,
  `templates/admin-bff/ACTIVATION.md: ${adminBffChecklist} işaretsiz madde` +
    ` (kodda sabitlenen ${ADMIN_BFF_CHECKLIST_ITEMS} ile eşleşmeli)`
);
// Detection signals are part of the guarantee, not tunable data.
for (const [gateId, expected] of Object.entries(EXPECTED_GATE_SIGNALS)) {
  const gate = (manifest.activationGates ?? []).find((g) => g.id === gateId);
  check(
    gate?.nameFragment === expected.nameFragment && gate?.marker === expected.marker,
    `activationGates["${gateId}"]: tespit sinyalleri kodda sabitlenen değerlerle uyuşmuyor` +
      ` (nameFragment=${JSON.stringify(gate?.nameFragment)}, marker=${JSON.stringify(gate?.marker)}` +
      ` — beklenen ${JSON.stringify(expected.nameFragment)}, ${JSON.stringify(expected.marker)})`
  );
  const templateSource = `templates/${gateId}/server.mjs`;
  check(
    existsSync(p(templateSource)) &&
      readFileSync(p(templateSource), 'utf8').includes(expected.marker),
    `${templateSource}: gate marker imzası (${expected.marker}) yok — kopyalanan şablon tespit edilemez`
  );
}

// Declaration <-> enforcement: both documents must list exactly the registered
// modules with exactly the registered mode; sorted-row comparison also catches
// duplicated or missing rows.
const expectedRows = registry
  .filter((m) => typeof m?.templatePath === 'string' && typeof m?.enforcementMode === 'string')
  .map((m) => `${m.templatePath} ${m.enforcementMode}`)
  .sort()
  .join(' | ');
for (const [docFile, format] of Object.entries(ACTIVATION_DOC_FORMATS)) {
  const text = existsSync(p(docFile)) ? readFileSync(p(docFile), 'utf8') : '';
  const starts = (text.match(/<!--\s*activation-modules:start\s*-->/g) ?? []).length;
  const ends = (text.match(/<!--\s*activation-modules:end\s*-->/g) ?? []).length;
  const section = text.match(ACTIVATION_SECTION_RE);
  check(
    starts === 1 && ends === 1 && section !== null,
    `${docFile}: activation-modules bölümü yok veya marker çifti bozuk (<!-- activation-modules:start/end -->)`
  );
  const body = section?.[1] ?? '';
  if (format.header) {
    check(
      format.header.test(body),
      `${docFile}: activation-modules tablosunun başlık satırı beklenen sırada değil (${format.headerLabel})`
    );
  }
  const rows = [...body.matchAll(format.row)]
    .map((m) => `${m[1]} ${m[2]}`)
    .sort()
    .join(' | ');
  check(
    rows === expectedRows,
    `${docFile}: activation-modules bölümü registry ile uyuşmuyor` +
      ` — bölüm: [${rows}] · registry: [${expectedRows}]`
  );
}
// Whitespace-normalised: the sentence stays valid across a reflow/rewrap.
const readmeText = existsSync(p('README.md'))
  ? readFileSync(p('README.md'), 'utf8').replace(/\s+/g, ' ')
  : '';
for (const phrase of CANONICAL_MANUAL_PHRASES) {
  check(
    readmeText.includes(phrase),
    `README.md: manual-hardening semantiği için canonical ifade eksik: "${phrase}"`
  );
}

// 7k. Audited upstream release provenance (AC-32 / F4-MEDIUM-02, ADR-0018).
//
// The repo used to keep a timeless evidence contract and a time-bound status
// table in one file: the contract stayed true while the table went stale, and
// README/CLAUDE said nothing at all. The registry below is the single machine
// source of truth; the ledger and the two bounded sections are verified against
// it. Three deliberate rules:
//   * Fields are AUDIT-SCOPED, never "current": publishing a candidate does not
//     mutate this tree, so no value can be born stale. A candidate enters the
//     registry only together with its canonical audit report.
//   * Dictionaries live in CODE, not in data, and the audit report plus the
//     protected RC1 snapshot section are bound by SHA-256 — an offline
//     cryptographic tie, never a network call or a git-ancestry query.
//   * The bounded section is skeleton-only provenance; a generated project must
//     not inherit the template's verdict as if it were its own (see bootstrap).
const RELEASE_VERDICTS = ['PASS', 'PASS_WITH_RISKS', 'FAIL'];
const RELEASE_READINESS = ['CORE_SKELETON_PRODUCTION_READY', 'CORE_SKELETON_NOT_PRODUCTION_READY'];
const RELEASE_RECOMMENDATIONS = ['GO_FOR_V1_0_0', 'NO_GO_REMEDIATION_REQUIRED'];
const STABLE_AT_AUDIT = ['NOT_PUBLISHED', 'PUBLISHED'];
const AUDITED_STATE_FIELDS = [
  'auditedCandidateTag', 'auditReport', 'auditSha256',
  'verdict', 'productionReadiness', 'recommendation', 'stableReleaseStatusAtAudit',
];
// Schema verification is EXACT, not "required fields present". A key nobody
// enforces is a key that can lie: `currentRelease`, `latestCandidate` or a
// harmless-looking `displayLabel` would each smuggle an unverified — and in the
// time-bound cases immediately stale — claim past the gate. Naming the banned
// fields one by one would be an endless denylist, so the rule is fail-closed:
// anything outside these sets is a violation on its own.
const PROVENANCE_FIELDS = ['auditedState', 'auditedImmutableReleases'];
const RELEASE_REQUIRED_FIELDS = [
  'tag', 'releaseId', 'targetCommit', 'publishedAt', 'prerelease', 'immutable', 'repositorySnapshot',
];
const RELEASE_OPTIONAL_FIELDS = [
  'snapshotProtectedSectionSha256', 'attestationVerified', 'attestationChecks',
];
const RELEASE_LEDGER = 'docs/releases/README.md';
const RELEASE_ATTESTATION = 'docs/operations/release-attestation.md';
const RC1_PROTECTED_START = '## Attestation (dış immutable kanıt)';
const RC1_PROTECTED_END = '**Bağlayıcı kural:**';
const RELEASE_STATE_SECTION_RE =
  /<!--\s*release-state:start\s*-->\r?\n([\s\S]*?)<!--\s*release-state:end\s*-->/;
const RELEASE_STATE_ROW_RE = /^- [^:`\n]+: `([^`\n]+)`\s*$/gm;
// Eight code-span cells per ledger row: every truth field of a release record
// is mirrored, so a one-sided registry edit cannot hide behind an unmirrored
// column (prerelease/immutable/attestation used to be prose only).
const LEDGER_CELL_RE = '\\s*`([^`|]+)`\\s*\\|';
const RELEASE_HISTORY_ROW_RE = new RegExp(`^\\|${LEDGER_CELL_RE.repeat(8)}`, 'gm');
const HISTORICAL_NOTE_RE =
  /<!--\s*historical-note:start\s*-->([\s\S]*?)<!--\s*historical-note:end\s*-->/;
// The registry itself legitimately carries 40-hex targets, so identity tokens
// get their own narrower pattern: those WOULD be rewritten by bootstrap.
const SKELETON_IDENTITY_RE = /site-skeleton|Site Skeleton|@skeleton\/|com\.skeleton|skeleton-api/;
// Inside the bounded summary every self-reference and every per-release metadata
// signal is banned: the section is an audit-scoped verdict summary, not a second
// copy of the release history. 40-hex is matched case-INSENSITIVELY (an
// uppercase SHA is the same self-reference), and long digit runs cover both
// release IDs and CI run IDs. Labels are reported so the failure names the class.
const SECTION_FORBIDDEN_PATTERNS = [
  [/\b[0-9a-fA-F]{40}\b/, '40-hex commit SHA'],
  [/actions\/runs\/\d+/, 'CI run URL'],
  [/\b\d{7,}\b/, 'release ID / CI run ID'],
  [/(?:^|[\s([])#\d{1,5}\b/, 'PR numarası'],
  [SKELETON_IDENTITY_RE, 'skeleton kimlik token\'ı'],
  [/publishedAt|prerelease|immutable/i, 'release metadata alanı'],
  [/attestationVerified|verified:\s*\d+|attestation[^\n]{0,24}(?:verified|doğrulan)/i,
    'olumlu attestation sinyali'],
];
const RELEASE_TAG_RE = /^v\d+\.\d+\.\d+(?:-rc\.\d+)?$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SHA40_RE = /^[0-9a-f]{40}$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

/** Exact key-set equality on a plain object — the fail-closed schema primitive. */
function sameKeySet(value, expected) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...expected].sort().join('|')
  );
}
const keyList = (value) =>
  value !== null && typeof value === 'object' ? Object.keys(value).sort().join(', ') : 'nesne değil';

const provenance = manifest.upstreamReleaseProvenance;
check(
  provenance !== null && typeof provenance === 'object' &&
    typeof provenance.auditedState === 'object' && provenance.auditedState !== null &&
    Array.isArray(provenance.auditedImmutableReleases),
  'scripts/structure-manifest.json: upstreamReleaseProvenance eksik veya şema dışı' +
    ' (auditedState nesnesi + auditedImmutableReleases dizisi zorunlu)'
);
check(
  sameKeySet(provenance, PROVENANCE_FIELDS),
  'upstreamReleaseProvenance: exact şema dışı anahtar kümesi' +
    ` — izinli: [${PROVENANCE_FIELDS.join(', ')}] · ölçülen: [${keyList(provenance)}]`
);
const auditedState = provenance?.auditedState ?? {};
check(
  sameKeySet(auditedState, AUDITED_STATE_FIELDS),
  'upstreamReleaseProvenance.auditedState: exact şema dışı anahtar kümesi' +
    ` — izinli: [${[...AUDITED_STATE_FIELDS].sort().join(', ')}] · ölçülen: [${keyList(auditedState)}]`
);
const releaseHistory = Array.isArray(provenance?.auditedImmutableReleases)
  ? provenance.auditedImmutableReleases
  : [];

for (const field of AUDITED_STATE_FIELDS) {
  check(
    typeof auditedState[field] === 'string' && auditedState[field].length > 0,
    `upstreamReleaseProvenance.auditedState.${field}: eksik veya boş`
  );
}
check(
  RELEASE_VERDICTS.includes(auditedState.verdict),
  `auditedState.verdict geçersiz: ${JSON.stringify(auditedState.verdict)} — izinli: ${RELEASE_VERDICTS.join(' | ')}`
);
check(
  RELEASE_READINESS.includes(auditedState.productionReadiness),
  `auditedState.productionReadiness geçersiz: ${JSON.stringify(auditedState.productionReadiness)}`
);
check(
  RELEASE_RECOMMENDATIONS.includes(auditedState.recommendation),
  `auditedState.recommendation geçersiz: ${JSON.stringify(auditedState.recommendation)}`
);
check(
  STABLE_AT_AUDIT.includes(auditedState.stableReleaseStatusAtAudit),
  `auditedState.stableReleaseStatusAtAudit geçersiz: ${JSON.stringify(auditedState.stableReleaseStatusAtAudit)}` +
    ' — bu alan audit anına aittir, release\'in bugünkü varlığına değil'
);
check(
  auditedState.verdict !== 'FAIL' || auditedState.productionReadiness === 'CORE_SKELETON_NOT_PRODUCTION_READY',
  'auditedState: verdict FAIL iken productionReadiness CORE_SKELETON_NOT_PRODUCTION_READY olmalı'
);
check(
  auditedState.verdict !== 'FAIL' || auditedState.recommendation === 'NO_GO_REMEDIATION_REQUIRED',
  'auditedState: verdict FAIL iken recommendation NO_GO_REMEDIATION_REQUIRED olmalı'
);
check(
  RELEASE_TAG_RE.test(auditedState.auditedCandidateTag ?? ''),
  `auditedState.auditedCandidateTag tag biçiminde değil: ${JSON.stringify(auditedState.auditedCandidateTag)}`
);

const auditRel = typeof auditedState.auditReport === 'string' ? auditedState.auditReport : '';
const auditExists =
  auditRel.startsWith('docs/audits/') && existsSync(p(auditRel)) && statSync(p(auditRel)).isFile();
check(auditExists, `auditedState.auditReport docs/audits/ altında bir dosya değil: ${auditRel}`);
check(
  SHA256_RE.test(auditedState.auditSha256 ?? ''),
  'auditedState.auditSha256 lowercase 64-hex değil'
);
const auditDigest = auditExists ? createHash('sha256').update(readFileSync(p(auditRel))).digest('hex') : '';
check(
  auditDigest === (auditedState.auditSha256 ?? '').toLowerCase(),
  `auditedState.auditSha256 canonical audit dosyasıyla eşleşmiyor (ölçülen ${auditDigest || 'yok'})`
);

const seenTags = new Set();
const seenIds = new Set();
let previousPublishedAt = '';
for (const [i, rel] of releaseHistory.entries()) {
  const label = typeof rel?.tag === 'string' ? rel.tag : `#${i}`;
  const keys = rel !== null && typeof rel === 'object' && !Array.isArray(rel) ? Object.keys(rel) : [];
  const unknown = keys.filter(
    (key) => !RELEASE_REQUIRED_FIELDS.includes(key) && !RELEASE_OPTIONAL_FIELDS.includes(key)
  );
  check(
    unknown.length === 0,
    `auditedImmutableReleases[${label}]: şema dışı alan(lar): ${unknown.join(', ')}` +
      ` — izinli zorunlu: [${RELEASE_REQUIRED_FIELDS.join(', ')}]` +
      ` · izinli koşullu: [${RELEASE_OPTIONAL_FIELDS.join(', ')}]`
  );
  const missing = RELEASE_REQUIRED_FIELDS.filter((key) => !keys.includes(key));
  check(
    missing.length === 0,
    `auditedImmutableReleases[${label}]: zorunlu alan eksik: ${missing.join(', ')}`
  );
  check(
    typeof rel?.tag === 'string' && RELEASE_TAG_RE.test(rel.tag) && !seenTags.has(rel.tag),
    `auditedImmutableReleases[${label}]: tag geçersiz veya yinelenmiş`
  );
  if (typeof rel?.tag === 'string') seenTags.add(rel.tag);
  check(
    Number.isInteger(rel?.releaseId) && rel.releaseId > 0 && !seenIds.has(rel.releaseId),
    `auditedImmutableReleases[${label}]: releaseId pozitif integer değil veya yinelenmiş`
  );
  if (Number.isInteger(rel?.releaseId)) seenIds.add(rel.releaseId);
  check(
    SHA40_RE.test(rel?.targetCommit ?? ''),
    `auditedImmutableReleases[${label}]: targetCommit lowercase 40-hex değil`
  );
  check(
    ISO_UTC_RE.test(rel?.publishedAt ?? ''),
    `auditedImmutableReleases[${label}]: publishedAt UTC ISO-8601 değil`
  );
  check(
    typeof rel?.prerelease === 'boolean' && typeof rel?.immutable === 'boolean',
    `auditedImmutableReleases[${label}]: prerelease/immutable boolean değil`
  );
  check(
    (rel?.publishedAt ?? '') > previousPublishedAt,
    `auditedImmutableReleases[${label}]: publication sırası artan olmalı`
  );
  previousPublishedAt = rel?.publishedAt ?? previousPublishedAt;
  const snapshot = rel?.repositorySnapshot ?? null;
  check(
    snapshot === null || (typeof snapshot === 'string' && existsSync(p(snapshot)) && statSync(p(snapshot)).isFile()),
    `auditedImmutableReleases[${label}]: repositorySnapshot yolu yok: ${snapshot}`
  );
  // A snapshot without its protected digest is an unbound file; a digest without
  // a snapshot is a claim about nothing. Both directions are violations.
  const hasDigest = keys.includes('snapshotProtectedSectionSha256');
  if (typeof snapshot === 'string') {
    check(
      hasDigest && SHA256_RE.test(rel.snapshotProtectedSectionSha256 ?? ''),
      `auditedImmutableReleases[${label}]: repositorySnapshot taşıyan kayıt` +
        ' lowercase 64-hex snapshotProtectedSectionSha256 taşımalı'
    );
  } else {
    check(
      !hasDigest,
      `auditedImmutableReleases[${label}]: repositorySnapshot null iken` +
        ' snapshotProtectedSectionSha256 taşınmamalı (bağlanacak dosya yok)'
    );
  }
  const hasVerified = keys.includes('attestationVerified');
  const hasChecks = keys.includes('attestationChecks');
  check(
    hasVerified === hasChecks,
    `auditedImmutableReleases[${label}]: attestationVerified ve attestationChecks` +
      ' birlikte bulunmalı (biri olmadan diğeri ölçülemez)'
  );
  if (hasVerified && hasChecks) {
    check(
      typeof rel.attestationVerified === 'boolean',
      `auditedImmutableReleases[${label}]: attestationVerified boolean değil`
    );
    check(
      Number.isInteger(rel.attestationChecks) && rel.attestationChecks > 0,
      `auditedImmutableReleases[${label}]: attestationChecks pozitif integer değil`
    );
  }
}
check(
  releaseHistory.filter((rel) => rel?.tag === auditedState.auditedCandidateTag).length === 1,
  `auditedCandidateTag ${auditedState.auditedCandidateTag} geçmişte tam bir kayıtla eşleşmiyor`
);
check(
  !SKELETON_IDENTITY_RE.test(JSON.stringify(provenance ?? {})),
  'upstreamReleaseProvenance: ikame edilebilir skeleton kimlik token\'ı taşıyor' +
    ' (generated projede provenance bozulur — bkz. ADR-0018)'
);

const registeredSnapshots = releaseHistory
  .map((rel) => rel?.repositorySnapshot)
  .filter((snapshot) => typeof snapshot === 'string')
  .sort();
const snapshotFiles = existsSync(p('docs/releases'))
  ? readdirSync(p('docs/releases'))
      .filter((name) => /^v.*\.md$/.test(name))
      .map((name) => `docs/releases/${name}`)
      .sort()
  : [];
check(
  registeredSnapshots.join(',') === snapshotFiles.join(','),
  `docs/releases: snapshot dosya kümesi registry ile eşit değil` +
    ` — registry: [${registeredSnapshots.join(', ')}] · dosya sistemi: [${snapshotFiles.join(', ')}]`
);

const rc1 = releaseHistory.find((rel) => rel?.tag === 'v1.0.0-rc.1');
const rc1Path = typeof rc1?.repositorySnapshot === 'string' ? rc1.repositorySnapshot : '';
const rc1Text = rc1Path && existsSync(p(rc1Path)) ? readFileSync(p(rc1Path), 'utf8') : '';
const protectedStart = rc1Text.indexOf(RC1_PROTECTED_START);
const protectedEnd = rc1Text.indexOf(RC1_PROTECTED_END);
const protectedSection =
  protectedStart >= 0 && protectedEnd > protectedStart ? rc1Text.slice(protectedStart, protectedEnd) : '';
check(protectedSection.length > 0, `${rc1Path || 'RC1 snapshot'}: korunan attestation bölümü sınırları bulunamadı`);
check(
  protectedSection.length > 0 &&
    createHash('sha256').update(protectedSection, 'utf8').digest('hex') === rc1?.snapshotProtectedSectionSha256,
  `${rc1Path || 'RC1 snapshot'}: korunan attestation/placeholder bölümü değişmiş` +
    ' (snapshotProtectedSectionSha256 eşleşmiyor — placeholder\'lar doldurulamaz)'
);
const rc1Note = rc1Text.match(HISTORICAL_NOTE_RE);
check(
  rc1Note !== null &&
    [rc1?.tag, String(rc1?.releaseId), rc1?.targetCommit, rc1?.publishedAt].every((value) =>
      rc1Note[1].includes(value)
    ),
  `${rc1Path || 'RC1 snapshot'}: historical-note bloğu registry kimliğiyle eşleşmiyor`
);

const expectedStateVector = [
  auditedState.verdict, auditedState.auditedCandidateTag, auditedState.auditReport,
  auditedState.productionReadiness, auditedState.recommendation, auditedState.stableReleaseStatusAtAudit,
].join(' | ');
for (const docFile of ['README.md', 'CLAUDE.md', RELEASE_LEDGER]) {
  const text = existsSync(p(docFile)) ? readFileSync(p(docFile), 'utf8') : '';
  const starts = (text.match(/<!--\s*release-state:start\s*-->/g) ?? []).length;
  const ends = (text.match(/<!--\s*release-state:end\s*-->/g) ?? []).length;
  // Ledger keeps upstream provenance in BOTH modes; README/CLAUDE carry the
  // summary only in the skeleton, never in a generated project.
  if (MODE !== 'skeleton-dev' && docFile !== RELEASE_LEDGER) {
    check(
      starts === 0 && ends === 0,
      `${docFile}: project modda upstream release-state bölümü bulunmamalı` +
        ' (üretilen proje iskeletin audit hükmünü kendi durumu gibi taşıyamaz)'
    );
    continue;
  }
  const section = text.match(RELEASE_STATE_SECTION_RE);
  check(
    starts === 1 && ends === 1 && section !== null,
    `${docFile}: release-state bölümü yok veya marker çifti bozuk (<!-- release-state:start/end -->)`
  );
  const body = section?.[1] ?? '';
  const fields = [...body.matchAll(RELEASE_STATE_ROW_RE)].map((match) => match[1]);
  const values = fields.join(' | ');
  check(
    values === expectedStateVector,
    `${docFile}: release-state alanları registry ile uyuşmuyor — bölüm: [${values}] · registry: [${expectedStateVector}]`
  );
  check(
    fields[0] === auditedState.verdict,
    `${docFile}: release-state bölümünün ilk alanı verdict olmalı (olumlu sinyal verdict'i gömemez)`
  );
  const forbidden = SECTION_FORBIDDEN_PATTERNS.filter(([pattern]) => pattern.test(body)).map(([, label]) => label);
  check(
    forbidden.length === 0,
    `${docFile}: release-state bölümünde yasak token var (${forbidden.join(' · ')})` +
      ' — bölüm audit-scoped verdict özetidir, release geçmişinin kopyası değildir'
  );
}

// Normalised attestation cell: the boolean decides the label, so flipping
// `attestationVerified` alone is a drift the ledger comparison must catch.
const attestationCell = (rel) => {
  if (typeof rel?.attestationVerified !== 'boolean' || !Number.isInteger(rel?.attestationChecks)) {
    return 'not-recorded';
  }
  return `${rel.attestationVerified ? 'verified' : 'unverified'}:${rel.attestationChecks}`;
};
const ledgerText = existsSync(p(RELEASE_LEDGER)) ? readFileSync(p(RELEASE_LEDGER), 'utf8') : '';
const ledgerRows = [...ledgerText.matchAll(RELEASE_HISTORY_ROW_RE)]
  .map((match) => match.slice(1, 9).join('|'))
  .join(' || ');
const expectedLedgerRows = releaseHistory
  .map((rel) =>
    [
      rel?.tag, String(rel?.releaseId), rel?.targetCommit, rel?.publishedAt,
      String(rel?.prerelease), String(rel?.immutable), attestationCell(rel),
      rel?.repositorySnapshot ?? 'none',
    ].join('|')
  )
  .join(' || ');
check(
  ledgerRows === expectedLedgerRows,
  `${RELEASE_LEDGER}: audited release history registry ile uyuşmuyor` +
    ` — ledger: [${ledgerRows}] · registry: [${expectedLedgerRows}]`
);
// The history table carries release IDs, SHAs and metadata by design, so it must
// stay OUTSIDE the bounded summary — otherwise the forbidden-token rule above
// would be satisfied only by weakening it.
const ledgerSectionEnd = ledgerText.indexOf('<!-- release-state:end -->');
check(
  ledgerSectionEnd >= 0 &&
    [...ledgerText.matchAll(RELEASE_HISTORY_ROW_RE)].every((match) => match.index > ledgerSectionEnd),
  `${RELEASE_LEDGER}: release-history satırları bounded release-state bölümünün dışında kalmalı`
);

// Stale-state ban (F4R2-MEDIUM-01). The attestation file is a TIMELESS contract:
// it legitimately teaches the placeholder model (`FINAL_MERGE_SHA`, …), so a
// repo-wide word ban would break its own examples — prose labels such as "Final
// evidence closure merge SHA" read almost identically to the banned
// FINAL_EVIDENCE_CLOSURE_MERGE_SHA placeholder. The ban therefore has two exact
// contexts: (1) no `Mevcut durum` heading may return, whatever its casing,
// emphasis or date suffix — except the pointer heading that says the state is
// NOT kept here; (2) SCREAMING_SNAKE status identifiers and the three
// external-status sentences are banned as written, case- and
// emphasis-insensitively, which prose spellings can never satisfy.
const STALE_STATUS_IDS = [
  'RC1_RELEASE_TARGET_SHA',
  'FINAL_EVIDENCE_MERGE_SHA',
  'FINAL_EVIDENCE_POST_MERGE_CI_RUN_URL',
  'FINAL_EVIDENCE_CLOSURE_PR',
  'FINAL_EVIDENCE_CLOSURE_MERGE_SHA',
  'FINAL_EVIDENCE_CLOSURE_POST_MERGE_CI_RUN_URL',
  'PENDING_USER_ACTION',
];
const STALE_STATUS_SENTENCES = [
  'Dördüncü mini-denetim başlatılmadı',
  'Release oluşturulmadı',
  'Tag oluşturulmadı',
];
const POINTER_HEADING = 'mevcut durum burada tutulmaz';
// Turkish casing is lossy in BOTH directions: `'I'.toLowerCase()` is dotted `i`
// while the written form is dotless `ı`, and `'İ'.toLowerCase()` adds a combining
// dot. A plain toLowerCase() comparison would therefore miss an ALL-CAPS stale
// sentence — a false negative in exactly the case the rule must catch. Folding
// every i-variant to bare `i` makes the match casing-proof both ways.
const COMBINING_DOT_ABOVE = '\u0307';
const DOTLESS_I = '\u0131';
const foldCase = (text) =>
  text.toLowerCase().split(COMBINING_DOT_ABOVE).join('').split(DOTLESS_I).join('i');
const attestationText = existsSync(p(RELEASE_ATTESTATION)) ? readFileSync(p(RELEASE_ATTESTATION), 'utf8') : '';
for (const line of attestationText.replace(/[`*_]/g, '').split(/\r?\n/)) {
  const heading = line.match(/^#{2,6}\s+(.+)$/);
  if (heading === null || !/mevcut\s+durum/i.test(heading[1])) continue;
  check(
    foldCase(heading[1].trim()) === foldCase(POINTER_HEADING),
    `${RELEASE_ATTESTATION}: kaldırılan current-status bölümü geri geldi ("${heading[1].trim()}")` +
      ' — güncel durum yalnız ledger\'da tutulur'
  );
}
const staleIdText = attestationText.replace(/[`*]/g, '').toUpperCase();
for (const token of STALE_STATUS_IDS) {
  check(
    !staleIdText.includes(token),
    `${RELEASE_ATTESTATION}: bayat current-state token'ı taşıyor (${token}) — durum ledger'da tutulur`
  );
}
const staleProseText = foldCase(attestationText.replace(/[`*]/g, '').replace(/\s+/g, ' '));
for (const sentence of STALE_STATUS_SENTENCES) {
  check(
    !staleProseText.includes(foldCase(sentence.replace(/\s+/g, ' '))),
    `${RELEASE_ATTESTATION}: bayat dış-durum cümlesi taşıyor ("${sentence}") — durum ledger'da tutulur`
  );
}
check(
  attestationText.includes(RELEASE_LEDGER),
  `${RELEASE_ATTESTATION}: canonical ledger'a (${RELEASE_LEDGER}) işaretçi yok`
);

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
