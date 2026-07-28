'use strict';
/**
 * PreToolUse (Bash|PowerShell): single-writer guard for project-memory/**.
 *
 * `memory-writer-guard` only sees Write/Edit tool calls. Faz 8.2 showed the
 * hole empirically: a shell redirect writes the same file and never touches
 * that hook, so the "only memory-steward writes memory" rule could be walked
 * around without anyone noticing (lessons: vault 07_Patterns).
 *
 * Trigger = a file-writing construct whose TARGET is under project-memory/.
 * Decision is only ever 'ask' — a human confirms; nothing is denied.
 *
 * Deliberate scope limits (honest, not a full shell parser):
 *  - aliases, base64/encoded payloads, `eval`, subshells and intentional
 *    obfuscation are NOT covered;
 *  - `Copy-Item -Destination <memory> -Path x` with the destination written
 *    before the source is matched via the explicit -Destination form only.
 * Reading memory is always allowed: `cat`, `git diff`, `Get-Content` have no
 * write construct, so they never reach a decision here.
 */
const { readStdinJson, safeRun, preToolDecision } = require('./lib/common');

const MEMORY_TARGET = /(?:^|[\s"'=/\\])project-memory[/\\]/i;

/** PowerShell / Unix writers whose file argument is the command's own path arg. */
const NAMED_WRITER = /\b(?:Out-File|Set-Content|Add-Content|Tee-Object|tee)\b/i;

/** Copy/move family: the destination is the LAST path token (or -Destination). */
const MOVER = /\b(?:cp|copy|Copy-Item|mv|move|Move-Item)\b/i;

/** Normalizes Windows separators so one pattern set covers both platforms. */
function norm(text) {
  return text.replace(/\\/g, '/');
}

/** Text after the last `>`/`>>` redirect operator (empty when there is none). */
function redirectTarget(command) {
  const idx = command.lastIndexOf('>');
  return idx === -1 ? '' : command.slice(idx + 1);
}

/** Last whitespace-separated token — the destination for cp/mv style commands. */
function lastToken(command) {
  const tokens = command.trim().split(/\s+/);
  return tokens.length ? tokens[tokens.length - 1].replace(/^['"]|['"]$/g, '') : '';
}

function writesIntoMemory(command) {
  const normalized = norm(command);
  if (MEMORY_TARGET.test(redirectTarget(normalized))) return true;
  if (NAMED_WRITER.test(normalized) && MEMORY_TARGET.test(normalized)) return true;
  if (MOVER.test(normalized)) {
    const destination = normalized.match(/-Destination\s+(['"]?[^\s'"]+)/i)?.[1] ?? lastToken(normalized);
    if (MEMORY_TARGET.test(`/${destination}`)) return true;
  }
  return false;
}

safeRun('pre-bash-memory-guard', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const command =
    input.tool_input && typeof input.tool_input.command === 'string'
      ? input.tool_input.command
      : '';
  if (!command || !writesIntoMemory(command)) return;

  preToolDecision(
    'ask',
    'Kabuk komutu project-memory/ altına yazıyor. project-memory tek-yazar ' +
      'alanıdır; fiziksel yazım memory-steward üzerinden yapılmalıdır ' +
      '(diğer roller HANDOFF bırakır — .claude/skills/memory-protocol). ' +
      'Bilinçli bir istisna ise kullanıcı onayıyla devam et.'
  );
});
