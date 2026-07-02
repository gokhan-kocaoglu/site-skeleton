// Quality gate: type-check — runs `pnpm type-check` (turbo -> tsc --noEmit per workspace).
// Side-effect free: streams the tool output and exits with its status code.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

console.log('[gate-typecheck] pnpm type-check');
const result = spawnSync('pnpm', ['type-check'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32', // pnpm is a .cmd shim on Windows
});
process.exit(result.status ?? 1);
