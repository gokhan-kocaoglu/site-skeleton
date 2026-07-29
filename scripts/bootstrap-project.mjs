#!/usr/bin/env node
/**
 * Bootstrap a real project from the skeleton (Faz 8.1 audit #11/#12;
 * Faz 8.3 PR-C: transactional + project-memory generation).
 * Deterministic, Node stdlib only. DRY-RUN by default; writes only with --apply.
 *
 * Usage:
 *   node scripts/bootstrap-project.mjs <proje-adi>          # dry-run (önizleme)
 *   node scripts/bootstrap-project.mjs <proje-adi> --apply  # uygula
 *
 * Pipeline: validate slug -> read state -> build plan -> validate plan ->
 * execute as a transaction -> roll back on ANY failure. The CLI at the bottom
 * is a thin shell over the exported functions so scripts/tests/ can drive the
 * same code paths (including fault injection) without CLI escape hatches.
 *
 * Scope (README "Bootstrap" bölümünde birebir belgelidir):
 *   - root package adı            site-skeleton      -> <slug>
 *   - npm workspace scope         @skeleton/*        -> @<slug>/*
 *   - Java package (+ dizin taşıma) com.skeleton     -> com.<slug'dan tiresiz>
 *   - Maven adları                skeleton-api / Skeleton API -> <slug>-api / <Display> API
 *   - DB adları                   skeleton, skeleton_it -> <slug _'li>, <slug _'li>_it
 *   - OpenAPI title + web metadata "Site Skeleton"   -> "<Display>"
 *   - README başlığı              site-skeleton      -> <slug>
 *   - structure-manifest          mode -> project, projectSlug -> <slug>
 *   - project memory              _TEMPLATE -> 01_Projects/<slug>/ (başlıklar doldurulur)
 *   - SiteSkeleton memory         -> 01_Projects/_ARCHIVE/SiteSkeleton/ (SİLİNMEZ)
 * Tarihsel kanıt DEĞİŞMEZ: docs/test-reports, docs/audits, docs/source-briefs ve
 * project-memory genel metin taramasının DIŞINDADIR; memory yalnız yukarıdaki
 * açık plan operasyonlarıyla değişir.
 */
import {
  readFileSync, writeFileSync, readdirSync, existsSync, renameSync, mkdirSync,
  mkdtempSync, copyFileSync, rmSync, rmdirSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const MANIFEST_REL = 'scripts/structure-manifest.json';
const MEMORY_ROOT = 'project-memory/ClaudeTeamMemory/01_Projects';
const MEMORY_TEMPLATE = `${MEMORY_ROOT}/_TEMPLATE`;
const MEMORY_SKELETON = `${MEMORY_ROOT}/SiteSkeleton`;
const MEMORY_ARCHIVE_DIR = `${MEMORY_ROOT}/_ARCHIVE`;
const MEMORY_ARCHIVE = `${MEMORY_ARCHIVE_DIR}/SiteSkeleton`;

const SLUG_RE = /^[a-z][a-z0-9-]{1,38}[a-z0-9]$/;
// A slug segment becomes a Java package element; JLS keywords would not compile.
const JAVA_RESERVED = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
  'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
  'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while',
  '_', 'true', 'false', 'null',
]);

export class BootstrapError extends Error {}

const p = (root, rel) => path.join(root, rel);
const toPosix = (value) => value.split(path.sep).join('/');

/** Slug -> derived identity. Throws BootstrapError on anything unusable. */
export function validateProjectSlug(name) {
  if (!name) throw new BootstrapError('kullanım: node scripts/bootstrap-project.mjs <proje-adi> [--apply]');
  if (!SLUG_RE.test(name)) {
    throw new BootstrapError(
      `geçersiz proje adı "${name}" — kebab-case: küçük harf/rakam/tire, harfle başlar (örn. cicek-sepeti)`
    );
  }
  if (/^(skeleton|site-skeleton)$/.test(name)) throw new BootstrapError(`"${name}" rezerve — gerçek proje adı seç`);
  if (name.includes('--')) throw new BootstrapError(`"${name}" ardışık tire içeriyor — segmentler boş olamaz`);
  const segments = name.split('-');
  for (const segment of segments) {
    if (!segment) throw new BootstrapError(`"${name}" boş segment içeriyor`);
    if (JAVA_RESERVED.has(segment)) {
      throw new BootstrapError(`"${name}" Java anahtar kelimesi içeriyor ("${segment}") — paket adı derlenmez`);
    }
  }
  const javaId = name.replaceAll('-', '');
  const dbName = name.replaceAll('-', '_');
  if (!javaId) throw new BootstrapError(`"${name}" boş Java tanımlayıcısı üretiyor`);
  // PostgreSQL identifier limit is 63 bytes; "<db>_it" is the longest name used.
  if (`${dbName}_it`.length > 63) throw new BootstrapError(`"${name}" çok uzun — DB adı 63 karakteri aşıyor`);
  const display = segments.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return { slug: name, display, javaId, dbName };
}

