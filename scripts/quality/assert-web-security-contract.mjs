// AC-33 static contract oracle (ADR-0019). Called from scripts/verify-structure.mjs
// so the drift rule lives here instead of growing that file's rule body.
//
// Three separately authored copies of the header contract must agree:
//   1. apps/web/lib/security-headers.ts   — the runtime source
//   2. docs/operations/deployment.md      — the human-readable contract
//   3. the literals in THIS file          — an independent third opinion
// The doc block is rebuilt from this file's literals and compared as one exact
// string, so no line of it is parsed and no bullet-collection grammar exists to
// have a hole in. Any marker/format/whitespace edit is a mismatch by definition.
//
// The runtime module is read as TEXT and never executed: this runs inside the
// structure gate, on Windows, with no dependency install and no TypeScript
// loader. That is why the module is required to declare its values as
// single-line string literals.
//
// stdlib only. Mode-agnostic on purpose: a generated project must keep the same
// contract, so this rule never goes quiet outside skeleton-dev.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const MODULE_REL = 'apps/web/lib/security-headers.ts';
const CONFIG_REL = 'apps/web/next.config.ts';
const DOC_REL = 'docs/operations/deployment.md';
const ADMIN_README_REL = 'apps/admin/README.md';

const CSP_PRODUCTION =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'";
const CSP_DEVELOPMENT =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self' ws://localhost:* ws://127.0.0.1:*";
const IMAGE_OPTIMIZER_CSP = "default-src 'self'; script-src 'none'; sandbox;";
const HEADER_SOURCE = '/(.*)';
const ADMIN_CSP =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'";

const STATIC_HEADERS = [
  ['X-Frame-Options', 'DENY'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
];

const WEB_BLOCK = [
  '**apps/web — Next.js runtime tarafından emit edilir**',
  '',
  `- Content-Security-Policy (production): \`${CSP_PRODUCTION}\``,
  `- Content-Security-Policy (development): \`${CSP_DEVELOPMENT}\``,
  `- Content-Security-Policy (/_next/image): \`${IMAGE_OPTIMIZER_CSP}\``,
  ...STATIC_HEADERS.map(([key, value]) => `- ${key}: \`${value}\``),
  `- Header source: \`${HEADER_SOURCE}\``,
  '- X-Powered-By: `emit edilmez (poweredByHeader: false)`',
  '- Strict-Transport-Security: `bu repo tarafından ZORLANMAZ — edge/TLS terminatörü sorumluluğu`',
].join('\n');

const ADMIN_BLOCK = [
  '**apps/admin — statik host / edge tarafından uygulanmalıdır; bu repo ZORLAMAZ**',
  '',
  `- Content-Security-Policy: \`${ADMIN_CSP}\``,
  ...STATIC_HEADERS.map(([key, value]) => `- ${key}: \`${value}\``),
  '- X-Robots-Tag: `noindex, nofollow`',
  '- Strict-Transport-Security: `max-age=31536000`',
].join('\n');

// Admin ownership must stay honest in prose, not only in a value column.
const ADMIN_DISCLAIMER = 'iddiası **taşımaz**';
const ADMIN_README_REQUIRED = ['repository runtime', 'statik host', 'docs/operations/deployment.md'];

const CSP_DIRECTIVE_MARKERS = ['default-src', 'script-src', 'frame-ancestors', 'form-action'];
const IDENTITY_LEAKS = ['site-skeleton', 'Site Skeleton', '@skeleton/', 'com.skeleton'];
const VERDICT_LEAKS = ['CORE_SKELETON_PRODUCTION_READY', 'NO_GO_REMEDIATION_REQUIRED', 'GO_FOR_V1_0_0'];

function extractBlock(text, name) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = text.indexOf(start);
  const to = text.indexOf(end);
  if (from === -1 || to === -1 || to < from) return null;
  if (text.indexOf(start, from + 1) !== -1 || text.indexOf(end, to + 1) !== -1) return null;
  return text.slice(from + start.length, to).trim();
}

function literal(text, name) {
  const m = new RegExp(`export const ${name}\\s*=\\s*"([^"\\n]*)";`).exec(text);
  return m ? m[1] : null;
}

/**
 * @param {string} root repository root
 * @returns {{checks: number, failures: string[]}}
 */
