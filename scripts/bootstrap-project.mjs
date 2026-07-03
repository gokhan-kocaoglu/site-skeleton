#!/usr/bin/env node
/**
 * Bootstrap a real project from the skeleton (Faz 8.1, audit #11/#12).
 * Deterministic, Node stdlib only. DRY-RUN by default; writes only with --apply.
 *
 * Usage:
 *   node scripts/bootstrap-project.mjs <proje-adi>          # dry-run (önizleme)
 *   node scripts/bootstrap-project.mjs <proje-adi> --apply  # uygula
 *
 * Scope (README "Bootstrap" bölümünde birebir belgelidir):
 *   - root package adı            site-skeleton      -> <slug>
 *   - npm workspace scope         @skeleton/*        -> @<slug>/*
 *   - Java package (+ dizin taşıma) com.skeleton     -> com.<slug'dan tiresiz>
 *   - Maven adları                skeleton-api / Skeleton API -> <slug>-api / <Display> API
 *   - DB adları                   skeleton, skeleton_it -> <slug _'li>, <slug _'li>_it
 *   - OpenAPI title + web metadata "Site Skeleton"   -> "<Display>"
 *   - README başlığı              site-skeleton      -> <slug>
 *   - structure-manifest mode     skeleton-dev       -> project
 * Tarihsel kanıt DEĞİŞMEZ: docs/test-reports, docs/audits, docs/source-briefs
 * ve project-memory taranmaz. Idempotent: hedef ad zaten uygulanmışsa çıkış 0.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, renameSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_REL = 'scripts/structure-manifest.json';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const name = args.find((a) => !a.startsWith('--'));

function die(msg) {
  console.error(`[bootstrap] HATA: ${msg}`);
  process.exit(1);
}

if (!name) die('kullanım: node scripts/bootstrap-project.mjs <proje-adi> [--apply]');
if (!/^[a-z][a-z0-9-]{1,38}[a-z0-9]$/.test(name)) {
  die(`geçersiz proje adı "${name}" — kebab-case: küçük harf/rakam/tire, harfle başlar (örn. cicek-sepeti)`);
}
if (/^(skeleton|site-skeleton)$/.test(name) || name.includes('--')) {
  die(`"${name}" rezerve/geçersiz — gerçek proje adı seç`);
}

const slug = name;
const display = slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const javaId = slug.replaceAll('-', '');
const dbName = slug.replaceAll('-', '_');

// Order matters: longer/more specific tokens first so partial overlaps
// (skeleton_it vs skeleton, Site Skeleton API vs Site Skeleton) stay correct.
const REPLACEMENTS = [
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

const EXCLUDE_DIRS = new Set([
  '.git', 'node_modules', '.next', '.turbo', 'dist', 'target', 'coverage',
  'refs', 'graphify-out',
  // historical evidence stays untouched:
  'project-memory', 'docs/source-briefs', 'docs/test-reports', 'docs/audits',
]);
const EXCLUDE_FILES = new Set(['scripts/bootstrap-project.mjs']);
const EXTENSIONS = [
  '.json', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.java', '.xml', '.md', '.css', '.sql', '.toml', '.example', '.html',
];

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) || EXCLUDE_DIRS.has(rel)) continue;
      yield* walk(abs);
    } else if (entry.isFile() && !EXCLUDE_FILES.has(rel)) {
      if (EXTENSIONS.some((e) => rel.endsWith(e))) yield rel;
    }
  }
}

// 1. Collect text replacements.
const fileChanges = []; // { rel, count, next }
for (const rel of walk(ROOT)) {
  const buf = readFileSync(path.join(ROOT, rel));
  if (buf.includes(0)) continue; // binary
  const original = buf.toString('utf8');
  let next = original;
  let count = 0;
  for (const [from, to] of REPLACEMENTS) {
    const parts = next.split(from);
    count += parts.length - 1;
    next = parts.join(to);
  }
  if (count > 0) fileChanges.push({ rel, count, next });
}

// 2. Java package directory moves.
const javaMoves = [];
for (const half of ['main', 'test']) {
  const from = `apps/api/src/${half}/java/com/skeleton`;
  if (existsSync(path.join(ROOT, from))) {
    javaMoves.push({ from, to: `apps/api/src/${half}/java/com/${javaId}` });
  }
}

// 3. Manifest mode flip.
const manifest = JSON.parse(readFileSync(path.join(ROOT, MANIFEST_REL), 'utf8'));
const modeChange = manifest.mode !== 'project';

// Idempotency: nothing to do -> safe exit.
if (fileChanges.length === 0 && javaMoves.length === 0 && !modeChange) {
  console.log(`[bootstrap] "${slug}" zaten uygulanmış görünüyor (değişecek dosya yok, mode=project). Çıkış.`);
  process.exit(0);
}

const label = apply ? 'UYGULANIYOR' : 'DRY-RUN (yazma yok)';
console.log(`[bootstrap] proje: ${slug} — ${label}`);
console.log(`  display: "${display}" · npm: @${slug}/* · java: com.${javaId} · db: ${dbName} / ${dbName}_it`);
console.log(`  Değişecek dosya: ${fileChanges.length} (toplam ${fileChanges.reduce((s, f) => s + f.count, 0)} ikame)`);
for (const f of fileChanges) console.log(`   - ${f.rel}: ${f.count}`);
for (const m of javaMoves) console.log(`  Taşınacak: ${m.from} -> ${m.to}`);
if (modeChange) console.log(`  Manifest: mode "${manifest.mode}" -> "project" (${MANIFEST_REL})`);

if (!apply) {
  console.log(`\nUygulamak için: node scripts/bootstrap-project.mjs ${slug} --apply`);
  process.exit(0);
}

for (const f of fileChanges) writeFileSync(path.join(ROOT, f.rel), f.next);
for (const m of javaMoves) {
  const toAbs = path.join(ROOT, m.to);
  mkdirSync(path.dirname(toAbs), { recursive: true });
  renameSync(path.join(ROOT, m.from), toAbs); // aynı com/ ebeveyni içinde taşınır
}
if (modeChange) {
  // Re-read: the text-replacement pass above may have rewritten manifest paths
  // (com/skeleton -> com/<javaId>); flipping mode on the stale parse would
  // clobber those writes.
  const fresh = JSON.parse(readFileSync(path.join(ROOT, MANIFEST_REL), 'utf8'));
  fresh.mode = 'project';
  writeFileSync(path.join(ROOT, MANIFEST_REL), `${JSON.stringify(fresh, null, 2)}\n`);
}

console.log('\n[bootstrap] tamam. Sıradaki adımlar:');
console.log('  1. pnpm install   (lockfile workspace adlarını tazeler)');
console.log('  2. pnpm gate      (7 gate ile doğrula)');
console.log('  3. cd apps/api; mvn verify');
console.log('  4. git diff ile incele, sonra commit et.');
