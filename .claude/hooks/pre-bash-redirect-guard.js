'use strict';
/**
 * PreToolUse (Bash|PowerShell): ask before shell commands that carry
 * token-looking material (Faz 8.1 audit #24; widened in Faz 8.3 PR-D / M5).
 *
 * Heuristic, first line of defence: full shell coverage via a hook is
 * impossible — the authoritative scan is Gitleaks over the full git history in
 * CI. Decision is only ever 'ask', never 'deny'.
 *
 * Two triggers, both target-INDEPENDENT since PR-D:
 *   1. Any known token pattern (lib/secret-patterns.js) anywhere in the command
 *      text. The old rule additionally required a redirect AND a sensitive
 *      target, so `echo sk_live_… > notes.txt` — a real leak into a tracked
 *      file — passed silently. A secret in a shell command is the problem; the
 *      destination only changes how bad it is.
 *   2. The narrower legacy case is reported with extra context: a write
 *      construct aimed at a sensitive file (.env*, .pem, .key, credentials*, …).
 *
 * A MATCHED credential that is itself a placeholder (PLACEHOLDER, CHANGE_ME,
 * <angle>, …) is ignored — this is what keeps `.env.example` work legal. The
 * exemption is match-scoped, NOT line-scoped (Faz 8.3 PR-D): the old rule
 * skipped any command mentioning "example"/"dummy", so writing a real token
 * into `docs/example.txt` or `.env.example` disarmed the scan via the target
 * filename alone. Detection is shared with pre-write-secret-scan through
 * lib/secret-patterns.js `secretLabelsInText()`.
 *
 * The message reports pattern LABELS only; the matched secret value is never
 * echoed back into the transcript.
 *
 * Scope limits (documented, not pretended away): aliases, base64/encoding,
 * dynamic eval, subshells and deliberate obfuscation are not covered.
 * Memory single-writer enforcement lives in pre-bash-memory-guard.js.
 */
const { readStdinJson, safeRun, preToolDecision } = require('./lib/common');
const { secretLabelsInText } = require('./lib/secret-patterns');

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

  const hits = secretLabelsInText(command);
  if (hits.length === 0) return;

  const sensitive = WRITER.test(command) && SENSITIVE_TARGET.test(command);
  preToolDecision(
    'ask',
    `Shell komutu token benzeri içerik taşıyor (${hits.join(', ')})` +
      (sensitive ? ' ve hassas bir dosyaya yazıyor' : '') +
      '. Secret hiçbir dosyaya yazılmaz; ortam değişkeni veya secret manager kullan. ' +
      'Bilinçli bir istisna ise kullanıcı onayıyla devam et.'
  );
});
