// Quality gate: contract-drift — the OpenAPI contract and the committed
// generated types must agree (Faz 8.1, audit #16/#17).
//   1) docs/api-contracts/openapi.yaml must be a valid OpenAPI document
//      (@seriousme/openapi-schema-validator — tool choice: ADR-0004 Faz 8.1 eki).
//   2) `pnpm --filter @skeleton/api-types generate` must leave
//      packages/api-types/src/index.d.ts byte-identical (before/after compare;
//      in a clean CI checkout this is equivalent to `git diff --exit-code`, and
//      locally it does not false-fail on an intentionally regenerated file that
//      simply is not committed yet). openapi-typescript is pinned exactly so a
//      formatter change in the generator cannot masquerade as contract drift.
// On drift the regenerated file is left in the worktree as evidence: commit it
// (contract changed intentionally) or fix the contract and regenerate.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Validator } from '@seriousme/openapi-schema-validator';

const root = fileURLToPath(new URL('../../', import.meta.url));
const shell = process.platform === 'win32'; // pnpm is a .cmd shim on Windows
const SPEC = path.join(root, 'docs', 'api-contracts', 'openapi.yaml');
const TYPES = 'packages/api-types/src/index.d.ts';

console.log('[gate-contract-drift] validating docs/api-contracts/openapi.yaml');
const validation = await new Validator().validate(SPEC);
if (!validation.valid) {
  console.log('[gate-contract-drift] FAIL: openapi.yaml is not a valid OpenAPI document');
  console.log(JSON.stringify(validation.errors, null, 2).slice(0, 2000));
  process.exit(1);
}

const typesPath = path.join(root, TYPES);
const before = readFileSync(typesPath, 'utf8');

console.log('[gate-contract-drift] regenerating types: pnpm --filter @skeleton/api-types generate');
const gen = spawnSync('pnpm', ['--filter', '@skeleton/api-types', 'generate'], {
  cwd: root,
  stdio: 'inherit',
  shell,
});
if ((gen.status ?? 1) !== 0) {
  console.log('[gate-contract-drift] FAIL: type generation failed');
  process.exit(gen.status ?? 1);
}

const after = readFileSync(typesPath, 'utf8');
if (before !== after) {
  console.log(
    `[gate-contract-drift] FAIL: ${TYPES} drifted from openapi.yaml ` +
      '(regenerated file left in worktree as evidence)',
  );
  process.exit(1);
}
console.log('[gate-contract-drift] PASS: contract and generated types agree');
process.exit(0);
