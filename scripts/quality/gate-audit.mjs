// Quality gate: audit — `pnpm audit --prod`. FAIL only on high/critical findings;
// lower severities are WARN. Audit infrastructure errors (offline registry, parse
// failure) also degrade to WARN so the gate never fails for reasons outside the code.
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
  console.log('[gate-audit] WARN: could not parse audit output (registry unreachable?) - gate not failed');
  if (result.stderr) console.log(result.stderr.slice(0, 1000));
  process.exit(0);
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
process.exit(0);
