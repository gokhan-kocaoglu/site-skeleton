# CI

Pipeline: `.github/workflows/ci.yml` — her `push` (main) ve `pull_request`'te
koşar. Job'lar paralel çalışır; hepsi yeşil olmadan merge yok.

**Yedi job tanımlıdır: PR'da yedisi de, main push'unda altısı koşar** —
`dependency-review` yalnız `pull_request` olayında çalışır, main push run'ında
**skipped** görünür ve orada beklenmez (Faz 8.3 PR-B, ADR-0015).

## Job'lar

| Job (check adı) | Runner | Ne koşar | Lokal eşdeğeri |
|---|---|---|---|
| `quality-gate-ubuntu` | ubuntu-latest | `pnpm install --frozen-lockfile` + `pnpm gate` (build → typecheck → lint → test → audit → structure → contract-drift; `SKIP_API=1`) | `pnpm gate` |
| `api-verify-testcontainers` | ubuntu-latest | `mvn --batch-mode verify` (apps/api; Testcontainers gerçek `postgres:16` konteyneri) | `cd apps/api; mvn verify` |
| `hooks-and-structure-windows` | windows-latest | `node .claude/hooks/tests/run-tests.js` + `node scripts/verify-structure.mjs` + negatif senaryolar (path/CRLF paritesi) | aynı komutlar |
| `gitleaks-full-history` | ubuntu-latest | Gitleaks, `fetch-depth: 0` ile TÜM git geçmişini tarar; konfig: `.gitleaks.toml` | `gitleaks git .` (CLI kuruluysa) |
| `supply-chain-trivy` | ubuntu-latest | JAR build + iki Trivy vuln taraması (repo + JAR) + CycloneDX SBOM + `assert-sbom.mjs` + SBOM artifact | aşağıdaki "Lokal Trivy" bölümü |
| `bootstrap-e2e` | ubuntu-latest | `bootstrap-transaction.mjs` + `bootstrap-e2e.mjs` — geçici repoda gerçek `--apply` ve **üretilen projenin kendi gate'i** | `pnpm test:bootstrap-e2e` |
| `dependency-review` | ubuntu-latest | `actions/dependency-review-action`, `fail-on-severity: high` — **yalnız PR'da** | (yok; GitHub tarafı) |

## Supply-chain job'u (ADR-0015)

`pnpm audit --prod` yalnız npm production ağacını görür; Maven ağacı ve
üretilen JAR'ın gömülü içeriği bu job'da taranır.

- **Root taraması** (`scan-type: fs`, `scan-ref: .`) — `pnpm-lock.yaml` ve
  `apps/api/pom.xml` package manifest'lerini birlikte tarar.
- **JAR taraması** (`scan-type: rootfs`) — deterministik olarak çözülen tek
  executable Spring Boot JAR'ını, `BOOT-INF/lib` altındaki gömülü
  bağımlılıklar dahil tarar. **`fs` KULLANILMAZ**: tek bir `.jar` dosyasını
  dil-spesifik dosya olarak tanımaz, "Supported files not found" deyip exit 0
  döner — yani hiçbir şey taramadan yeşil görünür.
