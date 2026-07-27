#!/usr/bin/env node
/**
 * Bootstrap transaction invariants (Faz 8.3 PR-C). Node stdlib only.
 *
 * Proves the properties the generated-repository E2E cannot: that a REFUSED or
 * FAILED apply leaves the repository byte-for-byte as it was. Fault injection
 * goes through the exported executor's programmatic seam — the production CLI
 * has no failure flag, no rollback-skip switch and no debug env var.
 *
 * Exit 0 = all scenarios behave, exit 1 otherwise.
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createRepoFixture, git, gitStatus, hashTree, diffHashTrees, run, SOURCE_ROOT,
} from './lib/repo-fixture.mjs';
import {
  validateProjectSlug, readBootstrapState, createBootstrapPlan, validateBootstrapPlan,
  executeBootstrapPlan, BootstrapError,
} from '../bootstrap-project.mjs';

const SLUG = 'certified-demo';
const results = [];
const record = (ok, name, detail = '') => {
  results.push({ ok, name, detail });
  console.log(`[bootstrap-transaction] ${ok ? 'PASS' : 'FAIL'} — ${name}${ok || !detail ? '' : `\n    ${detail}`}`);
};

const bootstrapCli = (dir, args) =>
  run(process.execPath, [path.join(dir, 'scripts', 'bootstrap-project.mjs'), ...args], { cwd: dir, timeout: 120_000 });

function scenario(name, fn) {
  const fixture = createRepoFixture();
  try {
    fn(fixture.dir);
    record(true, name);
  } catch (error) {
    record(false, name, error.message);
  } finally {
    fixture.cleanup();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// 1. Dry-run must not write anything, even though it prints a full plan.
scenario('dry-run tek bayt yazmaz ve planı gösterir', (dir) => {
  const before = hashTree(dir);
  const res = bootstrapCli(dir, [SLUG]);
  assert(res.status === 0, `dry-run exit=${res.status} (beklenen 0)\n${res.tail()}`);
  assert(res.output.includes('DRY-RUN'), 'çıktıda DRY-RUN etiketi yok');
  assert(res.output.includes('Değişecek dosya:'), 'çıktıda plan özeti yok');
  assert(res.output.includes('project memory'), 'çıktıda memory operasyonları yok');
  assert(gitStatus(dir) === '', 'dry-run sonrası çalışma ağacı kirlendi');
  const problems = diffHashTrees(before, hashTree(dir));
  assert(problems.length === 0, `dry-run dosya değiştirdi:\n    ${problems.join('\n    ')}`);
});

// 2. A dirty tree must be refused BEFORE any write.
scenario('kirli çalışma ağacında --apply reddedilir', (dir) => {
  writeFileSync(path.join(dir, 'README.md'), `${readFileSync(path.join(dir, 'README.md'), 'utf8')}\n<!-- dirty -->\n`);
  const before = hashTree(dir);
  const res = bootstrapCli(dir, [SLUG, '--apply']);
  assert(res.status === 1, `exit=${res.status} (beklenen 1)\n${res.tail()}`);
  assert(/çalışma ağacı kirli/.test(res.output), `beklenen hata mesajı yok:\n${res.tail()}`);
  assert(/README\.md/.test(res.output), 'hata mesajı kirli yolu göstermiyor');
  const problems = diffHashTrees(before, hashTree(dir));
  assert(problems.length === 0, `bootstrap kaynaklı ek değişiklik:\n    ${problems.join('\n    ')}`);
  const manifest = JSON.parse(readFileSync(path.join(dir, 'scripts', 'structure-manifest.json'), 'utf8'));
  assert(manifest.mode === 'skeleton-dev', `manifest mode değişti: ${manifest.mode}`);
});

// 3. Plan validation must reject a colliding target before writing.
scenario('çakışan hedefte plan doğrulaması yazmadan reddeder', (dir) => {
  const archive = path.join(dir, 'project-memory', 'ClaudeTeamMemory', '01_Projects', '_ARCHIVE', 'SiteSkeleton');
  mkdirSync(archive, { recursive: true });
  writeFileSync(path.join(archive, 'placeholder.md'), '# collision\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'collision fixture']);
  const before = hashTree(dir);
  const res = bootstrapCli(dir, [SLUG, '--apply']);
  assert(res.status === 1, `exit=${res.status} (beklenen 1)\n${res.tail()}`);
  assert(/kısmi dönüşüm|arşiv hedefi zaten var/.test(res.output), `beklenen doğrulama hatası yok:\n${res.tail()}`);
  const problems = diffHashTrees(before, hashTree(dir));
  assert(problems.length === 0, `plan doğrulaması yazma yaptı:\n    ${problems.join('\n    ')}`);
});

// 4. Java move target collision — also caught before any byte is written.
scenario('Java taşıma hedefi doluysa plan reddedilir', (dir) => {
  const target = path.join(dir, 'apps', 'api', 'src', 'main', 'java', 'com', 'certifieddemo');
  mkdirSync(target, { recursive: true });
  writeFileSync(path.join(target, 'Placeholder.java'), '// collision\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '--quiet', '-m', 'java collision fixture']);
  const before = hashTree(dir);
  const res = bootstrapCli(dir, [SLUG, '--apply']);
  assert(res.status === 1, `exit=${res.status} (beklenen 1)\n${res.tail()}`);
  assert(/taşıma hedefi zaten var/.test(res.output), `beklenen doğrulama hatası yok:\n${res.tail()}`);
  const problems = diffHashTrees(before, hashTree(dir));
  assert(problems.length === 0, `plan doğrulaması yazma yaptı:\n    ${problems.join('\n    ')}`);
});

// 5. Mid-transaction fault -> full rollback. Injected through the exported
//    executor, not through any CLI/env switch.
scenario('transaction ortasında hata tam rollback üretir', (dir) => {
  const before = hashTree(dir);
  const statusBefore = gitStatus(dir);
  const identity = validateProjectSlug(SLUG);
  const state = readBootstrapState(dir);
  assert(state.mode === 'skeleton-dev', `fixture mode=${state.mode}`);
  const plan = createBootstrapPlan(dir, identity);
  validateBootstrapPlan(dir, plan);

  // Fail late enough that replaces, at least one move and several creates ran.
  const moveIndex = plan.operations.findIndex((op) => op.type === 'move');
  const faultAt = plan.operations.length - 2;
  assert(moveIndex >= 0 && faultAt > moveIndex, 'plan beklenen operasyon sırasını içermiyor');
  let applied = 0;
  let thrown = null;
  try {
    executeBootstrapPlan(dir, plan, {
      onOperation: (_op, index) => {
        applied = index + 1;
        if (index === faultAt) throw new Error('enjekte edilmiş test hatası');
      },
    });
  } catch (error) {
    thrown = error;
  }
  assert(thrown instanceof BootstrapError, `beklenen BootstrapError yerine: ${thrown}`);
  assert(/rollback tamam/.test(thrown.message), `rollback bildirimi yok: ${thrown.message}`);
  assert(applied > moveIndex, `hata çok erken tetiklendi (applied=${applied}, move=${moveIndex})`);

  const problems = diffHashTrees(before, hashTree(dir));
  assert(problems.length === 0, `rollback sonrası fark:\n    ${problems.join('\n    ')}`);
  assert(gitStatus(dir) === statusBefore, `rollback sonrası git status değişti:\n${gitStatus(dir)}`);
  const memoryRoot = path.join(dir, 'project-memory', 'ClaudeTeamMemory', '01_Projects');
  assert(existsSync(path.join(memoryRoot, 'SiteSkeleton')), 'SiteSkeleton canlı konumuna dönmedi');
  assert(!existsSync(path.join(memoryRoot, '_ARCHIVE')), '_ARCHIVE kaldırılmadı');
  assert(!existsSync(path.join(memoryRoot, SLUG)), 'üretilen proje memory klasörü kaldırılmadı');
  assert(existsSync(path.join(dir, 'apps/api/src/main/java/com/skeleton')), 'Java dizini geri taşınmadı');
  assert(!existsSync(path.join(dir, 'apps/api/src/main/java/com/certifieddemo')), 'Java hedefi kaldırılmadı');
  const manifest = JSON.parse(readFileSync(path.join(dir, 'scripts', 'structure-manifest.json'), 'utf8'));
  assert(manifest.mode === 'skeleton-dev' && manifest.projectSlug === undefined, 'manifest geri alınmadı');
});

// 6. A REAL renameSync failure — not an injected throw. Regression guard: the
//    journal must record a move only after it actually succeeded, otherwise
//    rollback tries to move a target that never existed, dies mid-unwind and
//    leaves the earlier operations applied.
const countBackupDirs = () =>
  readdirSync(os.tmpdir(), { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name.startsWith('skeleton-bootstrap-')).length;

scenario('move rename hatası önceki operasyonları tamamen geri alır', (dir) => {
  const identity = validateProjectSlug(SLUG);
  const plan = createBootstrapPlan(dir, identity);
  validateBootstrapPlan(dir, plan); // plan is valid at this point

  const moves = plan.operations.filter((op) => op.type === 'move');
  assert(moves.length >= 3, `beklenen move sayısı bulunamadı (${moves.length})`);
  const firstJavaMove = moves[0];
  const secondJavaMove = moves[1];
  assert(secondJavaMove.from.includes('src/test/java'), `ikinci move beklenen değil: ${secondJavaMove.from}`);

  // Occupy the SECOND move's target AFTER validation. The source stays intact,
  // so every replacement and the first move still apply; only the rename itself
  // fails (EPERM on Windows, ENOTEMPTY on Linux). Removing the source instead
  // would break an earlier replacement backup and never reach the move.
  const blockedTarget = path.join(dir, ...secondJavaMove.to.split('/'));
  mkdirSync(blockedTarget, { recursive: true });
  writeFileSync(path.join(blockedTarget, 'occupied.txt'), 'blocks the rename\n');

  const backupsBefore = countBackupDirs();
  const before = hashTree(dir);
  const statusBefore = gitStatus(dir);

  let thrown = null;
  try {
    executeBootstrapPlan(dir, plan);
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof BootstrapError, `beklenen BootstrapError yerine: ${thrown}`);
  assert(/rename/i.test(thrown.message), `gerçek rename hatası değil: ${thrown.message}`);
  assert(/rollback tamam/.test(thrown.message), `rollback tamamlanmadı: ${thrown.message}`);
  assert(!/GERİ ALMA DA BAŞARISIZ/.test(thrown.message), `rollback kendisi kırıldı: ${thrown.message}`);

  const problems = diffHashTrees(before, hashTree(dir));
  assert(problems.length === 0, `rollback sonrası fark:\n    ${problems.slice(0, 6).join('\n    ')}`);
  assert(gitStatus(dir) === statusBefore, `git status değişti:\n${gitStatus(dir)}`);
  assert(existsSync(path.join(dir, ...firstJavaMove.from.split('/'))), 'ilk Java move geri alınmadı');
  assert(!existsSync(path.join(dir, ...firstJavaMove.to.split('/'))), 'ilk Java move hedefi kaldırılmadı');
  assert(existsSync(path.join(blockedTarget, 'occupied.txt')), 'engelleyen hedef rollback tarafından silinmemeli');
  const manifest = JSON.parse(readFileSync(path.join(dir, 'scripts', 'structure-manifest.json'), 'utf8'));
  assert(manifest.mode === 'skeleton-dev' && manifest.projectSlug === undefined, 'manifest geri alınmadı');
  assert(countBackupDirs() === backupsBefore, 'transaction backup dizini kaldı');
});

// 7. Identity guards reject inconsistent manifests without touching the tree.
scenario('tutarsız manifest state kontrollü hata üretir', (dir) => {
  const manifestPath = path.join(dir, 'scripts', 'structure-manifest.json');
  const original = readFileSync(manifestPath);
  const broken = JSON.parse(original.toString('utf8'));
  broken.mode = 'project'; // projectSlug deliberately absent
  writeFileSync(manifestPath, `${JSON.stringify(broken, null, 2)}\n`);
  const res = bootstrapCli(dir, [SLUG, '--apply']);
  assert(res.status === 1, `exit=${res.status} (beklenen 1)\n${res.tail()}`);
  assert(/mode=project ama projectSlug yok/.test(res.output), `beklenen state hatası yok:\n${res.tail()}`);
  writeFileSync(manifestPath, original);
  assert(gitStatus(dir) === '', 'fixture geri yüklenemedi');
});

// Every scenario ran against a temp fixture; the source tree is never a target.
const sourceRootUsed = SOURCE_ROOT;
console.log(`[bootstrap-transaction] kaynak repo hiç yazılmadı (fixture kökü: ${path.basename(sourceRootUsed)} kopyası)`);

const failed = results.filter((r) => !r.ok).length;
console.log(`[bootstrap-transaction] ${results.length - failed}/${results.length} senaryo PASS`);
process.exit(failed ? 1 : 0);
