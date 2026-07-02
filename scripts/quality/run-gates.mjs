// Runs every quality gate sequentially and prints a PASS/FAIL summary table.
// Exit code 0 only when all gates pass. Stdout only — the /quality-gate command
// is responsible for collecting evidence reports; these scripts stay side-effect free.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = fileURLToPath(new URL('.', import.meta.url));
const GATES = ['typecheck', 'lint', 'test', 'audit'];

const results = [];
for (const gate of GATES) {
  console.log(`\n=== gate: ${gate} ===`);
  const run = spawnSync(process.execPath, [path.join(here, `gate-${gate}.mjs`)], {
    stdio: 'inherit',
  });
  results.push({ gate, ok: run.status === 0 });
}

console.log('\nGate        Result');
console.log('----------  ------');
for (const { gate, ok } of results) {
  console.log(`${gate.padEnd(10)}  ${ok ? 'PASS' : 'FAIL'}`);
}

const allPass = results.every((r) => r.ok);
console.log(allPass ? '\nAll gates PASS' : '\nOne or more gates FAILED');
process.exit(allPass ? 0 : 1);
