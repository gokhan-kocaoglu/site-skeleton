#!/usr/bin/env node
/**
 * Negative self-tests for verify-structure rules.
 *
 * Each scenario plants a temporary violation and asserts the gate FAILs
 * with the offending file named in the output — proving exemptions did
 * not loosen the scan (CI #15 regression) and structural rules actually
 * bite. Node stdlib only. Exit 0 = all scenarios behave, exit 1 otherwise.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
const MANIFEST = path.join(ROOT, 'scripts', 'structure-manifest.json');
const MEMORY_ROOT = path.join(ROOT, 'project-memory', 'ClaudeTeamMemory', '01_Projects');
const PINNED_SHA = 'd23441a48e516b6c34aea4fa41551a30e30af803';
const NEG_SLUG = 'negative-demo';
const MEMORY_SUBDIRS = ['01_PM', '02_UX_UI', '03_Backend', '04_Frontend', '05_QA', '06_Decisions', '07_Patterns', '08_Session_Logs'];

// This suite runs in the skeleton AND inside bootstrapped repositories (the
// generated-project gate calls it). Rules that only exist in one mode must be
// skipped in the other, or the scenario would fail itself — the latent bug the
// bootstrap certification surfaced.
const MODE = JSON.parse(readFileSync(MANIFEST, 'utf8')).mode ?? 'skeleton-dev';

// A scenario that mutates tracked files or plants directories must leave no
// trace; this snapshot covers tracked changes AND untracked leftovers.
function worktreeSnapshot() {
  const run = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error || run.status !== 0) return null; // git missing -> fail-safe skip
  return run.stdout;
}

/** Rewrites the manifest and hands back a byte-exact restore. */
function patchManifest(mutate) {
  const original = readFileSync(MANIFEST);
  const data = JSON.parse(original.toString('utf8'));
  mutate(data);
  writeFileSync(MANIFEST, `${JSON.stringify(data, null, 2)}\n`);
  return () => writeFileSync(MANIFEST, original);
}

/** Rewrites a tracked text file and hands back a byte-exact restore. */
function patchTextFile(relPath, mutate) {
  const file = path.join(ROOT, relPath);
  const original = readFileSync(file);
  writeFileSync(file, mutate(original.toString('utf8')));
  return () => writeFileSync(file, original);
}

/** Drops one release-state field row from a document's bounded section. */
function dropReleaseStateField(text, label) {
  return text
    .split('\n')
    .filter((line) => !line.startsWith(`- ${label}:`))
    .join('\n');
}

/** mode=project fixture: patches the manifest and plants the project vault. */
function asProjectMode(mutate = () => {}) {
  const dir = plantMemoryProject(NEG_SLUG);
  return {
    paths: [dir],
    restore: patchManifest((m) => {
      m.mode = 'project';
      m.projectSlug = NEG_SLUG;
      mutate(m);
    }),
  };
}

/** Drops every line carrying one module's templatePath code span. */
function dropActivationRow(text, templatePath) {
  return text
    .split('\n')
    .filter((line) => !line.includes(`\`${templatePath}\``))
    .join('\n');
}

/**
 * Adds ONE extra line after a module's row inside the activation-modules
 * section. The canonical rows stay intact — that is the CASE-B shape R9 needs;
 * deleting or editing a row is already covered above and proves less.
 */
function addActivationRow(text, injected, anchorPrefix) {
  const lines = text.split('\n');
  let idx = -1;
  for (let i = 0; i < lines.length; i += 1) if (lines[i].startsWith(anchorPrefix)) idx = i;
  if (idx < 0) throw new Error(`activation anchor missing: ${anchorPrefix}`);
  return [...lines.slice(0, idx + 1), injected, ...lines.slice(idx + 1)].join('\n');
}

// Fixture rows are written LITERALLY here: the harness must never derive its
// markers or separators from the detector constants it is testing.
const R9_STRAY = 'activation-modules bölümünde canonical grammar dışı declaration satırı';
const R9_CLAUDE_ANCHOR = '- `templates/payments/` · `manual-hardening`';
const R9_README_ANCHOR = '| `templates/payments/` | `manual-hardening` |';

/** R9 CASE-B: five canonical rows kept, one non-canonical declaration added. */
const r9Stray = (doc, name, injected) => ({
  name,
  expectFragments: [`${doc}: ${R9_STRAY}`, injected],
  setup: () => ({
    paths: [],
    restore: patchTextFile(doc, (text) =>
      addActivationRow(text, injected, doc === 'README.md' ? R9_README_ANCHOR : R9_CLAUDE_ANCHOR)
    ),
  }),
});

const tickedList = (n) => Array.from({ length: n }, (_, i) => `- [x] item ${i + 1}`).join('\n');

/**
 * Plants an activated copy whose marker sits in a SUBDIRECTORY of the package
 * root (F4-LOW-05). The name carries no `bff` fragment on purpose: only the
 * marker signal may fire, so the scenario measures marker-root resolution and
 * nothing else.
 */
function plantNestedMarkerCopy({ activation = null } = {}) {
  const dir = path.join(ROOT, 'apps', 'probe-root');
  mkdirSync(path.join(dir, 'src'), { recursive: true });
  writeFileSync(path.join(dir, 'package.json'), '{ "name": "probe-root", "private": true }\n');
  writeFileSync(
    path.join(dir, 'src', 'server.mjs'),
    `// copied template\n// ${'ADMIN_BFF'}_TEMPLATE_MARKER\n`
  );
  if (activation !== null) writeFileSync(path.join(dir, 'ACTIVATION.md'), activation);
  return [dir];
}

/** Plants a throwaway project-memory folder; `omit` leaves one file out. */
function plantMemoryProject(slug, { omit = null } = {}) {
  const base = path.join(MEMORY_ROOT, slug);
  const display = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  mkdirSync(base, { recursive: true });
  const files = {
    'Project Brief.md': `# Project Brief — ${display}\n`,
    'Current Status.md': `# Current Status — ${display}\n`,
    'Backlog.md': `# Backlog — ${display}\n`,
  };
  for (const [name, content] of Object.entries(files)) {
    if (name !== omit) writeFileSync(path.join(base, name), content);
  }
  for (const sub of MEMORY_SUBDIRS) {
    mkdirSync(path.join(base, sub), { recursive: true });
    writeFileSync(path.join(base, sub, '.gitkeep'), '');
  }
  return base;
}

/** Guarantees a live SiteSkeleton folder exists; returns paths to clean up. */
function plantLiveSkeleton() {
  const live = path.join(MEMORY_ROOT, 'SiteSkeleton');
  if (existsSync(live)) return [];
  mkdirSync(live, { recursive: true });
  writeFileSync(path.join(live, 'Current Status.md'), '# Current Status — Site Skeleton\n');
  return [live];
}

// Writes a throwaway workflow whose only interesting content is one `uses:` line.
function plantWorkflow(slug, usesLine) {
  const file = path.join(WORKFLOWS, `__action-pin-negative-${slug}.tmp.yml`);
  writeFileSync(
    file,
    `name: action-pin-negative-${slug}\non:\n  workflow_dispatch:\njobs:\n` +
      `  probe:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: ${usesLine}\n`
  );
  return file;
}

