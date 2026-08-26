// AC-26 / F4-LOW-02: release version source-of-truth contract (ADR-0020).
//
// The manifest is authoritative: scripts/structure-manifest.json ->
// upstreamReleaseVersionPolicy declares the current release line, the tag
// grammar and which version fields are deliberately NOT release authority.
//
// Three authority classes are kept apart on purpose (ADR-0020 section 2):
//   historical provenance  grammar only - a historical tag is NOT bound to the
//                          current canonicalVersion, otherwise moving the
//                          release line would retroactively invalidate correct
//                          immutable history.
//   current release line   canonicalVersion, validated as a bare core version.
//   proposed release       release-time only: core must equal canonicalVersion.
//
// The grammar is a narrow, anchored subset of SemVer, documented as such; it
// is not full SemVer and adds no dependency (ADR-0020 section 3).
//
// Direct run is the release-time validator invoked by the canonical procedure
// in docs/operations/release-attestation.md before a tag is created:
//   node scripts/quality/assert-release-version-contract.mjs --tag v1.0.0-rc.3
// Exit codes: 0 valid | 1 contract mismatch | 2 invocation error.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const POLICY_KEY = 'upstreamReleaseVersionPolicy';
const POLICY_FIELDS = [
  'authority',
  'canonicalVersion',
  'tagPrefix',
  'prereleaseChannels',
  'nonAuthoritativeVersionSources',
  'generatedProjectScope',
];

const NUM = '(?:0|[1-9][0-9]*)';
const CORE_RE = new RegExp(`^${NUM}\\.${NUM}\\.${NUM}$`);
const PREFIX_RE = /^[A-Za-z][A-Za-z-]*$/;
const CHANNEL_RE = /^[a-z][a-z0-9]*$/;
const BLOCK_START = '<!-- release-version-policy:start -->';
const BLOCK_END = '<!-- release-version-policy:end -->';
const LEDGER_REL = 'docs/releases/README.md';

// Executable governance contract: exact (order-free) set of non-authoritative
// version fields, so a narrowed manifest list cannot shrink the covered surface.
const EXPECTED_NON_AUTHORITATIVE_SOURCES = [
  'package.json',
  'apps/web/package.json',
  'apps/admin/package.json',
  'packages/api-types/package.json',
  'packages/design-tokens/package.json',
  'apps/api/pom.xml',
];

// Prose next to the machine-compared block must state the three distinctions.
const LEDGER_REQUIRED_PHRASES = [
  'npm/Maven application',
  "generated project'in kendi release version'ı",
  'historical audited provenance registry',
];

function fail(code, detail) {
  return { code, detail };
}

function sameKeySet(value, expected) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === [...expected].sort().join('|')
  );
}

/** Grammar only. Returns null for anything the narrow grammar rejects. */
export function parseReleaseTag(tag, policy) {
  if (typeof tag !== 'string' || tag.length === 0) return null;
  const prefix = policy?.tagPrefix;
  if (typeof prefix !== 'string' || prefix.length === 0) return null;
  if (!tag.startsWith(prefix)) return null;
  const rest = tag.slice(prefix.length);

  const dash = rest.indexOf('-');
  const core = dash === -1 ? rest : rest.slice(0, dash);
  if (!CORE_RE.test(core)) return null;
  const [major, minor, patch] = core.split('.').map(Number);
  if (dash === -1) {
    return { core, major, minor, patch, channel: null, channelNumber: null };
  }

  const suffix = rest.slice(dash + 1);
  const dot = suffix.indexOf('.');
  if (dot === -1) return null;
  const channel = suffix.slice(0, dot);
  const number = suffix.slice(dot + 1);
  if (!CHANNEL_RE.test(channel)) return null;
  if (!new RegExp(`^${NUM}$`).test(number)) return null;
  return { core, major, minor, patch, channel, channelNumber: Number(number) };
}

