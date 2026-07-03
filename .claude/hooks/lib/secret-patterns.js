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

/** A matching line is ignored when it is clearly a placeholder. */
const PLACEHOLDER = /placeholder|change[_-]?me|your[_-]|<[^>]*>|xxxx|dummy|example/i;

module.exports = { SECRET_PATTERNS, PLACEHOLDER };
