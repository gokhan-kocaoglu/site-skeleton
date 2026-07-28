#!/usr/bin/env node
'use strict';
/**
 * Self-test harness for .claude/hooks — Node stdlib only, no framework.
 *
 * Each fixture in tests/fixtures/*.json runs its hook as a child process:
 *   { "hook": "<file in .claude/hooks>", "name": "...",
 *     "args": [], "stdin": {...} | "stdinRaw": "garbage",
 *     "cwd": "<relative to repo root>", "env": { ... },
 *     "expect": { "exitCode": 0, "noStdout": true,
 *                 "permissionDecision": "deny|ask", "reasonIncludes": "...",
 *                 "additionalContextIncludes": "...",
 *                 "stopDecision": "block", "stopReasonIncludes": "...",
 *                 "stdoutIncludes": "...", "stderrIncludes": "..." } }
 *
 * The literal "<ROOT>" inside env values is replaced with the absolute repo
 * root at runtime, so fixtures can set CLAUDE_PROJECT_DIR portably. Fixtures
 * with a "cwd" outside the repo root simulate Claude Code invoking hooks from
 * a subdirectory (Faz 8.1 / audit #7).
 *
 * Also asserts settings.json bindings: every hook command uses the
 * node "$CLAUDE_PROJECT_DIR/.claude/hooks/<x>.js" form, the file exists on
 * disk, all repo hooks are bound, task-card-validator is bound under the
 * top-level TaskCreated event (matcher-less) and NOT under PreToolUse.
 * Exit 0 = all assertions pass, exit 1 otherwise.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { runGitContextTests } = require('./session-close-git-context');

const TESTS_DIR = __dirname;
const HOOKS_DIR = path.resolve(TESTS_DIR, '..');
const ROOT = path.resolve(HOOKS_DIR, '..', '..');
const FIXTURES_DIR = path.join(TESTS_DIR, 'fixtures');

let assertions = 0;
const failures = [];

function assert(cond, label) {
  assertions++;
  if (!cond) failures.push(label);
}

function runFixture(fixture, fileName) {
  const hookPath = path.join(HOOKS_DIR, fixture.hook);
  if (!fs.existsSync(hookPath)) {
    assert(false, `${fileName}: hook not found: ${fixture.hook}`);
    return;
  }
  const stdin =
    typeof fixture.stdinRaw === 'string'
      ? fixture.stdinRaw
      : fixture.stdin !== undefined
        ? JSON.stringify(fixture.stdin)
        : '';
  const cwd = fixture.cwd ? path.resolve(ROOT, fixture.cwd) : ROOT;
  const fixtureEnv = {};
  for (const [k, v] of Object.entries(fixture.env || {})) {
    fixtureEnv[k] = typeof v === 'string' ? v.replace(/<ROOT>/g, ROOT) : v;
  }
  const result = spawnSync('node', [hookPath, ...(fixture.args || [])], {
    input: stdin,
    cwd,
    env: { ...process.env, ...fixtureEnv },
    encoding: 'utf8',
    timeout: 15000,
  });

  const id = `${fileName} (${fixture.name || fixture.hook})`;
  const exp = fixture.expect || {};
  const stdout = result.stdout || '';

  assert(
    result.status === (exp.exitCode ?? 0),
    `${id}: exit ${result.status}, expected ${exp.exitCode ?? 0} [stderr: ${(result.stderr || '').trim()}]`
  );

  if (exp.noStdout) {
    assert(stdout.trim() === '', `${id}: expected no stdout, got: ${stdout.trim().slice(0, 120)}`);
  }
  if (exp.stdoutIncludes) {
    assert(stdout.includes(exp.stdoutIncludes), `${id}: stdout missing "${exp.stdoutIncludes}"`);
  }
  if (exp.stderrIncludes) {
    assert(
      (result.stderr || '').includes(exp.stderrIncludes),
      `${id}: stderr missing "${exp.stderrIncludes}" [stderr: ${(result.stderr || '').trim().slice(0, 120)}]`
    );
  }

  const needsJson =
    exp.permissionDecision || exp.reasonIncludes || exp.additionalContextIncludes ||
    exp.stopDecision || exp.stopReasonIncludes;
  if (needsJson) {
    let out = null;
    try {
      out = JSON.parse(stdout);
    } catch {
      assert(false, `${id}: stdout is not JSON: ${stdout.trim().slice(0, 120)}`);
      return;
    }
    const hso = out.hookSpecificOutput || {};
    if (exp.permissionDecision) {
      assert(
        hso.permissionDecision === exp.permissionDecision,
        `${id}: permissionDecision=${hso.permissionDecision}, expected ${exp.permissionDecision}`
      );
    }
    if (exp.reasonIncludes) {
      assert(
        (hso.permissionDecisionReason || '').includes(exp.reasonIncludes),
        `${id}: reason missing "${exp.reasonIncludes}"`
      );
    }
    if (exp.additionalContextIncludes) {
      assert(
        (hso.additionalContext || '').includes(exp.additionalContextIncludes),
        `${id}: additionalContext missing "${exp.additionalContextIncludes}"`
      );
    }
    if (exp.stopDecision) {
      assert(out.decision === exp.stopDecision, `${id}: decision=${out.decision}, expected ${exp.stopDecision}`);
    }
    if (exp.stopReasonIncludes) {
      assert((out.reason || '').includes(exp.stopReasonIncludes), `${id}: stop reason missing "${exp.stopReasonIncludes}"`);
    }
  }
}

// 1. Fixture-driven hook tests
const fixtureFiles = fs
  .readdirSync(FIXTURES_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort();
for (const file of fixtureFiles) {
  let fixture;
  try {
    fixture = JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8'));
  } catch (e) {
    assert(false, `${file}: fixture is not valid JSON (${e.message})`);
    continue;
  }
  runFixture(fixture, file);
}

// 2. settings.json binding checks
const SETTINGS_PATH = path.join(ROOT, '.claude', 'settings.json');
const EXPECTED_HOOKS = [
  'pre-write-secret-scan.js',
  'pre-bash-git-guard.js',
  'pre-bash-redirect-guard.js',
  'post-edit-style-guard.js',
  'memory-writer-guard.js',
  'task-card-validator.js',
  'session-close-validator.js',
  'graph-first-reminder.js',
];

let settings = null;
try {
  settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  assert(true, 'settings.json parses');
} catch (e) {
  assert(false, `settings.json unreadable/invalid: ${e.message}`);
}

if (settings) {
  const commands = [];
  for (const eventRules of Object.values(settings.hooks || {})) {
    for (const rule of eventRules) {
      for (const h of rule.hooks || []) {
        if (h.type === 'command' && typeof h.command === 'string') commands.push(h.command);
      }
    }
  }
  // Faz 8.1 (audit #7): every command must use the CWD-safe quoted form
  //   node "$CLAUDE_PROJECT_DIR/<repo-relative>.js"
  for (const cmd of commands) {
    const m = cmd.match(/^node "\$CLAUDE_PROJECT_DIR\/(.+\.js)"$/);
    assert(!!m, `hook command is not node "$CLAUDE_PROJECT_DIR/<file>.js": ${cmd}`);
    if (m) assert(fs.existsSync(path.join(ROOT, m[1])), `bound hook file missing: ${m[1]}`);
  }
  for (const hook of EXPECTED_HOOKS) {
    assert(
      commands.some((c) => c.includes(hook)),
      `hook not bound in settings.json: ${hook}`
    );
  }

  // Faz 8.1 (audit #2): task-card-validator lives under the top-level
  // TaskCreated event (matcher-less, per official docs) — not PreToolUse.
  const taskCreated = settings.hooks && settings.hooks.TaskCreated;
  assert(Array.isArray(taskCreated) && taskCreated.length > 0, 'TaskCreated event not bound in settings.json');
  if (Array.isArray(taskCreated)) {
    for (const rule of taskCreated) {
      assert(rule.matcher === undefined, `TaskCreated rule must not carry a matcher (unsupported): ${rule.matcher}`);
    }
    assert(
      taskCreated.some((rule) => (rule.hooks || []).some((h) => (h.command || '').includes('task-card-validator.js'))),
      'task-card-validator.js not bound under TaskCreated'
    );
  }
  const preToolUse = (settings.hooks && settings.hooks.PreToolUse) || [];
  assert(
    !preToolUse.some((rule) => (rule.hooks || []).some((h) => (h.command || '').includes('task-card-validator.js'))),
    'task-card-validator.js must no longer be bound under PreToolUse (legacy TaskCreate matcher)'
  );
}

// 3. Real-git closure scenarios (Faz 8.3 PR-D): branch, dirty-path and
// ancestry semantics cannot be expressed as static JSON, so they run against
// throwaway repositories under the OS temp dir (see session-close-git-context.js).
runGitContextTests(assert);

// Report
if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} of ${assertions} assertions failed:`);
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}
console.log(
  `PASS — ${assertions} assertions OK (${fixtureFiles.length} fixtures + settings bindings` +
    ' + git closure-context scenarios)'
);