// Distinguishes "unparseable" into the reason codes the contract publishes.
function grammarFailures(tag, policy) {
  if (typeof tag !== 'string' || tag.length === 0) return [fail('TAG_MISSING', 'tag boş')];
  if (/\s/.test(tag)) return [fail('TAG_MALFORMED', `tag whitespace taşıyor: ${JSON.stringify(tag)}`)];
  const prefix = typeof policy?.tagPrefix === 'string' ? policy.tagPrefix : '';
  if (prefix.length > 0 && !tag.startsWith(prefix)) {
    return [fail('TAG_PREFIX', `tag ${JSON.stringify(tag)} "${prefix}" ile başlamıyor`)];
  }
  const parsed = parseReleaseTag(tag, policy);
  if (parsed) return [];

  const rest = tag.slice(prefix.length);
  const dash = rest.indexOf('-');
  if (dash !== -1) {
    const suffix = rest.slice(dash + 1);
    const dot = suffix.indexOf('.');
    if (dot !== -1) {
      const channel = suffix.slice(0, dot);
      const number = suffix.slice(dot + 1);
      const channels = Array.isArray(policy?.prereleaseChannels) ? policy.prereleaseChannels : [];
      if (CHANNEL_RE.test(channel) && !new RegExp(`^${NUM}$`).test(number)) {
        return [fail('CHANNEL_NUMBER_MALFORMED', `kanal numarası geçersiz: ${JSON.stringify(number)}`)];
      }
      if (!CHANNEL_RE.test(channel) && !channels.includes(channel)) {
        return [fail('CHANNEL_UNKNOWN', `bilinmeyen kanal: ${JSON.stringify(channel)}`)];
      }
    }
  }
  return [fail('TAG_MALFORMED', `tag grammar dışı: ${JSON.stringify(tag)}`)];
}

function channelFailures(parsed, policy) {
  if (!parsed?.channel) return [];
  const channels = Array.isArray(policy?.prereleaseChannels) ? policy.prereleaseChannels : [];
  return channels.includes(parsed.channel)
    ? []
    : [fail('CHANNEL_UNKNOWN', `bilinmeyen kanal: ${JSON.stringify(parsed.channel)}`)];
}

/**
 * Historical provenance tag: grammar + channel only. Deliberately does NOT
 * compare against canonicalVersion and never reports TAG_ALREADY_AUDITED -
 * a historical tag being present in the registry is its normal state.
 */
export function validateHistoricalTag(tag, policy) {
  const failures = grammarFailures(tag, policy);
  if (failures.length > 0) return { ok: false, failures };
  const channel = channelFailures(parseReleaseTag(tag, policy), policy);
  return { ok: channel.length === 0, failures: channel };
}

/** Release-time: grammar + channel + core equality + already-audited rejection. */
export function validateProposedReleaseTag(tag, policy, provenance) {
  const failures = grammarFailures(tag, policy);
  if (failures.length > 0) return { ok: false, failures };
  const parsed = parseReleaseTag(tag, policy);
  failures.push(...channelFailures(parsed, policy));

  if (parsed.core !== policy?.canonicalVersion) {
    failures.push(
      fail('CORE_MISMATCH', `tag core ${parsed.core} != canonicalVersion ${policy?.canonicalVersion}`),
    );
  }

  const known = new Set();
  const state = provenance?.auditedState ?? {};
  if (typeof state.auditedCandidateTag === 'string') known.add(state.auditedCandidateTag);
  for (const rel of provenance?.auditedImmutableReleases ?? []) {
    if (typeof rel?.tag === 'string') known.add(rel.tag);
  }
  if (known.has(tag)) {
    failures.push(fail('TAG_ALREADY_AUDITED', `${tag} audited release registry'sinde zaten var`));
  }
  return { ok: failures.length === 0, failures };
}