/**
 * The memory folder is named with the exact slug, so a case-only difference
 * still collides on Windows. Checked before planning, never during the
 * idempotent re-run path (where the folder legitimately exists already).
 */
export function assertMemoryNameAvailable(root, identity) {
  const memoryRoot = p(root, MEMORY_ROOT);
  if (!existsSync(memoryRoot)) return;
  for (const entry of readdirSync(memoryRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.toLowerCase() === identity.slug.toLowerCase()) {
      throw new BootstrapError(`"${identity.slug}" mevcut memory klasörüyle çakışıyor: ${MEMORY_ROOT}/${entry.name}`);
    }
  }
}

/** Manifest identity. Throws BootstrapError on any inconsistent state. */
export function readBootstrapState(root) {
  const abs = p(root, MANIFEST_REL);
  if (!existsSync(abs)) throw new BootstrapError(`manifest bulunamadı: ${MANIFEST_REL}`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (error) {
    throw new BootstrapError(`manifest okunamadı (geçersiz JSON): ${error.message}`);
  }
  const mode = manifest.mode ?? 'skeleton-dev';
  const projectSlug = manifest.projectSlug;
  if (mode !== 'project' && mode !== 'skeleton-dev') {
    throw new BootstrapError(`tutarsız state: bilinmeyen mode "${mode}"`);
  }
  if (mode === 'project' && !projectSlug) {
    throw new BootstrapError('tutarsız state: mode=project ama projectSlug yok');
  }
  if (mode === 'skeleton-dev' && projectSlug !== undefined) {
    throw new BootstrapError(`tutarsız state: mode=skeleton-dev ama projectSlug var ("${projectSlug}")`);
  }
  if (projectSlug !== undefined && !SLUG_RE.test(projectSlug)) {
    throw new BootstrapError(`tutarsız state: kayıtlı projectSlug geçersiz biçimde ("${projectSlug}")`);
  }
  if (mode === 'skeleton-dev' && existsSync(p(root, MEMORY_ARCHIVE))) {
    throw new BootstrapError(`tutarsız state: mode=skeleton-dev ama ${MEMORY_ARCHIVE} mevcut (kısmi dönüşüm)`);
  }
  return { manifest, mode, projectSlug };
}

/** Refuses to start on a dirty tree; ignored build output is not a blocker. */
export function assertCleanWorktree(root) {
  const git = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], {
    cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  if (git.error || git.status !== 0) {
    throw new BootstrapError(
      'çalışma ağacı doğrulanamadı (git yok veya repository değil) — --apply için temiz bir git ağacı zorunlu'
    );
  }
  const dirty = git.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
  if (dirty.length) {
    const shown = dirty.slice(0, 5).map((l) => `    ${l}`).join('\n');
    throw new BootstrapError(
      `çalışma ağacı kirli (${dirty.length} yol) — bootstrap yalnız temiz ağaçta uygulanır:\n${shown}` +
        (dirty.length > 5 ? `\n    … +${dirty.length - 5}` : '')
    );
  }
}

const EXCLUDE_DIRS = new Set([
  '.git', 'node_modules', '.next', '.turbo', 'dist', 'target', 'coverage',
  'refs', 'graphify-out',
  // historical evidence stays untouched; memory is handled by explicit ops:
  'project-memory', 'docs/source-briefs', 'docs/test-reports', 'docs/audits',
  'docs/releases',
]);
const EXCLUDE_FILES = new Set(['scripts/bootstrap-project.mjs']);
// Upstream audit provenance is skeleton-only: a generated project must not
// inherit the template's verdict as its own release state (ADR-0018).
const RELEASE_STATE_DOCS = new Set(['README.md', 'CLAUDE.md']);
const RELEASE_STATE_RE =
  /\n?<!--\s*release-state:start\s*-->[\s\S]*?<!--\s*release-state:end\s*-->\n?/g;
const EXTENSIONS = [
  '.json', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.java', '.xml', '.md', '.css', '.sql', '.toml', '.example', '.html',
];

function* walkTextFiles(root, dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = toPosix(path.relative(root, abs));
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) || EXCLUDE_DIRS.has(rel)) continue;
      yield* walkTextFiles(root, abs);
    } else if (entry.isFile() && !EXCLUDE_FILES.has(rel)) {
      if (EXTENSIONS.some((e) => rel.endsWith(e))) yield rel;
    }
  }
}

