'use strict';
/**
 * PreToolUse (Write|Edit on project-memory/**): single-writer guard.
 *
 * project-memory/ has exactly one writer: the memory-steward agent.
 * The hook payload usually cannot prove which agent is writing, so the
 * fail-safe fallback is ASK (never a silent deny) — the human decides.
 * If the payload or CLAUDE_AGENT_TYPE proves memory-steward, allow silently.
 */
const { readStdinJson, safeRun, preToolDecision, normPath } = require('./lib/common');

safeRun('memory-writer-guard', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const filePath = normPath(input.tool_input && input.tool_input.file_path);
  if (!filePath.includes('project-memory/')) return;

  const agent =
    input.agent_name ||
    input.agent_type ||
    input.subagent_type ||
    process.env.CLAUDE_AGENT_TYPE ||
    '';
  if (String(agent).toLowerCase() === 'memory-steward') return;

  preToolDecision(
    'ask',
    'project-memory/ tek yazarlıdır: yalnız memory-steward ajanı yazar ' +
      '(diğer roller HANDOFF bırakır — bkz. .claude/skills/memory-protocol). ' +
      'Yazarın memory-steward olduğu kanıtlanamadı; bilinçliyse onaylayın.'
  );
});
