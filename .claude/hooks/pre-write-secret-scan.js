'use strict';
/**
 * PreToolUse (Write|Edit): deny writes that contain secret-looking material.
 *
 * Pattern set lives in lib/secret-patterns.js (single source, Faz 8.1 audit
 * #24 expansion: GitHub fine-grained/OAuth, GitLab, Slack, Stripe live, AWS
 * STS, npm, signed JWT, connection-string password). A matching line is
 * ignored when it is clearly a placeholder (PLACEHOLDER, CHANGE_ME,
 * <angle-bracket>, ...) — this is what keeps .env.example legal.
 * Own test fixtures (.claude/hooks/tests/fixtures/) are exempt: they must
 * contain fake secrets to exercise this hook.
 */
const { readStdinJson, safeRun, preToolDecision, writeTexts, normPath } = require('./lib/common');
const { SECRET_PATTERNS, PLACEHOLDER } = require('./lib/secret-patterns');

safeRun('pre-write-secret-scan', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const filePath = normPath(input.tool_input && input.tool_input.file_path);
  if (filePath.includes('.claude/hooks/tests/fixtures/')) return;

  const hits = new Set();
  for (const text of writeTexts(input.tool_input)) {
    for (const line of text.split('\n')) {
      if (PLACEHOLDER.test(line)) continue;
      for (const { label, re } of SECRET_PATTERNS) {
        if (re.test(line)) hits.add(label);
      }
    }
  }

  if (hits.size > 0) {
    preToolDecision(
      'deny',
      `Secret deseni tespit edildi: ${[...hits].join(', ')}. ` +
        'Secret hiçbir dosyaya yazılmaz (.env.example placeholder hariç). ' +
        'Ortam değişkeni veya secret manager kullan; gerçek bir değer açığa çıktıysa derhal rotate et.'
    );
  }
});
