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

/** The one directory a memory-only closure may touch. */
const ALLOWED_DIRTY_PREFIX = 'project-memory/';

/**
 * Exact paths (never prefixes) a closure may additionally carry. Prefix
 * matching was wrong here: `.session-close-pending-extra` /
 * `.session-close-pending.backup` share the flag's prefix but are ordinary
 * files, and a startsWith() allowlist smuggled them into a memory-only PR.
 */
const ALLOWED_DIRTY_EXACT = [
  '.claude/hooks/.session-close-pending', // governance artefact, not a code change
];

/** Single, explicit allow rule for closure dirty paths. */
function isAllowedClosurePath(rel) {
  return rel.startsWith(ALLOWED_DIRTY_PREFIX) || ALLOWED_DIRTY_EXACT.includes(rel);
}

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

/**
 * Parses `git status --porcelain=v1 -z --untracked-files=all`.
 *
 * Record shape, verified empirically against git 2.51 (not assumed):
 *   ordinary     "XY <path>\0"
 *   rename/copy  "XY <NEW-path>\0<ORIG-path>\0"
 * Note the order — with `-z` the DESTINATION comes first and the ORIGINAL
 * follows as its own NUL-terminated field, the reverse of the human-readable
 * `orig -> new` rendering. `-z` also disables path quoting, so paths containing
 * spaces or quotes survive intact instead of being mangled by a text split.
 *
 * BOTH sides of a rename/copy are returned. A rename is two paths, and judging
 * only the destination hid the real danger: `git mv docs/x.md
 * project-memory/x.md` deletes a non-memory file, yet the destination alone
 * looks like a legitimate memory write.
 *
 * A record that does not match the expected shape produces an explicit problem
 * (fail-closed): an unparseable status is not evidence of a clean tree.
 */
function parsePorcelainZ(stdout) {
  const fields = stdout.split('\0');
  const paths = [];
  const problems = [];
  for (let i = 0; i < fields.length; i++) {
    const record = fields[i];
    if (record === '') continue; // trailing NUL
    if (record.length < 4 || record[2] !== ' ') {
      problems.push(`Çözümlenemeyen git status kaydı: ${JSON.stringify(record.slice(0, 60))}`);
      continue;
    }
    paths.push(record.slice(3));
    if (/[RC]/.test(record.slice(0, 2))) {
      const origin = fields[++i];
      if (!origin) {
        problems.push(`Rename/copy kaydının kaynak yolu eksik: ${JSON.stringify(record.slice(0, 60))}`);
      } else {
        paths.push(origin);
      }
    }
  }
  return { paths, problems };
}

function dirtyPathProblems(root) {
  const status = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  if (status.status !== 0) return [];
  const { paths, problems } = parsePorcelainZ(status.stdout);
  const offenders = [
    ...new Set(paths.map((rel) => rel.replace(/\\/g, '/')).filter((rel) => !isAllowedClosurePath(rel))),
  ];
  if (offenders.length > 0) {
    problems.push(
      `Memory-only closure'da memory dışı değişiklik var: ${offenders.slice(0, 8).join(', ')}` +
        `${offenders.length > 8 ? ` (+${offenders.length - 8})` : ''}. ` +
        'Closure PR yalnız project-memory/** taşır; implementasyon değişikliği feature PR\'ına aittir. ' +
        '(Rename\'in her iki tarafı da denetlenir.)'
    );
  }
  return problems;
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
  ALLOWED_DIRTY_PREFIX,
  ALLOWED_DIRTY_EXACT,
  isAllowedClosurePath,
  parsePorcelainZ,
  sectionOf,
  staleProblems,
  closureContextProblems,
};
