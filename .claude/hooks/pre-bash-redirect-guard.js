'use strict';
/**
 * PreToolUse (Bash|PowerShell): ask before shell commands that redirect
 * token-looking material into sensitive files (Faz 8.1, audit #24).
 *
 * Deliberately a SEPARATE lightweight hook, not an extra pattern inside
 * pre-bash-git-guard (single-purpose hooks). Heuristic, first line of
 * defence: full shell coverage via a hook is impossible — the authoritative
 * scan is Gitleaks in CI. Decision is only ever 'ask', never 'deny'.
 *
 * Trigger = ALL THREE of:
 *   1. a write construct: `>` / `>>` redirect, or a PowerShell/Unix file
 *      writer (Out-File, Set-Content, Add-Content, Tee-Object, tee)
 *   2. a sensitive target mentioned in the command (.env*, .pem, .key, .p12,
 *      .pfx, .npmrc, .pgpass, credentials*, config file, settings.local.json)
 *   3. a known token pattern in the command text (lib/secret-patterns.js)
 */
const { readStdinJson, safeRun, preToolDecision } = require('./lib/common');
const { SECRET_PATTERNS } = require('./lib/secret-patterns');

const WRITER = />>?|\b(?:Out-File|Set-Content|Add-Content|Tee-Object|tee)\b/i;

const SENSITIVE_TARGET =
  /(?:^|[\s"'=/\\])[\w./\\~-]*(?:\.env(?:\.[\w-]+)?|\.pem|\.key|\.p12|\.pfx|\.npmrc|\.pgpass|\.conf|credentials[\w.-]*|config\.(?:json|ya?ml|toml|ini)|settings\.local\.json)(?:$|[\s"'|;&])/i;

safeRun('pre-bash-redirect-guard', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const command =
    input.tool_input && typeof input.tool_input.command === 'string'
      ? input.tool_input.command
      : '';
  if (!command) return;

  if (!WRITER.test(command)) return;
  if (!SENSITIVE_TARGET.test(command)) return;

  const hits = SECRET_PATTERNS.filter(({ re }) => re.test(command)).map(({ label }) => label);
  if (hits.length > 0) {
    preToolDecision(
      'ask',
      `Shell komutu hassas bir dosyaya token benzeri içerik yazıyor (${hits.join(', ')}). ` +
        'Secret hiçbir dosyaya yazılmaz; ortam değişkeni veya secret manager kullan. ' +
        'Bilinçli bir istisna ise kullanıcı onayıyla devam et.'
    );
  }
});
