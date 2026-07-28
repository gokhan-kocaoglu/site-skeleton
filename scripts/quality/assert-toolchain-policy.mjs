// Toolchain policy guard (Faz 8.3 F4 remediation, audit AC-31 / R-4 partial).
//
// Scope, stated honestly: audit R-4 asks for a gate over "packageManager + Node"
// version/EOL. This file implements the packageManager/pnpm half only. There is
// deliberately NO Node version or EOL check here -- that half of R-4 is an open,
// non-blocking debt, tracked in
// docs/source-briefs/f4-pnpm-toolchain-remediation-brief.md.
//
// Why this exists: the fourth mini-audit found that the repository pinned
// pnpm@9.15.4, a line affected by CVE-2026-50015 / -55487 / -55698 and by
// GHSA-qrv3-253h-g69c / GHSA-fr4h-3cph-29xv (both HIGH, no CVE id assigned in
// the GitHub Advisory DB), with no fix ever published for 9.x. None of the
// existing gates saw it:
// `pnpm audit` scans project dependencies, Trivy scans the repo and the API jar,
// and Dependabot ignores semver-major updates — so the package manager itself
// was an unguarded surface. This script closes that hole.
//
// Deliberately offline and stdlib-only: it must not break local development,
// must not depend on an advisory API being reachable, and must give the same
// answer on every machine. The floor below is a reviewed constant, not a lookup.
//
// Exit-code contract (run-gates.mjs, Faz 8.2 brief 3.1):
//   0 = PASS, anything else = FAIL. This gate never returns INCONCLUSIVE:
//   the package.json field is always readable, so there is no "cannot tell".
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const REPO_ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

// Binding security floor. pnpm >= 10.34.4 is the first version outside the
// affected range of every advisory listed above (the last of them is fixed in
// 10.34.4). Raising this is fine; lowering it re-opens F4-HIGH-01.
export const MIN_PNPM = '10.34.4';

// The major line this repository is reviewed for. A different major is not
// silently accepted: ADR-0009 rule 1 requires major moves to go through an
// explicit decision, so pnpm@11.x FAILs here until this constant is updated
// together with that review.
export const ALLOWED_MAJOR = 10;

const EXPECTED_MANAGER = 'pnpm';

// name@x.y.z with an optional Corepack integrity suffix (name@x.y.z+sha512.<hex>).
// Ranges (^, ~, >=, x, *) do not match on purpose — the pin must be exact.
const PIN_RE = /^([a-z0-9@/-]+)@(\d+)\.(\d+)\.(\d+)(\+[A-Za-z0-9.+_-]+)?$/;

/**
 * Pure policy check so the negative test can drive it without touching disk.
 * @param {unknown} pkg parsed package.json
 * @returns {{ ok: boolean, code: string, message: string }}
 */
export function checkToolchainPolicy(pkg) {
  const field = pkg && typeof pkg === 'object' ? pkg.packageManager : undefined;

  if (field === undefined || field === null) {
    return {
      ok: false,
      code: 'MISSING',
      message: 'package.json "packageManager" alanı yok — exact pin zorunlu.',
    };
  }
  if (typeof field !== 'string' || field.trim() === '') {
    return {
      ok: false,
      code: 'NOT_A_STRING',
      message: `package.json "packageManager" bir metin değil (${JSON.stringify(field)}).`,
    };
  }

  const match = PIN_RE.exec(field.trim());
  if (!match) {
    return {
      ok: false,
      code: 'NOT_EXACT_PIN',
      message:
        `"packageManager": "${field}" exact pin değil. ` +
        'Beklenen biçim: "<manager>@<major>.<minor>.<patch>" ' +
        '(aralık belirteci ^ ~ >= x * kabul edilmez).',
    };
  }

  const [, manager, majorRaw, minorRaw, patchRaw] = match;
  if (manager !== EXPECTED_MANAGER) {
    return {
      ok: false,
      code: 'WRONG_MANAGER',
      message: `Paket yöneticisi "${manager}" — bu repository ${EXPECTED_MANAGER} kullanır.`,
    };
  }

  const found = [Number(majorRaw), Number(minorRaw), Number(patchRaw)];
  const floor = MIN_PNPM.split('.').map(Number);

  if (found[0] !== ALLOWED_MAJOR) {
    return {
      ok: false,
      code: 'MAJOR_NOT_REVIEWED',
      message:
        `pnpm@${found.join('.')} — major hat ${found[0]}, incelenmiş hat ${ALLOWED_MAJOR}. ` +
        'Major geçiş ADR-0009 kural 1 gereği açık karar ister: ADR yazılmadan ve ' +
        'bu dosyadaki ALLOWED_MAJOR güncellenmeden geçemez (sessiz PASS yok).',
    };
  }

  for (let i = 0; i < 3; i += 1) {
    if (found[i] > floor[i]) break;
    if (found[i] < floor[i]) {
      return {
        ok: false,
        code: 'BELOW_SECURITY_FLOOR',
        message:
          `pnpm@${found.join('.')} < ${MIN_PNPM} — güvenlik tabanının altında. ` +
          'CVE-2026-50015 / CVE-2026-55487 / CVE-2026-55698 ile ' +
          'GHSA-qrv3-253h-g69c / GHSA-fr4h-3cph-29xv kapsamındaki sürümler ' +
          'kabul edilmez (denetim bulgusu F4-HIGH-01). Son iki madde GHSA ' +
          'kimliğiyle anılır: Advisory DB onlar için CVE id taşımıyor.',
      };
    }
  }

  return {
    ok: true,
    code: 'OK',
    message: `pnpm@${found.join('.')} — exact pin, güvenlik tabanı ${MIN_PNPM} karşılanıyor.`,
  };
}

function main() {
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  } catch (err) {
    console.error(`[gate-toolchain] package.json okunamadı: ${err.message}`);
    process.exit(1);
  }

  const result = checkToolchainPolicy(pkg);
  if (!result.ok) {
    console.error(`[gate-toolchain] FAIL (${result.code}) — ${result.message}`);
    process.exit(1);
  }
  console.log(`[gate-toolchain] PASS — ${result.message}`);
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
