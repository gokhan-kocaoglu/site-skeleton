'use strict';
/**
 * TaskCreated: validate Task-Card risk-analysis fields.
 *
 * Binding (official docs — code.claude.com/docs/en/hooks, Faz 8.1 remediation):
 *  - TaskCreated is a TOP-LEVEL hook event; it supports NO matcher.
 *  - Blocking task creation = message on stderr + exit code 2 (the creation is
 *    rolled back, stderr is shown to Claude). `permissionDecision` is
 *    PreToolUse-only and INVALID here.
 *  - The documented example payload carries tool_name:"TaskCreate" and
 *    tool_input:{title, description, status}.
 *
 * Schema tolerance (diagnosis-first): payloads have three known shapes —
 *   "top-level" : task_subject / task_description       (remediation brief)
 *   "official"  : tool_input.title / .description       (documented example)
 *   "legacy"    : tool_input.subject / .description     (pre-8.1 binding)
 * The matched shape is ALWAYS logged to stderr as "schema=<name>" so a future
 * payload change is diagnosed in seconds. Historical note: the pre-8.1
 * PreToolUse+TaskCreate matcher binding did fire empirically (2026-07-03) but
 * is undocumented; TaskCreated is the official path.
 *
 * Contract (vault 00_System/Task-Card-template.md): a task card carries
 * 4 mandatory risk fields — contract-impact, race-condition, auth-boundary,
 * rollback-plani. "N/A — <gerekçe>" is a valid value; bare "N/A" is not.
 *
 * Decisions:
 *  - all 4 complete            -> silent allow (exit 0)
 *  - some present, some broken -> BLOCK: stderr detail + exit 2
 *  - none present              -> non-blocking systemMessage reminder only
 *                                 (micro-todos are legal; formal cards come
 *                                 from the PM DAG)
 */
const { readStdinJson, safeRun, emit } = require('./lib/common');

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

function joinText(...parts) {
  return parts.filter((s) => typeof s === 'string').join('\n');
}

/** Detect payload shape and extract the card text. Returns { schema, text }. */
function extractCard(input) {
  if (typeof input.task_subject === 'string' || typeof input.task_description === 'string') {
    return { schema: 'top-level', text: joinText(input.task_subject, input.task_description) };
  }
  const ti = input.tool_input && typeof input.tool_input === 'object' ? input.tool_input : {};
  if (typeof ti.title === 'string') {
    return { schema: 'official', text: joinText(ti.title, ti.description, ti.content) };
  }
  if (typeof ti.subject === 'string') {
    return { schema: 'legacy', text: joinText(ti.subject, ti.description, ti.content) };
  }
  if (typeof ti.description === 'string' || typeof ti.content === 'string') {
    return { schema: 'official', text: joinText(ti.description, ti.content) };
  }
  return { schema: 'none', text: '' };
}

safeRun('task-card-validator', async () => {
  const input = await readStdinJson();
  if (!input || typeof input !== 'object') return;

  const { schema, text } = extractCard(input);
  if (schema === 'none') return; // nothing recognizable to validate: fail open
  process.stderr.write(`[task-card-validator] schema=${schema}\n`);

  const statuses = FIELDS.map((f) => ({ key: f.key, status: fieldStatus(text, f) }));
  const present = statuses.filter((s) => s.status !== 'missing');
  const broken = statuses.filter((s) => s.status !== 'ok');

  if (present.length === 0) {
    emit({
      systemMessage:
        '[task-card-validator] Bu görevde risk analizi alanları yok. Formal bir task card ise ' +
        'vault 00_System/Task-Card-template.md şablonunu kullan: contract-impact, race-condition, ' +
        'auth-boundary, rollback-plani ("N/A — <gerekçe>" kabul edilir).',
    });
    return;
  }

  if (broken.length > 0) {
    const detail = broken
      .map((s) => `${s.key} (${s.status === 'na-without-reason' ? 'N/A gerekçesiz' : s.status})`)
      .join(', ');
    process.stderr.write(
      `[task-card-validator] Task card eksik/bozuk risk alanları içeriyor: ${detail}. ` +
        'Dört alan da doldurulmalı; geçerli değilse "N/A — <gerekçe>" yaz ' +
        '(şablon: vault 00_System/Task-Card-template.md).\n'
    );
    process.exit(2); // official TaskCreated block: creation is rolled back
  }
});
