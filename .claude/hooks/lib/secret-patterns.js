'use strict';
/**
 * Single source of truth for secret-looking token patterns (Faz 8.1, audit #24).
 * Consumers: pre-write-secret-scan (deny on file writes) and
 * pre-bash-redirect-guard (ask on shell redirects into sensitive files).
 * These hooks are the FIRST line of defence only — the authoritative scan is
 * Gitleaks in CI (full git history, .gitleaks.toml).
 */

const SECRET_PATTERNS = [
  { label: 'API anahtarı (sk-...)', re: /\bsk-[A-Za-z0-9_-]{8,}/ },
  { label: 'Stripe live key (sk_live_...)', re: /\bsk_live_[A-Za-z0-9]{8,}/ },
  { label: 'GitHub token (ghp_...)', re: /\bghp_[A-Za-z0-9]{16,}/ },
  { label: 'GitHub fine-grained PAT (github_pat_...)', re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { label: 'GitHub OAuth token (gho_...)', re: /\bgho_[A-Za-z0-9]{16,}/ },
  { label: 'GitLab PAT (glpat-...)', re: /\bglpat-[A-Za-z0-9_-]{16,}/ },
  { label: 'Slack token (xox[baprs]-...)', re: /\bxox[baprs]-[A-Za-z0-9-]{8,}/ },
  { label: 'AWS access key (AKIA/ASIA...)', re: /\b(?:AKIA|ASIA)[0-9A-Z]{8,}/ },
  { label: 'npm token (npm_...)', re: /\bnpm_[A-Za-z0-9]{16,}/ },
  {
    label: 'imzalı JWT (eyJ… üç nokta-ayrımlı segment)',
    re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  },
  {
    label: 'bağlantı dizisinde parola (postgres URL user:parola@)',
    re: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@/i,
  },
  { label: 'password literali', re: /password\s*=\s*['"]?[^\s'"<]{4,}/i },
  { label: 'private key bloğu', re: /BEGIN [A-Z ]*PRIVATE KEY/ },
];

/**
 * A MATCH is ignored when the matched credential itself is clearly a
 * placeholder. Scope matters: this is deliberately NOT applied to the whole
 * line (Faz 8.3 PR-D remediation).
 */
const PLACEHOLDER = /placeholder|change[_-]?me|your[_-]|<[^>]*>|xxxx|dummy|example/i;

/**
 * Single detection routine for every consumer (pre-write-secret-scan,
 * pre-bash-redirect-guard). Returns the labels of non-placeholder secret
 * patterns found in `text`; never returns the matched values themselves, so a
 * caller cannot accidentally echo a secret back into the transcript.
 *
 * Match-scoped exemption (the fix): the placeholder test runs against the
 * MATCHED credential, not the surrounding line. The previous line-scoped test
 * meant that any line mentioning "example"/"dummy" was skipped entirely — so
 * `echo ghp_<real> > docs/example.txt`, a write into `.env.example`, or a
 * trailing `// example` comment silently disarmed the whole scan.
 *
 * Every occurrence is examined, not just the first: a line may carry a
 * placeholder AND a real value for the same pattern. A fresh global clone is
 * built per pattern so no `lastIndex` state is shared between calls.
 */
function secretLabelsInText(text) {
  const hits = new Set();
  if (typeof text !== 'string' || text === '') return [];
  for (const line of text.split(/\r?\n/)) {
    for (const { label, re } of SECRET_PATTERNS) {
      if (hits.has(label)) continue;
      const scanner = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
      for (const match of line.matchAll(scanner)) {
        if (PLACEHOLDER.test(match[0])) continue;
        hits.add(label);
        break;
      }
    }
  }
  return [...hits];
}

module.exports = { SECRET_PATTERNS, PLACEHOLDER, secretLabelsInText };
