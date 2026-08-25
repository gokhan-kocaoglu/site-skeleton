// AC-26 / F4-LOW-02 negative harness for the release-version contract.
//
// Adversarial oracle for scripts/quality/assert-release-version-contract.mjs.
// Every expected value below is authored independently of the helper: this file
// imports FUNCTIONS only, never the helper's literals or field lists. A test
// that imported the same constant it verifies would pass by tautology.
//
// Three scenario families:
//   1. static contract  - a synthetic repository root is built in a temp dir and
//      mutated one field at a time; assertReleaseVersionContract must fail with
//      the expected reason code.
//   2. release-time     - validateProposedReleaseTag against a hand-written policy.
//   3. CLI              - the real binary is spawned; exit codes are contractual
//                         (0 valid, 1 mismatch, 2 invocation error).
//
// FE-1/FE-2/FE-3 are the regression oracles for the binding amendment that
// historical provenance tags are NOT bound to the current canonicalVersion.
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  parseReleaseTag,
  validateHistoricalTag,
  validateProposedReleaseTag,
  assertReleaseVersionContract,
} from '../quality/assert-release-version-contract.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CLI = path.join(ROOT, 'scripts', 'quality', 'assert-release-version-contract.mjs');

let pass = 0;
const failures = [];

function ok(condition, name, detail = '') {
  if (condition) {
    pass++;
    console.log(`[release-version-negative] PASS — ${name}`);
  } else {
    failures.push(`${name}${detail ? ` :: ${detail}` : ''}`);
    console.log(`[release-version-negative] FAIL — ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

function codes(result) {
  return (result?.failures ?? []).map((f) => f.code ?? String(f));
}

// --- independently authored baseline -----------------------------------------
// These literals are written here on purpose; they are NOT imported.
function baselinePolicy() {
  return {
    authority: 'manifest',
    canonicalVersion: '1.0.0',
    tagPrefix: 'v',
    prereleaseChannels: ['rc'],
    nonAuthoritativeVersionSources: [
      'package.json',
      'apps/web/package.json',
      'apps/admin/package.json',
      'packages/api-types/package.json',
      'packages/design-tokens/package.json',
      'apps/api/pom.xml',
    ],
    generatedProjectScope: 'upstream-only',
  };
}

function baselineProvenance() {
  return {
    auditedState: { auditedCandidateTag: 'v1.0.0-rc.2' },
    auditedImmutableReleases: [{ tag: 'v1.0.0-rc.1' }, { tag: 'v1.0.0-rc.2' }],
  };
}

function policyBlock(policy) {
  return [
    '<!-- release-version-policy:start -->',
    '',
    `- authority: \`${policy.authority}\``,
    `- current release version: \`${policy.canonicalVersion}\``,
    `- tag prefix: \`${policy.tagPrefix}\``,
    `- prerelease channels: \`${policy.prereleaseChannels.join(', ')}\``,
    `- generated project scope: \`${policy.generatedProjectScope}\``,
    '',
    '<!-- release-version-policy:end -->',
  ].join('\n');
}

// The four distinctions the ledger must state in prose next to the block.
const LEDGER_PROSE = [
  'Current upstream repository release version, npm/Maven application',
  "versions'ından ayrıdır; generated project'in kendi release version'ı",
  'değildir; historical audited provenance registry de değildir.',
].join('\n');

function buildFixture(mutate) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'ac26-fixture-'));
  const manifest = {
    mode: 'skeleton-dev',
    upstreamReleaseProvenance: baselineProvenance(),
    upstreamReleaseVersionPolicy: baselinePolicy(),
  };
  // The ledger is rendered AFTER the manifest mutation so that a policy change
  // does not leak a stale DOC_BLOCK_MISMATCH into unrelated scenarios (that
  // would mask FE-1). Doc-targeting scenarios set docs.patch instead.
  const docs = { patch: null };
  mutate?.(manifest, docs);
  let ledger;
  try {
    ledger = `# Ledger\n\n${policyBlock(manifest.upstreamReleaseVersionPolicy)}\n\n${LEDGER_PROSE}\n`;
  } catch {
    ledger = `# Ledger\n\n${LEDGER_PROSE}\n`;
  }
  if (docs.patch) ledger = docs.patch(ledger);

  mkdirSync(path.join(dir, 'scripts'), { recursive: true });
  mkdirSync(path.join(dir, 'docs', 'releases'), { recursive: true });
  mkdirSync(path.join(dir, 'apps', 'web'), { recursive: true });
  mkdirSync(path.join(dir, 'apps', 'admin'), { recursive: true });
  mkdirSync(path.join(dir, 'apps', 'api'), { recursive: true });
  mkdirSync(path.join(dir, 'packages', 'api-types'), { recursive: true });
  mkdirSync(path.join(dir, 'packages', 'design-tokens'), { recursive: true });

  writeFileSync(path.join(dir, 'scripts', 'structure-manifest.json'), JSON.stringify(manifest, null, 2));
  writeFileSync(path.join(dir, 'docs', 'releases', 'README.md'), ledger);
  const pkg = (name) => JSON.stringify({ name, version: '0.1.0', private: true }, null, 2);
  writeFileSync(path.join(dir, 'package.json'), pkg('site-skeleton'));
  writeFileSync(path.join(dir, 'apps', 'web', 'package.json'), pkg('web'));
  writeFileSync(path.join(dir, 'apps', 'admin', 'package.json'), pkg('admin'));
  writeFileSync(path.join(dir, 'packages', 'api-types', 'package.json'), pkg('@skeleton/api-types'));
  writeFileSync(path.join(dir, 'packages', 'design-tokens', 'package.json'), pkg('@skeleton/design-tokens'));
  writeFileSync(
    path.join(dir, 'apps', 'api', 'pom.xml'),
    ['<project>', '  <parent>', '    <artifactId>spring-boot-starter-parent</artifactId>',
      '    <version>4.1.0</version>', '  </parent>', '  <artifactId>api</artifactId>',
      '  <version>0.1.0-SNAPSHOT</version>', '  <dependencies>', '    <dependency>',
      '      <artifactId>x</artifactId>', '      <version>9.9.9</version>', '    </dependency>',
      '  </dependencies>', '</project>'].join('\n'),
  );
  return dir;
}

