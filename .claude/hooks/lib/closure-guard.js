'use strict';
/**
 * Post-merge memory-closure guard (Faz 8.3 PR-D, brief P0-4 / HIGH-4).
 *
 * Two independent layers, deliberately separated so the cheap one always runs:
 *
 *  1. CONTENT layer (`staleProblems`) — pure text analysis of Current Status.
 *     Runs in every validator mode. After the feature PR is merged there is
 *     nothing left "waiting", so an operational section that still says
 *     "push bekleniyor" is proof the file was written before the merge.
 *
 *  2. GIT-CONTEXT layer (`closureContextProblems`) — only runs in closure mode
 *     (`--closure`, or the armed Stop-hook flag). It proves WHERE the closure
 *     is happening: a dedicated `chore/memory-close-*` branch cut from the
 *     merged main, carrying nothing but memory files, whose recorded
 *     implementation hash is a real ancestor of HEAD.
 *
 * Fail-safe: git missing or unusable degrades to a stderr warning, never a
 * block (.claude/rules/common/hooks.md). Text checks keep biting regardless.
 */
const { spawnSync } = require('node:child_process');

/**
 * Stale operational state. Documented copy of this list (binding):
 * `.claude/skills/memory-protocol/SKILL.md` → "Bayat Durum Kalıpları".
 * The bounded `[^\n.]{0,48}` window keeps "push ... bekliyor" matching across a
 * clause ("C14-C17 push'u bekliyor") without spanning unrelated sentences.
 */
const STALE_PATTERNS = [
  { label: 'push bekleniyor', re: /push[^\n.]{0,48}bekl(?:eniyor|iyor)/i },
  { label: 'onay bekliyor', re: /onay(?:ı|i)?[^\n.]{0,24}bekl(?:eniyor|iyor)/i },
  { label: 'PR açılması bekleniyor', re: /\bPR\b[^\n.]{0,48}bekl(?:eniyor|iyor)/i },
  { label: 'merge bekleniyor', re: /merge[^\n.]{0,48}bekl(?:eniyor|iyor)/i },
  { label: 'CI bekleniyor', re: /\bCI\b[^\n.]{0,48}bekl(?:eniyor|iyor)/i },
  { label: 'pending', re: /\bpending\b/i },
];

/**
 * Sections scanned for stale state. `## Memory Closure Commiti` is EXCLUDED on
 * purpose: its "PENDING — closure commit henüz oluşturulmadı" placeholder is
 * the documented pre-closure value, so a blanket PENDING scan would block every
 * legitimate closure (memory-protocol, seal convention).
 */
const OPERATIONAL_SECTIONS = [
  '## Aşama',
  '## Son Tamamlanan Görev',
  '## Aktif Görev',
  '## Blocker',
  '## Sonraki 3 Adım',
  '## Son Uygulama Commiti',
];

const CLOSURE_BRANCH_RE = /^chore\/memory-close-\d{4}-\d{2}-\d{2}-[a-z0-9-]+$/;

/** Dirty paths a memory-only closure may legitimately carry. */
const ALLOWED_DIRTY = [
  'project-memory/',
  '.claude/hooks/.session-close-pending', // governance artefact, not a code change
];