function* walkAll(root, dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = toPosix(path.relative(root, abs));
    if (entry.isDirectory()) yield* walkAll(root, abs);
    else if (entry.isFile()) yield rel;
  }
}

/** Ordered longest-first so partial overlaps (skeleton_it vs skeleton) stay correct. */
function replacementsFor({ slug, display, javaId, dbName }) {
  return [
    ['@skeleton/', `@${slug}/`],
    ['com.skeleton', `com.${javaId}`],
    ['com/skeleton', `com/${javaId}`],
    ['skeleton_it', `${dbName}_it`],
    ['5432/skeleton', `5432/${dbName}`],
    ['skeleton-api', `${slug}-api`],
    ['Site Skeleton API', `${display} API`],
    ['Skeleton API', `${display} API`],
    ['Site Skeleton', display],
    ['site-skeleton', slug],
  ];
}

function substitute(text, replacements) {
  let next = text;
  let count = 0;
  for (const [from, to] of replacements) {
    const parts = next.split(from);
    count += parts.length - 1;
    next = parts.join(to);
  }
  return { next, count };
}

/**
 * Immutable plan. Nothing is written here — every operation carries its target
 * and, for replacements, the exact bytes it will overwrite.
 */
export function createBootstrapPlan(root, identity) {
  const replacements = replacementsFor(identity);
  const operations = [];
  let substitutions = 0;

  for (const rel of walkTextFiles(root, root)) {
    if (rel === MANIFEST_REL) continue; // manifest is rebuilt below in one op
    const buf = readFileSync(p(root, rel));
    if (buf.includes(0)) continue; // binary
    const text = buf.toString('utf8');
    let { next, count } = substitute(text, replacements);
    if (RELEASE_STATE_DOCS.has(rel)) next = next.replace(RELEASE_STATE_RE, '\n');
    if (next !== text) {
      operations.push({ type: 'replace', rel, before: buf, after: next, count });
      substitutions += count;
    }
  }

  // Manifest: text substitution AND identity fields in a single write, so a
  // stale re-parse can never clobber the rewritten paths.
  const manifestBuf = readFileSync(p(root, MANIFEST_REL));
  const { next: manifestText, count: manifestCount } = substitute(manifestBuf.toString('utf8'), replacements);
  const manifest = JSON.parse(manifestText);
  manifest.mode = 'project';
  manifest.projectSlug = identity.slug;
  operations.push({
    type: 'replace',
    rel: MANIFEST_REL,
    before: manifestBuf,
    after: `${JSON.stringify(manifest, null, 2)}\n`,
    count: manifestCount,
    note: `mode -> project · projectSlug -> ${identity.slug}`,
  });
  substitutions += manifestCount;

  for (const half of ['main', 'test']) {
    const from = `apps/api/src/${half}/java/com/skeleton`;
    if (existsSync(p(root, from))) {
      operations.push({ type: 'move', from, to: `apps/api/src/${half}/java/com/${identity.javaId}` });
    }
  }

  // Project memory: template -> 01_Projects/<slug>/ with deterministic headings.
  const targetDir = `${MEMORY_ROOT}/${identity.slug}`;
  operations.push({ type: 'mkdir', rel: targetDir });
  const memoryFiles = [...walkAll(root, p(root, MEMORY_TEMPLATE))].sort();
  const createdDirs = new Set();
  for (const rel of memoryFiles) {
    const relative = rel.slice(`${MEMORY_TEMPLATE}/`.length);
    const dir = path.posix.dirname(relative);
    if (dir !== '.' && !createdDirs.has(dir)) {
      createdDirs.add(dir);
      operations.push({ type: 'mkdir', rel: `${targetDir}/${dir}` });
    }
    const buf = readFileSync(p(root, rel));
    const content = rel.endsWith('.md')
      ? buf.toString('utf8').split('<Proje Adı>').join(identity.display).split('<proje-adi>').join(identity.slug)
      : buf;
    operations.push({ type: 'create', rel: `${targetDir}/${relative}`, content, source: rel });
  }

  // SiteSkeleton operational memory is archived, never deleted.
  if (!existsSync(p(root, MEMORY_ARCHIVE_DIR))) operations.push({ type: 'mkdir', rel: MEMORY_ARCHIVE_DIR });
  operations.push({ type: 'move', from: MEMORY_SKELETON, to: MEMORY_ARCHIVE });

  return {
    identity,
    operations,
    summary: {
      substitutions,
      replacedFiles: operations.filter((o) => o.type === 'replace').length,
      moves: operations.filter((o) => o.type === 'move').length,
      created: operations.filter((o) => o.type === 'create').length,
      directories: operations.filter((o) => o.type === 'mkdir').length,
    },
  };
}

