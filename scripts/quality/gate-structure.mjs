// Quality gate: structure — wraps scripts/verify-structure.mjs so the
// manifest-driven structure check is part of the standard gate chain.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));

console.log('[gate-structure] node scripts/verify-structure.mjs');
const run = spawnSync(process.execPath, [path.join(root, 'scripts', 'verify-structure.mjs')], {
  cwd: root,
  stdio: 'inherit',
});
process.exit(run.status ?? 1);
