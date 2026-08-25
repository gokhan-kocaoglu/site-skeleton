// Quality gate: web-headers — build-artifact oracle for the AC-33 header
// contract (ADR-0019).
//
// This gate is deliberately NOT a second copy of the unit tests. Its input is
// what Next.js itself produced (`.next/routes-manifest.json` and
// `.next/required-server-files.json`), not the source module the tests import,
// so a change that keeps the module happy but never reaches a real response
// still fails here. The expected values below are independent literals; they
// are never read back from apps/web.
//
// The rule-key check is an ALLOWLIST on purpose. Next accepts `has`, `missing`,
// `locale` and `basePath` on a header rule; adding `has: [{type:'header',
// key:'x-never-sent'}]` emits zero headers in production while every unit test
// stays green. A denylist would have to enumerate keys Next may add later.
//
// stdlib only. Exit 0 = PASS, exit 1 = FAIL.
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const EXPECTED_SOURCE = '/(.*)';
export const EXPECTED_REGEX = '^(?:/(.*))(?:/)?$';
export const ALLOWED_RULE_KEYS = ['headers', 'regex', 'source'];
export const EXPECTED_IMAGE_CSP = "default-src 'self'; script-src 'none'; sandbox;";
export const EXPECTED_HEADERS = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const FORBIDDEN_SCRIPT_SRC_SOURCES = ['nonce-', 'sha256-', 'sha384-', 'sha512-'];

function scriptSrcDirective(csp) {
  return String(csp)
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('script-src'));
}

/**
 * Pure oracle over the two build artifacts. Both arguments are the parsed JSON
 * documents, or null when the artifact is absent (which is a FAIL, not a skip:
 * "no artifact" must never read as "no problem").
 */
export function checkWebHeaderArtifacts(routesManifest, requiredServerFiles) {
  const failures = [];
  const fail = (code, detail) => failures.push({ code, detail });

  if (routesManifest == null) {
    fail('ROUTES_MANIFEST_MISSING', 'apps/web/.next/routes-manifest.json not readable');
  } else {
    const rules = routesManifest.headers;
    if (!Array.isArray(rules) || rules.length !== 1) {
      fail('RULE_COUNT', `expected exactly 1 header rule, got ${Array.isArray(rules) ? rules.length : typeof rules}`);
    } else {
      const rule = rules[0];
      const keys = Object.keys(rule).sort();
      if (keys.join(',') !== ALLOWED_RULE_KEYS.join(',')) {
        fail('RULE_KEYS', `rule keys ${JSON.stringify(keys)} != ${JSON.stringify(ALLOWED_RULE_KEYS)}`);
      }
      if (rule.source !== EXPECTED_SOURCE) {
        fail('RULE_SOURCE', `source ${JSON.stringify(rule.source)} != ${JSON.stringify(EXPECTED_SOURCE)}`);
      }
      if (rule.regex !== EXPECTED_REGEX) {
        fail('RULE_REGEX', `regex ${JSON.stringify(rule.regex)} != ${JSON.stringify(EXPECTED_REGEX)}`);
      }
      const emitted = Array.isArray(rule.headers) ? rule.headers : [];
      if (JSON.stringify(emitted) !== JSON.stringify(EXPECTED_HEADERS)) {
        fail('HEADER_SET', `emitted header set does not match the pinned contract: ${JSON.stringify(emitted)}`);
      }
      const folded = emitted.map((h) => String(h?.key).toLowerCase());
      if (new Set(folded).size !== folded.length) {
        fail('HEADER_DUPLICATE', `duplicate header name (case-insensitive): ${JSON.stringify(folded)}`);
      }
      if (folded.includes('strict-transport-security')) {
        fail('HSTS_EMITTED', 'apps/web must not emit HSTS; it is owned by the edge/TLS terminator');
      }
      const csp = emitted.find((h) => String(h?.key).toLowerCase() === 'content-security-policy')?.value;
      const scriptSrc = csp == null ? undefined : scriptSrcDirective(csp);
      if (scriptSrc && scriptSrc.includes("'unsafe-inline'")) {
        const offender = FORBIDDEN_SCRIPT_SRC_SOURCES.find((token) => scriptSrc.includes(token));
        if (offender) {
          fail(
            'CSP_UNSAFE_INLINE_NEUTRALISED',
            `script-src carries '${offender}' next to 'unsafe-inline'; CSP2+ browsers silently drop 'unsafe-inline'`
          );
        }
      }
    }
  }

  if (requiredServerFiles == null) {
    fail('REQUIRED_SERVER_FILES_MISSING', 'apps/web/.next/required-server-files.json not readable');
  } else {
    const config = requiredServerFiles.config ?? {};
    if (config.poweredByHeader !== false) {
      fail('POWERED_BY_HEADER', `config.poweredByHeader is ${JSON.stringify(config.poweredByHeader)}, expected false`);
    }
    // The three image checks are independent on purpose: an exact-equality
    // check alone would report one generic code for every drift, and the two
    // properties that actually neutralise the sandboxed response class would
    // have no signal of their own.
    const imageCsp = config.images?.contentSecurityPolicy;
    if (imageCsp !== EXPECTED_IMAGE_CSP) {
      fail('IMAGE_CSP', `images.contentSecurityPolicy ${JSON.stringify(imageCsp)} != ${JSON.stringify(EXPECTED_IMAGE_CSP)}`);
    }
    if (!String(imageCsp).includes("script-src 'none'")) {
      fail('IMAGE_CSP_SCRIPT_SRC', "image CSP lost script-src 'none'");
    }
    if (!String(imageCsp).includes('sandbox')) {
      fail('IMAGE_CSP_SANDBOX', 'image CSP lost sandbox');
    }
  }

  return { ok: failures.length === 0, failures };
}

function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const nextDir = path.join(root, 'apps', 'web', '.next');
  console.log('[gate-web-headers] reading apps/web/.next build artifacts');
  const result = checkWebHeaderArtifacts(
    readJson(path.join(nextDir, 'routes-manifest.json')),
    readJson(path.join(nextDir, 'required-server-files.json'))
  );
  if (!result.ok) {
    console.error(`[gate-web-headers] FAIL — ${result.failures.length} problem(s):`);
    for (const f of result.failures) console.error(`  x ${f.code}: ${f.detail}`);
    process.exit(1);
  }
  console.log('[gate-web-headers] PASS: emitted header contract matches ADR-0019');

  // A gate nobody has watched fail is decoration: prove the oracle rejects the
  // mutations it claims to reject before reporting PASS.
  console.log('[gate-web-headers] node scripts/tests/web-headers-gate-negative.mjs');
  const neg = spawnSync(
    process.execPath,
    [path.join(root, 'scripts', 'tests', 'web-headers-gate-negative.mjs')],
    { cwd: root, stdio: 'inherit' }
  );
  process.exit(neg.status ?? 1);
}
