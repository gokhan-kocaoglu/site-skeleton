'use strict';
/**
 * Real-git scenarios for the post-merge closure guard (Faz 8.3 PR-D, P0-4).
 *
 * The JSON fixture harness can only feed text to a hook; branch, dirty-path and
 * `git merge-base --is-ancestor` semantics need an actual repository. Each
 * scenario therefore builds a throwaway git repo under the OS temp dir, runs the
 * validator against it via CLAUDE_PROJECT_DIR, and removes the repo in a
 * `finally` — nothing is left behind and the skeleton's own worktree is never
 * touched.
 *
 * Consumed by tests/run-tests.js so the counts land in one harness report.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const VALIDATOR = path.join(__dirname, '..', 'session-close-validator.js');
const PROJECT = 'DemoProje';
const VAULT = ['project-memory', 'ClaudeTeamMemory', '01_Projects', PROJECT];
const CLOSURE_BRANCH = 'chore/memory-close-2026-07-27-demo';

const STATUS_BODY = (implLine, closureLine) => `# Current Status — ${PROJECT}

## Aşama

Faz 2 — kupon modülü PR'ı merge edildi.

## Son Tamamlanan Görev

Kupon endpointi merge edildi; post-merge main CI yeşil.

## Aktif Görev

Yok.

## Blocker

Yok.

## Sonraki 3 Adım

1. Sipariş iptali task card'ı.
2. QA gate.
3. Kapsam raporu.

## Son Uygulama Commiti

${implLine}

## Memory Closure Commiti

${closureLine}
`;

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.error) throw r.error;
  return r;
}

function writeFile(root, rel, content) {
  const abs = path.join(root, ...rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  return abs;
}

function writeStatus(root, implLine, closureLine = 'f0e9d8c chore(memory): close session 2026-07-27') {
  return writeFile(root, [...VAULT, 'Current Status.md'], STATUS_BODY(implLine, closureLine));
}

/** Repo with a real feature merge on main; returns { root, mergeSha, straySha }. */
function buildMergedRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-guard-'));
  git(root, ['init', '--quiet']);
  git(root, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Closure Guard Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);

  writeFile(root, ['README.md'], '# demo\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '--quiet', '-m', 'chore: baseline']);

  git(root, ['checkout', '--quiet', '-b', 'feat/coupons']);
  writeFile(root, ['feature.txt'], 'coupon endpoint\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '--quiet', '-m', 'feat: coupon endpoint']);

  git(root, ['checkout', '--quiet', 'main']);
  git(root, ['merge', '--quiet', '--no-ff', '-m', 'Merge pull request #41', 'feat/coupons']);
  const mergeSha = git(root, ['rev-parse', 'HEAD']).stdout.trim();

  // A commit that never reached main: the "feature branch head" mistake.
  git(root, ['checkout', '--quiet', '-b', 'feat/unmerged']);
  writeFile(root, ['stray.txt'], 'never merged\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '--quiet', '-m', 'feat: unmerged work']);
  const straySha = git(root, ['rev-parse', 'HEAD']).stdout.trim();
  git(root, ['checkout', '--quiet', 'main']);

  return { root, mergeSha, straySha };
}

function runValidator(root, extraArgs = []) {
  return spawnSync(process.execPath, [VALIDATOR, '--project', PROJECT, '--closure', ...extraArgs], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    input: '',
  });
}

function rmRepo(root) {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

/** Runs every scenario; `assert(cond, label)` is supplied by the harness. */
function runGitContextTests(assert) {
  // 1. Recorded merge SHA is an ancestor of HEAD on a proper closure branch.
  //    The status file is left uncommitted on purpose: project-memory/** is the
  //    one dirty path a closure may carry.
  {
    const { root, mergeSha } = buildMergedRepo();
    try {
      git(root, ['checkout', '--quiet', '-b', CLOSURE_BRANCH]);
      writeStatus(root, `\`${mergeSha} Merge pull request #41\` (PR #41 · CI run 30262787137)`);
      const r = runValidator(root);
      assert(
        r.status === 0,
        `git-context: post-merge closure should PASS, got exit ${r.status} [${(r.stdout || '').trim()}]`
      );
    } finally {
      rmRepo(root);
    }
  }

  // 2. A commit that never landed on main is not an ancestor of HEAD.
  {
    const { root, straySha } = buildMergedRepo();
    try {
      git(root, ['checkout', '--quiet', '-b', CLOSURE_BRANCH]);
      writeStatus(root, `\`${straySha} feat: unmerged work\``);
      const r = runValidator(root);
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      assert(r.status === 1, `git-context: non-ancestor hash must BLOCK, got exit ${r.status}`);
      assert(out.includes("atası değil"), 'git-context: non-ancestor message missing');
    } finally {
      rmRepo(root);
    }
  }

  // 3. Closure attempted straight from the feature branch.
  {
    const { root, mergeSha } = buildMergedRepo();
    try {
      git(root, ['checkout', '--quiet', 'feat/coupons']);
      writeStatus(root, `\`${mergeSha} Merge pull request #41\``);
      const r = runValidator(root);
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      assert(r.status === 1, `git-context: closure on a feature branch must BLOCK, got ${r.status}`);
      assert(out.includes('yanlış dalda'), 'git-context: wrong-branch message missing');
    } finally {
      rmRepo(root);
    }
  }

  // 4. A memory-only closure may not carry implementation changes.
  {
    const { root, mergeSha } = buildMergedRepo();
    try {
      git(root, ['checkout', '--quiet', '-b', CLOSURE_BRANCH]);
      writeStatus(root, `\`${mergeSha} Merge pull request #41\``);
      writeFile(root, ['docs', 'stray-implementation.md'], '# not memory\n');
      const r = runValidator(root);
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      assert(r.status === 1, `git-context: non-memory dirty path must BLOCK, got ${r.status}`);
      assert(out.includes('memory dışı değişiklik'), 'git-context: dirty-path message missing');
    } finally {
      rmRepo(root);
    }
  }

  // 5. Fail-safe: no usable git context -> warn, skip git layer, keep text checks.
  {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'closure-guard-nogit-'));
    try {
      writeStatus(root, '`b7c1d2e Merge pull request #41` (PR #41 · CI run 30262787137)');
      const r = runValidator(root);
      assert(r.status === 0, `git-context: missing git context must fail-safe PASS, got ${r.status}`);
      assert(
        (r.stderr || '').includes('git çalıştırılamadı'),
        'git-context: fail-safe warning missing'
      );
      assert((r.stdout || '').includes('PASS'), 'git-context: heading checks must still run');
    } finally {
      rmRepo(root);
    }
  }

  // 6. Sealed closure (real closure hash, clean worktree) still passes.
  {
    const { root, mergeSha } = buildMergedRepo();
    try {
      git(root, ['checkout', '--quiet', '-b', CLOSURE_BRANCH]);
      writeStatus(
        root,
        `\`${mergeSha} Merge pull request #41\``,
        'a9b8c7d chore(memory): seal session 2026-07-27 — closure hash a9b8c7d'
      );
      git(root, ['add', '-A']);
      git(root, ['commit', '--quiet', '-m', 'chore(memory): close session 2026-07-27']);
      const r = runValidator(root);
      assert(
        r.status === 0,
        `git-context: sealed closure should PASS, got exit ${r.status} [${(r.stdout || '').trim()}]`
      );
    } finally {
      rmRepo(root);
    }
  }
}

module.exports = { runGitContextTests };
