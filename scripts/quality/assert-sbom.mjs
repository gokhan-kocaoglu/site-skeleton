#!/usr/bin/env node
/**
 * CycloneDX SBOM assertion (Faz 8.3 PR-B, ADR-0015).
 *
 * The SBOM step is an INVENTORY step — it produces no vulnerability verdict.
 * This script asserts the inventory is actually complete and still reflects the
 * security overrides, so an empty or half-scanned SBOM can never pass as proof:
 * both ecosystems must be present (npm AND maven), the pinned safe versions must
 * appear, and the versions they replaced must not.
 *
 * Usage: node scripts/quality/assert-sbom.mjs <sbom-path>
 * Node stdlib only. Exit 0 = PASS, exit 1 = FAIL.
 */
import { readFileSync, existsSync } from 'node:fs';

const sbomPath = process.argv[2];
const failures = [];

function fail(message) {
  failures.push(message);
}

function done() {
  if (failures.length) {
    console.error(`[assert-sbom] FAIL — ${failures.length} problem:`);
    for (const f of failures) console.error(`  x ${f}`);
    process.exit(1);
  }
}

if (!sbomPath) {
  console.error('[assert-sbom] FAIL: kullanım - node scripts/quality/assert-sbom.mjs <sbom-path>');
  process.exit(1);
}
if (!existsSync(sbomPath)) {
  console.error(`[assert-sbom] FAIL: SBOM dosyası yok: ${sbomPath}`);
  process.exit(1);
}

let sbom;
try {
  sbom = JSON.parse(readFileSync(sbomPath, 'utf8'));
} catch (e) {
  console.error(`[assert-sbom] FAIL: geçersiz JSON (${e.message}): ${sbomPath}`);
  process.exit(1);
}

if (sbom.bomFormat !== 'CycloneDX') fail(`bomFormat "CycloneDX" değil (bulunan: ${JSON.stringify(sbom.bomFormat ?? null)})`);
if (!sbom.specVersion) fail('specVersion alanı yok');

// Trivy nests sub-components (per scanned manifest); flatten before asserting.
function flatten(components, acc = []) {
  for (const c of components ?? []) {
    acc.push(c);
    if (Array.isArray(c.components)) flatten(c.components, acc);
  }
  return acc;
}

if (!Array.isArray(sbom.components) || sbom.components.length === 0) {
  fail('components dizisi yok veya boş');
  done();
}

const components = flatten(sbom.components);
const purls = components.map((c) => c.purl ?? '').filter(Boolean);
const npm = purls.filter((p) => p.startsWith('pkg:npm/'));
const maven = purls.filter((p) => p.startsWith('pkg:maven/'));

// A purl carries optional qualifiers (?type=jar) and namespaces, so match on the
// name@version segment rather than on full string equality.
const hasPkg = (list, needle) => list.some((p) => p.split('?')[0].endsWith(needle));
const hasNamespace = (list, prefix) => list.some((p) => p.startsWith(prefix));

if (npm.length === 0) fail('hiç pkg:npm/ bileşeni yok (npm ekosistemi taranmamış)');
if (maven.length === 0) fail('hiç pkg:maven/ bileşeni yok (Maven ekosistemi taranmamış)');

const REQUIRED_NPM = [
  ['postcss@8.5.18', 'PostCSS 8.5.18 (güvenli override sürümü)'],
  ['sharp@0.35.0', 'Sharp 0.35.0 (güvenli override sürümü)'],
];
for (const [needle, label] of REQUIRED_NPM) {
  if (!hasPkg(npm, `/${needle}`)) fail(`beklenen bileşen SBOM'da yok: ${label}`);
}

const FORBIDDEN_NPM = [
  ['postcss@8.4.31', 'PostCSS 8.4.31 (override öncesi zafiyetli sürüm)'],
  ['sharp@0.34.5', 'Sharp 0.34.5 (override öncesi zafiyetli sürüm)'],
];
for (const [needle, label] of FORBIDDEN_NPM) {
  if (hasPkg(npm, `/${needle}`)) fail(`yasak bileşen SBOM'da var: ${label}`);
}

if (!hasNamespace(maven, 'pkg:maven/org.postgresql/postgresql@')) {
  fail("beklenen bileşen SBOM'da yok: org.postgresql:postgresql (Maven)");
}
if (!hasNamespace(maven, 'pkg:maven/org.springframework.boot/')) {
  fail("beklenen bileşen SBOM'da yok: en az bir org.springframework.boot Maven bileşeni");
}

done();
console.log(
  `[assert-sbom] PASS — ${sbomPath} (CycloneDX ${sbom.specVersion}) ` +
    `npm=${npm.length} maven=${maven.length} total=${components.length}`
);