export function assertWebSecurityContract(root) {
  const failures = [];
  let checks = 0;
  const check = (condition, label) => {
    checks++;
    if (!condition) failures.push(label);
  };
  const read = (rel) => {
    const abs = path.join(root, rel);
    return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
  };

  const moduleText = read(MODULE_REL);
  check(moduleText !== null, `web security contract: missing ${MODULE_REL}`);
  if (moduleText !== null) {
    for (const [name, expected] of [
      ['CSP_PRODUCTION', CSP_PRODUCTION],
      ['CSP_DEVELOPMENT', CSP_DEVELOPMENT],
      ['IMAGE_OPTIMIZER_CSP', IMAGE_OPTIMIZER_CSP],
      ['HEADER_SOURCE', HEADER_SOURCE],
    ]) {
      check(
        literal(moduleText, name) === expected,
        `web security contract: ${MODULE_REL} ${name} does not match the canonical value`
      );
    }
    for (const [key, value] of STATIC_HEADERS) {
      check(
        moduleText.includes(`{ key: "${key}", value: "${value}" }`),
        `web security contract: ${MODULE_REL} lost the exact literal for ${key}`
      );
    }
    check(
      !/strict-transport-security/i.test(moduleText),
      `web security contract: ${MODULE_REL} must not emit HSTS (edge/TLS terminator owns it)`
    );
  }

  const configText = read(CONFIG_REL);
  check(configText !== null, `web security contract: missing ${CONFIG_REL}`);
  if (configText !== null) {
    check(
      !/strict-transport-security/i.test(configText),
      `web security contract: ${CONFIG_REL} must not emit HSTS`
    );
    check(
      !/output\s*:\s*['"]export['"]/.test(configText),
      `web security contract: ${CONFIG_REL} output export mode would make headers() inert`
    );
    check(
      /poweredByHeader\s*:\s*false/.test(configText),
      `web security contract: ${CONFIG_REL} must set poweredByHeader false`
    );
    check(
      /contentSecurityPolicy\s*:\s*IMAGE_OPTIMIZER_CSP/.test(configText),
      `web security contract: ${CONFIG_REL} must pin the image optimizer policy to IMAGE_OPTIMIZER_CSP`
    );
    check(
      !CSP_DIRECTIVE_MARKERS.some((d) => configText.includes(d)),
      `web security contract: ${CONFIG_REL} must import header values, not restate them`
    );
  }

  const docText = read(DOC_REL);
  check(docText !== null, `web security contract: missing ${DOC_REL}`);
  if (docText !== null) {
    const web = extractBlock(docText, 'web-security-contract');
    const admin = extractBlock(docText, 'admin-security-contract');
    check(web !== null, `web security contract: ${DOC_REL} web block is missing or duplicated`);
    check(admin !== null, `web security contract: ${DOC_REL} admin block is missing or duplicated`);
    check(web === WEB_BLOCK, `web security contract: ${DOC_REL} web block does not equal the canonical block byte for byte`);
    check(admin === ADMIN_BLOCK, `web security contract: ${DOC_REL} admin block does not equal the canonical block byte for byte`);
    const outside = [web, admin]
      .filter((block) => typeof block === 'string' && block.length > 0)
      .reduce((acc, block) => acc.split(block).join(''), docText);
    check(
      !CSP_DIRECTIVE_MARKERS.some((d) => outside.includes(d)),
      `web security contract: ${DOC_REL} carries CSP directives outside the bounded blocks`
    );
    // The disclaimer must live in prose, not inside a block the equality check
    // already pins — otherwise it would be "verified" by its own copy.
    check(
      outside.includes(ADMIN_DISCLAIMER),
      `web security contract: ${DOC_REL} must keep the admin ownership disclaimer outside the bounded blocks`
    );
  }

  const adminReadme = read(ADMIN_README_REL);
  check(adminReadme !== null, `web security contract: missing ${ADMIN_README_REL}`);
  if (adminReadme !== null) {
    for (const phrase of ADMIN_README_REQUIRED) {
      check(adminReadme.includes(phrase), `web security contract: ${ADMIN_README_REL} must mention "${phrase}"`);
    }
    check(
      !CSP_DIRECTIVE_MARKERS.some((d) => adminReadme.includes(d)),
      `web security contract: ${ADMIN_README_REL} must not duplicate the exact header block`
    );
  }

  for (const [rel, text] of [
    [MODULE_REL, moduleText],
    [DOC_REL, docText],
    [ADMIN_README_REL, adminReadme],
  ]) {
    if (text === null) continue;
    check(
      !IDENTITY_LEAKS.some((token) => text.includes(token)),
      `web security contract: ${rel} leaks skeleton identity into a generated project`
    );
    check(
      !VERDICT_LEAKS.some((token) => text.includes(token)),
      `web security contract: ${rel} carries release verdict language`
    );
  }

  return { checks, failures };
}
