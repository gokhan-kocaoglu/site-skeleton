/**
 * Throwaway repository fixtures for the bootstrap certification tests
 * (Faz 8.3 PR-C). Node stdlib only.
 *
 * The fixture is a real git repository in the OS temp dir, built from the
 * SOURCE tree's git-visible files (tracked + untracked-not-ignored) so a
 * work-in-progress implementation is certified too. The source repository is
 * never written to — every test drives the copy.
 */
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

// Top-level only. `git ls-files --exclude-standard` already drops ignored
// output dirs, and a nested match would wrongly exclude the ONE committed
// graphify-out fixture that .gitignore re-includes on purpose.
const EXCLUDED_PREFIXES = [
  '.git/', 'node_modules/', 'refs/', '.next/', '.turbo/', 'dist/', 'target/',
  'coverage/', 'graphify-out/',
];
const isExcluded = (rel) =>
  EXCLUDED_PREFIXES.some((prefix) => rel === prefix.slice(0, -1) || rel.startsWith(prefix));
// Build output that only appears after install/build; never part of a hash proof.
const TRANSIENT_DIRS = new Set(['.git', 'node_modules', '.next', '.turbo', 'dist', 'target', 'coverage']);

/** Argument-array process runner — no shell by default, so a slug is never interpolated. */
export function run(cmd, args, { cwd, timeout = 180_000, env, shell = false } = {}) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    timeout,
    maxBuffer: 96 * 1024 * 1024,
    shell,
    env: env ? { ...process.env, ...env } : process.env,
  });
  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const spawnFailure = result.error ? `\n[spawn hatası] ${result.error.message}` : '';
  const output = `${stdout}${stderr}${spawnFailure}`;
  return {
    status: result.error ? -1 : result.status,
    stdout,
    stderr,
    output,
    error: result.error,
    tail(lines = 12) {
      return output.trim().split('\n').slice(-lines).join('\n');
    },
  };
}

/**
 * pnpm ships as a .cmd shim on Windows and Node >= 20.12 refuses to spawn
 * .cmd/.bat without a shell (CVE-2024-27980 hardening). Only fixed arguments
 * are passed through here — never the user-supplied slug, which always goes to
 * `process.execPath` with a plain argument array.
 */
export function pnpm(args, options = {}) {
  const isWindows = process.platform === 'win32';
  return run(isWindows ? 'pnpm.cmd' : 'pnpm', args, { ...options, shell: isWindows });
}

export const git = (cwd, args) => run('git', args, { cwd, timeout: 60_000 });

export function gitStatus(cwd) {
  return git(cwd, ['status', '--porcelain=v1', '--untracked-files=all']).stdout.trim();
}

/** sha256 of every non-ignored file — the rollback proof compares two of these. */
export function hashTree(root) {
  const hashes = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (entry.isDirectory() && TRANSIENT_DIRS.has(entry.name)) continue;
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) hashes.set(rel, createHash('sha256').update(readFileSync(abs)).digest('hex'));
    }
  };
  walk(root);
  return hashes;
}

export function diffHashTrees(before, after) {
  const problems = [];
  for (const [rel, hash] of before) {
    if (!after.has(rel)) problems.push(`kayboldu: ${rel}`);
    else if (after.get(rel) !== hash) problems.push(`içerik değişti: ${rel}`);
  }
  for (const rel of after.keys()) if (!before.has(rel)) problems.push(`yeni dosya: ${rel}`);
  return problems;
}

/**
 * Copies the source tree into a fresh temp git repo and commits a baseline.
 * Short temp base name keeps the deepest Java paths under the Windows limit.
 */
export function createRepoFixture() {
  const listing = run('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: SOURCE_ROOT,
    timeout: 60_000,
  });
  if (listing.status !== 0) throw new Error(`fixture: kaynak dosya listesi alınamadı — ${listing.tail()}`);
  const files = listing.stdout.split('\0').filter(Boolean).filter((rel) => !isExcluded(rel));
  if (files.length < 100) throw new Error(`fixture: beklenmedik şekilde az dosya (${files.length})`);

  const dir = mkdtempSync(path.join(os.tmpdir(), 'skl-'));
  for (const rel of files) {
    const target = path.join(dir, rel);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(path.join(SOURCE_ROOT, rel), target);
  }

  const init = [
    ['init', '--quiet', '-b', 'main'],
    ['config', 'user.name', 'Bootstrap E2E'],
    ['config', 'user.email', 'bootstrap-e2e@example.invalid'],
    ['config', 'core.autocrlf', 'false'],
    ['add', '-A'],
    ['commit', '--quiet', '-m', 'test fixture baseline'],
  ];
  for (const args of init) {
    const res = git(dir, args);
    if (res.status !== 0) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
      throw new Error(`fixture: git ${args[0]} başarısız — ${res.tail()}`);
    }
  }
  const dirty = gitStatus(dir);
  if (dirty) {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    throw new Error(`fixture: baseline temiz değil:\n${dirty}`);
  }
  return { dir, fileCount: files.length, cleanup: () => rmSync(dir, { recursive: true, force: true, maxRetries: 5 }) };
}
