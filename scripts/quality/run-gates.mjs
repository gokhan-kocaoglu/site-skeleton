// Runs every quality gate sequentially and prints a PASS/FAIL summary table.
// Exit code 0 only when all gates pass. Stdout only — the /quality-gate command
// is responsible for collecting evidence reports; these scripts stay side-effect
// free (exception: contract-drift leaves regenerated types in place on FAIL, as
// evidence). Gate order is binding (Faz 8.1): build first (cheapest total signal
// after cache), structure and contract-drift last (they assert the repo's shape
// after everything else ran).
// Exit-code contract (Faz 8.2, brief 3.1): gate scripts exit 0 = PASS,
// 2 = INCONCLUSIVE (today only gate-audit, locally), anything else = FAIL.
// Overall: any FAIL -> exit 1; else any INCONCLUSIVE -> PASS_WITH_WARNINGS
// (exit 0, warning visible in the table); else "All gates PASS".
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const GATES = ['build', 'typecheck', 'lint', 'test', 'audit', 'structure', 'contract-drift'];

const results = [];
for (const gate of GATES) {
  console.log(`\n=== gate: ${gate} ===`);
  const run = spawnSync(process.execPath, [path.join(here, `gate-${gate}.mjs`)], {
    stdio: 'inherit',
  });
  const status = run.status === 0 ? 'PASS' : run.status === 2 ? 'INCONCLUSIVE' : 'FAIL';
  results.push({ gate, status });
}

console.log('\nGate            Result');
console.log('--------------  ------------');
for (const { gate, status } of results) {
  console.log(`${gate.padEnd(14)}  ${status}`);
}

if (results.some((r) => r.status === 'FAIL')) {
  console.log('\nOne or more gates FAILED');
  process.exit(1);
}
if (results.some((r) => r.status === 'INCONCLUSIVE')) {
  console.log('\nPASS_WITH_WARNINGS — audit inconclusive locally');
  process.exit(0);
}
console.log('\nAll gates PASS');
process.exit(0);
