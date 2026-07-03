#!/usr/bin/env node
/**
 * Negative self-test for the forbidden-pattern scan (CI #15 regression).
 *
 * The cicekci|çiçek rule exempts evidence/memory paths (docs/test-reports,
 * docs/audits, project-memory) because those files DESCRIBE the pattern.
 * This test proves the exemption did not loosen the CODE scan: a temporary
 * file under apps/ carrying the pattern must make verify-structure FAIL.
 * Node stdlib only. Exit 0 = negative test behaves, exit 1 otherwise.
 */
import { writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TMP = path.join(ROOT, 'apps', 'web', '__forbidden-pattern-negative.tmp.ts');

let ok = false;
try {
  // The token is assembled at runtime so this test file itself never
  // contains the forbidden literal.
  writeFileSync(TMP, `// negative fixture\nconst shopName = "${'cicek' + 'ci'}";\n`);
  const run = spawnSync(
    process.execPath,
    [path.join(ROOT, 'scripts', 'verify-structure.mjs')],
    { cwd: ROOT, encoding: 'utf8' }
  );
  const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
  ok = run.status === 1 && out.includes('__forbidden-pattern-negative.tmp.ts');
  if (!ok) {
    console.error(
      `[verify-structure-negative] FAIL — exit=${run.status} (beklenen 1); ` +
        'sahte pattern dosyası yakalanmadı: muafiyet kod taramasını gevşetmiş olabilir.'
    );
    console.error(out.trim().split('\n').slice(-8).join('\n'));
  }
} finally {
  rmSync(TMP, { force: true });
}

if (!ok) process.exit(1);
console.log('[verify-structure-negative] PASS — apps/ altındaki sahte pattern dosyası FAIL üretti (muafiyet kod taramasını gevşetmedi)');
