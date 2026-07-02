'use strict';
/**
 * PreToolUse (TaskCreate): validate Task-Card risk-analysis fields.
 *
 * NOTE — event/tool name may vary between Claude Code versions (the brief
 * says "TaskCreated"); this repo binds it as a PreToolUse matcher on the
 * TaskCreate tool. If task tools are renamed, rebind in .claude/settings.json.
 *
 * Contract (vault 00_System/Task-Card-template.md): a task card carries
 * 4 mandatory risk fields — contract-impact, race-condition, auth-boundary,
 * rollback-plani. "N/A — <gerekçe>" is a valid value; bare "N/A" is not.
 *
 * Decisions:
 *  - all 4 complete            -> silent allow
 *  - some present, some broken -> ask (a task card was attempted, incomplete)
 *  - none present              -> additionalContext reminder only (micro-todos
 *                                 are legal; formal cards come from the PM DAG)
 */
const { readStdinJson, safeRun, preToolDecision, preToolContext } = require('./lib/common');

const FIELDS = [
  { key: 'contract-impact', re: /contract-impact\s*[:=]\s*(.*)/i },
  { key: 'race-condition', re: /race-condition\s*[:=]\s*(.*)/i },
  { key: 'auth-boundary', re: /auth-boundary\s*[:=]\s*(.*)/i },
  { key: 'rollback-plani', re: /rollback-plan[ıi]\s*[:=]\s*(.*)/i },
];

function fieldStatus(text, { re }) {
  const m = text.match(re);
  if (!m) return 'missing';
  const value = (m[1] || '').trim();
  if (value.length === 0) return 'empty';
  if (/^N\/?A\b/i.test(value) && !/^N\/?A\s*[—–-]+\s*\S+/i.test(value)) {
    return 'na-without-reason'; // "N/A" alone: gerekçe zorunlu
  }
  return 'ok';
}

safeRun('task-card-validator', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const ti = input.tool_input || {};
  const text = [ti.subject, ti.description, ti.content]
    .filter((s) => typeof s === 'string')
    .join('\n');

  const statuses = FIELDS.map((f) => ({ key: f.key, status: fieldStatus(text, f) }));
  const present = statuses.filter((s) => s.status !== 'missing');
  const broken = statuses.filter((s) => s.status !== 'ok');

  if (present.length === 0) {
    preToolContext(
      '[task-card-validator] Bu görevde risk analizi alanları yok. Formal bir task card ise ' +
        'vault 00_System/Task-Card-template.md şablonunu kullan: contract-impact, race-condition, ' +
        'auth-boundary, rollback-plani ("N/A — <gerekçe>" kabul edilir).'
    );
    return;
  }

  if (broken.length > 0) {
    const detail = broken
      .map((s) => `${s.key} (${s.status === 'na-without-reason' ? 'N/A gerekçesiz' : s.status})`)
      .join(', ');
    preToolDecision(
      'ask',
      `Task card eksik/bozuk risk alanları içeriyor: ${detail}. ` +
        'Dört alan da doldurulmalı; geçerli değilse "N/A — <gerekçe>" yaz ' +
        '(şablon: vault 00_System/Task-Card-template.md).'
    );
  }
});
