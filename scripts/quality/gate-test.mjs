// Quality gate: test — frontend (`pnpm test`) then backend (`mvn verify` in apps/api).
// Env switches:
//   SKIP_API=1  skip the backend part (no JDK/Maven on this machine)
//   IT_LOCAL=1  run backend ITs against local PostgreSQL (mvn verify -Pit-local, no Docker)
//
// Faz 8.1 (audit #5): a pnpm workspace WITHOUT a `test` script fails this gate
// unless it is explicitly allowlisted below with a reason. "turbo: no tasks
// executed" must never read as PASS.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shell = process.platform === 'win32'; // pnpm/mvn are .cmd shims on Windows

// Workspaces allowed to have no `test` script — name: reason. Adding a new
// workspace without tests requires a conscious entry here, not silence.
const NO_TEST_ALLOWLIST = {
  '@skeleton/design-tokens': 'pure CSS token package, no executable code',
  '@skeleton/api-types': 'generated OpenAPI types; drift guarded by gate-contract-drift',
};

function workspaceDirs() {
  const yaml = fs.readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  const globs = [...yaml.matchAll(/^\s*-\s*["']?([^"'\n]+?)["']?\s*$/gm)].map((m) => m[1]);
  const dirs = [];
  for (const glob of globs) {
    if (!glob.endsWith('/*')) continue; // skeleton only uses <dir>/* patterns
    const parent = path.join(root, glob.slice(0, -2));
    if (!fs.existsSync(parent)) continue;
    for (const entry of fs.readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(parent, entry.name, 'package.json'))) {
        dirs.push(path.join(parent, entry.name));
      }
    }
  }
  return dirs;
}

const missing = [];
for (const dir of workspaceDirs()) {
  const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  if (pkg.scripts && typeof pkg.scripts.test === 'string') continue;
  if (NO_TEST_ALLOWLIST[pkg.name]) {
    console.log(`[gate-test] no test script in ${pkg.name} - allowlisted (${NO_TEST_ALLOWLIST[pkg.name]})`);
    continue;
  }
  missing.push(pkg.name || path.relative(root, dir));
}
if (missing.length > 0) {
  console.error(
    `[gate-test] FAIL: workspace(s) without a test script: ${missing.join(', ')}. ` +
      'Add real tests (or an explicit NO_TEST_ALLOWLIST entry with a reason).'
  );
  process.exit(1);
}

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