/** Text of one "## ..." section (heading -> next "## "). */
function sectionOf(text, heading) {
  const idx = text.indexOf(heading);
  if (idx === -1) return null;
  return text.slice(idx + heading.length).split(/^## /m)[0];
}

/** Stale operational state in the closure-relevant sections. */
function staleProblems(text) {
  const problems = [];
  for (const heading of OPERATIONAL_SECTIONS) {
    const body = sectionOf(text, heading);
    if (body === null) continue; // missing heading is reported by the caller
    for (const { label, re } of STALE_PATTERNS) {
      if (re.test(body)) {
        problems.push(
          `"${heading}" bölümünde bayat operasyonel ifade var (${label}). ` +
            'Memory closure MERGE SONRASI yapılır: bekleyen iş kalmamalı ' +
            '(bkz. memory-protocol → Bayat Durum Kalıpları)'
        );
      }
    }
  }
  return problems;
}

function git(root, args) {
  return spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

/** True when git is callable at all; otherwise the caller degrades to a warning. */
function gitAvailable(root) {
  const probe = git(root, ['rev-parse', '--is-inside-work-tree']);
  return !probe.error && probe.status === 0;
}

function branchProblems(root) {
  const head = git(root, ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (head.status !== 0) return [];
  const branch = head.stdout.trim();
  if (!CLOSURE_BRANCH_RE.test(branch)) {
    return [
      `Memory closure yanlış dalda deneniyor: "${branch}". Kapanış, feature PR ` +
        'merge edildikten SONRA güncel main\'den açılan ' +
        '"chore/memory-close-<yyyy-mm-dd>-<project-slug>" dalında yapılır ' +
        '(feature dalında closure yasak — /finish-session).',
    ];
  }
  // The closure branch must sit on top of the merged main, otherwise the merge
  // it is supposed to record is not even in its history. Only an explicit
  // "not an ancestor" (exit 1) blocks: a repository without an `origin/main`
  // ref makes git exit 128, which is a missing-context case, not a violation.
  const onMain = git(root, ['merge-base', '--is-ancestor', 'origin/main', 'HEAD']);
  if (onMain.status === 1) {
    return [
      `Closure dalı "${branch}" güncel origin/main üzerinden açılmamış ` +
        '(feature merge\'i bu dalın geçmişinde yok) — main\'i çekip dalı yeniden aç.',
    ];
  }
  return [];
}

function dirtyPathProblems(root) {
  const status = git(root, ['status', '--porcelain=v1', '--untracked-files=all']);
  if (status.status !== 0) return [];
  const paths = status.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, '').split(' -> ').pop().trim());
  const offenders = paths.filter((rel) => !ALLOWED_DIRTY.some((ok) => rel.startsWith(ok)));
  if (offenders.length === 0) return [];
  return [
    `Memory-only closure'da memory dışı değişiklik var: ${offenders.slice(0, 8).join(', ')}` +
      `${offenders.length > 8 ? ` (+${offenders.length - 8})` : ''}. ` +
      'Closure PR yalnız project-memory/** taşır; implementasyon değişikliği feature PR\'ına aittir.',
  ];
}

/**
 * The hash recorded under "## Son Uygulama Commiti" must be the real feature
 * MERGE commit and therefore an ancestor of HEAD. A branch-head hash that never
 * landed on main fails here — that is the point (brief P0-4).
 */
function ancestryProblems(root, statusText) {
  const section = sectionOf(statusText, '## Son Uygulama Commiti');
  const hash = section && section.match(/\b[0-9a-f]{7,40}\b/);
  if (!hash) {
    return ['Son Uygulama Commiti bölümünde ancestry doğrulanacak commit hash yok'];
  }
  const sha = hash[0];
  if (git(root, ['rev-parse', '--verify', '--quiet', `${sha}^{commit}`]).status !== 0) {
    return [`Kayıtlı uygulama commiti bu repository'de bulunamadı: ${sha}`];
  }
  if (git(root, ['merge-base', '--is-ancestor', sha, 'HEAD']).status !== 0) {
    return [
      `Kayıtlı uygulama commiti HEAD'in atası değil: ${sha}. ` +
        'Buraya feature dalının head\'i değil, gerçek feature MERGE commit\'i yazılır.',
    ];
  }
  return [];
}

/**
 * Git-context problems for closure mode. Returns { problems, warnings } so a
 * missing git degrades to a warning while the text layer keeps enforcing.
 */
function closureContextProblems(root, statusText) {
  if (!gitAvailable(root)) {
    return {
      problems: [],
      warnings: [
        'UYARI — git çalıştırılamadı: closure dal/dirty-path/ancestry kontrolleri ' +
          'atlandı (fail-safe). Başlık ve bayat-durum kontrolleri koştu.',
      ],
    };
  }
  return {
    problems: [
      ...branchProblems(root),
      ...dirtyPathProblems(root),
      ...ancestryProblems(root, statusText),
    ],
    warnings: [],
  };
}

module.exports = {
  STALE_PATTERNS,
  OPERATIONAL_SECTIONS,
  CLOSURE_BRANCH_RE,
  ALLOWED_DIRTY,
  sectionOf,
  staleProblems,
  closureContextProblems,
};
