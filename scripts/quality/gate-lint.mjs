// Quality gate: lint — runs `pnpm lint` (turbo -> ESLint flat config per workspace).
// Side-effect free: streams the tool output and exits with its status code.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

console.log('[gate-lint] pnpm lint');
const result = spawnSync('pnpm', ['lint'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32', // pnpm is a .cmd shim on Windows
});
process.exit(result.status ?? 1);
