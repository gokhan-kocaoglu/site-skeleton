// Quality gate: audit — `pnpm audit --prod`. Three-state (Faz 8.1, audit #4):
//   PASS         no high/critical findings (moderate/low -> WARN, still pass)
//   FAIL         high+critical > 0
//   INCONCLUSIVE the scan could not run or be parsed (offline registry, parse
//                error). Locally non-blocking so the gate never blocks on
//                infrastructure; in CI (CI env var set) a merge blocker (exit 1)
//                because "could not scan" must never read as "scanned clean".
// Exit-code contract (Faz 8.2, brief 3.1): 0 = PASS · 1 = FAIL (also
// INCONCLUSIVE in CI) · 2 = INCONCLUSIVE locally. run-gates.mjs maps exit 2
// to an INCONCLUSIVE row so the summary never shows it as a silent PASS.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

console.log('[gate-audit] pnpm audit --prod');
const result = spawnSync('pnpm', ['audit', '--prod', '--json'], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32', // pnpm is a .cmd shim on Windows
});

let counts;
try {
  counts = JSON.parse(result.stdout).metadata.vulnerabilities;
} catch {
  const inCi = !!process.env.CI;
  console.log(
    `[gate-audit] INCONCLUSIVE: could not run/parse the audit (registry unreachable?) - ` +
      (inCi ? 'CI treats this as FAIL' : 'local warning only (exit 2, surfaced by run-gates)'),
  );
  if (result.stderr) console.log(result.stderr.slice(0, 1000));
  process.exit(inCi ? 1 : 2);
}

const { info = 0, low = 0, moderate = 0, high = 0, critical = 0 } = counts;
console.log(
  `[gate-audit] vulnerabilities - critical:${critical} high:${high} moderate:${moderate} low:${low} info:${info}`,
);

if (high + critical > 0) {
  console.log('[gate-audit] FAIL: high/critical vulnerabilities in production dependencies');
  process.exit(1);
}
if (moderate + low > 0) {
  console.log('[gate-audit] WARN: lower-severity findings - review when convenient');
}
console.log('[gate-audit] PASS');
process.exit(0);