/** Every target is checked before a single byte is written. */
export function validateBootstrapPlan(root, plan) {
  const resolvedRoot = path.resolve(root);
  const inside = (rel) => {
    const abs = path.resolve(root, rel);
    return abs === resolvedRoot || abs.startsWith(resolvedRoot + path.sep);
  };
  const targets = new Set();
  const claim = (rel, kind) => {
    if (targets.has(rel)) throw new BootstrapError(`plan geçersiz: aynı hedefe iki operasyon (${kind}): ${rel}`);
    targets.add(rel);
  };

  if (!existsSync(p(root, MEMORY_TEMPLATE))) throw new BootstrapError(`plan geçersiz: memory şablonu yok: ${MEMORY_TEMPLATE}`);
  if (!existsSync(p(root, MEMORY_SKELETON))) throw new BootstrapError(`plan geçersiz: canlı SiteSkeleton memory'si yok: ${MEMORY_SKELETON}`);
  if (existsSync(p(root, MEMORY_ARCHIVE))) throw new BootstrapError(`plan geçersiz: arşiv hedefi zaten var: ${MEMORY_ARCHIVE}`);

  for (const op of plan.operations) {
    for (const rel of [op.rel, op.from, op.to].filter(Boolean)) {
      if (path.isAbsolute(rel) || rel.includes('..') || !inside(rel)) {
        throw new BootstrapError(`plan geçersiz: repository kökü dışında/geçersiz yol: ${rel}`);
      }
    }
    if (op.type === 'replace') {
      claim(op.rel, 'replace');
      if (!existsSync(p(root, op.rel))) throw new BootstrapError(`plan geçersiz: değişecek dosya yok: ${op.rel}`);
      if (!readFileSync(p(root, op.rel)).equals(op.before)) {
        throw new BootstrapError(`plan geçersiz: dosya plan üretiminden sonra değişti: ${op.rel}`);
      }
    } else if (op.type === 'move') {
      claim(op.to, 'move');
      if (!existsSync(p(root, op.from))) throw new BootstrapError(`plan geçersiz: taşınacak kaynak yok: ${op.from}`);
      if (existsSync(p(root, op.to))) throw new BootstrapError(`plan geçersiz: taşıma hedefi zaten var: ${op.to}`);
      if (!existsSync(path.dirname(p(root, op.to))) && !targets.has(toPosix(path.dirname(op.to)))) {
        throw new BootstrapError(`plan geçersiz: taşıma hedefinin üst dizini yok: ${path.posix.dirname(op.to)}`);
      }
    } else if (op.type === 'mkdir' || op.type === 'create') {
      claim(op.rel, op.type);
      if (existsSync(p(root, op.rel))) throw new BootstrapError(`plan geçersiz: oluşturulacak yol zaten var: ${op.rel}`);
    } else {
      throw new BootstrapError(`plan geçersiz: bilinmeyen operasyon tipi "${op.type}"`);
    }
  }
  return true;
}

function applyOperation(root, op, backupDir, journal, index) {
  const abs = op.rel ? p(root, op.rel) : null;
  if (op.type === 'replace') {
    const backup = path.join(backupDir, `${index}.bak`);
    copyFileSync(abs, backup);
    journal.push({ type: 'replace', rel: op.rel, backup });
    writeFileSync(abs, op.after);
  } else if (op.type === 'move') {
    // Journal only completed moves; a failed rename must not create a
    // rollback entry for a target that never existed.
    renameSync(p(root, op.from), p(root, op.to));
    journal.push({ type: 'move', from: op.from, to: op.to });
  } else if (op.type === 'mkdir') {
    journal.push({ type: 'mkdir', rel: op.rel });
    mkdirSync(abs);
  } else if (op.type === 'create') {
    journal.push({ type: 'create', rel: op.rel });
    writeFileSync(abs, op.content);
  }
}

