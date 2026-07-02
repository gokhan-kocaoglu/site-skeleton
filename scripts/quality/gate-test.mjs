// Quality gate: test — frontend (`pnpm test`) then backend (`mvn verify` in apps/api).
// Env switches:
//   SKIP_API=1  skip the backend part (no JDK/Maven on this machine)
//   IT_LOCAL=1  run backend ITs against local PostgreSQL (mvn verify -Pit-local, no Docker)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shell = process.platform === 'win32'; // pnpm/mvn are .cmd shims on Windows

console.log('[gate-test] frontend: pnpm test');
const front = spawnSync('pnpm', ['test'], { cwd: root, stdio: 'inherit', shell });
if ((front.status ?? 1) !== 0) process.exit(front.status ?? 1);

if (process.env.SKIP_API === '1') {
  console.log('[gate-test] SKIP_API=1 - backend (mvn verify) skipped');
  process.exit(0);
}

const mvnArgs = ['verify'];
if (process.env.IT_LOCAL === '1') mvnArgs.push('-Pit-local');
console.log(`[gate-test] backend: mvn ${mvnArgs.join(' ')} (apps/api)`);
const api = spawnSync('mvn', mvnArgs, {
  cwd: path.join(root, 'apps', 'api'),
  stdio: 'inherit',
  shell,
});
process.exit(api.status ?? 1);
