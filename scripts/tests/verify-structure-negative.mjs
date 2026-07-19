#!/usr/bin/env node
/**
 * Negative self-tests for verify-structure rules.
 *
 * Each scenario plants a temporary violation and asserts the gate FAILs
 * with the offending file named in the output — proving exemptions did
 * not loosen the scan (CI #15 regression) and structural rules actually
 * bite. Node stdlib only. Exit 0 = all scenarios behave, exit 1 otherwise.
 */
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Forbidden tokens are assembled at runtime so this test file itself never
// contains the literals it plants.
const scenarios = [
  {
    name: 'apps/ altındaki sahte pattern dosyası FAIL üretir (muafiyet kod taramasını gevşetmedi)',
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
];

let failed = 0;
for (const scenario of scenarios) {
  let cleanup = [];
  try {
    cleanup = scenario.setup();
    const run = spawnSync(
      process.execPath,
      [path.join(ROOT, 'scripts', 'verify-structure.mjs')],
      { cwd: ROOT, encoding: 'utf8' }
    );
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    if (run.status === 1 && out.includes(scenario.expectFragment)) {
      console.log(`[verify-structure-negative] PASS — ${scenario.name}`);
    } else {
      failed++;
      console.error(
        `[verify-structure-negative] FAIL — ${scenario.name}: ` +
          `exit=${run.status} (beklenen 1) veya "${scenario.expectFragment}" çıktıda yok.`
      );
      console.error(out.trim().split('\n').slice(-8).join('\n'));
    }
  } finally {
    for (const tmp of cleanup) rmSync(tmp, { recursive: true, force: true });
  }
}

if (failed) process.exit(1);
console.log(`[verify-structure-negative] ${scenarios.length}/${scenarios.length} senaryo PASS`);
