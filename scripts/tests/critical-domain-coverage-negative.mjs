#!/usr/bin/env node
/**
 * Negative proof for the critical-domain coverage wire (Faz 8.3 PR-D / M9).
 *
 * CLAUDE.md requires 80% coverage in auth / payment / billing while the global
 * skeleton floor stays at 60%. In an empty skeleton those paths do not exist,
 * so the rule is dormant — and a dormant rule that was never proven to bite is
 * indistinguishable from no rule at all.
 *
 * Each scenario therefore plants ONE tiny, deliberately untested source file
 * under a critical path, runs that workspace's real test command and asserts:
 *   1. the command fails (nonzero exit), and
 *   2. the failure names the critical-domain 80% threshold — not the global
 *      60% floor. The planted file is kept small on purpose so the global
 *      number stays above 60 and the two rules cannot be confused.
 * The file is removed in `finally`, and a worktree snapshot proves the source
 * tree is byte-identical afterwards.
 *
 * Node stdlib only. Exit 0 = the wire bites in every workspace, exit 1 otherwise.
 */
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// One uncovered branch + one uncovered function: enough to drive the critical
// path to 0% without moving the global figure below the 60% floor.
const PROBE_SOURCE = `export function probeCriticalGuard(role: string): boolean {
  if (role === "admin") return true;
  return false;
}
`;

const SCENARIOS = [
  {
    workspace: 'web',
    probe: 'apps/web/lib/auth/__critical-domain-probe.ts',
    plantedRoot: 'apps/web/lib/auth',
    expectFragment: '**/lib/**/{auth,payment,billing}/**',
  },
  {
    workspace: 'admin',
    probe: 'apps/admin/src/auth/__critical-domain-probe.ts',
    plantedRoot: 'apps/admin/src/auth',
    expectFragment: '**/src/**/{auth,payment,billing}/**',
  },
];

function worktreeSnapshot() {
  const run = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  if (run.error || run.status !== 0) return null; // git missing -> fail-safe skip
  return run.stdout;
}

const snapshotBefore = worktreeSnapshot();
let failed = 0;

for (const scenario of SCENARIOS) {
  const probeAbs = path.join(ROOT, scenario.probe);
  const plantedAbs = path.join(ROOT, scenario.plantedRoot);
  const preexisting = existsSync(plantedAbs);
  try {
    mkdirSync(path.dirname(probeAbs), { recursive: true });
    writeFileSync(probeAbs, PROBE_SOURCE);

    const run = spawnSync('pnpm', ['--filter', scenario.workspace, 'test'], {
      cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32', maxBuffer: 64 * 1024 * 1024,
    });
    const out = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const bit = run.status !== 0;
    const named = out.includes(scenario.expectFragment) && out.includes('threshold (80%)');

    if (bit && named) {
      console.log(
        `[critical-domain-coverage] PASS — ${scenario.workspace}: ` +
          `${scenario.probe} kritik-domain %80 eşiğini kırdı (exit ${run.status})`
      );
    } else {
      failed++;
      console.error(
        `[critical-domain-coverage] FAIL — ${scenario.workspace}: exit=${run.status} ` +
          `(nonzero bekleniyordu), %80 kritik-domain mesajı ${named ? 'var' : 'YOK'}`
      );
      console.error(out.trim().split('\n').slice(-12).join('\n'));
    }
  } finally {
    rmSync(probeAbs, { force: true });
    // Only remove the directory this run created; never touch a real one.
    if (!preexisting) rmSync(plantedAbs, { recursive: true, force: true });
  }
}

const snapshotAfter = worktreeSnapshot();
if (snapshotBefore === null || snapshotAfter === null) {
  console.error('[critical-domain-coverage] ! worktree kontrolü atlandı (git yok/başarısız)');
} else if (snapshotBefore !== snapshotAfter) {
  failed++;
  console.error(
    '[critical-domain-coverage] FAIL — çalışma ağacı restore edilmedi:\n' +
      `  önce:\n${snapshotBefore.trim() || '    (temiz)'}\n  sonra:\n${snapshotAfter.trim() || '    (temiz)'}`
  );
}

if (failed) process.exit(1);
console.log(
  `[critical-domain-coverage] ${SCENARIOS.length}/${SCENARIOS.length} workspace PASS ` +
    '(kritik-domain %80 teli canlı; global %60 tabanı ayrı)'
);