function policySchemaFailures(policy) {
  const out = [];
  if (!sameKeySet(policy, POLICY_FIELDS)) {
    out.push(fail('POLICY_SCHEMA', `exact anahtar kümesi dışı — izinli: [${[...POLICY_FIELDS].sort().join(', ')}]`));
    return out;
  }
  if (policy.authority !== 'manifest') {
    out.push(fail('POLICY_SCHEMA', `authority "manifest" olmalı, ölçülen ${JSON.stringify(policy.authority)}`));
  }
  if (typeof policy.canonicalVersion !== 'string' || !CORE_RE.test(policy.canonicalVersion)) {
    out.push(fail('CANONICAL_VERSION_MALFORMED',
      `canonicalVersion yalın core olmalı (v prefix / prerelease / leading zero yok), ölçülen ${JSON.stringify(policy.canonicalVersion)}`));
  }
  if (typeof policy.tagPrefix !== 'string' || !PREFIX_RE.test(policy.tagPrefix)) {
    out.push(fail('POLICY_SCHEMA', `tagPrefix geçersiz: ${JSON.stringify(policy.tagPrefix)}`));
  }
  const channels = policy.prereleaseChannels;
  const channelsValid =
    Array.isArray(channels) &&
    channels.length > 0 &&
    channels.every((c) => typeof c === 'string' && CHANNEL_RE.test(c)) &&
    new Set(channels).size === channels.length;
  if (!channelsValid) {
    out.push(fail('POLICY_SCHEMA', `prereleaseChannels geçersiz: ${JSON.stringify(channels)}`));
  }
  const sources = policy.nonAuthoritativeVersionSources;
  if (!Array.isArray(sources) || !sources.every((s) => typeof s === 'string' && s.length > 0)) {
    out.push(fail('POLICY_SCHEMA', 'nonAuthoritativeVersionSources boş olmayan yol dizisi olmalı'));
  } else {
    const seen = new Set(sources);
    const missing = EXPECTED_NON_AUTHORITATIVE_SOURCES.filter((s) => !seen.has(s));
    const extra = sources.filter((s) => !EXPECTED_NON_AUTHORITATIVE_SOURCES.includes(s));
    if (seen.size !== sources.length || missing.length > 0 || extra.length > 0) {
      out.push(fail('POLICY_SCHEMA', 'nonAuthoritativeVersionSources exact küme dışı — eksik: '
        + `[${missing.join(', ')}] · fazla: [${extra.join(', ')}] · yinelenen: ${sources.length - seen.size}`));
    }
  }
  if (policy.generatedProjectScope !== 'upstream-only') {
    out.push(fail('POLICY_SCHEMA',
      `generatedProjectScope "upstream-only" olmalı, ölçülen ${JSON.stringify(policy.generatedProjectScope)}`));
  }
  return out;
}

/** Maven project version, ignoring parent/dependency/plugin versions. */
function mavenProjectVersion(xml) {
  const trimmed = xml
    .replace(/<parent>[\s\S]*?<\/parent>/g, '')
    .replace(/<dependencyManagement>[\s\S]*?<\/dependencyManagement>/g, '')
    .replace(/<dependencies>[\s\S]*?<\/dependencies>/g, '')
    .replace(/<build>[\s\S]*?<\/build>/g, '')
    .replace(/<profiles>[\s\S]*?<\/profiles>/g, '');
  const m = /<version>([^<]+)<\/version>/.exec(trimmed);
  return m ? m[1].trim() : null;
}

function sourceFailures(root, sources) {
  const out = [];
  for (const rel of sources ?? []) {
    const abs = path.join(root, rel);
    if (!existsSync(abs)) {
      out.push(fail('SOURCE_PATH_MISSING', `${rel} bulunamadı`));
      continue;
    }
    const text = readFileSync(abs, 'utf8');
    if (rel.endsWith('.json')) {
      let version;
      try {
        version = JSON.parse(text).version;
      } catch {
        out.push(fail('SOURCE_PATH_MISSING', `${rel} geçerli JSON değil`));
        continue;
      }
      if (typeof version !== 'string' || version.length === 0) {
        out.push(fail('SOURCE_PATH_MISSING', `${rel} top-level version alanı taşımıyor`));
      }
    } else if (rel.endsWith('.xml')) {
      const version = mavenProjectVersion(text);
      if (!version) out.push(fail('SOURCE_PATH_MISSING', `${rel} project version taşımıyor`));
    }
  }
  return out;
}

/** The exact bounded block the ledger must carry, rebuilt from the policy. */
export function expectedPolicyBlock(policy) {
  return [
    BLOCK_START,
    '',
    `- authority: \`${policy.authority}\``,
    `- current release version: \`${policy.canonicalVersion}\``,
    `- tag prefix: \`${policy.tagPrefix}\``,
    `- prerelease channels: \`${policy.prereleaseChannels.join(', ')}\``,
    `- generated project scope: \`${policy.generatedProjectScope}\``,
    '',
    BLOCK_END,
  ].join('\n');
}

function extractBlock(text) {
  const start = text.indexOf(BLOCK_START);
  const end = text.indexOf(BLOCK_END);
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + BLOCK_END.length);
}