- **Fail semantiği:** her iki taramada `HIGH,CRITICAL` → `exit-code: 1`.
  `ignore-unfixed` kullanılmaz; **yaması olmayan HIGH/CRITICAL de fail'dir.**
  Tarama koşulamazsa sonuç temiz sayılmaz. Tam olarak bir executable JAR
  bulunamazsa (`.jar.original`, sources/javadoc/tests JAR'ları elenir) job fail
  eder.
- **SBOM verdict üretmez.** Üçüncü Trivy çağrısı `format: cyclonedx` +
  `exit-code: 0` ile çalışır; Trivy bu modda taramayı kendisi kapatır
  (`"--format cyclonedx" disables security scanning`). Envanterdir; zafiyet
  kararı yalnız yukarıdaki iki taramadan gelir.
- **SBOM assertion:** `node scripts/quality/assert-sbom.mjs <path>` — npm VE
  Maven bileşeninin birlikte bulunmasını, PostCSS 8.5.18 / Sharp 0.35.0'ın var
  ve 8.4.31 / 0.34.5'in yok olmasını doğrular; boş veya yarım taranmış bir SBOM
  kanıt sayılamaz.
- **Artifact:** `site-skeleton-cyclonedx-sbom`, `retention-days: 14`,
  `if-no-files-found: error`. SBOM repository'ye **commit edilmez**.
- Job `pnpm gate` zincirine **eklenmez** (ağ bağımlılığı + süre).
- Üç Trivy çağrısı birbirine sızmaz: action her çağrıda `trivy_envs.txt`
  dosyasını sıfırlar ve adım sonunda siler (upstream #422).

Lokal Trivy koşumunda `--skip-dirs refs` gerekir: `refs/` yalnız yerelde
duran, `.gitignore`'lu referans repo klonudur ve CI checkout'unda yoktur.

## Bootstrap sertifikasyonu (Faz 8.3 PR-C)

`bootstrap-e2e`, PR ve main push'unun ikisinde de koşar.

- **Playwright E2E DEĞİLDİR.** Buradaki "e2e", bootstrap yaşam döngüsünün
  uçtan uca kanıtıdır: iskelet geçici bir git reposuna kopyalanır → gerçek
  `--apply` → `pnpm install` → **üretilen projede** `SKIP_API=1 pnpm gate` →
  project-mode `verify-structure` → aynı slug idempotency → farklı slug reddi.
  `templates/e2e/` (Playwright) dormant şablon olarak kalır; bu job tarayıcı
  kurmaz, browser testi çalıştırmaz.
- **Maven burada koşmaz.** API kanıtı `api-verify-testcontainers` job'ındadır;
  süre nedeniyle tekrar edilmez.
- Job `pnpm gate` zincirine **eklenmez** (geçici repo kopyası + ağ kurulumu +
  tam generated-project gate: ayrı ve uzun bir check'tir).
- `bootstrap-transaction.mjs` aynı job'da önce koşar: kirli ağaç reddi,
  plan-öncesi çakışma reddi, transaction ortası rollback ve dry-run no-write.
- Negatif structure senaryoları **mode-farkındalıdır**: yalnız skeleton-dev'de
  aktif olan kurallar (guarded forbidden-pattern) bootstrap'lanmış repoda SKIP
  edilir — aksi hâlde senaryo kendini FAIL eder ve generated gate patlardı.
- **Yeni required check:** `bootstrap-e2e` GitHub'da ilk kez göründükten sonra
  ruleset'e kullanıcı tarafından eklenir (aşağıdaki Branch Protection bölümü).

## Dependency Review

Yalnız `pull_request` olayında koşar. Yeni eklenen/güncellenen
bağımlılıklarda `HIGH` veya `CRITICAL` zafiyet merge'i engeller. İlk kapsamda
license allow/deny listesi yoktur; PR yorumu yazılmadığı için job'a
`pull-requests: write` verilmez.

## Action pinleme

Harici tüm `uses:` referansları tam 40 karakter commit SHA'sına pinlidir ve
aynı satırda **exact release tag** yorumu taşır
(`actions/checkout@d23441a4… # v6.1.0`). `# v6` gibi hareketli major alias
kabul edilmez; yerel `./` action'lar muaftır. Kural
`scripts/verify-structure.mjs` `githubActionsPins` bölümüyle enforce edilir
(negatif testler: tag ref, kısa SHA, yorumsuz SHA) ve hem
`quality-gate-ubuntu` hem `hooks-and-structure-windows` üzerinden her PR'da
koşar.

Dependabot `github-actions` ekosistemi SHA'yı ve aynı satırdaki sürüm yorumunu
birlikte günceller; major action geçişleri ADR-0009 kural 4 gereği bot'a
kapalıdır.

**Action runtime hattı Node 24'tür** (checkout v6, setup-node v6, setup-java
v5, pnpm/action-setup v6). Bu, action'ın kendi runtime'ıdır — **uygulama test
matrisi Node.js 22 ve Java 21 olarak değişmemiştir.** Dependency kurmayan
`setup-node` adımlarında (`hooks-and-structure-windows`, `supply-chain-trivy`)
otomatik paket yöneticisi cache'i `package-manager-cache: false` ile
kapatılır; `quality-gate-ubuntu` `cache: pnpm` davranışını korur.

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
- Top-level `permissions: contents: read` korunur; hiçbir job'a yazma izni,
  PAT veya repository secret'ı verilmez. Supply-chain ve dependency-review
  job'ları Dependabot PR'larındaki read-only token ile çalışabilir.

## Branch Protection (GitHub UI'da manuel — insan işi)

`main` için Settings → Branches → Branch protection rule:

- Require a pull request before merging.
- Require status checks to pass; **required checks listesi (Faz 8.3 ile dörtten
  yediye çıkar):**
  1. `quality-gate-ubuntu`
  2. `api-verify-testcontainers`
  3. `hooks-and-structure-windows`
  4. `gitleaks-full-history`
  5. `supply-chain-trivy` — PR-B ile eklendi
  6. `dependency-review` — PR-B ile eklendi
  7. `bootstrap-e2e` — PR-C ile eklenecek
- Require branches to be up to date before merging.

> **Faz 8.3 şerhi:** 5 ve 6 numaralı check'ler PR-B açıkken ruleset'e eklendi
> (`main-branch-protection`, ruleset id 18469047 — altı check aktif).
> 7 numaralı `bootstrap-e2e` ruleset'e **PR-C açıldıktan ve check GitHub
> arayüzünde ilk kez göründükten sonra** eklenir — bu bir insan adımıdır ve
> repository dosyasıyla yapılamaz. Liste genişletilene kadar yeni job koşar
> ama merge'ü teknik olarak engellemez. Mevcut altı check korunur.
>
> **Actions full-SHA pin policy'si (Settings → Actions):** pinler CI'da
> doğrulandıktan sonra açılır. Policy hesap/plan nedeniyle görünmüyorsa
> **ruleset gevşetilmez**; `verify-structure` `githubActionsPins` kuralı ve
> negatif testleri bağlayıcı teknik enforcement olarak yürürlükte kalır.

Job adı değişirse bu liste ve workflow birlikte güncellenir (workflow başındaki
uyarı yorumu).

**Bilinen kısıt (2026-07-03):** Ruleset yukarıdaki listeyle yapılandırıldı,
ancak repo **private + ücretsiz GitHub planında** olduğundan enforcement
GitHub tarafından uygulanmıyor (rulesets/branch protection private repolarda
Pro/Team planı ister; public repoda ücretsizdir). Yani required-checks şu an
**bilgilendiricidir, merge'i teknik olarak engellemez** — disiplin insan
onaylı push protokolüyle korunur. Repo public olursa veya plan yükselirse
enforcement kendiliğinden devreye girer; bu not o zaman kaldırılır.

> **Kapanış şerhi (2026-07-19, Faz 8.2):** Repo public'e alındı (Seçenek A);
> ruleset enforcement'ın **Active** olduğu ve dört required check'in tamamının
> aktif olduğu kullanıcı tarafından teyit edildi. Yukarıdaki kısıt kapanmıştır;
> required-checks artık merge'i teknik olarak engeller. (Orijinal not kanıt
> bütünlüğü için korunmuştur.)

## Kanıt Kuralı

CI yeşili tek başına verdict değildir; quality-gate raporları
(`docs/test-reports/`) koşulan run'ın commit hash'ini içerir ve verdict
`.claude/rules/common/verdict-policy.md` sözlüğüyle verilir.
