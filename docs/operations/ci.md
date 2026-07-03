# CI

Pipeline: `.github/workflows/ci.yml` — her `push` (main) ve `pull_request`'te
koşar. Dört bağımsız job paralel çalışır; hepsi yeşil olmadan merge yok.

## Job'lar

| Job (check adı) | Runner | Ne koşar | Lokal eşdeğeri |
|---|---|---|---|
| `quality-gate-ubuntu` | ubuntu-latest | `pnpm install --frozen-lockfile` + `pnpm gate` (build → typecheck → lint → test → audit → structure → contract-drift; `SKIP_API=1`) | `pnpm gate` |
| `api-verify-testcontainers` | ubuntu-latest | `mvn --batch-mode verify` (apps/api; Testcontainers gerçek `postgres:16` konteyneri) | `cd apps/api; mvn verify` |
| `hooks-and-structure-windows` | windows-latest | `node .claude/hooks/tests/run-tests.js` + `node scripts/verify-structure.mjs` (path/CRLF paritesi) | aynı komutlar |
| `gitleaks-full-history` | ubuntu-latest | Gitleaks, `fetch-depth: 0` ile TÜM git geçmişini tarar; konfig: `.gitleaks.toml` | `gitleaks git .` (CLI kuruluysa) |

Notlar:

- Backend, `quality-gate-ubuntu` içinde `SKIP_API=1` ile atlanır çünkü kendi
  job'unda (`api-verify-testcontainers`) tam `mvn verify` koşar — sinyal ayrışır,
  iki job paralel biter.
- `gate-audit` üç durumludur: CI'da (`CI` env'i runner'da her zaman set)
  **INCONCLUSIVE = FAIL** — "tarayamadım" asla "temiz" sayılmaz. Lokalde yalnız
  uyarıdır.
- `gate-test`, `test` script'i olmayan pnpm workspace'i FAIL eder
  (allowlist + gerekçe: `scripts/quality/gate-test.mjs`).
- Hook fixture'ları kasıtlı sahte secret içerir; Gitleaks muafiyeti YALNIZ
  `.claude/hooks/tests/fixtures/` yoludur (`.gitleaks.toml`).
- Gitleaks job'u organizasyon repolarında `GITLEAKS_LICENSE` secret'ı ister;
  kişisel repoda gerekmez (gitleaks-action v2 davranışı).

## Branch Protection (GitHub UI'da manuel — insan işi)

`main` için Settings → Branches → Branch protection rule:

- Require a pull request before merging.
- Require status checks to pass; **required checks listesi:**
  1. `quality-gate-ubuntu`
  2. `api-verify-testcontainers`
  3. `hooks-and-structure-windows`
  4. `gitleaks-full-history`
- Require branches to be up to date before merging.

Job adı değişirse bu liste ve workflow birlikte güncellenir (workflow başındaki
uyarı yorumu).

**Bilinen kısıt (2026-07-03):** Ruleset yukarıdaki listeyle yapılandırıldı,
ancak repo **private + ücretsiz GitHub planında** olduğundan enforcement
GitHub tarafından uygulanmıyor (rulesets/branch protection private repolarda
Pro/Team planı ister; public repoda ücretsizdir). Yani required-checks şu an
**bilgilendiricidir, merge'i teknik olarak engellemez** — disiplin insan
onaylı push protokolüyle korunur. Repo public olursa veya plan yükselirse
enforcement kendiliğinden devreye girer; bu not o zaman kaldırılır.

## Kanıt Kuralı

CI yeşili tek başına verdict değildir; quality-gate raporları
(`docs/test-reports/`) koşulan run'ın commit hash'ini içerir ve verdict
`.claude/rules/common/verdict-policy.md` sözlüğüyle verilir.
