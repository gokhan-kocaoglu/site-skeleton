'use strict';
/**
 * PreToolUse (Write|Edit): deny writes that contain secret-looking material.
 *
 * Detection lives in lib/secret-patterns.js `secretLabelsInText()` (single
 * source, Faz 8.1 audit #24 expansion: GitHub fine-grained/OAuth, GitLab,
 * Slack, Stripe live, AWS STS, npm, signed JWT, connection-string password).
 *
 * The placeholder exemption is MATCH-scoped, not line-scoped (Faz 8.3 PR-D):
 * only a matched credential that is itself a placeholder (PLACEHOLDER,
 * CHANGE_ME, <angle-bracket>, ...) is ignored — which keeps .env.example legal
 * — while a real token sitting next to an "// example" comment is still denied.
 *
 * Own test fixtures (.claude/hooks/tests/fixtures/) are exempt: they must
 * contain fake secrets to exercise this hook. The exemption is scoped to that
 * path only and never applies to production files.
 */
const { readStdinJson, safeRun, preToolDecision, writeTexts, normPath } = require('./lib/common');
const { secretLabelsInText } = require('./lib/secret-patterns');

safeRun('pre-write-secret-scan', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const filePath = normPath(input.tool_input && input.tool_input.file_path);
  if (filePath.includes('.claude/hooks/tests/fixtures/')) return;

  const hits = secretLabelsInText(writeTexts(input.tool_input).join('\n'));

  if (hits.length > 0) {
    preToolDecision(
      'deny',
      `Secret deseni tespit edildi: ${hits.join(', ')}. ` +
        'Secret hiçbir dosyaya yazılmaz (.env.example placeholder hariç). ' +
        'Ortam değişkeni veya secret manager kullan; gerçek bir değer açığa çıktıysa derhal rotate et.'
    );
  }
});