// Forbidden tokens are assembled at runtime so this test file itself never
// contains the literals it plants.
const scenarios = [
  {
    name: 'apps/ altındaki sahte pattern dosyası FAIL üretir (muafiyet kod taramasını gevşetmedi)',
    // The guarded pattern rule is skeleton-dev only; in a bootstrapped project
    // it is deliberately off, so asserting a FAIL there would be wrong.
    modes: ['skeleton-dev'],
    expectFragment: '__forbidden-pattern-negative.tmp.ts',
    setup() {
      const tmp = path.join(ROOT, 'apps', 'web', '__forbidden-pattern-negative.tmp.ts');
      writeFileSync(tmp, `// negative fixture\nconst shopName = "${'cicek' + 'ci'}";\n`);
      return [tmp];
    },
  },
  {
    name: 'geçersiz HANDOFF hedefi FAIL üretir (handoffTargets kuralı bağlayıcı)',
    expectFragment: '__handoff-negative.tmp.md',
    setup() {
      const tmp = path.join(ROOT, '.claude', 'rules', '__handoff-negative.tmp.md');
      writeFileSync(tmp, `# negative fixture\n\nHANDOFF → ${'team-' + 'lead'}\n`);
      return [tmp];
    },
  },
  {
    // Faz 8.3 PR-D (M3): the pre-PR-D regex matched `[a-z-]+` only, so these
    // three lines produced NO match at all and shipped as if they were valid.
    name: 'yer tutucu HANDOFF hedefi FAIL üretir (handoffTargets: <sonraki-rol>)',
    expectFragments: ['__handoff-placeholder.tmp.md', 'yer tutucu bırakılmış'],
    setup() {
      const tmp = path.join(ROOT, '.claude', 'rules', '__handoff-placeholder.tmp.md');
      writeFileSync(tmp, `# negative fixture\n\nHANDOFF → <${'sonraki'}-rol>\n`);
      return [tmp];
    },
  },
  {
    name: 'boş HANDOFF hedefi FAIL üretir (handoffTargets: hedef yok)',
    expectFragments: ['__handoff-empty.tmp.md', 'HANDOFF hedefi boş'],
    setup() {
      const tmp = path.join(ROOT, '.claude', 'rules', '__handoff-empty.tmp.md');
      writeFileSync(tmp, '# negative fixture\n\nHANDOFF →\n');
      return [tmp];
    },
  },
  {
    name: 'geçerli HANDOFF hedefi FAIL ÜRETMEZ (kural aşırı sıkı değil)',
    expectOk: true,
    setup() {
      const tmp = path.join(ROOT, '.claude', 'rules', '__handoff-valid.tmp.md');
      writeFileSync(tmp, '# positive control\n\n`HANDOFF → project-manager` (ADR linkiyle)\n');
      return [tmp];
    },
  },
  {
    name: 'ACTIVATION.md olmadan aktive edilen admin-bff FAIL üretir (activationGates)',
    expectFragment: 'ACTIVATION.md olmadan',
    setup() {
      const dir = path.join(ROOT, 'apps', 'admin-bff');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), '{ "name": "admin-bff", "private": true }\n');
      return [dir];
    },
  },
  {
    name: 'işaretsiz checklist maddesi kalan ACTIVATION.md FAIL üretir (activationGates)',
    expectFragment: 'işaretsiz checklist maddesi',
    setup() {
      const dir = path.join(ROOT, 'apps', 'admin-bff');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), '{ "name": "admin-bff", "private": true }\n');
      const ticked = Array.from({ length: 11 }, (_, i) => `- [x] item ${i + 1}`).join('\n');
      writeFileSync(path.join(dir, 'ACTIVATION.md'), `# checklist\n\n${ticked}\n- [ ] item 12\n`);
      return [dir];
    },
  },
  {
    // Faz 8.3 PR-D (M7): the three activation signals, one scenario each.
    name: 'ismi değişmiş *bff* dizini ACTIVATION.md olmadan FAIL üretir (sinyal 1: dizin adı)',
    expectFragments: ['apps/auth-bff', 'ACTIVATION.md olmadan'],
    setup() {
      const dir = path.join(ROOT, 'apps', 'auth-bff');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'server.mjs'), '// renamed copy\n');
      return [dir];
    },
  },
  {
    name: 'paket adı *bff* olan dizin ACTIVATION.md olmadan FAIL üretir (sinyal 2: package name)',
    expectFragments: ['apps/gateway', 'ACTIVATION.md olmadan'],
    setup() {
      const dir = path.join(ROOT, 'apps', 'gateway');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), '{ "name": "@x/admin-bff", "private": true }\n');
      return [dir];
    },
  },
  {
    name: 'tamamen yeniden adlandırılmış kopya marker ile yakalanır (sinyal 3: şablon imzası)',
    expectFragments: ['apps/renamed-service', 'ACTIVATION.md olmadan'],
    setup() {
      const dir = path.join(ROOT, 'apps', 'renamed-service');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        path.join(dir, 'server.mjs'),
        `// copied template\n// ${'ADMIN_BFF'}_TEMPLATE_MARKER\n`
      );
      return [dir];
    },
  },
  {
    // Positive control: a fully ticked activation passes, AND the pristine
    // templates/admin-bff copy (0/12 ticked) stays out of scope — otherwise
    // this green run would be impossible.
    name: 'nested + 12/12 işaretli ACTIVATION.md FAIL ÜRETMEZ (templates/ dormant kalır)',
    expectOk: true,
    setup() {
      const dir = path.join(ROOT, 'apps', 'services', 'probe-bff');
      mkdirSync(dir, { recursive: true });
      const ticked = Array.from({ length: 12 }, (_, i) => `- [x] item ${i + 1}`).join('\n');
      writeFileSync(path.join(dir, 'ACTIVATION.md'), `# checklist\n\n${ticked}\n`);
      writeFileSync(
        path.join(dir, 'server.mjs'),
        `// nested activated copy\n// ${'ADMIN_BFF'}_TEMPLATE_MARKER\n`
      );
      return [path.join(ROOT, 'apps', 'services')];
    },
  },
  {
    // AC-29 / ADR-0017: the registry is driven by the file system, so a new
    // template directory cannot ship until it is classified.
    name: 'registry\'de olmayan templates/ dizini FAIL üretir (activationModules)',
    expectFragments: ['templates/__probe-module/', "registry'sinde kayıtlı değil"],
    setup() {
      const dir = path.join(ROOT, 'templates', '__probe-module');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'README.md'), '# negative fixture\n');
      return [dir];
    },
  },
  {
    name: 'registry templatePath gerçekte yoksa FAIL üretir (activationModules)',
    expectFragments: ['templatePath yok veya dizin değil', 'templates/__missing/'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.activationModules.find((mod) => mod.id === 'db').templatePath = 'templates/__missing/';
      }),
    }),
  },
  {
    name: 'yinelenen registry id FAIL üretir (activationModules)',
    expectFragments: ['id geçersiz veya yinelenmiş', 'admin-bff'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.activationModules.find((mod) => mod.id === 'db').id = 'admin-bff';
      }),
    }),
  },
  {
    // A manual-hardening module must never look automatically protected.
    name: 'manual-hardening kayıtta activationGateId FAIL üretir (activationModules)',
    expectFragments: ['manual-hardening kayıt activationGateId taşıyor', 'payments'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.activationModules.find((mod) => mod.id === 'payments').activationGateId = 'admin-bff';
      }),
    }),
  },
  {
    name: 'automatic-gate kaydın geçersiz gate id\'si FAIL üretir (activationModules)',
    expectFragments: ['activationGates içinde yok', 'orphan veya çift referanslı gate'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.activationModules.find((mod) => mod.id === 'admin-bff').activationGateId = '__nope';
      }),
    }),
  },
  {
    name: 'README bölümünden modül silinirse FAIL üretir (beyan ↔ registry)',
    expectFragments: ['README.md: activation-modules bölümü registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) => dropActivationRow(text, 'templates/e2e/')),
    }),
  },
  {
    name: 'CLAUDE.md bölümünden modül silinirse FAIL üretir (beyan ↔ registry)',
    expectFragments: ['CLAUDE.md: activation-modules bölümü registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) => dropActivationRow(text, 'templates/e2e/')),
    }),
  },
  {
    // Silently upgrading a manual module's claim is the exact drift AC-29 found.
    name: 'README\'de enforcement modu değiştirilirse FAIL üretir (beyan ↔ registry)',
    expectFragments: ['README.md: activation-modules bölümü registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text
          .split('\n')
          .map((line) =>
            line.startsWith('| `templates/payments/` |')
              ? line.replace('`manual-hardening`', '`automatic-gate`')
              : line
          )
          .join('\n')
      ),
    }),
  },
  {
    // F4-LOW-05: the marker lives in src/, the demand must land on the package
    // root — and the message must name the marker file that caused it.
    name: 'alt dizindeki marker paket kökünü işaret eder (F4-LOW-05)',
    expectFragments: [
      'apps/probe-root: aktive şablon',
      'marker: apps/probe-root/src/server.mjs',
    ],
    setup: () => plantNestedMarkerCopy(),
  },
  {
    // Positive control for the same correction: before it, ACTIVATION.md at the
    // package root could not satisfy a marker sitting one level deeper.
    name: 'alt dizin marker + kökte 12/12 ACTIVATION.md FAIL ÜRETMEZ (F4-LOW-05)',
    expectOk: true,
    setup: () => plantNestedMarkerCopy({ activation: `# checklist\n\n${tickedList(12)}\n` }),
  },
  {
    // Security-gate regression (HIGH): an interim revision dropped a marker
    // root whenever ANY deeper candidate existed, so a decoy directory whose
    // name carries the fragment and whose checklist is fully ticked silenced
    // the real, unhardened copy above it. Base behaviour FAILed; the interim
    // code returned exit 0. This scenario nails the demand to the package root.
    name: 'derindeki decoy ACTIVATION.md üstteki sertleştirilmemiş kopyayı gizleyemez (marker kökü)',
    expectFragments: [
      'apps/probe-gw: aktive şablon',
      'marker: apps/probe-gw/src/server.mjs',
    ],
    setup() {
      const dir = path.join(ROOT, 'apps', 'probe-gw');
      mkdirSync(path.join(dir, 'src'), { recursive: true });
      mkdirSync(path.join(dir, 'tools', 'decoy-bff'), { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), '{ "name": "probe-gw", "private": true }\n');
      writeFileSync(
        path.join(dir, 'src', 'server.mjs'),
        `// copied template\n// ${'ADMIN_BFF'}_TEMPLATE_MARKER\n`
      );
      writeFileSync(
        path.join(dir, 'tools', 'decoy-bff', 'ACTIVATION.md'),
        `# checklist\n\n${tickedList(12)}\n`
      );
      return [dir];
    },
  },
  {
    // Data-only bypass: blanking the detection signals used to disarm the gate
    // while verify-structure stayed green.
    name: 'manifest\'te tespit sinyallerini boşaltmak FAIL üretir (gate sinyalleri kodda sabit)',
    expectFragments: ['tespit sinyalleri kodda sabitlenen değerlerle uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        const gate = m.activationGates.find((g) => g.id === 'admin-bff');
        gate.nameFragment = '';
        gate.marker = '';
      }),
    }),
  },
  {
    // The documented table must keep Enforcement next to Template: a reordered
    // table let arbitrary prose sit where the enforcement mode belongs.
    name: 'README tablosunda kolon sırası bozulursa FAIL üretir (beyan yapısı)',
    expectFragments: ['README.md: activation-modules'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text
          .split('\n')
          .map((line) =>
            /^\| `templates\/[a-z0-9-]+\/` \| `(automatic-gate|manual-hardening)` \|/.test(line)
              ? line.replace(
                  /^(\| `templates\/[a-z0-9-]+\/` )\| (`(?:automatic-gate|manual-hardening)`) \| ([^|]*)\|/,
                  '$1| $3| $2 |'
                )
              : line
          )
          .join('\n')
      ),
    }),
  },
  {
    // The strict equality is a security property: extra ticks must not be able
    // to cover a missing mandatory item.
    name: '13 işaretli madde (beklenen 12) FAIL üretir (ticked === checklistItems)',
    expectFragments: ['13 işaretli madde', 'beklenen 12'],
    setup() {
      const dir = path.join(ROOT, 'apps', 'admin-bff');
      mkdirSync(dir, { recursive: true });
      writeFileSync(path.join(dir, 'package.json'), '{ "name": "admin-bff", "private": true }\n');
      writeFileSync(path.join(dir, 'ACTIVATION.md'), `# checklist\n\n${tickedList(13)}\n`);
      return [dir];
    },
  },
  // --- R9: non-canonical declaration row invisibility ------------------------
  // Every row below was a measured FALSE PASS: the canonical row patterns were
  // the only collector, so a declaration they missed was never counted,
  // compared or reported. Bare markers are deliberately NOT here — they carry
  // no registry token and are not declarations (see the two controls below).
  r9Stray('CLAUDE.md', 'CLAUDE: fazladan `*` declaration FAIL üretir (R9)', '* `templates/payments/` · `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: fazladan `+` declaration FAIL üretir (R9)', '+ `templates/payments/` · `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: fazladan `1.` declaration FAIL üretir (R9)', '1. `templates/payments/` · `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: fazladan `1)` declaration FAIL üretir (R9)', '1) `templates/payments/` · `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: aynı modlu fazladan `*` declaration FAIL üretir (R9)', '* `templates/payments/` · `manual-hardening`'),
  r9Stray('CLAUDE.md', 'CLAUDE: `:` ayırıcılı declaration FAIL üretir (R9)', '- `templates/payments/`: `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: em dash ayırıcılı declaration FAIL üretir (R9)', '- `templates/payments/` — `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: tırnaksız templatePath declaration FAIL üretir (R9)', '- templates/payments/ · `automatic-gate`'),
  r9Stray('CLAUDE.md', 'CLAUDE: modsuz kısmi declaration FAIL üretir (R9)', '* `templates/payments/`'),
  r9Stray('README.md', 'README: tırnaksız enforcement declaration FAIL üretir (R9)', '| `templates/payments/` | automatic-gate | extra |'),
  r9Stray('README.md', 'README: liste biçimli declaration FAIL üretir (R9)', '* `templates/payments/` · `automatic-gate`'),
  r9Stray('README.md', 'README: geçersiz enforcement token declaration FAIL üretir (R9)', '| `templates/payments/` | `automatic-gate-wrong` | x | y |'),
  {
    // ADR-0017 leaves free prose inside the section unchecked on purpose. These
    // two controls bind stage 1 to DECLARATION candidates: a list-like line
    // without a registry token must stay green, or the fix quietly widened the
    // contract into a Markdown style rule.
    name: 'CLAUDE: declaration olmayan liste prozası FAIL ÜRETMEZ (R9 pozitif kontrol)',
    expectOk: true,
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) =>
        addActivationRow(text, '* This paragraph is explanatory prose only.', R9_CLAUDE_ANCHOR)
      ),
    }),
  },
  {
    name: 'README: declaration olmayan liste prozası FAIL ÜRETMEZ (R9 pozitif kontrol)',
    expectOk: true,
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        addActivationRow(text, '* Explanatory prose for contributors.', R9_README_ANCHOR)
      ),
    }),
  },
  {
    // Baseline control: the shipped tree (pristine templates/, five registered
    // modules, both documents in sync) must be green with no fixture at all.
    name: 'dokunulmamış templates/ + senkron beyan FAIL ÜRETMEZ (registry taban kontrolü)',
    expectOk: true,
    setup: () => [],
  },
  // AC-32 / ADR-0018: audited upstream release provenance. Every rule below is
  // mode-explicit — the suite also runs inside a bootstrapped project, where
  // README/CLAUDE must NOT carry the upstream section at all.
  {
    name: 'README release-state alanı silinirse FAIL üretir (auditedState)',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state alan/değer çiftleri registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) => dropReleaseStateField(text, 'recommendation')),
    }),
  },
  {
    name: 'CLAUDE.md release-state alanı silinirse FAIL üretir (auditedState)',
    modes: ['skeleton-dev'],
    expectFragments: ['CLAUDE.md: release-state alan/değer çiftleri registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) => dropReleaseStateField(text, 'verdict')),
    }),
  },
  {
    name: 'ledger audited-state alanı silinirse FAIL üretir (auditedState)',
    expectFragments: ['docs/releases/README.md: release-state alan/değer çiftleri registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        dropReleaseStateField(text, 'audit report')
      ),
    }),
  },
  {
    name: 'ledger release-history kaydı değişirse FAIL üretir (auditedImmutableReleases)',
    expectFragments: ['audited release history registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('`361113458`', '`999999999`')
      ),
    }),
  },
  {
    // Cryptographic tie: the canonical audit bytes cannot drift silently.
    name: 'audit digest saptırılırsa FAIL üretir (auditSha256)',
    expectFragments: ['canonical audit dosyasıyla eşleşmiyor'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedState.auditSha256 = 'a'.repeat(64);
      }),
    }),
  },
  {
    name: 'audit raporu yolu kaybolursa FAIL üretir (auditReport)',
    expectFragments: ['docs/audits/ altında bir dosya değil'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedState.auditReport = 'docs/audits/__nope.md';
      }),
    }),
  },
  {
    name: 'yinelenen release tag FAIL üretir (auditedImmutableReleases)',
    expectFragments: ['tag geçersiz veya yinelenmiş'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        const list = m.upstreamReleaseProvenance.auditedImmutableReleases;
        list[1].tag = list[0].tag;
      }),
    }),
  },
  {
    name: 'yinelenen release ID FAIL üretir (auditedImmutableReleases)',
    expectFragments: ['releaseId pozitif integer değil veya yinelenmiş'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        const list = m.upstreamReleaseProvenance.auditedImmutableReleases;
        list[1].releaseId = list[0].releaseId;
      }),
    }),
  },
  {
    name: 'publication sırası bozulursa FAIL üretir (auditedImmutableReleases)',
    expectFragments: ['publication sırası artan olmalı'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases.reverse();
      }),
    }),
  },
  {
    name: 'RC1 historical-note kimliği saptırılırsa FAIL üretir',
    expectFragments: ['historical-note metadata satırları registry sözleşmesinden sapıyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('361113458', '361113459')
      ),
    }),
  },
  {
    // The sealed RC1 attestation table may never be "completed" after the fact.
    name: 'RC1 korunan placeholder tablosu değişirse FAIL üretir (protected digest)',
    expectFragments: ['korunan attestation/placeholder bölümü değişmiş'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('`RC1_RELEASE_TARGET_SHA`', '`0123456789abcdef0123456789abcdef01234567`')
      ),
    }),
  },
  {
    name: 'README release-state marker\'ı silinirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state bölümü yok veya marker çifti bozuk'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) => text.replace('<!-- release-state:end -->', '')),
    }),
  },
  {
    name: 'README release-state marker\'ı ikizlenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state bölümü yok veya marker çifti bozuk'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:start -->', '<!-- release-state:start -->\n<!-- release-state:start -->')
      ),
    }),
  },
  {
    name: 'CLAUDE.md release-state marker\'ı silinirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['CLAUDE.md: release-state bölümü yok veya marker çifti bozuk'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) => text.replace('<!-- release-state:end -->', '')),
    }),
  },
  {
    name: 'ledger release-state marker\'ı silinirse FAIL üretir',
    expectFragments: ['docs/releases/README.md: release-state bölümü yok veya marker çifti bozuk'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('<!-- release-state:end -->', '')
      ),
    }),
  },
  {
    // Self-reference guard: the section may not carry a commit SHA.
    name: 'bounded section\'a 40-hex SHA eklenirse FAIL üretir (self-reference)',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state bölümünde yasak token'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- merge: `0123456789abcdef0123456789abcdef01234567`')
      ),
    }),
  },
  {
    name: 'bounded section\'a skeleton kimlik token\'ı eklenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['CLAUDE.md: release-state bölümünde yasak token'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- repo: `site-skeleton`')
      ),
    }),
  },
  {
    // The removed current-status surface is caught by its HEADING, whatever the
    // date suffix, casing or emphasis — not by a repo-wide word ban that would
    // also outlaw the contract's own placeholder examples.
    name: 'release-attestation bayat durum tablosu geri konursa FAIL üretir',
    expectFragments: ['kaldırılan current-status bölümü geri geldi', 'Mevcut durum (2026-07-28)'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/operations/release-attestation.md', (text) =>
        `${text}\n## Mevcut durum (2026-07-28)\n\n| Release | oluşturulmadı |\n`
      ),
    }),
  },
  {
    name: 'indekssiz release snapshot dosyası FAIL üretir (docs/releases)',
    expectFragments: ['snapshot dosya kümesi registry ile eşit değil', 'v9.9.9.md'],
    setup() {
      const tmp = path.join(ROOT, 'docs', 'releases', 'v9.9.9.md');
      writeFileSync(tmp, '# negative fixture\n');
      return [tmp];
    },
  },
  {
    // A substitutable identity token inside the registry would be rewritten by
    // bootstrap and would silently falsify upstream provenance.
    name: 'manifest provenance\'ına skeleton kimlik token\'ı eklenirse FAIL üretir',
    expectFragments: ["ikame edilebilir skeleton kimlik token'ı taşıyor"],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].releaseName = 'site-skeleton v1.0.0-rc.2';
      }),
    }),
  },
  {
    // Exact schema, not "required fields present": a time-bound field nobody
    // enforces would be born stale the moment the next candidate ships.
    name: 'auditedState\'e currentRelease eklenirse FAIL üretir (exact key set)',
    expectFragments: ['auditedState: exact şema dışı anahtar kümesi', 'currentRelease'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedState.currentRelease = 'v1.0.0';
      }),
    }),
  },
  {
    name: 'provenance top-level\'ına latestRelease eklenirse FAIL üretir (exact key set)',
    expectFragments: ['upstreamReleaseProvenance: exact şema dışı anahtar kümesi', 'latestRelease'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.latestRelease = 'v1.0.0-rc.2';
      }),
    }),
  },
  {
    // The identity-token rule cannot carry this load: the planted field is
    // perfectly innocent-looking and survives bootstrap untouched. Only the
    // fail-closed key set rejects it.
    name: 'release kaydına kimlik token\'sız bilinmeyen alan eklenirse FAIL üretir (exact key set)',
    expectFragments: ['şema dışı alan(lar): displayLabel'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].displayLabel = 'Audited candidate';
      }),
    }),
  },
  {
    name: 'snapshot\'sız kayda protected digest eklenirse FAIL üretir (koşullu şema)',
    expectFragments: ['repositorySnapshot null iken', 'snapshotProtectedSectionSha256 taşınmamalı'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].snapshotProtectedSectionSha256 = 'b'.repeat(64);
      }),
    }),
  },
  {
    name: 'attestation çifti bölünürse FAIL üretir (koşullu şema)',
    expectFragments: ['attestationVerified ve attestationChecks', 'birlikte bulunmalı'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        delete m.upstreamReleaseProvenance.auditedImmutableReleases[1].attestationChecks;
      }),
    }),
  },
  {
    // Metadata drift: each field below used to live in ledger PROSE, so a
    // one-sided manifest edit was invisible. The ledger stays untouched here.
    name: 'RC2 immutable false yapılırsa ledger mismatch FAIL üretir',
    expectFragments: ['audited release history registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].immutable = false;
      }),
    }),
  },
  {
    name: 'RC2 prerelease false yapılırsa ledger mismatch FAIL üretir',
    expectFragments: ['audited release history registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].prerelease = false;
      }),
    }),
  },
  {
    name: 'RC2 attestationVerified false yapılırsa ledger mismatch FAIL üretir',
    expectFragments: ['audited release history registry ile uyuşmuyor', 'unverified:11'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].attestationVerified = false;
      }),
    }),
  },
  {
    name: 'RC2 attestationChecks 10 yapılırsa ledger mismatch FAIL üretir',
    expectFragments: ['audited release history registry ile uyuşmuyor', 'verified:10'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.upstreamReleaseProvenance.auditedImmutableReleases[1].attestationChecks = 10;
      }),
    }),
  },
  {
    // Uppercase is the same self-reference; the old pattern was lowercase-only.
    name: 'bounded section\'a uppercase 40-hex SHA eklenirse FAIL üretir (self-reference)',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state bölümünde yasak token', '40-hex commit SHA'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- merge: `0123456789ABCDEF0123456789ABCDEF01234567`')
      ),
    }),
  },
  {
    name: 'bounded section\'a publishedAt alanı eklenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state bölümünde yasak token', 'release metadata alanı'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- publishedAt: `recorded`')
      ),
    }),
  },
  {
    name: 'bounded section\'a olumlu attestation sinyali eklenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['CLAUDE.md: release-state bölümünde yasak token', 'olumlu attestation sinyali'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- attestation: `verified:11`')
      ),
    }),
  },
  {
    // The history table may never migrate into the bounded summary: that would
    // "satisfy" the forbidden-token rule only by hollowing it out.
    name: 'release-history satırı bounded section\'a taşınırsa FAIL üretir',
    expectFragments: ['release-history satırları bounded release-state bölümünün dışında kalmalı'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace(
          '<!-- release-state:end -->',
          '| `v0.0.1` | `1` | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` |' +
            ' `2026-07-28T13:37:11Z` | `true` | `true` | `not-recorded` | `none` |\n<!-- release-state:end -->'
        )
      ),
    }),
  },
  {
    name: 'attestation yönlendirme bölümüne bayat CI placeholder\'ı eklenirse FAIL üretir',
    expectFragments: ["bayat current-state token'ı taşıyor (FINAL_EVIDENCE_POST_MERGE_CI_RUN_URL)"],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/operations/release-attestation.md', (text) =>
        `${text}\nSon closure CI: \`FINAL_EVIDENCE_POST_MERGE_CI_RUN_URL\`\n`
      ),
    }),
  },
  {
    // Markdown emphasis and casing must not create a false negative.
    name: 'attestation dosyasına bayat dış-durum cümlesi eklenirse FAIL üretir',
    expectFragments: ['bayat dış-durum cümlesi taşıyor ("Release oluşturulmadı")'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/operations/release-attestation.md', (text) =>
        `${text}\n**RELEASE OLUŞTURULMADI**\n`
      ),
    }),
  },
  {
    // The decisive case: EVERY value stays byte-identical and only the label
    // moves. A value-vector comparison passes this; a label+value contract does
    // not. To a human reader `unrelated label: FAIL` still reads as provenance.
    name: 'README verdict etiketi değişirse (değerler unchanged) FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state alan/değer çiftleri registry ile uyuşmuyor',
      'unrelated label=FAIL',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- unrelated label: `FAIL`')
      ),
    }),
  },
  {
    name: 'CLAUDE audited candidate etiketi kısaltılırsa FAIL üretir (etiket sözleşmesi)',
    modes: ['skeleton-dev'],
    expectFragments: [
      'CLAUDE.md: release-state alan/değer çiftleri registry ile uyuşmuyor',
      'candidate=v1.0.0-rc.2',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) =>
        text.replace('- audited candidate: `v1.0.0-rc.2`', '- candidate: `v1.0.0-rc.2`')
      ),
    }),
  },
  {
    // Order is part of the schema: swapping two intact rows keeps every pair
    // valid in isolation and still breaks the canonical vector.
    name: 'ledger bounded field sırası değişirse FAIL üretir (etiket sırası)',
    expectFragments: ['docs/releases/README.md: release-state alan/değer çiftleri registry ile uyuşmuyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace(
          '- production readiness: `CORE_SKELETON_NOT_PRODUCTION_READY`\n- recommendation: `NO_GO_REMEDIATION_REQUIRED`',
          '- recommendation: `NO_GO_REMEDIATION_REQUIRED`\n- production readiness: `CORE_SKELETON_NOT_PRODUCTION_READY`'
        )
      ),
    }),
  },
  {
    name: 'bounded section\'da yinelenen alan etiketi FAIL üretir',
    expectFragments: ['docs/releases/README.md: release-state bölümünde yinelenen alan etiketi var'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- verdict: `FAIL`')
      ),
    }),
  },
  {
    // Data cells stay byte-identical; only the human-readable column name moves.
    name: 'ledger Immutable kolon başlığı yeniden adlandırılırsa FAIL üretir',
    expectFragments: [
      'release-history başlık satırı exact kolon sözleşmesinden sapıyor',
      'Immutability',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('| Prerelease | Immutable | Attestation |', '| Prerelease | Immutability | Attestation |')
      ),
    }),
  },
  {
    name: 'ledger Prerelease/Immutable kolon sırası değişirse FAIL üretir',
    expectFragments: ['release-history başlık satırı exact kolon sözleşmesinden sapıyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('| Prerelease | Immutable | Attestation |', '| Immutable | Prerelease | Attestation |')
      ),
    }),
  },
  {
    // Containment ("is this SHA somewhere in the block?") accepted this: the
    // value is correct, only the label lies about what it is.
    name: 'RC1 historical-note target etiketi commit olursa FAIL üretir (değer unchanged)',
    expectFragments: [
      'historical-note metadata satırları registry sözleşmesinden sapıyor',
      'commit=f891910d9e6877b4ce40d5833cb42579c6d3d9f1',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('> - target: `f891910d', '> - commit: `f891910d')
      ),
    }),
  },
  {
    name: 'RC1 historical-note metadata sırası değişirse FAIL üretir',
    expectFragments: ['historical-note metadata satırları registry sözleşmesinden sapıyor'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace(
          '> - release ID: `361113458`\n> - target: `f891910d9e6877b4ce40d5833cb42579c6d3d9f1`',
          '> - target: `f891910d9e6877b4ce40d5833cb42579c6d3d9f1`\n> - release ID: `361113458`'
        )
      ),
    }),
  },
  {
    // Six digits cleared the old five-digit ceiling, and the code-span form is
    // exactly how the section writes its own fields — both had to be closed.
    name: 'bounded section\'a altı basamaklı PR referansı eklenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: release-state bölümünde yasak token', 'PR numarası'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- pr: `#123456`')
      ),
    }),
  },
  {
    // Fail-closed grammar: the canonical six rows stay untouched and a seventh
    // bullet the parser does not understand is added. Collecting only canonical
    // rows made this invisible to the gate while reading as a live claim.
    name: 'README bounded bölüme gramer dışı bullet eklenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      'current release: v1.0.0',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- current release: v1.0.0')
      ),
    }),
  },
  {
    name: 'CLAUDE bounded bölüme serbest metin bullet\'ı eklenirse FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: [
      'CLAUDE.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      'note: free text',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- note: free text')
      ),
    }),
  },
  {
    // This one DOES satisfy the canonical grammar, so the bullet-count contract
    // is what has to bite: a seventh canonical-looking row is still a violation.
    name: 'ledger bounded bölüme yedinci canonical-looking bullet eklenirse FAIL üretir',
    expectFragments: ['docs/releases/README.md: release-state bölümü tam 6 bullet taşımalı'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `FAIL`\n- unknown: `value`')
      ),
    }),
  },
  {
    // Without an end anchor the row pattern matched a PREFIX: eight clean cells
    // were still "found" while a ninth rode along unverified.
    name: 'ledger data row\'una dokuzuncu hücre eklenirse FAIL üretir (end-anchored gramer)',
    expectFragments: ['data row grameri exact değil', 'sapan satır(lar)'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace('| `verified:11` | `none` |', '| `verified:11` | `none` | `extra` |')
      ),
    }),
  },
  {
    name: 'ledger data row\'unun sonuna serbest metin eklenirse FAIL üretir',
    expectFragments: ['data row grameri exact değil', 'sapan satır(lar)'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace(
          '| `not-recorded` | `docs/releases/v1.0.0-rc.1.md` |',
          '| `not-recorded` | `docs/releases/v1.0.0-rc.1.md` | trailing prose'
        )
      ),
    }),
  },
  {
    // The table body must be CONTIGUOUS: a line wedged in truncates the region.
    name: 'separator ile data row arasına açıklama satırı girerse FAIL üretir',
    expectFragments: ['ardışık data row bulunmalı', 'ölçülen 0'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace(
          '|---|---|---|---|---|---|---|---|\n',
          '|---|---|---|---|---|---|---|---|\nara açıklama satırı\n'
        )
      ),
    }),
  },
  {
    // Row count is derived from the registry, never hard-coded.
    name: 'ledger\'a üçüncü sahte release row eklenirse FAIL üretir (registry uzunluğu)',
    expectFragments: ['ardışık data row bulunmalı', 'ölçülen 3'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        text.replace(
          '| `verified:11` | `none` |\n',
          '| `verified:11` | `none` |\n| `v9.9.9` | `999999999` |' +
            ' `0123456789abcdef0123456789abcdef01234567` | `2026-07-30T00:00:00Z` |' +
            ' `true` | `true` | `not-recorded` | `none` |\n'
        )
      ),
    }),
  },
  {
    // A canonical-looking row is only history INSIDE the header's region.
    name: 'başlık bölgesi dışına canonical release row konursa FAIL üretir',
    expectFragments: ['canonical release-history satırı yalnız başlık bölgesinde bulunabilir'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/README.md', (text) =>
        `${text}\n| \`v8.8.8\` | \`888888888\` | \`0123456789abcdef0123456789abcdef01234567\` |` +
          ' `2026-07-30T00:00:00Z` | `true` | `true` | `not-recorded` | `none` |\n'
      ),
    }),
  },
  {
    name: 'RC1 historical-note\'a gramer dışı blockquote bullet eklenirse FAIL üretir',
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
      'current release: v1.0.0',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('> - tag: `v1.0.0-rc.1`', '> - current release: v1.0.0\n> - tag: `v1.0.0-rc.1`')
      ),
    }),
  },
  {
    name: 'RC1 historical-note\'a beşinci metadata bullet\'ı eklenirse FAIL üretir',
    expectFragments: ['historical-note tam 4 blockquote bullet taşımalı'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('> - tag: `v1.0.0-rc.1`', '> - tag: `v1.0.0-rc.1`\n> - unknown: `value`')
      ),
    }),
  },
  {
    name: 'dokunulmamış release provenance FAIL ÜRETMEZ (registry taban kontrolü)',
    expectOk: true,
    setup: () => [],
  },
  {
    // Project mode simulated from the skeleton: the sections exist here, so
    // flipping the mode alone is the planted violation.
    name: 'project modda README upstream release-state bölümü FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['README.md: project modda upstream release-state bölümü bulunmamalı'],
    setup: () => asProjectMode(),
  },
  {
    name: 'project modda CLAUDE.md upstream release-state bölümü FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['CLAUDE.md: project modda upstream release-state bölümü bulunmamalı'],
    setup: () => asProjectMode(),
  },
  {
    // Inside a real bootstrapped project the section is already gone, so the
    // violation has to be planted for the rule to have something to bite.
    name: 'generated README\'ye upstream release-state bölümü geri konursa FAIL üretir',
    modes: ['project'],
    expectFragments: ['README.md: project modda upstream release-state bölümü bulunmamalı'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        `${text}\n<!-- release-state:start -->\n- verdict: \`FAIL\`\n<!-- release-state:end -->\n`
      ),
    }),
  },
  {
    name: 'generated CLAUDE.md\'ye upstream release-state bölümü geri konursa FAIL üretir',
    modes: ['project'],
    expectFragments: ['CLAUDE.md: project modda upstream release-state bölümü bulunmamalı'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('CLAUDE.md', (text) =>
        `${text}\n<!-- release-state:start -->\n- verdict: \`FAIL\`\n<!-- release-state:end -->\n`
      ),
    }),
  },
  {
    name: 'generated RC1 snapshot korunan bölümü değişirse FAIL üretir',
    modes: ['project'],
    expectFragments: ['korunan attestation/placeholder bölümü değişmiş'],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('`RC1_RELEASE_TARGET_SHA`', '`0123456789abcdef0123456789abcdef01234567`')
      ),
    }),
  },
  {
    name: 'project modda ledger manifestten saparsa FAIL üretir',
    expectFragments: ['docs/releases/README.md: release-state alan/değer çiftleri registry ile uyuşmuyor'],
    setup() {
      const restoreDoc = patchTextFile('docs/releases/README.md', (text) =>
        text.replace('- verdict: `FAIL`', '- verdict: `PASS_WITH_RISKS`')
      );
      const planted = asProjectMode();
      return {
        paths: planted.paths,
        restore: () => {
          planted.restore();
          restoreDoc();
        },
      };
    },
  },
  {
    name: 'RC1 snapshot project kimliğiyle yeniden yazılırsa FAIL üretir',
    modes: ['skeleton-dev'],
    expectFragments: ['korunan attestation/placeholder bölümü değişmiş'],
    setup() {
      const restoreDoc = patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.split('site-skeleton').join('negative-demo')
      );
      const planted = asProjectMode();
      return {
        paths: planted.paths,
        restore: () => {
          planted.restore();
          restoreDoc();
        },
      };
    },
  },
  {
    name: 'tag referanslı action FAIL üretir (githubActionsPins: hareketli tag)',
    expectFragments: ['__action-pin-negative-tag.tmp.yml', 'tam 40-hex commit SHA değil'],
    setup: () => [plantWorkflow('tag', 'actions/checkout@v6')],
  },
  {
    name: 'kısa SHA referanslı action FAIL üretir (githubActionsPins: 40-hex zorunlu)',
    expectFragments: ['__action-pin-negative-short.tmp.yml', 'tam 40-hex commit SHA değil'],
    setup: () => [plantWorkflow('short', `actions/checkout@${PINNED_SHA.slice(0, 7)} # v6.1.0`)],
  },
  {
    name: 'sürüm yorumu olmayan tam SHA FAIL üretir (githubActionsPins: exact tag yorumu)',
    expectFragments: ['__action-pin-negative-nocomment.tmp.yml', 'exact sürüm yorumu yok'],
    setup: () => [plantWorkflow('nocomment', `actions/checkout@${PINNED_SHA}`)],
  },
  {
    // Tracked-file mutation: the original bytes are held in memory and written
    // back in the shared finally block, then asserted by the git-diff snapshot.
    name: 'eksik Next güvenlik override selector FAIL üretir (nextSecurityOverrides)',
    expectFragments: ['package.json', "override'ı eksik/farklı"],
    setup() {
      const file = path.join(ROOT, 'package.json');
      const original = readFileSync(file);
      const pkg = JSON.parse(original.toString('utf8'));
      for (const key of Object.keys(pkg.pnpm?.overrides ?? {})) {
        if (key.startsWith('next@') && key.endsWith('>postcss')) delete pkg.pnpm.overrides[key];
      }
      writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
      return { paths: [], restore: () => writeFileSync(file, original) };
    },
  },
  {
    name: 'mode=project ama projectSlug yoksa FAIL üretir (projectMemory)',
    expectFragments: ['projectSlug yok/geçersiz', 'bootstrap tamamlanmamış'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.mode = 'project';
        delete m.projectSlug;
      }),
    }),
  },
  {
    name: 'projectSlug gerçek memory klasörüyle uyuşmuyorsa FAIL üretir (projectMemory)',
    expectFragments: ['project memory klasörü yok', 'no-such-project'],
    setup: () => ({
      paths: [],
      restore: patchManifest((m) => {
        m.mode = 'project';
        m.projectSlug = 'no-such-project';
      }),
    }),
  },
  {
    name: 'project memory ana dosyası eksikse FAIL üretir (projectMemory)',
    expectFragments: ['project memory dosyası eksik', 'Backlog.md'],
    setup() {
      const dir = plantMemoryProject(NEG_SLUG, { omit: 'Backlog.md' });
      return {
        paths: [dir],
        restore: patchManifest((m) => {
          m.mode = 'project';
          m.projectSlug = NEG_SLUG;
        }),
      };
    },
  },
  {
    name: 'mode=project iken canlı SiteSkeleton varsa FAIL üretir (projectMemory)',
    expectFragments: ['canlı iskelet memory', 'kalmamalı'],
    setup() {
      const dir = plantMemoryProject(NEG_SLUG);
      return {
        paths: [dir, ...plantLiveSkeleton()],
        restore: patchManifest((m) => {
          m.mode = 'project';
          m.projectSlug = NEG_SLUG;
        }),
      };
    },
  },

  // --- 7l · AC-33 web security header contract (ADR-0019) ------------------
  // The doc side is verified by exact block equality, so these scenarios also
  // cover the class a bullet-collection grammar would miss: a `-` turning into
  // `*`, an extra space, an indented row. None of them is parsed; the whole
  // block is one string.
  {
    name: 'deployment.md web bloğunda değer sürüklenirse FAIL üretir (blok eşitliği)',
    expectFragment: 'web block does not equal the canonical block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('- X-Frame-Options: `DENY`', '- X-Frame-Options: `SAMEORIGIN`')
        ),
      };
    },
  },
  {
    name: 'deployment.md web bloğundan bir header silinirse FAIL üretir',
    expectFragment: 'web block does not equal the canonical block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('- X-Content-Type-Options: `nosniff`\n', '')
        ),
      };
    },
  },
  {
    name: 'deployment.md web bloğunda bullet biçimi - yerine * olursa FAIL üretir',
    expectFragment: 'web block does not equal the canonical block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('- Referrer-Policy: `strict', '* Referrer-Policy: `strict')
        ),
      };
    },
  },
  {
    name: 'deployment.md web bloğunda iç boşluk değişirse FAIL üretir',
    expectFragment: 'web block does not equal the canonical block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('- Header source:', '-  Header source:')
        ),
      };
    },
  },
  {
    name: 'deployment.md web bloğuna satır eklenirse FAIL üretir',
    expectFragment: 'web block does not equal the canonical block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace(
            '<!-- web-security-contract:end -->',
            '- X-Extra-Header: `whatever`\n<!-- web-security-contract:end -->'
          )
        ),
      };
    },
  },
  {
    name: 'deployment.md web bloğu marker\'ı çoğaltılırsa FAIL üretir',
    expectFragment: 'web block is missing or duplicated',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace(
            '## Edge / TLS',
            '<!-- web-security-contract:start -->\n\n## Edge / TLS'
          )
        ),
      };
    },
  },
  {
    name: 'deployment.md web bloğu kapanış marker\'ı silinirse FAIL üretir',
    expectFragment: 'web block is missing or duplicated',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('<!-- web-security-contract:end -->', '')
        ),
      };
    },
  },
  {
    name: 'deployment.md admin bloğunda değer sürüklenirse FAIL üretir',
    expectFragment: 'admin block does not equal the canonical block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('- X-Robots-Tag: `noindex, nofollow`', '- X-Robots-Tag: `all`')
        ),
      };
    },
  },
  {
    name: 'deployment.md blok DIŞINDA CSP direktifi geçerse FAIL üretir',
    expectFragment: 'CSP directives outside the bounded blocks',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          `${t}\nNot: ornek politika default-src yok sayilir.\n`
        ),
      };
    },
  },
  {
    name: 'deployment.md admin sahiplik ibaresi blok dışından silinirse FAIL üretir',
    expectFragment: 'admin ownership disclaimer outside the bounded blocks',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          t.replace('iddiası **taşımaz**', 'iddiasını karşılar')
        ),
      };
    },
  },
  {
    name: 'security-headers.ts production CSP literali sürüklenirse FAIL üretir',
    expectFragment: 'CSP_PRODUCTION does not match the canonical value',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/lib/security-headers.ts', (t) =>
          t.replace("connect-src 'self'\"", "connect-src *\"")
        ),
      };
    },
  },
  {
    name: 'security-headers.ts image optimizer CSP sürüklenirse FAIL üretir',
    expectFragment: 'IMAGE_OPTIMIZER_CSP does not match the canonical value',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/lib/security-headers.ts', (t) =>
          t.replace('script-src \'none\'; sandbox;', 'script-src \'self\'; sandbox;')
        ),
      };
    },
  },
  {
    name: 'security-headers.ts header source sürüklenirse FAIL üretir',
    expectFragment: 'HEADER_SOURCE does not match the canonical value',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/lib/security-headers.ts', (t) =>
          t.replace('export const HEADER_SOURCE = "/(.*)";', 'export const HEADER_SOURCE = "/:path*";')
        ),
      };
    },
  },
  {
    name: 'security-headers.ts statik header literali sürüklenirse FAIL üretir',
    expectFragment: 'lost the exact literal for X-Frame-Options',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/lib/security-headers.ts', (t) =>
          t.replace('{ key: "X-Frame-Options", value: "DENY" }', '{ key: "X-Frame-Options", value: "SAMEORIGIN" }')
        ),
      };
    },
  },
  {
    name: 'security-headers.ts HSTS emit ederse FAIL üretir (edge sahipliği)',
    expectFragment: 'must not emit HSTS',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/lib/security-headers.ts', (t) =>
          t.replace(
            '  { key: "X-Frame-Options", value: "DENY" },',
            '  { key: "Strict-Transport-Security", value: "max-age=31536000" },\n  { key: "X-Frame-Options", value: "DENY" },'
          )
        ),
      };
    },
  },
  {
    name: 'next.config.ts statik export moduna geçerse FAIL üretir (headers() etkisiz)',
    expectFragment: 'export mode would make headers() inert',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/next.config.ts', (t) =>
          t.replace('  poweredByHeader: false,', "  output: 'export',\n  poweredByHeader: false,")
        ),
      };
    },
  },
  {
    name: 'next.config.ts poweredByHeader pini kaybolursa FAIL üretir',
    expectFragment: 'must set poweredByHeader false',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/next.config.ts', (t) =>
          t.replace('  poweredByHeader: false,\n', '')
        ),
      };
    },
  },
  {
    name: 'next.config.ts image CSP pini kaybolursa FAIL üretir',
    expectFragment: 'must pin the image optimizer policy',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/next.config.ts', (t) =>
          t.replace('  images: { contentSecurityPolicy: IMAGE_OPTIMIZER_CSP },\n', '')
        ),
      };
    },
  },
  {
    name: 'next.config.ts header değerlerini tekrar literal yazarsa FAIL üretir',
    expectFragment: 'must import header values, not restate them',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/web/next.config.ts', (t) =>
          t.replace('const headerMode', "const inlineCsp = \"default-src 'self'\";\nconst headerMode")
        ),
      };
    },
  },
  {
    name: 'apps/admin/README.md sahiplik ifadesini kaybederse FAIL üretir',
    expectFragment: 'must mention "repository runtime"',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/admin/README.md', (t) =>
          t.replace('repository runtime', 'proje runtime')
        ),
      };
    },
  },
  {
    name: 'apps/admin/README.md exact header bloğunu kopyalarsa FAIL üretir',
    expectFragment: 'must not duplicate the exact header block',
    setup() {
      return {
        paths: [],
        restore: patchTextFile('apps/admin/README.md', (t) =>
          `${t}\n- Content-Security-Policy: \`default-src 'self'\`\n`
        ),
      };
    },
  },
  {
    name: '7l mode=project altında da bağlayıcıdır (mode-agnostik)',
    expectFragment: 'web block does not equal the canonical block',
    setup() {
      const dir = plantMemoryProject(NEG_SLUG);
      const restoreDoc = patchTextFile('docs/operations/deployment.md', (t) =>
        t.replace('- X-Frame-Options: `DENY`', '- X-Frame-Options: `SAMEORIGIN`')
      );
      const restoreManifest = patchManifest((m) => {
        m.mode = 'project';
        m.projectSlug = NEG_SLUG;
      });
      return {
        paths: [dir],
        restore: () => {
          restoreManifest();
          restoreDoc();
        },
      };
    },
  },
  // --- AC-26 / F4-LOW-02 release version source-of-truth (ADR-0020) ---------
  {
    name: 'upstreamReleaseVersionPolicy yoksa FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['POLICY_MISSING'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          delete m.upstreamReleaseVersionPolicy;
        }),
      };
    },
  },
  {
    name: 'policy exact anahtar kümesi dışına çıkarsa FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['POLICY_SCHEMA'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          m.upstreamReleaseVersionPolicy.packageManifestAuthority = 'none';
        }),
      };
    },
  },
  {
    name: 'canonicalVersion v prefix taşırsa FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['CANONICAL_VERSION_MALFORMED'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          m.upstreamReleaseVersionPolicy.canonicalVersion = 'v1.0.0';
        }),
      };
    },
  },
  {
    name: 'canonicalVersion doc bloğuyla uyuşmazsa FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['DOC_BLOCK_MISMATCH'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          m.upstreamReleaseVersionPolicy.canonicalVersion = '2.0.0';
        }),
      };
    },
  },
  {
    name: 'ledger policy bloğu silinirse FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['DOC_BLOCK_MISMATCH'],
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/releases/README.md', (x) =>
          x.replace('<!-- release-version-policy:end -->', '')
        ),
      };
    },
  },
  {
    name: 'ledger blok bullet işareti sürüklenirse FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['DOC_BLOCK_MISMATCH'],
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/releases/README.md', (x) =>
          x.replace('- tag prefix: `v`', '* tag prefix: `v`')
        ),
      };
    },
  },
  {
    name: 'ledger ayrım ifadesi silinirse FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['DOC_BLOCK_MISMATCH'],
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/releases/README.md', (x) =>
          x.replace('historical audited provenance registry', 'baska bir sey')
        ),
      };
    },
  },
  {
    name: 'zorunlu non-authoritative kaynak çıkarılırsa FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['POLICY_SCHEMA', 'exact küme dışı'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          const p = m.upstreamReleaseVersionPolicy;
          p.nonAuthoritativeVersionSources = p.nonAuthoritativeVersionSources.filter(
            (s) => s !== 'apps/api/pom.xml'
          );
        }),
      };
    },
  },
  {
    name: 'generatedProjectScope sürüklenirse FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['POLICY_SCHEMA'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          m.upstreamReleaseVersionPolicy.generatedProjectScope = 'project';
        }),
      };
    },
  },
  {
    name: 'historical tag grammar dışına çıkarsa FAIL üretir (releaseVersionPolicy)',
    expectFragments: ['tag geçersiz veya yinelenmiş'],
    setup() {
      return {
        paths: [],
        restore: patchManifest((m) => {
          m.upstreamReleaseProvenance.auditedImmutableReleases[0].tag = 'v1.0.0-rc.01';
        }),
      };
    },
  },
  {
    name: 'canonicalVersion ilerlerken historical tag\'ler FAIL ÜRETMEZ (FE-1 pozitif kontrol)',
    expectOk: true,
    setup() {
      return {
        paths: [],
        restore: (() => {
          const restoreManifest = patchManifest((m) => {
            m.upstreamReleaseVersionPolicy.canonicalVersion = '1.1.0';
          });
          const restoreDoc = patchTextFile('docs/releases/README.md', (x) =>
            x.replace('- current release version: `1.0.0`', '- current release version: `1.1.0`')
          );
          return () => {
            restoreDoc();
            restoreManifest();
          };
        })(),
      };
    },
  },
  // --- F4-MEDIUM-04: stage-1 list-marker blindness -------------------------
  // The canonical rows stay intact; one extra list-like line is added with a
  // NON-hyphen marker. A hyphen-only stage 1 collected none of these, so the
  // gate reported PASS while a human reader saw a live claim.
  {
    name: "release-state: fazladan `*` bullet FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "* current release: `example`" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  {
    name: "release-state: fazladan `+` bullet FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "+ current release: `example`" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  {
    name: "release-state: fazladan `1.` bullet FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "1. current release: `example`" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  {
    name: "release-state: fazladan `1)` bullet FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "1) current release: `example`" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  {
    name: "historical-note: fazladan `> *` bullet FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> * current release: `example`" + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  {
    name: "historical-note: fazladan `> +` bullet FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> + current release: `example`" + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  {
    name: "historical-note: fazladan `> 1.` bullet FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> 1. current release: `example`" + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  {
    name: "historical-note: fazladan `> 1)` bullet FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> 1) current release: `example`" + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  // Bare marker + end-of-line: still a list item, still not canonical.
  {
    name: "release-state: içeriksiz `*` marker FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "*" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  {
    name: "release-state: içeriksiz `2.` marker FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "2." + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  {
    name: "historical-note: içeriksiz `> *` marker FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> *" + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  {
    name: "historical-note: içeriksiz `> 2.` marker FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> 2." + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  // Quoting must not hide a row, at any blockquote depth.
  {
    name: "historical-note: iç içe `> > *` bullet FAIL üretir (F4-MEDIUM-04)",
    expectFragments: [
      'historical-note içinde canonical metadata grameri dışı blockquote bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('docs/releases/v1.0.0-rc.1.md', (text) =>
        text.replace('<!-- historical-note:end -->', "> > * current release: `example`" + '\n\n<!-- historical-note:end -->')
      ),
    }),
  },

  {
    name: "release-state: blockquote'lu `> *` bullet FAIL üretir (F4-MEDIUM-04)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "> * current release: `example`" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },

  // Regression guard: whitespace-indented hyphens were collected BEFORE this
  // fix and must still be collected after it.
  {
    name: "release-state: girintili `-` bullet coverage korunur (F4-MEDIUM-04 regression)",
    modes: ['skeleton-dev'],
    expectFragments: [
      'README.md: release-state bölümünde canonical metadata grameri dışı bullet var',
      "current release",
    ],
    setup: () => ({
      paths: [],
      restore: patchTextFile('README.md', (text) =>
        text.replace('<!-- release-state:end -->', "    - current release: `example`" + '\n\n<!-- release-state:end -->')
      ),
    }),
  },
  {
    name: 'blok DIŞINDAKİ serbest proza FAIL üretmez (pozitif kontrol)',
    expectOk: true,
    setup() {
      return {
        paths: [],
        restore: patchTextFile('docs/operations/deployment.md', (t) =>
          `${t}\nNot: bu satir bounded blok disinda serbest prozadir.\n`
        ),
      };
    },
  },
];

const snapshotBefore = worktreeSnapshot();
let failed = 0;
let skipped = 0;
let ran = 0;
for (const scenario of scenarios) {
  if (scenario.modes && !scenario.modes.includes(MODE)) {
    skipped++;
    console.log(`[verify-structure-negative] SKIP — ${scenario.name} (kural mode=${MODE} için kapalı)`);
    continue;
  }
  ran++;
  let cleanup = [];
  let restore = null;
  try {
    const planted = scenario.setup();
    if (Array.isArray(planted)) cleanup = planted;
    else ({ paths: cleanup = [], restore = null } = planted);
    // A positive control asserts the opposite: a legitimate construct must NOT
    // trip the rule, so the gate has to stay green with the fixture in place.
    const expected = scenario.expectOk
      ? []
      : (scenario.expectFragments ?? [scenario.expectFragment]);
    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts', 'verify-structure.mjs')],
      { cwd: ROOT, encoding: 'utf8' }
    );
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const missing = expected.filter((fragment) => !out.includes(fragment));
    const wantedStatus = scenario.expectOk ? 0 : 1;
    if (run.status === wantedStatus && missing.length === 0) {
      console.log(`[verify-structure-negative] PASS — ${scenario.name}`);
    } else {
      failed++;
      console.error(
        `[verify-structure-negative] FAIL — ${scenario.name}: ` +
          `exit=${run.status} (beklenen ${wantedStatus}) veya çıktıda yok: ${missing.join(' | ')}`
      );
      console.error(out.trim().split('\n').slice(-8).join('\n'));
    }
  } finally {
    for (const tmp of cleanup) rmSync(tmp, { recursive: true, force: true });
    if (restore) restore();
  }
}

// Restoration proof: nothing a scenario touched or planted may survive.
const snapshotAfter = worktreeSnapshot();
if (snapshotBefore === null || snapshotAfter === null) {
  console.error('[verify-structure-negative] ! worktree kontrolü atlandı (git yok/başarısız)');
} else if (snapshotBefore !== snapshotAfter) {
  failed++;
  console.error(
    '[verify-structure-negative] FAIL — çalışma ağacı restore edilmedi:\n' +
      `  önce:\n${snapshotBefore.trim() || '    (temiz)'}\n  sonra:\n${snapshotAfter.trim() || '    (temiz)'}`
  );
}

if (failed) process.exit(1);
console.log(
  `[verify-structure-negative] ${ran}/${ran} senaryo PASS` +
    ` (mode=${MODE}${skipped ? `, ${skipped} senaryo bu modda kapalı` : ''}; toplam ${scenarios.length})`
);
