'use strict';
/**
 * PreToolUse (Bash|PowerShell): ask before destructive git operations.
 *
 * Guarded forms (skeleton-brief §8 / rules/common/git-workflow.md):
 * push --force / -f, reset --hard, checkout . , clean -f.
 * Everything else passes silently. Overlaps with settings.json
 * permissions.ask on purpose (defence in depth).
 */
const { readStdinJson, safeRun, preToolDecision } = require('./lib/common');

const DANGEROUS = [
  { label: 'git push --force', re: /\bpush\b[^|;&\n]*\s(--force(-with-lease)?|-f)\b/ },
  { label: 'git reset --hard', re: /\breset\b[^|;&\n]*--hard\b/ },
  { label: 'git checkout . (toplu geri alma)', re: /\bcheckout\b\s+(--\s+)?\.(\s|$)/ },
  { label: 'git clean -f', re: /\bclean\b[^|;&\n]*\s-[a-zA-Z]*f/ },
];

safeRun('pre-bash-git-guard', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const command = input.tool_input && typeof input.tool_input.command === 'string'
    ? input.tool_input.command
    : '';
  if (!/\bgit\b/.test(command)) return;

  const hits = DANGEROUS.filter(({ re }) => re.test(command)).map(({ label }) => label);
  if (hits.length > 0) {
    preToolDecision(
      'ask',
      `Tehlikeli git işlemi: ${hits.join(', ')}. ` +
        'Bu komut geri alınamaz kayba yol açabilir; gerekçesiz çalıştırma, kullanıcı onayı gerekli.'
    );
  }
});
