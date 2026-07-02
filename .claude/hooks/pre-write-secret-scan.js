'use strict';
/**
 * PreToolUse (Write|Edit): deny writes that contain secret-looking material.
 *
 * Pattern classes (skeleton-brief §5): sk-, ghp_, AKIA, password=, BEGIN PRIVATE KEY.
 * A matching line is ignored when it is clearly a placeholder (PLACEHOLDER,
 * CHANGE_ME, <angle-bracket>, ...) — this is what keeps .env.example legal.
 * Own test fixtures (.claude/hooks/tests/fixtures/) are exempt: they must
 * contain fake secrets to exercise this hook.
 */
const { readStdinJson, safeRun, preToolDecision, writeTexts, normPath } = require('./lib/common');

const PATTERNS = [
  { label: 'API anahtarı (sk-...)', re: /\bsk-[A-Za-z0-9_-]{8,}/ },
  { label: 'GitHub token (ghp_...)', re: /\bghp_[A-Za-z0-9]{16,}/ },
  { label: 'AWS access key (AKIA...)', re: /\bAKIA[0-9A-Z]{8,}/ },
  { label: 'password= literali', re: /password\s*=\s*['"]?[^\s'"<]{4,}/i },
  { label: 'private key bloğu', re: /BEGIN [A-Z ]*PRIVATE KEY/ },
];

const PLACEHOLDER = /placeholder|change[_-]?me|your[_-]|<[^>]*>|xxxx|dummy|example/i;

safeRun('pre-write-secret-scan', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const filePath = normPath(input.tool_input && input.tool_input.file_path);
  if (filePath.includes('.claude/hooks/tests/fixtures/')) return;

  const hits = new Set();
  for (const text of writeTexts(input.tool_input)) {
    for (const line of text.split('\n')) {
      if (PLACEHOLDER.test(line)) continue;
      for (const { label, re } of PATTERNS) {
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