function withFixture(mutate, fn) {
  const dir = buildFixture(mutate);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function staticCase(name, mutate, expectedCode) {
  withFixture(mutate, (dir) => {
    const result = assertReleaseVersionContract(dir);
    const got = codes(result);
    ok(got.includes(expectedCode), name, `beklenen ${expectedCode}, ölçülen [${got.join(', ')}]`);
  });
}

// --- 1. static contract -------------------------------------------------------
withFixture(null, (dir) => {
  const result = assertReleaseVersionContract(dir);
  ok(result.failures.length === 0, 'değişmemiş fixture PASS üretir (pozitif kontrol)',
    `ölçülen [${codes(result).join(', ')}]`);
  ok(result.checks > 0, 'static contract en az bir check sayar', `checks=${result.checks}`);
});

staticCase('policy yoksa POLICY_MISSING', (m) => { delete m.upstreamReleaseVersionPolicy; }, 'POLICY_MISSING');
staticCase('beklenmeyen policy anahtarı POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.packageManifestAuthority = 'none'; }, 'POLICY_SCHEMA');
staticCase('eksik policy anahtarı POLICY_SCHEMA üretir',
  (m) => { delete m.upstreamReleaseVersionPolicy.generatedProjectScope; }, 'POLICY_SCHEMA');
staticCase('authority manifest değilse POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.authority = 'tag'; }, 'POLICY_SCHEMA');

for (const [label, bad] of [
  ['1.0', '1.0'], ['1.0.0.0', '1.0.0.0'], ['v1.0.0', 'v1.0.0'],
  ['1.0.0-rc.1', '1.0.0-rc.1'], ['01.0.0', '01.0.0'], ['', ''],
]) {
  staticCase(`canonicalVersion ${JSON.stringify(label)} CANONICAL_VERSION_MALFORMED üretir`,
    (m) => { m.upstreamReleaseVersionPolicy.canonicalVersion = bad; }, 'CANONICAL_VERSION_MALFORMED');
}

staticCase('boş tagPrefix POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.tagPrefix = ''; }, 'POLICY_SCHEMA');
staticCase('rakam içeren tagPrefix POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.tagPrefix = 'v2'; }, 'POLICY_SCHEMA');
staticCase('boş prereleaseChannels POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.prereleaseChannels = []; }, 'POLICY_SCHEMA');
staticCase('yinelenen prereleaseChannels POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.prereleaseChannels = ['rc', 'rc']; }, 'POLICY_SCHEMA');
staticCase('geçersiz kanal token POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.prereleaseChannels = ['RC']; }, 'POLICY_SCHEMA');
staticCase('generatedProjectScope sürüklenirse POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.generatedProjectScope = 'project'; }, 'POLICY_SCHEMA');

staticCase('leading-zero historical kanal numarası reddedilir',
  (m) => { m.upstreamReleaseProvenance.auditedImmutableReleases[0].tag = 'v1.0.0-rc.01'; },
  'CHANNEL_NUMBER_MALFORMED');
staticCase('grammar dışı historical tag reddedilir',
  (m) => { m.upstreamReleaseProvenance.auditedImmutableReleases[0].tag = 'v1.0'; }, 'TAG_MALFORMED');
staticCase('bozuk auditedCandidateTag reddedilir',
  (m) => { m.upstreamReleaseProvenance.auditedState.auditedCandidateTag = '1.0.0-rc.2'; }, 'TAG_PREFIX');

staticCase('doc blok değer sürüklenmesi DOC_BLOCK_MISMATCH üretir',
  (m, d) => { d.patch = (x) => x.replace('`1.0.0`', '`2.0.0`'); }, 'DOC_BLOCK_MISMATCH');
staticCase('doc blok satır sırası sürüklenmesi DOC_BLOCK_MISMATCH üretir',
  (m, d) => {
    d.patch = (x) => x.replace(
      '- authority: `manifest`\n- current release version: `1.0.0`',
      '- current release version: `1.0.0`\n- authority: `manifest`',
    );
  }, 'DOC_BLOCK_MISMATCH');
staticCase('doc blok whitespace sürüklenmesi DOC_BLOCK_MISMATCH üretir',
  (m, d) => { d.patch = (x) => x.replace('- tag prefix: `v`', '-  tag prefix: `v`'); }, 'DOC_BLOCK_MISMATCH');
staticCase('doc blok yoksa DOC_BLOCK_MISMATCH üretir',
  (m, d) => { d.patch = () => '# Ledger\n\nblok yok\n'; }, 'DOC_BLOCK_MISMATCH');
staticCase('ledger ayrım prozası silinirse DOC_BLOCK_MISMATCH üretir',
  (m, d) => { d.patch = (x) => x.replace(LEDGER_PROSE, 'ayrım yok'); }, 'DOC_BLOCK_MISMATCH');

staticCase('non-authoritative kaynak yolu yoksa SOURCE_PATH_MISSING üretir',
  (m) => { m.upstreamReleaseVersionPolicy.nonAuthoritativeVersionSources.push('apps/ghost/package.json'); },
  'SOURCE_PATH_MISSING');
staticCase('boş nonAuthoritativeVersionSources POLICY_SCHEMA üretir',
  (m) => { m.upstreamReleaseVersionPolicy.nonAuthoritativeVersionSources = []; }, 'POLICY_SCHEMA');

// FE-1: the binding amendment's permanent regression oracle.
withFixture((m) => { m.upstreamReleaseVersionPolicy.canonicalVersion = '1.1.0'; }, (dir) => {
  const result = assertReleaseVersionContract(dir);
  const got = codes(result);
  ok(result.failures.length === 0,
    'FE-1: canonicalVersion 1.1.0 iken historical 1.0.0 tag\'leri static contract\'ı KIRMAZ',
    `ölçülen [${got.join(', ')}]`);
});

// --- 2. release-time ----------------------------------------------------------
function proposed(tag, policyMutate) {
  const policy = baselinePolicy();
  policyMutate?.(policy);
  return validateProposedReleaseTag(tag, policy, baselineProvenance());
}

ok(proposed('v1.0.0-rc.3').ok, 'proposed v1.0.0-rc.3 PASS (pozitif kontrol)',
  `[${codes(proposed('v1.0.0-rc.3')).join(', ')}]`);
ok(proposed('v1.0.0').ok, 'proposed stable v1.0.0 PASS (pozitif kontrol)',
  `[${codes(proposed('v1.0.0')).join(', ')}]`);

for (const [name, tag, code] of [
  ['core mismatch', 'v1.1.0-rc.1', 'CORE_MISMATCH'],
  ['eksik prefix', '1.0.0-rc.3', 'TAG_PREFIX'],
  ['bilinmeyen kanal', 'v1.0.0-beta.1', 'CHANNEL_UNKNOWN'],
  ['büyük harf kanal', 'v1.0.0-RC.1', 'CHANNEL_UNKNOWN'],
  ['bozuk kanal numarası', 'v1.0.0-rc.x', 'CHANNEL_NUMBER_MALFORMED'],
  ['leading-zero kanal numarası', 'v1.0.0-rc.02', 'CHANNEL_NUMBER_MALFORMED'],
  ['build metadata', 'v1.0.0+build.5', 'TAG_MALFORMED'],
  ['baştaki boşluk', ' v1.0.0-rc.3', 'TAG_MALFORMED'],
  ['sondaki newline', 'v1.0.0-rc.3\n', 'TAG_MALFORMED'],
  ['leading-zero core', 'v01.0.0', 'TAG_MALFORMED'],
  ['zaten audited tag', 'v1.0.0-rc.2', 'TAG_ALREADY_AUDITED'],
  ['boş tag', '', 'TAG_MISSING'],
]) {
  const got = codes(proposed(tag));
  ok(got.includes(code), `proposed ${name} → ${code}`, `ölçülen [${got.join(', ')}]`);
}

// FE-2 / FE-3: the current line moves, the historical line stops validating.
const fe2 = codes(proposed('v1.1.0-rc.1', (p) => { p.canonicalVersion = '1.1.0'; }));
ok(fe2.length === 0, 'FE-2: canonicalVersion 1.1.0 · proposed v1.1.0-rc.1 → PASS', `[${fe2.join(', ')}]`);
const fe3 = codes(proposed('v1.0.0-rc.3', (p) => { p.canonicalVersion = '1.1.0'; }));
ok(fe3.includes('CORE_MISMATCH'), 'FE-3: canonicalVersion 1.1.0 · proposed v1.0.0-rc.3 → CORE_MISMATCH',
  `[${fe3.join(', ')}]`);

// historical validation must never emit the release-time-only duplicate code
const hist = codes(validateHistoricalTag('v1.0.0-rc.2', baselinePolicy()));
ok(!hist.includes('TAG_ALREADY_AUDITED'),
  'historical doğrulama TAG_ALREADY_AUDITED üretmez', `[${hist.join(', ')}]`);
ok(!hist.includes('CORE_MISMATCH'),
  'historical doğrulama CORE_MISMATCH üretmez', `[${hist.join(', ')}]`);

// grammar-only parser
ok(parseReleaseTag('v1.0.0-rc.7', baselinePolicy())?.channelNumber === 7,
  'parseReleaseTag kanal numarasını çözer');
ok(parseReleaseTag('v1.0.0', baselinePolicy())?.channel === null,
  'parseReleaseTag stable tag\'de kanal taşımaz');
ok(parseReleaseTag('v1.0.0-rc.1-extra', baselinePolicy()) === null,
  'parseReleaseTag fazladan segmenti reddeder');

// --- 3. CLI -------------------------------------------------------------------
function cli(args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: ROOT, encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// The policy-dependent CLI cases need the real manifest to carry the policy.
// It is introduced in the commit that wires the contract in; until then these
// are reported as SKIPPED rather than silently dropped, and they activate
// automatically once the key exists. They are never weakened.
const realManifest = JSON.parse(
  readFileSync(path.join(ROOT, 'scripts', 'structure-manifest.json'), 'utf8'),
);
const policyLive = realManifest.upstreamReleaseVersionPolicy !== undefined;
let skipped = 0;

if (policyLive) {
  const cliOk = cli(['--tag', 'v1.0.0-rc.3']);
  ok(cliOk.status === 0, 'CLI --tag v1.0.0-rc.3 → exit 0', `exit=${cliOk.status} ${cliOk.out.trim()}`);

  const cliAudited = cli(['--tag', 'v1.0.0-rc.2']);
  ok(cliAudited.status === 1 && cliAudited.out.includes('TAG_ALREADY_AUDITED'),
    'CLI zaten audited tag → exit 1 + TAG_ALREADY_AUDITED', `exit=${cliAudited.status}`);

  const cliMismatch = cli(['--tag', 'v1.1.0-rc.1']);
  ok(cliMismatch.status === 1 && cliMismatch.out.includes('CORE_MISMATCH'),
    'CLI core mismatch → exit 1 + CORE_MISMATCH', `exit=${cliMismatch.status}`);
} else {
  skipped = 3;
  console.log('[release-version-negative] SKIP — 3 CLI senaryosu: manifest henüz '
    + 'upstreamReleaseVersionPolicy taşımıyor (wiring commit\'inde etkinleşir)');
}

const cliNoArg = cli([]);
ok(cliNoArg.status === 2 && cliNoArg.out.includes('TAG_MISSING'),
  'CLI argümansız → exit 2 + TAG_MISSING', `exit=${cliNoArg.status}`);

const cliUnknown = cli(['--wat', 'x']);
ok(cliUnknown.status === 2, 'CLI bilinmeyen argüman → exit 2', `exit=${cliUnknown.status}`);

// --- report -------------------------------------------------------------------
const total = pass + failures.length;
if (failures.length > 0) {
  console.log(`\n[release-version-negative] FAIL — ${failures.length}/${total} senaryo başarısız:`);
  for (const f of failures) console.log(`  x ${f}`);
  process.exit(1);
}
console.log(`\n[release-version-negative] PASS — ${total} senaryo (pozitif kontroller dahil)`);
