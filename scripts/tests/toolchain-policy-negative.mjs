// Negative proof for the toolchain policy guard (Faz 8.3 F4 remediation).
//
// A threshold nobody has seen fail is decoration. The fourth mini-audit made
// that point about the critical-domain coverage wire; the same standard applies
// here. This driver feeds the pure policy function the exact pins that must be
// refused — including the one that caused F4-HIGH-01 — and asserts both the
// verdict and the reason code, so a future refactor cannot loosen the rule while
// still "passing".
//
// stdlib only, offline, no fixtures on disk: the policy function is pure.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  checkToolchainPolicy,
  MIN_PNPM,
  ALLOWED_MAJOR,
} from '../quality/assert-toolchain-policy.mjs';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

const CASES = [
  // --- must FAIL -----------------------------------------------------------
  {
    name: 'RC1 pini pnpm@9.15.4 reddedilir (F4-HIGH-01 regresyonu)',
    pkg: { packageManager: 'pnpm@9.15.4' },
    expectOk: false,
    expectCode: 'MAJOR_NOT_REVIEWED',
  },
  {
    // This scenario carries a second duty: it is the only place the security
    // floor message is actually produced, so it also pins the advisory
    // identifiers. GHSA-qrv3-253h-g69c and GHSA-fr4h-3cph-29xv have NO CVE id
    // in the GitHub Advisory DB; earlier drafts called them CVE-2026-59195 /
    // -59196. Asserting their absence stops those unverifiable ids from
    // creeping back into a user-facing failure message.
    name: 'tabanın bir patch altı pnpm@10.34.3 reddedilir (+ advisory kimlik bütünlüğü)',
    pkg: { packageManager: 'pnpm@10.34.3' },
    expectOk: false,
    expectCode: 'BELOW_SECURITY_FLOOR',
    expectMessageIncludes: ['GHSA-qrv3-253h-g69c', 'GHSA-fr4h-3cph-29xv'],
    expectMessageExcludes: ['CVE-2026-59195', 'CVE-2026-59196'],
  },
  {
    name: 'aralık belirteci pnpm@^10.34.4 reddedilir (exact pin zorunlu)',
    pkg: { packageManager: 'pnpm@^10.34.4' },
    expectOk: false,
    expectCode: 'NOT_EXACT_PIN',
  },
  {
    name: 'packageManager alanı yoksa reddedilir',
    pkg: { name: 'x' },
    expectOk: false,
    expectCode: 'MISSING',
  },
  {
    name: 'geçersiz semver pnpm@10.x reddedilir',
    pkg: { packageManager: 'pnpm@10.x' },
    expectOk: false,
    expectCode: 'NOT_EXACT_PIN',
  },
  {
    name: 'başka paket yöneticisi npm@10.9.0 reddedilir',
    pkg: { packageManager: 'npm@10.9.0' },
    expectOk: false,
    expectCode: 'WRONG_MANAGER',
  },
  {
    name: 'metin olmayan alan reddedilir',
    pkg: { packageManager: 42 },
    expectOk: false,
    expectCode: 'NOT_A_STRING',
  },
  {
    name: `pnpm@11.0.0 sessizce GEÇMEZ — major hat ${ALLOWED_MAJOR} dışı, açık karar ister`,
    pkg: { packageManager: 'pnpm@11.0.0' },
    expectOk: false,
    expectCode: 'MAJOR_NOT_REVIEWED',
  },

  // --- must PASS (kural aşırı sıkı olmamalı) -------------------------------
  {
    name: `taban sürüm pnpm@${MIN_PNPM} kabul edilir`,
    pkg: { packageManager: `pnpm@${MIN_PNPM}` },
    expectOk: true,
    expectCode: 'OK',
  },
  {
    name: 'aynı major içinde daha yeni sürüm pnpm@10.35.0 kabul edilir',
    pkg: { packageManager: 'pnpm@10.35.0' },
    expectOk: true,
    expectCode: 'OK',
  },
  {
    name: 'Corepack integrity ekli exact pin kabul edilir',
    pkg: { packageManager: `pnpm@${MIN_PNPM}+sha512.abc123def456` },
    expectOk: true,
    expectCode: 'OK',
  },
];

let failures = 0;
for (const c of CASES) {
  const got = checkToolchainPolicy(c.pkg);
  const problems = [];

  if (got.ok !== c.expectOk || got.code !== c.expectCode) {
    problems.push(
      `beklenen ok=${c.expectOk} code=${c.expectCode}; bulunan ok=${got.ok} code=${got.code}`,
    );
  }
  for (const needle of c.expectMessageIncludes ?? []) {
    if (!got.message.includes(needle)) problems.push(`mesajda "${needle}" YOK`);
  }
  for (const needle of c.expectMessageExcludes ?? []) {
    if (got.message.includes(needle)) {
      problems.push(`mesajda doğrulanamayan tanımlayıcı "${needle}" VAR`);
    }
  }

  if (problems.length === 0) {
    console.log(`[toolchain-policy] PASS — ${c.name}`);
  } else {
    failures += 1;
    console.error(
      `[toolchain-policy] FAIL — ${c.name}\n` +
        problems.map((p) => `    ${p}`).join('\n') +
        `\n    mesaj: ${got.message}`,
    );
  }
}

// The live repository must satisfy its own rule; otherwise the guard is green
// only against synthetic input.
const realPkg = JSON.parse(readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
const real = checkToolchainPolicy(realPkg);
if (real.ok) {
  console.log(`[toolchain-policy] PASS — gerçek package.json kuralı sağlıyor (${real.message})`);
} else {
  failures += 1;
  console.error(`[toolchain-policy] FAIL — gerçek package.json kuralı ihlal ediyor: ${real.message}`);
}

const total = CASES.length + 1;
if (failures > 0) {
  console.error(`\n[toolchain-policy] ${failures}/${total} senaryo BAŞARISIZ`);
  process.exit(1);
}
console.log(`\n[toolchain-policy] ${total}/${total} senaryo PASS (exact pin + güvenlik tabanı ${MIN_PNPM} canlı)`);
process.exit(0);
