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
