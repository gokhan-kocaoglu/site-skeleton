'use strict';
/**
 * Fail-safe core for all hooks in this repo.
 *
 * Invariants (see .claude/rules/common/hooks.md):
 *  - An internal hook error must NEVER block the agent: safeRun() catches
 *    everything, writes a note to stderr and exits 0 (fail open).
 *  - Garbage / missing stdin resolves to null instead of throwing.
 *  - Node stdlib only. No dependencies.
 */

/** Read the hook payload from stdin. Returns parsed JSON or null. */
function readStdinJson(timeoutMs = 5000) {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = (value) => {
      if (!done) {
        done = true;
        resolve(value);
      }
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      try {
        finish(JSON.parse(data));
      } catch {
        finish(null);
      }
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      finish(null);
    });
  });
}

/** Run a hook body; any uncaught error fails OPEN (exit 0 + stderr note). */
function safeRun(hookName, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => process.exit(0))
    .catch((err) => {
      const msg = err && err.message ? err.message : String(err);
      process.stderr.write(`[${hookName}] internal error, failing open: ${msg}\n`);
      process.exit(0);
    });
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

/** PreToolUse decision: 'allow' | 'deny' | 'ask'. */
function preToolDecision(decision, reason) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  });
}

/** PreToolUse context note without touching the permission flow. */
function preToolContext(context) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: context,
    },
  });
}

/** PostToolUse warning / context note. */
function postToolContext(context) {
  emit({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: context,
    },
  });
}

/** Stop hook: refuse session close with a reason. */
function stopBlock(reason) {
  emit({ decision: 'block', reason });
}

/** Collect every text payload a Write/Edit tool call may carry. */
function writeTexts(toolInput) {
  const texts = [];
  if (!toolInput || typeof toolInput !== 'object') return texts;
  if (typeof toolInput.content === 'string') texts.push(toolInput.content);
  if (typeof toolInput.new_string === 'string') texts.push(toolInput.new_string);
  if (Array.isArray(toolInput.edits)) {
    for (const e of toolInput.edits) {
      if (e && typeof e.new_string === 'string') texts.push(e.new_string);
    }
  }
  return texts;
}

/** Normalize a file path to forward slashes for matching. */
function normPath(p) {
  return typeof p === 'string' ? p.replace(/\\/g, '/') : '';
}

module.exports = {
  readStdinJson,
  safeRun,
  emit,
  preToolDecision,
  preToolContext,
  postToolContext,
  stopBlock,
  writeTexts,
  normPath,
};
