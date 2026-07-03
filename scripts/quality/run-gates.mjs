// Runs every quality gate sequentially and prints a PASS/FAIL summary table.
// Exit code 0 only when all gates pass. Stdout only — the /quality-gate command
// is responsible for collecting evidence reports; these scripts stay side-effect
// free (exception: contract-drift leaves regenerated types in place on FAIL, as
// evidence). Gate order is binding (Faz 8.1): build first (cheapest total signal
// after cache), structure and contract-drift last (they assert the repo's shape
// after everything else ran).
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
  results.push({ gate, ok: run.status === 0 });
}

console.log('\nGate            Result');
console.log('--------------  ------');
for (const { gate, ok } of results) {
  console.log(`${gate.padEnd(14)}  ${ok ? 'PASS' : 'FAIL'}`);
}

const allPass = results.every((r) => r.ok);
console.log(allPass ? '\nAll gates PASS' : '\nOne or more gates FAILED');
process.exit(allPass ? 0 : 1);
