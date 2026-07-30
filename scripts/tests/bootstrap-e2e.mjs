#!/usr/bin/env node
/**
 * Generated-repository certification (Faz 8.3 PR-C). Node stdlib only.
 *
 * NOT a browser test: "e2e" here means the whole bootstrap lifecycle end to end
 * — copy the skeleton to a temp git repo, run the real `--apply`, install, run
 * the generated project's own quality gate, verify project-mode structure, then
 * assert idempotency and different-slug rejection. Playwright stays a dormant
 * template (templates/e2e/) and is deliberately not activated here.
 *
 * Maven is NOT run: the API is covered by the api-verify-testcontainers job.
 *
 * Usage: node scripts/tests/bootstrap-e2e.mjs   (pnpm test:bootstrap-e2e)
 * Exit 0 = certified, exit 1 otherwise.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  createRepoFixture, gitStatus, hashTree, diffHashTrees, run, pnpm,
} from './lib/repo-fixture.mjs';

const SLUG = 'certified-demo';
const OTHER_SLUG = 'other-demo';
const DISPLAY = 'Certified Demo';
const JAVA_ID = 'certifieddemo';
const DB_NAME = 'certified_demo';
const MEMORY_ROOT = 'project-memory/ClaudeTeamMemory/01_Projects';

let failures = 0;
const step = (name) => console.log(`\n=== ${name} ===`);
function check(condition, label, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}
const readIfAny = (abs) => (existsSync(abs) ? readFileSync(abs, 'utf8') : '');
const isDir = (abs) => existsSync(abs) && statSync(abs).isDirectory();

const fixture = createRepoFixture();
const dir = fixture.dir;
const at = (...parts) => path.join(dir, ...parts);
const bootstrap = (args, timeout = 180_000) =>
  run(process.execPath, [at('scripts', 'bootstrap-project.mjs'), ...args], { cwd: dir, timeout });

try {
  console.log(`[bootstrap-e2e] fixture: ${dir} (${fixture.fileCount} dosya)`);

  // 1 — dry-run leaves the tree untouched.
  step('1. dry-run');
  const beforeDryRun = hashTree(dir);
  const dryRun = bootstrap([SLUG]);
  check(dryRun.status === 0, 'dry-run exit 0', dryRun.tail());
  check(dryRun.output.includes('DRY-RUN'), 'plan DRY-RUN olarak etiketli');
  check(dryRun.output.includes('Taşınacak:'), 'plan taşıma operasyonlarını listeliyor');
  check(gitStatus(dir) === '', 'dry-run sonrası çalışma ağacı temiz');
  check(diffHashTrees(beforeDryRun, hashTree(dir)).length === 0, 'dry-run hiçbir dosyayı değiştirmedi');

  // Upstream audited provenance must survive the apply byte-for-byte (ADR-0018).
  const releaseHashes = (tree) =>
    JSON.stringify([...tree].filter(([rel]) => rel.startsWith('docs/releases/')).sort());
  const provenanceOf = () =>
    JSON.stringify(
      JSON.parse(readIfAny(at('scripts', 'structure-manifest.json')) || '{}').upstreamReleaseProvenance ?? null
    );
  const releasesBefore = releaseHashes(beforeDryRun);
  const provenanceBefore = provenanceOf();

  // 2 — the real apply.
  step('2. --apply');
  const apply = bootstrap([SLUG, '--apply']);
  check(apply.status === 0, 'apply exit 0', apply.tail());

  // 3 — identity.
  step('3. kimlik');
  const manifest = JSON.parse(readIfAny(at('scripts', 'structure-manifest.json')) || '{}');
  check(manifest.mode === 'project', `manifest mode=project (bulunan: ${manifest.mode})`);
  check(manifest.projectSlug === SLUG, `manifest projectSlug=${SLUG} (bulunan: ${manifest.projectSlug})`);
  const rootPkg = JSON.parse(readIfAny(at('package.json')) || '{}');
  check(rootPkg.name === SLUG, `kök package adı ${SLUG} (bulunan: ${rootPkg.name})`);
  const webPkg = JSON.parse(readIfAny(at('apps', 'web', 'package.json')) || '{}');
  check(
    Object.keys(webPkg.dependencies ?? {}).some((d) => d.startsWith(`@${SLUG}/`)),
    `npm scope @${SLUG}/*`,
    JSON.stringify(Object.keys(webPkg.dependencies ?? {}))
  );
  check(isDir(at('apps/api/src/main/java/com', JAVA_ID)), `Java dizini com/${JAVA_ID}`);
  check(isDir(at('apps/api/src/test/java/com', JAVA_ID)), `Java test dizini com/${JAVA_ID}`);
  check(!existsSync(at('apps/api/src/main/java/com/skeleton')), 'eski com/skeleton dizini kalmadı');
  const appYml = readIfAny(at('apps/api/src/main/resources/application.yml'));
  check(appYml.includes(`5432/${DB_NAME}`), `DB adı ${DB_NAME}`);
  const itYml = readIfAny(at('apps/api/src/test/resources/application-it-local.yml'));
  check(itYml.includes(`${DB_NAME}_it`), `IT DB adı ${DB_NAME}_it`);
  const pom = readIfAny(at('apps/api/pom.xml'));
  check(pom.includes(`<name>${SLUG}-api</name>`), `Maven proje adı ${SLUG}-api`);
  check(pom.includes(`<groupId>com.${JAVA_ID}</groupId>`), `Maven groupId com.${JAVA_ID}`);

  // 4 — deterministic project memory.
  step('4. project memory');
  const projectMemory = at(MEMORY_ROOT, SLUG);
  check(isDir(projectMemory), `${MEMORY_ROOT}/${SLUG}/ oluşturuldu`);
  const headings = {
    'Project Brief.md': `# Project Brief — ${DISPLAY}`,
    'Current Status.md': `# Current Status — ${DISPLAY}`,
    'Backlog.md': `# Backlog — ${DISPLAY}`,
  };
  for (const [file, expected] of Object.entries(headings)) {
    const first = readIfAny(path.join(projectMemory, file)).split(/\r?\n/)[0].trim();
    check(first === expected, `${file} başlığı doğru`, `bulunan: "${first}"`);
  }
  check(
    !readIfAny(path.join(projectMemory, 'Project Brief.md')).includes('<proje-adi>'),
    'Project Brief slug placeholder\'ı doldurulmuş'
  );
  for (const sub of ['01_PM', '02_UX_UI', '03_Backend', '04_Frontend', '05_QA', '06_Decisions', '07_Patterns', '08_Session_Logs']) {
    check(existsSync(path.join(projectMemory, sub, '.gitkeep')), `${sub}/.gitkeep kopyalandı`);
  }
  check(!existsSync(at(MEMORY_ROOT, 'SiteSkeleton')), 'canlı SiteSkeleton memory\'si kalmadı');
  check(isDir(at(MEMORY_ROOT, '_ARCHIVE', 'SiteSkeleton')), 'SiteSkeleton arşive taşındı (silinmedi)');
  check(
    existsSync(at(MEMORY_ROOT, '_ARCHIVE/SiteSkeleton/08_Session_Logs/2026-07-02-session-01.md')),
    'arşivlenen session log korundu'
  );
  // The archive is a move, not a rewrite: the historical wording must survive
  // the identity rename that touched every active surface.
  const archivedStatus = readIfAny(at(MEMORY_ROOT, '_ARCHIVE/SiteSkeleton/Current Status.md'));
  check(archivedStatus.includes('Site Skeleton'), 'arşiv içeriğine metin ikamesi uygulanmadı');
  check(!archivedStatus.includes(DISPLAY), `arşiv içeriğinde "${DISPLAY}" yok (ikame sızmadı)`);
  check(isDir(at(MEMORY_ROOT, '_TEMPLATE')), '_TEMPLATE korundu');
  check(
    readIfAny(at(MEMORY_ROOT, '_TEMPLATE', 'Backlog.md')).includes('<Proje Adı>'),
    '_TEMPLATE placeholder\'ları değişmedi'
  );

  // 5 — dependencies. Bootstrap renames the workspace, so the lockfile is
  //     legitimately stale here; a controlled update is expected.
  step('5. pnpm install');
  const install = pnpm(['install', '--prefer-offline'], { cwd: dir, timeout: 900_000 });
  check(install.status === 0, 'pnpm install exit 0', install.tail(20));

  // 6 — the generated project's own quality gate.
  step('6. generated project quality gate');
  const gate = pnpm(['gate'], { cwd: dir, timeout: 1_800_000, env: { SKIP_API: '1' } });
  check(gate.status === 0, 'pnpm gate exit 0 (SKIP_API=1)', gate.tail(25));
  check(/All gates PASS/.test(gate.output), 'gate tablosu "All gates PASS"');
  for (const g of ['build', 'typecheck', 'lint', 'test', 'audit', 'structure', 'contract-drift']) {
    check(new RegExp(`${g}\\s+PASS`).test(gate.output), `gate ${g} PASS`);
  }

  // 7 — project-mode structure, run directly.
  step('7. project-mode structure');
  const structure = run(process.execPath, [at('scripts', 'verify-structure.mjs')], { cwd: dir, timeout: 300_000 });
  check(structure.status === 0, 'verify-structure exit 0', structure.tail());
  check(/PASS — \d+ checks OK/.test(structure.output), 'structure PASS satırı');

  // 8 — same slug is idempotent even on a (now legitimately) dirty tree.
  step('8. aynı slug idempotency');
  const dirtyBefore = gitStatus(dir);
  check(dirtyBefore !== '', 'apply sonrası ağaç beklendiği gibi kirli (idempotency bunu tolere etmeli)');
  const beforeSecond = hashTree(dir);
  const second = bootstrap([SLUG, '--apply']);
  check(second.status === 0, 'ikinci apply exit 0', second.tail());
  check(/idempotent çıkış/.test(second.output), 'açık idempotent mesajı');
  const secondDiff = diffHashTrees(beforeSecond, hashTree(dir));
  check(secondDiff.length === 0, 'ikinci koşu hiçbir dosyayı değiştirmedi', secondDiff.slice(0, 5).join('\n        '));
  check(gitStatus(dir) === dirtyBefore, 'ikinci koşu git status\'u değiştirmedi');

  // 9 — a different slug must be refused, loudly and without writing.
  step('9. farklı slug reddi');
  const beforeOther = hashTree(dir);
  const other = bootstrap([OTHER_SLUG, '--apply']);
  check(other.status === 1, 'farklı slug exit 1', other.tail());
  check(other.output.includes(SLUG) && other.output.includes(OTHER_SLUG), 'hata mesajı iki slug\'ı da gösteriyor');
  check(diffHashTrees(beforeOther, hashTree(dir)).length === 0, 'reddedilen koşu hiçbir şey yazmadı');

  // 10 — no skeleton identifiers left on the active surface.
  step('10. artık iskelet kimliği kalmadı');
  const surfaces = [
    'package.json', 'apps/web/package.json', 'apps/admin/package.json',
    'apps/api/pom.xml', 'apps/api/src/main/resources/application.yml',
    'docs/api-contracts/openapi.yaml',
  ];
  for (const rel of surfaces) {
    const text = readIfAny(at(rel));
    check(
      !/site-skeleton|@skeleton\/|com\.skeleton|Site Skeleton/.test(text),
      `${rel}: iskelet kimliği kalmadı`
    );
  }
  check(
    readIfAny(at('docs/source-briefs/skeleton-brief.md')).length > 0
      && /Site Skeleton|site-skeleton/.test(readIfAny(at('docs/source-briefs/skeleton-brief.md'))),
    'tarihsel source-brief değiştirilmedi'
  );
  const report = at('docs/test-reports/2026-07-03-faz8.2-sealing.md');
  check(/site-skeleton|Site Skeleton/.test(readIfAny(report)), 'tarihsel test raporu değiştirilmedi');

  // 11 — upstream release provenance: stripped from the active surface, kept
  // byte-for-byte as archive (AC-32 / ADR-0018).
  step('11. upstream release provenance');
  for (const rel of ['README.md', 'CLAUDE.md']) {
    const text = readIfAny(at(rel));
    check(!/release-state:(start|end)/.test(text), `${rel}: upstream release-state marker'ı kaldırıldı`);
    check(!/v1\.0\.0-rc/.test(text), `${rel}: upstream RC hükmü taşınmıyor`);
  }
  check(releaseHashes(hashTree(dir)) === releasesBefore, 'docs/releases dosya kümesi ve byte hash\'leri korundu');
  check(provenanceOf() === provenanceBefore, 'manifest upstreamReleaseProvenance deep-equal korundu');
  const rc1Snapshot = readIfAny(at('docs/releases/v1.0.0-rc.1.md'));
  check(rc1Snapshot.startsWith('# site-skeleton v1.0.0-rc.1'), 'RC1 snapshot upstream başlığı korundu');
  check(
    !new RegExp(`github\\.com/[^/\\s]+/${SLUG}/`).test(rc1Snapshot),
    'upstream GitHub linkleri project slug\'a dönüşmedi'
  );
  const ledger = readIfAny(at('docs/releases/README.md'));
  check(ledger.includes('Audited Upstream Release Provenance'), 'ledger upstream provenance metni korundu');
  check(!new RegExp(SLUG).test(ledger), 'ledger project slug\'ı ile yeniden yazılmadı');
} catch (error) {
  failures++;
  console.error(`\n[bootstrap-e2e] beklenmedik hata: ${error.stack ?? error.message}`);
} finally {
  if (process.env.KEEP_BOOTSTRAP_E2E_TMP) {
    console.log(`\n[bootstrap-e2e] temp korunuyor: ${dir}`);
  } else {
    fixture.cleanup();
    console.log(`\n[bootstrap-e2e] temp temizlendi: ${existsSync(dir) ? 'HAYIR' : 'evet'}`);
  }
}

console.log(`\n[bootstrap-e2e] ${failures ? `${failures} assertion FAIL` : 'tüm assertion\'lar PASS'}`);
process.exit(failures ? 1 : 0);
