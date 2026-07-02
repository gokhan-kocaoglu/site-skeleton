'use strict';
/**
 * PreToolUse (Grep | Bash/PowerShell running grep/rg): graph-first reminder.
 *
 * If a graphify export exists (graphify-out/graph.json or GRAPH_REPORT.md),
 * remind the agent to try `graphify query` before raw text search.
 * Context note only — never touches the permission flow, always exits 0.
 */
const fs = require('node:fs');
const path = require('node:path');
const { readStdinJson, safeRun, preToolContext } = require('./lib/common');

const ROOT = path.resolve(__dirname, '..', '..');

safeRun('graph-first-reminder', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const toolName = input.tool_name || '';
  if (toolName !== 'Grep') {
    const command = input.tool_input && typeof input.tool_input.command === 'string'
      ? input.tool_input.command
      : '';
    if (!/(^|[\s|;&])(grep|rg)\b/.test(command)) return;
  }

  const cwd = input.cwd
    ? path.isAbsolute(input.cwd) ? input.cwd : path.resolve(ROOT, input.cwd)
    : ROOT;
  const hasGraph =
    fs.existsSync(path.join(cwd, 'graphify-out', 'graph.json')) ||
    fs.existsSync(path.join(cwd, 'GRAPH_REPORT.md'));
  if (!hasGraph) return;

  preToolContext(
    '[graph-first-reminder] Bu repoda graphify çıktısı var. Kod tabanı sorusu için önce ' +
      '`graphify query "<soru>"` dene (token-ucuz, yapı-farkında); ham grep taraması ikinci tercih. ' +
      'Ayrıntı: .claude/skills/graphify.'
  );
});
