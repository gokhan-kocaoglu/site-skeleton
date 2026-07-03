// Quality gate: structure — wraps scripts/verify-structure.mjs so the
// manifest-driven structure check is part of the standard gate chain, then
// runs the forbidden-pattern negative self-test (the evidence-path exemption
// must never loosen the code scan — CI #15 regression).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));

console.log('[gate-structure] node scripts/verify-structure.mjs');
const run = spawnSync(process.execPath, [path.join(root, 'scripts', 'verify-structure.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
if ((run.status ?? 1) !== 0) process.exit(run.status ?? 1);

console.log('[gate-structure] node scripts/tests/verify-structure-negative.mjs');
const neg = spawnSync(
  process.execPath,
  [path.join(root, 'scripts', 'tests', 'verify-structure-negative.mjs')],
  { cwd: root, stdio: 'inherit' }
);
process.exit(neg.status ?? 1);
