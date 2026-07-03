// Quality gate: build — production build evidence for every workspace
// (`turbo run build`: apps/web Next production build + apps/admin Vite build).
// A skeleton that only typechecks can still fail to build; this gate closes that gap.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

console.log('[gate-build] pnpm build (turbo run build)');
const run = spawnSync('pnpm', ['build'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32', // pnpm is a .cmd shim on Windows
});
process.exit(run.status ?? 1);
