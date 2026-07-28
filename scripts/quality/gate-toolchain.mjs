// Thin gate wrapper so run-gates.mjs can discover the toolchain policy check
// through its gate-<name>.mjs convention. The policy itself (and the constants
// the negative suite drives) lives in assert-toolchain-policy.mjs.
//
// This gate does two things on purpose:
//   1. asserts the live package.json satisfies the policy, and
//   2. re-runs the negative suite, so the rule is proven to still REJECT the
//      pins that must never come back — including pnpm@9.15.4, the exact pin
//      that produced F4-HIGH-01.
// (2) is what keeps this from becoming a decorative threshold: a refactor that
// accidentally makes the checker permissive fails here instead of passing
// quietly. Both are pure/offline, so the added cost is a few milliseconds and
// no new CI job or required check is needed — `pnpm gate` already runs inside
// quality-gate-ubuntu.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkToolchainPolicy, MIN_PNPM } from './assert-toolchain-policy.mjs';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

console.log(`[gate-toolchain] packageManager exact-pin + security floor >= ${MIN_PNPM}`);

let pkg;
try {
  pkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
} catch (err) {
  console.error(`[gate-toolchain] FAIL — package.json okunamadı: ${err.message}`);
  process.exit(1);
}

const result = checkToolchainPolicy(pkg);
if (!result.ok) {
  console.error(`[gate-toolchain] FAIL (${result.code}) — ${result.message}`);
  process.exit(1);
}
console.log(`[gate-toolchain] PASS — ${result.message}`);

const negative = spawnSync(
  process.execPath,
  [path.join(REPO_ROOT, 'scripts', 'tests', 'toolchain-policy-negative.mjs')],
  { stdio: 'inherit' },
);
if (negative.status !== 0) {
  console.error('[gate-toolchain] FAIL — negatif senaryolar geçmedi (kural gevşemiş olabilir).');
  process.exit(1);
}

process.exit(0);