/** Undoes a journal in reverse; touches ONLY paths the plan touched. */
export function rollbackBootstrapPlan(root, journal) {
  for (let i = journal.length - 1; i >= 0; i--) {
    const entry = journal[i];
    if (entry.type === 'replace') copyFileSync(entry.backup, p(root, entry.rel));
    else if (entry.type === 'move') renameSync(p(root, entry.to), p(root, entry.from));
    else if (entry.type === 'create') rmSync(p(root, entry.rel), { force: true });
    else if (entry.type === 'mkdir') {
      try {
        rmdirSync(p(root, entry.rel));
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }
}

/**
 * Transactional execution. `options.onOperation(op, index)` is a PROGRAMMATIC
 * test seam only — it is deliberately not reachable from the CLI or an env var,
 * so production runs cannot be told to fail or to skip the rollback.
 */
export function executeBootstrapPlan(root, plan, options = {}) {
  const backupDir = mkdtempSync(path.join(os.tmpdir(), 'skeleton-bootstrap-'));
  const journal = [];
  try {
    plan.operations.forEach((op, index) => {
      applyOperation(root, op, backupDir, journal, index);
      if (options.onOperation) options.onOperation(op, index);
    });
  } catch (error) {
    let rollbackError = null;
    try {
      rollbackBootstrapPlan(root, journal);
    } catch (failure) {
      rollbackError = failure;
    }
    rmSync(backupDir, { recursive: true, force: true });
    if (rollbackError) {
      throw new BootstrapError(
        `uygulama hatası: ${error.message}\nGERİ ALMA DA BAŞARISIZ: ${rollbackError.message}\n` +
          'Repository yarım dönüşümde olabilir — git ile inceleyin.'
      );
    }
    throw new BootstrapError(`uygulama hatası: ${error.message}\nTüm değişiklikler geri alındı (rollback tamam).`);
  }
  rmSync(backupDir, { recursive: true, force: true });
  return journal;
}

function describePlan(plan, log) {
  const { slug, display, javaId, dbName } = plan.identity;
  log(`  display: "${display}" · npm: @${slug}/* · java: com.${javaId} · db: ${dbName} / ${dbName}_it`);
  log(`  Değişecek dosya: ${plan.summary.replacedFiles} (toplam ${plan.summary.substitutions} ikame)`);
  for (const op of plan.operations) {
    if (op.type === 'replace') log(`   - ${op.rel}: ${op.count}${op.note ? ` (${op.note})` : ''}`);
  }
  for (const op of plan.operations) {
    if (op.type === 'move') log(`  Taşınacak: ${op.from} -> ${op.to}`);
  }
  log(`  Oluşturulacak: ${plan.summary.directories} dizin, ${plan.summary.created} dosya (project memory)`);
}

/** Full run. Returns an exit code; never calls process.exit itself. */
export function runBootstrap({ root, name, apply = false, log = console.log, onOperation } = {}) {
  const identity = validateProjectSlug(name);
  const state = readBootstrapState(root);

  // Identity decisions come BEFORE the clean-worktree preflight: after a first
  // apply the tree is legitimately dirty, and re-running the same slug must
  // still exit cleanly while a different slug must still be refused.
  if (state.mode === 'project') {
    if (state.projectSlug === identity.slug) {
      log(`[bootstrap] "${identity.slug}" zaten uygulanmış (manifest mode=project, projectSlug=${state.projectSlug}).`);
      log('[bootstrap] idempotent çıkış — hiçbir dosyaya yazılmadı.');
      return 0;
    }
    throw new BootstrapError(
      `bootstrap daha önce "${state.projectSlug}" için uygulanmış; "${identity.slug}" olarak yeniden uygulanamaz`
    );
  }

  if (apply) assertCleanWorktree(root);
  assertMemoryNameAvailable(root, identity);

  const plan = createBootstrapPlan(root, identity);
  validateBootstrapPlan(root, plan);

  log(`[bootstrap] proje: ${identity.slug} — ${apply ? 'UYGULANIYOR' : 'DRY-RUN (yazma yok)'}`);
  describePlan(plan, log);

  if (!apply) {
    log(`\nUygulamak için: node scripts/bootstrap-project.mjs ${identity.slug} --apply`);
    return 0;
  }

  executeBootstrapPlan(root, plan, { onOperation });

  log('\n[bootstrap] tamam. Sıradaki adımlar:');
  log('  1. pnpm install   (lockfile workspace adlarını tazeler)');
  log('  2. pnpm gate      (7 gate ile doğrula)');
  log('  3. cd apps/api; mvn verify');
  log('  4. git diff ile incele, sonra commit et.');
  return 0;
}

const THIS_FILE = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === THIS_FILE) {
  const args = process.argv.slice(2);
  try {
    process.exit(runBootstrap({
      root: path.resolve(path.dirname(THIS_FILE), '..'),
      name: args.find((a) => !a.startsWith('--')),
      apply: args.includes('--apply'),
    }));
  } catch (error) {
    if (!(error instanceof BootstrapError)) throw error;
    console.error(`[bootstrap] HATA: ${error.message}`);
    process.exit(1);
  }
}