function ledgerFailures(root, policy) {
  const abs = path.join(root, LEDGER_REL);
  if (!existsSync(abs)) {
    return [fail('DOC_BLOCK_MISMATCH', `${LEDGER_REL} bulunamadı`)];
  }
  const text = readFileSync(abs, 'utf8').replace(/\r\n/g, '\n');
  const block = extractBlock(text);
  if (block === null) {
    return [fail('DOC_BLOCK_MISMATCH', `${LEDGER_REL}: release-version-policy bloğu yok`)];
  }
  const out = [];
  // Block equality, not line parsing: bullet-marker, order, indentation and
  // whitespace drift are all mismatches by definition (immune to F4-MEDIUM-04).
  if (block !== expectedPolicyBlock(policy)) {
    out.push(fail('DOC_BLOCK_MISMATCH', `${LEDGER_REL}: blok manifest politikasıyla birebir eşleşmiyor`));
  }
  const outside = text.replace(block, '');
  for (const phrase of LEDGER_REQUIRED_PHRASES) {
    if (!outside.includes(phrase)) {
      out.push(fail('DOC_BLOCK_MISMATCH', `${LEDGER_REL}: zorunlu ayrım ifadesi eksik — ${phrase}`));
    }
  }
  return out;
}

/**
 * Static branch-time contract. Runs without any tag context, so every gate and
 * every CI job exercises it. Returns the verify-structure collector shape.
 */
export function assertReleaseVersionContract(root) {
  const failures = [];
  let checks = 0;
  const add = (list) => {
    checks++;
    failures.push(...list);
  };

  const manifestPath = path.join(root, 'scripts', 'structure-manifest.json');
  if (!existsSync(manifestPath)) {
    return { checks: 1, failures: [fail('POLICY_MISSING', 'scripts/structure-manifest.json bulunamadı')] };
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    return { checks: 1, failures: [fail('POLICY_MISSING', `manifest okunamadı: ${e.message}`)] };
  }

  const policy = manifest[POLICY_KEY];
  checks++;
  if (policy === undefined || policy === null) {
    failures.push(fail('POLICY_MISSING', `manifest ${POLICY_KEY} anahtarını taşımıyor`));
    return { checks, failures };
  }

  const schema = policySchemaFailures(policy);
  add(schema);
  if (schema.length > 0) return { checks, failures };

  add(sourceFailures(root, policy.nonAuthoritativeVersionSources));
  add(ledgerFailures(root, policy));

  // Historical provenance: grammar only, never core equality (ADR-0020 s.2).
  const provenance = manifest.upstreamReleaseProvenance ?? {};
  const historical = [];
  const candidate = provenance?.auditedState?.auditedCandidateTag;
  if (typeof candidate === 'string') historical.push(candidate);
  for (const rel of provenance?.auditedImmutableReleases ?? []) {
    if (typeof rel?.tag === 'string') historical.push(rel.tag);
  }
  for (const tag of historical) {
    add(validateHistoricalTag(tag, policy).failures);
  }

  return { checks, failures };
}

// --- release-time CLI ---------------------------------------------------------
const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const argv = process.argv.slice(2);
  let tag = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tag') {
      tag = argv[i + 1] ?? null;
      i++;
    } else {
      console.error(`INVOCATION\tbilinmeyen argüman: ${argv[i]}`);
      console.error('kullanım: node scripts/quality/assert-release-version-contract.mjs --tag <TAG>');
      process.exit(2);
    }
  }
  if (tag === null) {
    console.error('TAG_MISSING\t--tag <TAG> zorunludur');
    console.error('kullanım: node scripts/quality/assert-release-version-contract.mjs --tag <TAG>');
    process.exit(2);
  }

  const manifest = JSON.parse(readFileSync(path.join(root, 'scripts', 'structure-manifest.json'), 'utf8'));
  const policy = manifest[POLICY_KEY];
  const schema = policy ? policySchemaFailures(policy) : [fail('POLICY_MISSING', `manifest ${POLICY_KEY} taşımıyor`)];
  if (schema.length > 0) {
    for (const f of schema) console.error(`${f.code}\t${f.detail}`);
    process.exit(1);
  }

  const result = validateProposedReleaseTag(tag, policy, manifest.upstreamReleaseProvenance ?? {});
  if (!result.ok) {
    for (const f of result.failures) console.error(`${f.code}\t${f.detail}`);
    process.exit(1);
  }
  console.log(`PASS: ${tag} release version contract'ına uygun (canonicalVersion ${policy.canonicalVersion})`);
  process.exit(0);
}
