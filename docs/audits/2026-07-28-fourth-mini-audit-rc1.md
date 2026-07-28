# Site Skeleton — Dördüncü Bağımsız Mini-Denetim

## Denetim Kimliği

| Alan | Değer |
|---|---|
| Repository | `gokhan-kocaoglu/site-skeleton` |
| Denetlenen release candidate | `v1.0.0-rc.1` |
| Denetlenen exact commit | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` |
| Release id | `361113458` |
| Release adı | `site-skeleton v1.0.0-rc.1` |
| draft / prerelease / immutable | `false` / `true` / **`true`** |
| publishedAt | `2026-07-28T13:37:11Z` |
| Denetim tarihi | 2026-07-28 |
| Denetim tipi | Bağımsız, salt-okuma, izole clone |
| Denetim ortamı | `%TEMP%\site-skeleton-fourth-mini-audit-2026-07-28\repo` (temiz clone, exact tag) |
| Kaynak repository | Denetim boyunca **değiştirilmedi** (salt-okuma) |

**Rol zinciri ve dürüstlük şerhi.**

1. **project-manager** — audit charter, kapsam, acceptance matrix, kanıt planı,
   baseline sayılar, bootstrap script tespiti, evidence gap listesi: **tamamlandı**
   ve bu rapora işlendi.
2. **qa-test-specialist kapsamındaki clean-environment doğrulaması** —
   orkestratör tarafından izole clone üzerinde **birebir koşuldu**; her komutun
   gerçek exit code'u ve sayısal sonucu aşağıda kayıtlıdır.
3. **code-reviewer** (security / governance / scope-boundary) — **tamamlandı**
   (salt-okuma; hiçbir komut çalıştırmadı, yalnız statik okuma + `git grep`).
   Bulguları bu rapora entegre edilmiştir. **Kapsam şerhi (önemli):**
   code-reviewer'ın görev tanımı **toolchain sürüm/advisory yüzeyini
   içermiyordu** ve ajan hiçbir ağ sorgusu yapmadı; bu nedenle onun
   "yeni HIGH: 0 · disposition Approve" sonucu F4-HIGH-01 ile **çelişmez** —
   o bulgunun dayandığı GitHub Advisory ve npm registry verisi ajanın
   incelemediği bir yüzeydir. Ajanın kendi beyan ettiği "incelenmedi" listesi
   §"Kapsam dışı bırakılan inceleme alanları" altında aynen korunmuştur.
4. **project-manager sentezi** — bu raporun verdict/disposition/tavsiye
   bölümleri.

Developer ajanları ve memory-steward **çağrılmadı** (görev gereği).

---

## Yönetici Özeti

`v1.0.0-rc.1` etiketinin kimliği, immutability'si ve kriptografik release
attestation'ı bağımsız olarak yeniden doğrulandı; tag tam olarak
`f891910d…` commit'ine pinlidir ve `gh release verify` exit 0 döner.

Exact tag'in temiz clone'unda **bütün zorunlu gate'ler yeniden üretilebildi**:
`pnpm gate` 7/7 PASS, `mvn --batch-mode verify` BUILD SUCCESS (gerçek
Testcontainers + postgres:16 + Flyway), hook harness 302 assertion,
`verify-structure` 1074 check, negatif senaryolar 19/19, bootstrap transaction
7/7, bootstrap generated-repo E2E tüm assertion'lar PASS, kritik-domain kapsam
teli 2/2. Post-merge CI run `30362297255` altı aktif job'da success.
Bağımsız `/new-project` kullanıcı senaryosu sıfırdan koşuldu ve üretilen proje
kendi gate'ini 7/7 geçti.

Buna rağmen denetim **yeni bir HIGH tedarik zinciri bulgusu** tespit etti:
repository `packageManager` alanında **`pnpm@9.15.4`** sürümünü pinler; bu
sürüm, RC1'den bir ay önce (2026-06-26/27) yayımlanmış **birden çok HIGH
şiddetli GitHub Security Advisory** kapsamındadır ve **9.x hattında düzeltme
yoktur** (ilk yamalı sürümler 10.34.x / 11.x). pnpm 9 hattı en son
2025-03-10'da sürüm almıştır. Bu açık, repository'nin kendi tedarik zinciri
kapılarının **kör noktasındadır**: `pnpm audit --prod` bağımlılıkları tarar,
paket yöneticisinin kendisini taramaz (bu denetimde de "No known
vulnerabilities found" döndü) ve Trivy repo/JAR taraması `packageManager`
alanını değerlendirmez.

Ayrıca aktivasyon kapısının kapsamı, dokümanların verdiği garantiden dardır:
`activationGates` yalnız `admin-bff` sinyallerini tanır; `templates/` altındaki
beş modülden yalnız birinde `ACTIVATION.md` vardır (bu bulguya orkestratör ve
code-reviewer **bağımsız olarak** ulaştı). code-reviewer ayrıca README/CLAUDE.md'de
release-candidate durumunun hiç bildirilmediğini ve core `apps/web` için
güvenlik başlığı (CSP/HSTS/X-Frame-Options) politikasının ne kodda ne
checklist'te bulunduğunu tespit etti.

Toplam yeni bulgu: **CRITICAL 0 · HIGH 1 · MEDIUM 3 · LOW 6.**

Bu nedenle formel verdict **FAIL**, production-readiness hükmü
**CORE_SKELETON_NOT_PRODUCTION_READY**, `v1.0.0` tavsiyesi
**NO_GO_REMEDIATION_REQUIRED**'dır. Bulgu `v1.0.0-rc.1` release'ini veya
attestation'ını geçersiz kılmaz; remediation düşük maliyetlidir.

---

## Kapsam ve Kapsam Dışı

**Kapsam içi (core skeleton):** `apps/web`, `apps/admin`, `apps/api`,
`packages/**`, `scripts/**`, `.claude/**`, `.github/workflows/ci.yml`,
`docs/**`, kök yapılandırma (`package.json`, `pnpm-workspace.yaml`,
`turbo.json`, `pnpm-lock.yaml`), dış attestation yüzeyi (Release/tag, ruleset,
post-merge CI).

**Kapsam dışı (dormant optional modules):** `templates/admin-bff`,
`templates/payments`, `templates/e2e` (Playwright aktivasyonu), `templates/db`,
`templates/operations` (backend-ops aktivasyon parçaları).
Bu modüller yalnız kendi aktivasyon checklist'i ve hardening'i tamamlandıktan
sonra production kapsamına girebilir.

**Denetlenmeyen ve verilmeyen iddia:** *"Tüm optional modülleriyle
production-ready."*

---

## Release/Tag/Attestation Kimliği

`gh release view v1.0.0-rc.1 --json …` → exit 0:

```json
{"isDraft":false,"isImmutable":true,"isPrerelease":true,
 "name":"site-skeleton v1.0.0-rc.1","publishedAt":"2026-07-28T13:37:11Z",
 "tagName":"v1.0.0-rc.1",
 "targetCommitish":"f891910d9e6877b4ce40d5833cb42579c6d3d9f1",
 "url":"https://github.com/gokhan-kocaoglu/site-skeleton/releases/tag/v1.0.0-rc.1"}
```

`gh release verify v1.0.0-rc.1 --repo gokhan-kocaoglu/site-skeleton` → **exit 0**:

```text
Resolved tag v1.0.0-rc.1 to sha1:f891910d9e6877b4ce40d5833cb42579c6d3d9f1
Loaded attestation from GitHub API
✓ Release v1.0.0-rc.1 verified!
```

`--format json` çıktısı (3860 bayt) parse edildi; top-level anahtarlar
`attestation`, `verificationResult`.

| Alan | Değer | Beklenen | Sonuç |
|---|---|---|---|
| `statement._type` | `https://in-toto.io/Statement/v1` | — | OK |
| `predicateType` | `https://in-toto.io/attestation/release/v0.2` | aynı | **PASS** |
| `subject[0].uri` | `pkg:github/gokhan-kocaoglu/site-skeleton@v1.0.0-rc.1` | aynı | **PASS** |
| `subject[0].digest.sha1` | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` | tag target | **PASS** |
| `predicate.tag` | `v1.0.0-rc.1` | aynı | **PASS** |
| `predicate.repository` | `gokhan-kocaoglu/site-skeleton` | aynı | **PASS** |
| `predicate.databaseId` | `361113458` | release id | **PASS** |
| signer SAN | `https://dotcom.releases.github.com` | aynı | **PASS** |
| bundle mediaType | `application/vnd.dev.sigstore.bundle.v0.3+json` | — | OK |
| DSSE payloadType | `application/vnd.in-toto+json` (1 imza) | — | OK |

Git tarafı: `git rev-list -n 1 v1.0.0-rc.1` = `f891910d…`;
`git describe --tags --exact-match` = `v1.0.0-rc.1`;
`git rev-parse --is-shallow-repository` = `false`.

Release veya tag üzerinde **hiçbir mutation yapılmadı**.

---

## Ortam Envanteri

| Araç | Sürüm |
|---|---|
| Node.js | v22.19.0 |
| corepack | 0.34.0 |
| pnpm | 9.15.4 |
| Java | 21.0.8 LTS (Oracle, build 21.0.8+12-LTS-250) |
| Maven | Apache Maven 3.9.9 |
| Docker | Client 29.6.1 / Docker Desktop 4.80.0, Engine 29.6.1 |
| git | 2.51.0.windows.1 |
| GitHub CLI | 2.96.0 |
| OS | Windows 11 Pro 10.0.26200 |

Zorunlu araçların hiçbiri eksik değildir; otomatik kurulum yapılmadı.
Not: `corepack enable` bu makinede `EPERM` (yönetici hakkı gerektiren
`C:\Program Files\nodejs\pnpm` shim yazımı) ile exit 1 verdi; pnpm 9.15.4 zaten
global olarak mevcut olduğundan kurulum ve gate'ler etkilenmedi. Bu bir
repository bulgusu değildir, ortam notudur.

---

## Çalıştırılan Komutlar ve Exit Code'lar

Tümü izole clone kökünde (`…\repo`) koşuldu.

| # | Komut | Exit | Sonuç |
|---|---|---|---|
| K-01 | `pnpm install --frozen-lockfile` | **0** | 461 paket; lockfile değişmedi; tracked diff boş |
| K-02 | `pnpm gate` | **0** | 7/7 PASS |
| K-03 | `node scripts/tests/critical-domain-coverage-negative.mjs` | **0** | 2/2 workspace PASS |
| K-04 | `mvn --batch-mode verify` (apps/api) | **0** | BUILD SUCCESS, Tests run: 5 |
| K-05 | `node scripts/verify-structure.mjs` | **0** | PASS — 1074 checks |
| K-06 | `node scripts/tests/verify-structure-negative.mjs` | **0** | 19/19 senaryo PASS |
| K-07 | `node .claude/hooks/tests/run-tests.js` | **0** | 302 assertion / 94 fixture PASS |
| K-08 | `node scripts/tests/bootstrap-transaction.mjs` | **0** | 7/7 senaryo PASS |
| K-09 | `node scripts/tests/bootstrap-e2e.mjs` | **0** | tüm assertion'lar PASS (51 s) |
| K-10 | `pnpm audit --prod` | **0** | "No known vulnerabilities found" |
| K-11 | `gh release view` / `gh release verify` | **0** / **0** | attestation VALID |
| K-12 | `gh api …/rulesets/18469047`, `…/runs/30362297255/jobs` | **0** | aşağıda |
| K-13 | `git rev-list -n 1 v1.0.0-rc.1`, `git describe --exact-match` | **0** | tag = HEAD |
| K-14 | Bağımsız `/new-project` senaryosu (ayrı temp kopya) | **0** | aşağıda |

Kaynak checkout üzerinde `pnpm install`, build veya test **çalıştırılmadı**.

---

## Clean Clone Reproducibility

```text
git clone --no-local --single-branch --branch v1.0.0-rc.1 . <AuditRepo>
HEAD                      = f891910d9e6877b4ce40d5833cb42579c6d3d9f1
git describe --exact-match = v1.0.0-rc.1
is-shallow                 = false
working tree               = clean (git status --short boş)
```

`pnpm install --frozen-lockfile` sonrası `git status --short` **boş** ve
`git diff --stat -- pnpm-lock.yaml` **boş** → lockfile ve hiçbir tracked dosya
kurulumdan etkilenmedi. Postinstall betiği kaynaklı değişiklik gözlenmedi.
`pnpm gate` sonrası da tracked diff boştur.

**Sonuç: exact tag temiz ortamda yeniden üretilebilir.**

---

## Frontend/Workspace Gate Sonuçları

`pnpm gate` (exit 0, ~64 s):

```text
Gate            Result
--------------  ------------
build           PASS
typecheck       PASS
lint            PASS
test            PASS
audit           PASS
structure       PASS
contract-drift  PASS

All gates PASS
```

Ayrıntı:

- **audit gate:** `critical:0 high:0 moderate:0 low:0 info:0` → PASS
- **structure gate:** `PASS — 1074 checks OK`
- **negative:** `19/19 senaryo PASS (mode=skeleton-dev)`
- **contract-drift:** `docs/api-contracts/openapi.yaml` doğrulandı, tipler
  yeniden üretildi, `contract and generated types agree`
- **Kapsam (v8):** `apps/admin` All files 100 / 100 / 100 / 100 ·
  `apps/web` All files 84.61 stmts / 100 branch / 71.42 funcs / 84.61 lines
  (global gate eşiği %60 — karşılanıyor)
- **Kritik-domain teli:** `node scripts/tests/critical-domain-coverage-negative.mjs`
  → web ve admin'de yerleştirilen probe dosyaları %80 eşiğini **gerçekten kırdı**
  (her ikisi exit 1) → `2/2 workspace PASS`. Eşik canlıdır, dekoratif değildir.

---

## Backend/Maven/Testcontainers Sonuçları

`cd apps/api; mvn --batch-mode verify` → **exit 0**, `BUILD SUCCESS`, toplam
34.1 s. Docker mevcut olduğu için **gerçek Testcontainers kanıtı** üretildi;
`-Pit-local` fallback'ine **başvurulmadı**.

```text
Testcontainers version: 2.0.5
Found Docker environment with local Npipe socket (npipe:////./pipe/docker_engine)
tc.testcontainers/ryuk:0.14.0 -- Container ... started in PT1.4636137S
tc.postgres:16 -- Container postgres:16 started in PT2.9851849S
org.flywaydb.core.FlywayExecutor : Database: jdbc:postgresql://localhost:45167/test (PostgreSQL 16.14)
o.f.c.i.s.JdbcTableSchemaHistory : Creating Schema History table "public"."flyway_schema_history" ...
Tests run: 2, Failures: 0, Errors: 0, Skipped: 0 -- in com.skeleton.api.contract.JacksonContractIT
Tests run: 3, Failures: 0, Errors: 0, Skipped: 0 -- in com.skeleton.api.health.HealthEndpointIT
Results: Tests run: 5, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
```

| Alan | Değer |
|---|---|
| Sonuç | BUILD SUCCESS (exit 0) |
| Test sayısı | 5 (failsafe/IT); surefire birim testi: 0 |
| Failure / Error / Skipped | 0 / 0 / 0 |
| Testcontainers | 2.0.5, gerçek Docker Engine 29.6.1, `postgres:16` (16.14) |
| Flyway | Şema geçmişi tablosu oluşturuldu, `V1__baseline.sql` uygulandı |
| Profil | varsayılan (`it-local` **kullanılmadı**) |
| Hibernate | `ddl-auto: validate` (`application.yml:14`), `open-in-view: false` |

Not: `apps/api` yalnız entegrasyon testleri taşır (surefire `Tests run: 0`).
Bu, iskelet aşamasında domain kodu bulunmamasının doğal sonucudur ve bulgu
olarak sayılmamıştır; ilk gerçek feature ile birim testleri gelecektir.

---

## Bootstrap ve Generated-Repo Sonuçları

**Transaction invariant'ları** (`bootstrap-transaction.mjs`, exit 0) — 7/7:

```text
PASS — dry-run tek bayt yazmaz ve planı gösterir
PASS — kirli çalışma ağacında --apply reddedilir
PASS — çakışan hedefte plan doğrulaması yazmadan reddeder
PASS — Java taşıma hedefi doluysa plan reddedilir
PASS — transaction ortasında hata tam rollback üretir
PASS — move rename hatası önceki operasyonları tamamen geri alır
PASS — tutarsız manifest state kontrollü hata üretir
kaynak repo hiç yazılmadı (fixture kökü: repo kopyası)
```

**Generated-repository E2E** (`bootstrap-e2e.mjs`, exit 0, 51 s) — tüm
assertion'lar PASS; üretilen projede project-mode `verify-structure` exit 0,
aynı-slug idempotency, farklı-slug reddi, iskelet kimliği kalıntısı yok,
tarihsel source-brief ve test raporu değiştirilmedi, temp temizlendi.

Bu iş **browser Playwright E2E'si değildir**; üretilen repository'nin kendi
gate'ini koşan bootstrap sertifikasyonudur.

### Bağımsız `/new-project` kullanıcı senaryosu

Gerçek script karşılığı repository kaynağından çıkarıldı (tahmin edilmedi):

- `.claude/commands/new-project.md:13` → `node scripts/bootstrap-project.mjs <proje-adi>`
- `.claude/commands/new-project.md:18` → `--apply` → `pnpm install` → `pnpm gate`
- `scripts/bootstrap-project.mjs:66` → `kullanım: node scripts/bootstrap-project.mjs <proje-adi> [--apply]`

Ayrı temp kopyada (bootstrap-e2e'den bağımsız), slug `audit-probe-alpha`:

| Kontrol | Sonuç |
|---|---|
| Temiz ağaç preflight (kirli ağaçta `--apply`) | **reddedildi**, exit 1: "çalışma ağacı kirli (1 yol)" |
| Dry-run tek bayt yazmıyor | **PASS** (exit 0, sonrasında `git status --short` boş) |
| `--apply` başarısı | **PASS** (exit 0) |
| `projectSlug` manifest kaydı | **PASS** — `mode=project projectSlug=audit-probe-alpha` |
| Memory üretimi | **PASS** — `01_Projects/audit-probe-alpha/` altında 3 ana dosya + 8 rol dizini `.gitkeep` |
| SiteSkeleton arşiv davranışı | **PASS** — canlı kopya yok, `01_Projects/_ARCHIVE/SiteSkeleton` mevcut (taşındı, silinmedi) |
| Generated project mode | **PASS** — `mode=project` |
| `verify-structure` | **PASS** — exit 0, `775 checks OK` (project-mode kural seti) |
| İskelet kimliği kalıntısı | **PASS** — dönüştürülen dosyalarda `site-skeleton` / `@skeleton/` / `com.skeleton` yok |
| Aynı slug ikinci koşu (idempotent) | **PASS** — exit 0, "idempotent çıkış — hiçbir dosyaya yazılmadı", `git status` değişmedi |
| Farklı slug kontrollü fail | **PASS** — exit 1, mesaj iki slug'ı da adlandırıyor, hiçbir şey yazılmadı |
| `SKIP_API=1 pnpm gate` | aşağıdaki şerhe bakınız |

**Şeffaflık şerhi (bulgu olarak sayılmamıştır).** İlk kopyada
`SKIP_API=1 pnpm gate` `test` aşamasında FAIL verdi; hata vitest'in başlangıç
hatasıydı: `ERR_PACKAGE_IMPORT_NOT_DEFINED: Package import specifier
"#module-evaluator" is not defined`. Kök neden aranırken şunlar **elendi**:
sürüm sapması (her iki ağaçta da vitest 4.1.10 ve vite 8.1.5 birebir aynı),
paket içeriği (`imports` alanı her iki ağaçta da `#module-evaluator` tanımlı,
hedef dosya mevcut), gölgeleyen `dist/package.json` (yok), sembolik bağ hedefi
(aynı), Windows MAX_PATH (LongPathsEnabled=1; kısa yol üzerinden de aynı hata),
`--prefer-offline` farkı (yeniden kurulum sorunu gidermedi).
**Sıfırdan temiz bir kopyada aynı belgeli akış** (clone → `--apply` →
`pnpm install` → `SKIP_API=1 pnpm gate`, slug `audit-probe-gamma`) **exit 0 ile
7/7 PASS verdi.** Dolayısıyla hata yeniden üretilemedi ve o tek ağaca özgü bir
kurulum/store bozulması olarak sınıflandırıldı; repository defect'i olarak
raporlanmamıştır. Kanıt: `fresh-gate.log` → `All gates PASS`.

---

## Security ve Supply-Chain Sonuçları

`pnpm audit --prod` → exit 0, **"No known vulnerabilities found"**
(gate içi ölçüm: `critical:0 high:0 moderate:0 low:0 info:0`).

Post-merge CI run **30362297255** (salt-okuma, rerun yapılmadı):

```text
CI  push  completed  success  f891910d9e6877b4ce40d5833cb42579c6d3d9f1  main  2026-07-28T13:10:58Z
```

| Job | Durum |
|---|---|
| quality-gate-ubuntu | success |
| api-verify-testcontainers | success |
| hooks-and-structure-windows | success |
| gitleaks-full-history | success |
| bootstrap-e2e | success |
| supply-chain-trivy | success |
| dependency-review | **skipped** (main push'ta beklenen) |

Altı aktif job success. `supply-chain-trivy` adım kırılımı:

```text
 7. Trivy vulnerability scan (repository)      success
 8. Trivy vulnerability scan (API jar)         success
 9. Generate CycloneDX SBOM (inventory only)   success
10. Assert SBOM inventory                      success
11. Upload SBOM                                success
```

**Secret ve credential hijyeni.** `gitleaks-full-history` job'u success
(tam git geçmişi taraması). `.gitleaks.toml` varsayılan kural setini
`useDefault = true` ile genişletir ve **tek** muafiyet taşır:
`.claude/hooks/tests/fixtures/**` (hook'ları test etmek için kasıtlı sahte
secret'lar). Muafiyet dar ve gerekçelidir. Manuel grep taraması yalnız ek
savunma olarak koşuldu ve Gitleaks'in yerine geçmez. Tracked `.env`, private
key, gerçek credential, PAT, cloud key veya DB parolası tespit edilmedi.
Rapora hiçbir secret/credential değeri yazılmamıştır.

code-reviewer'ın bağımsız taraması bunu doğrular: tracked `.env` yalnız
`apps/web/.env.example` (placeholder); `.pem` / `.key` / `.p12` / `.pfx` /
`.jks` uzantılı dosya sayısı **0**; PEM özel anahtar başlık deseni yalnız bir
hook fixture'ında; PAT / Slack / Stripe-live / AWS / npm token desenlerinin
**tamamı** `.claude/hooks/tests/fixtures/` altında kasıtlı sentetik test
verisidir ve Gitleaks muafiyeti tam bu yola sınırlıdır.
`.claude/mcp/*.example.json` yalnız yer tutucu değerler taşır.
`application.yml` default profilde credential fallback'i **yoktur**
(fail-fast); `local` / `it-local` profillerindeki yerel geliştirme parolası
bilinçli ve belgelidir. Release notlarında secret yoktur. **Gerçek credential
bulunmamıştır.**

*Yan kanıt:* bu raporun yazımı sırasında `pre-write-secret-scan` hook'u,
PEM başlık desenini birebir içeren bir taslak cümleyi **fiilen engelledi**
(deny). Hook zinciri canlıdır.

### Stack destek durumu (birincil resmî kaynaklar)

| Stack | Kurulu sürüm | Resmî destek durumu | Endişe | Release-blocking | Kanıt kaynağı |
|---|---|---|---|---|---|
| Node.js | `>=22.12.0` (koşan: 22.19.0) | **Maintenance LTS**, EOL **2027-04-30** | Aktif LTS değil (v24); ~9 ay destek kaldı | HAYIR | nodejs/Release `schedule.json` (resmî) |
| pnpm | **9.15.4** (pin) | 9.x hattı son sürüm **2025-03-10** (9.15.9); güncel hat 11.17.0 | **Birden çok HIGH advisory; 9.x'te yama YOK** | **EVET** | GitHub Advisory DB + npm registry |
| Turborepo | ^2.10.7 | `latest` = 2.10.7 | yok | HAYIR | npm registry dist-tags |
| Next.js | 16.2.12 | Güncel sürüm 16.2.12 | yok | HAYIR | nextjs.org docs (version alanı) |
| React | 19.2.8 | `latest` = 19.2.8 | yok | HAYIR | npm registry dist-tags |
| Vite | ^8.1.5 | `latest` = 8.1.5 | yok | HAYIR | npm registry dist-tags |
| Spring Boot | 4.1.0 | 2026-06-10 GA; OSS desteği ≥13 ay → ~2027-07 | yok | HAYIR | spring.io blog + spring.io/support-policy |
| Java | 21 (LTS) | LTS, aktif destekte | yok | HAYIR | ADR-0009 + Oracle LTS statüsü |
| PostgreSQL | 16 (16.14 test) | Destekte, EOL **2028-11-09** | yok | HAYIR | postgresql.org/support/versioning |
| Flyway | Boot 4.1 BOM yönetimli | BOM ile güncel | yok | HAYIR | `apps/api/pom.xml` |
| Testcontainers | 2.0.5 (BOM) | Güncel; Docker 29 uyumlu | yok | HAYIR | mvn çıktısı + pom yorumu |

Sürümün "en son" olmaması tek başına bulgu sayılmamıştır; yalnız EOL,
desteklenmeyen veya bilinen release-blocking güvenlik sorunu bulgu sayılmıştır.

---

## Governance ve Ruleset Sonuçları

`gh api repos/gokhan-kocaoglu/site-skeleton/rulesets/18469047`:

```text
18469047   main-branch-protection   branch   active
conditions: ref_name.include = ["~DEFAULT_BRANCH"]
rules: deletion · non_fast_forward · required_status_checks · pull_request
strict_required_status_checks_policy = true
bypass_actors = []
```

Required checks — **7/7 birebir eşleşti**:

```text
quality-gate-ubuntu · api-verify-testcontainers · hooks-and-structure-windows
gitleaks-full-history · supply-chain-trivy · dependency-review · bootstrap-e2e
```

`main`'e doğrudan push koruması: `deletion` + `non_fast_forward` kuralları
etkin, `bypass_actors` **boş** (istisna yok), enforcement `active`, strict
politika `true` (dal güncel olmadan merge edilemez).

True-merge workflow kanıtı — son beş merge commit'inin tamamı iki ebeveynli
gerçek merge commit'idir:

```text
f891910  parents=a9df423 360e7af  Merge pull request #32 …
a9df423  parents=90bbf12 68790e2  Merge pull request #30 …
90bbf12  parents=cf5226f 4e94374  Merge pull request #29 …
cf5226f  parents=dda8342 733a813  Merge pull request #28 …
dda8342  parents=f5b9eb1 7a5d0ec  Merge pull request #27 …
```

Ruleset üzerinde **hiçbir değişiklik yapılmadı**.

---

## Core/Optional Scope Boundary

| # | Kontrol | Sonuç | Kanıt |
|---|---|---|---|
| 1 | `templates/**` core build/gate kapsamında çalışmıyor | **PASS** | `pnpm-workspace.yaml` yalnız `apps/*` + `packages/*`; `templates/` hiçbir workspace'te değil |
| 2 | Optional modüllerin `ACTIVATION.md` checklist'leri mevcut | **FAIL** | 5 template dizininden yalnız `templates/admin-bff/ACTIVATION.md` var; `db`, `e2e`, `operations`, `payments` yok |
| 3 | `activationGates` recursive çalışıyor | **PASS** | `verify-structure-negative`: nested/rename senaryoları PASS; `apps/**` altında her derinlikte tarama |
| 4 | BFF dizin/paket/marker (3 sinyal) test ediliyor | **PASS** | negatif senaryolar: sinyal 1 dizin adı, sinyal 2 package name, sinyal 3 `ADMIN_BFF_TEMPLATE_MARKER` |
| 5 | BFF hardening eksikleri core iddiaya gizlenmiyor | **PASS** | BFF-1/2/3 risk defterinde açıkça MEDIUM, sahipli, core dışı olarak kayıtlı |
| 6 | README/release notes core ↔ optional ayrımı yapıyor | **PASS** | `README.md:120-126`; `docs/releases/v1.0.0-rc.1.md:124-132` |
| 7 | "Tüm modülleriyle production-ready" iddiası yok | **PASS** | 7 eşleşmenin **tamamı yasak beyanı/meta-atıf**; hiçbiri iddia değil. `fully production-ready` = 0 |

**Kapsam sınırının kendisi RESPECTED'dır:** dormant modüller build dışıdır,
production-ready iddiasının kapsamında değildir ve yasaklı ifade hiç
kullanılmamıştır. Ancak madde 2 nedeniyle **aktivasyon kapısının kapsamı
dokümanların verdiği garantiden dardır** (bkz. F4-MEDIUM-01):
`activationGates` manifest'inde tek kayıt vardır (`admin-bff`), oysa
`README.md:123-125` garantiyi kopyalanan *herhangi* bir template'e genelleştirir.

---

## Dokümantasyon Tutarlılığı

- README'de belgelenen komutlar (`pnpm build|test|type-check|lint`, `pnpm gate`,
  `mvn verify`, `pnpm test:bootstrap-e2e`, `node scripts/bootstrap-project.mjs`)
  repository'de **gerçekten mevcuttur** ve bu denetimde koşulmuştur.
- Windows kurulum yolu (`docs/setup/local-setup-windows.md`), Node/Java/
  PostgreSQL gereksinimleri, Corepack/pnpm komutları, Docker/Testcontainers
  gereksinimi, `/new-project` başlangıç akışı, MCP user-scope/secret sınırı,
  optional module activation sınırı, CI/ruleset açıklaması ve release-candidate
  uyarısı belgelenmiştir.
- `docs/releases/v1.0.0-rc.1.md` hâlâ "TASLAK — henüz yayınlanmadı",
  "Release ve tag oluşturulmamıştır" der ve `RC1_RELEASE_TARGET_SHA`,
  `FINAL_EVIDENCE_MERGE_SHA` gibi açık placeholder'lar taşır. Bu **bayatlık
  değil, sözleşme gereğidir**: `docs/operations/release-attestation.md:117-120`
  bu alanların repo-içi PR ile doldurulmasını açıkça yasaklar (aksi hâlde her
  release yeni kanıt PR'ı → yeni closure → zincir kapanmaz). Gerçek değerler
  dış immutable Release üzerinde mühürlenmiştir ve bu denetimde doğrulanmıştır.
  Bulgu sayılmamıştır.
- Release-blocking doküman drift'i tespit **edilmedi**; F4-MEDIUM-01 ve
  F4-LOW-01 doküman/gerçek sapmalarıdır ancak release'i yanlış yönlendirme
  eşiğinin altındadır (F4-MEDIUM-01 aktivasyon garantisinin kapsamıyla ilgilidir).

---

## Önceki Üç Kabul Edilmiş Risk

### Risk 1 — Optional module hardening (BFF-1/2/3) · MEDIUM

| Alan | Değer |
|---|---|
| Durum | **confirmed / open** (değişmedi) |
| Core dışında mı | **EVET** — `templates/admin-bff` build'e girmez |
| Sahip | Aktivasyon-anı implementer (kayıtlı) |
| Mitigation | `verify-structure` `activationGates`; `ACTIVATION.md` 12 maddesi tamamlanmadan gate FAIL — bu denetimde negatif senaryolarla **fiilen doğrulandı** |
| Aktivasyon gate etkin mi | **EVET** (admin-bff için; üç sinyal, recursive) |
| Release-blocking | **HAYIR** |

### Risk 2 — Hook tam shell parser değildir · LOW

| Alan | Değer |
|---|---|
| Durum | **confirmed / open** |
| Sınır dürüstçe belgeli mi | **EVET** — alias/encoding/dinamik eval/obfuscation kapsam dışı olarak yazılı |
| Güvenlik ağı aktif mi | **EVET** — `gitleaks-full-history` run 30362297255'te success |
| Yeni bypass bulgusu | **YOK** (302 assertion / 94 fixture harness yeşil) |
| Sahip | Orkestratör |
| Release-blocking | **HAYIR** |

### Risk 3 — Type-aware lint derinliği (ADR-0012) · LOW

| Alan | Değer |
|---|---|
| Durum | **confirmed / open** |
| Erteleme kararı kayıtlı mı | **EVET** — `docs/adr/ADR-0012-lint-enforcement-depth.md` mevcut; gerekçe ölçümlü (~2× süre + tsc mükerrerliği) |
| Lint/type-check zinciri çalışıyor mu | **EVET** — `pnpm gate` içinde `lint` ve `typecheck` PASS |
| Kritik kaçak üretiyor mu | Tespit edilmedi |
| Sahip | Orkestratör |
| Release-blocking | **HAYIR** |

Üç riskin üçü de **açık, kayıtlı ve sahiplidir**; hiçbirinin durumu
değişmemiştir ve hiçbiri tek başına core release'i engellemez.

---

## Yeni Bulgular

### F4-HIGH-01 — Pinlenen pnpm sürümü çok sayıda HIGH advisory kapsamında ve 9.x hattında yaması yok

```text
ID:       F4-HIGH-01
Başlık:   packageManager pnpm@9.15.4 — düzeltilemeyen HIGH tedarik zinciri açıkları
Severity: HIGH
Domain:   security / supply-chain
```

**Kanıt:**

- `package.json:5` → `"packageManager": "pnpm@9.15.4"`
- `.github/workflows/ci.yml:28-29` → `pnpm/action-setup` sürümü bu alandan okur
  (CI de aynı sürümü kullanır)
- `docs/setup/local-setup-windows.md:12` → `corepack prepare pnpm@9.15.4 --activate`
- GitHub Advisory DB (`gh api "advisories?ecosystem=npm&affects=pnpm@9.15.4"`)
  → 20 advisory döner; doğrulanan HIGH örnekleri ve **yamalı ilk sürümleri**:

  | GHSA | Severity | Etkilenen aralık | İlk yamalı sürüm | Yayım |
  |---|---|---|---|---|
  | GHSA-qrv3-253h-g69c | high | `< 10.34.4` | 10.34.4 | 2026-06-27 |
  | GHSA-w466-c33r-3gjp (CVE-2026-55698) | high | `< 10.34.2` | 10.34.2 | 2026-06-26 |
  | GHSA-5wx6-mg75-v57r (CVE-2026-55487) | high | `< 10.34.2` | 10.34.2 | 2026-06-26 |
  | GHSA-rxhj-4m44-96r4 (CVE-2026-50015) | high | `< 10.34.0` | 10.34.0 | 2026-06-26 |
  | GHSA-72r4-9c5j-mj57 · GHSA-fr4h-3cph-29xv · GHSA-gj8w-mvpf-x27x · GHSA-hwx4-2j3j-g496 | high | `< 10.34.x` | 10.34.x | 2026-06 |

- npm registry: `9.15.4` yayım 2025-01-13; **9.x hattının son sürümü 9.15.9
  (2025-03-10)**; `latest` = 11.17.0. → Yamalı sürümlerin hiçbiri 9.x'te yok.
- Bu denetimdeki kapı çıktıları: `pnpm audit --prod` = "No known
  vulnerabilities found" (exit 0); `supply-chain-trivy` job'u success.
  **Hiçbiri paket yöneticisinin kendisini denetlemez.**
- **Otomatik güncelleme yolu yok:** `grep -rn "packageManager" scripts/
  .github/workflows/` → yalnız açıklama yorumu; hiçbir gate bu alanı
  denetlemez. `.github/dependabot.yml` npm ekosisteminde
  `version-update:semver-major` güncellemelerini **yok sayar**; yamalı sürüm
  ise major yükseltme gerektirir (9 → 10/11). Dolayısıyla pin ne kapılarla ne
  bot ile kendiliğinden düzelir.

**Etkisi:** Advisory'lerin bir bölümü `pnpm install` sırasında
repository-kontrollü içerikten (lockfile, manifest, configDependencies) yola
çıkarak dizin dışına yazma veya yaşam döngüsü betiği çalıştırma imkânı verir
(ör. "Manifest identity spoof satisfies allowBuilds and runs attacker
lifecycle", "Project env lockfile can short-circuit package-manager resolution
and execute lockfile-selected pnpm bytes"). İskeletten üretilen **her proje**
bu pini devralır ve gerçek projeler üçüncü taraf paket kurar. Açık, 9.x
hattında kapatılamaz; hat 16 aydır sürüm almamaktadır. Bu durum, repository'nin
kendi ADR-0009 kural 3'ü ("baseline yalnız OSS desteği süren hatlarda tutulur")
ve ADR-0015 tedarik zinciri sertleştirme amacıyla da çelişir.

**Release blocker:** **EVET** (v1.0.0 "production-ready" iddiası için).
`v1.0.0-rc.1` release'ini veya attestation'ını geçersiz kılmaz.

**Zorunlu remediation:**
1. `packageManager` alanını yamalı bir hatta yükselt (en az 10.34.4; tercihen
   güncel 11.x), `pnpm-lock.yaml`'ı yeniden üret.
2. `docs/setup/local-setup-windows.md` ve `docs/source-briefs/skeleton-brief.md`
   içindeki `corepack prepare pnpm@…` satırlarını eşitle.
3. Tam gate zincirini yeniden koş (`pnpm gate`, `mvn verify`, bootstrap E2E) ve
   yeşil kanıtla commit'le (ADR-0009 kural 5).
4. Toolchain sürümlerini (packageManager, Node) kapsayan bir kontrol ekle —
   mevcut kapılar bu yüzeyi taramıyor; ADR-0009 "otomatik EOL kontrolü" borcuyla
   birlikte ele alınabilir.

**Sahip:** Orkestratör / repository maintainer.

---

### F4-MEDIUM-01 — Aktivasyon kapısı kapsamı, dokümandaki garantiden dar

```text
ID:       F4-MEDIUM-01
Başlık:   activationGates yalnız admin-bff'i tanır; 5 template dizininden 4'ünde ACTIVATION.md yok
Severity: MEDIUM
Domain:   scope / governance / docs
```

**Kanıt:**

- `scripts/structure-manifest.json` → `activationGates` **tek** kayıt:
  `{"id":"admin-bff","nameFragment":"bff","marker":"ADMIN_BFF_TEMPLATE_MARKER","checklistItems":12}`
- `find templates -name ACTIVATION.md` → yalnız `templates/admin-bff/ACTIVATION.md`
- `ls templates/` → `admin-bff`, `db`, `e2e`, `operations`, `payments` (5 dizin)
- `README.md:123-125` (genelleştirilmiş garanti):
  "Copying one under `apps/` arms the structural activation gate: its
  `ACTIVATION.md` hardening checklist must be fully ticked or
  `verify-structure` FAILs."
- `docs/releases/v1.0.0-rc.1.md:126-130`: "Kopyalanıp etkinleştirilen **her**
  modül, kendi `ACTIVATION.md` sertleştirme checklist'i tamamlanmadan
  production'a çıkamaz."

**Etkisi:** `templates/payments/` (ödeme sağlayıcı portu — en güvenlik-hassas
optional modül) `apps/` altına kopyalanırsa hiçbir yapısal kapı silahlanmaz:
ne `ACTIVATION.md` vardır ne de manifest sinyali. Doküman, verilenden daha geniş
bir teknik garanti beyan eder. Kapsam sınırının kendisi (build dışılık,
production-ready iddiasının dışında olma) ihlal edilmemiştir; sorun
**enforcement kapsamı ile beyan arasındaki farktır**.

**Release blocker:** **HAYIR** (core kapsamı production'a optional modül
sızdırmıyor; risk aktivasyon anında doğar).

**Zorunlu remediation:** ya `payments`/`e2e`/`db`/`operations` için
`ACTIVATION.md` + `activationGates` kayıtları eklenerek garanti gerçeklenir, ya
da README/release dili garantiyi açıkça yalnız `admin-bff` ile sınırlayacak
şekilde daraltılır. İkisinden biri seçilmelidir.

**Sahip:** Orkestratör / repository maintainer.

---

### F4-MEDIUM-02 — README ve CLAUDE.md deponun release-candidate durumunu bildirmiyor

```text
ID:       F4-MEDIUM-02
Severity: MEDIUM
Domain:   docs / release
Kaynak:   code-reviewer
```

**Kanıt:** `git grep -n -i "release candidate\|rc\.1" -- README.md CLAUDE.md`
→ **0 sonuç**. `README.md:150-158` "Build phases" listesi
"8 build phases + 8.1 remediation + 8.2 sealing (recertified)" der; **Faz 8.3
ve `v1.0.0-rc.1` hiç geçmez**, oysa tag'in kendisi 8.3 kapanışıdır. RC uyarısı
yalnız `docs/releases/v1.0.0-rc.1.md:3-21` içindedir.

**Etkisi:** "Use this template" ile bu tag'i klonlayan kullanıcı, deponun
v1.0.0 değil release candidate olduğunu ve dördüncü denetimin sonucunu
README'den öğrenemez.

**Release blocker:** HAYIR.
**Zorunlu remediation:** README'ye kısa RC şerhi + Faz 8.3 satırı
(`docs/releases/v1.0.0-rc.1.md` linkiyle).
**Sahip:** Orkestratör.

---

### F4-MEDIUM-03 — Core web için güvenlik başlığı ne kodda ne checklist'te var

```text
ID:       F4-MEDIUM-03
Severity: MEDIUM
Domain:   security
Kaynak:   code-reviewer
```

**Kanıt:**
`git grep -il "content-security-policy\|X-Frame-Options\|strict-transport\|helmet"`
→ **0 dosya** (tüm depo). `apps/web/next.config.ts:3` →
`const nextConfig: NextConfig = {};` (`headers()` yok).
`templates/operations/production-checklist.md` yalnız `apps/api` odaklıdır
(Actuator, metrics, logging, shutdown, pool, supply chain); web başlık
sertleştirme maddesi yoktur. `docs/operations/deployment.md:1-14` "Taslak" ve
başlık/TLS politikası içermez.

**Etkisi:** "Core skeleton production-ready baseline" iddiasının içindeki
`apps/web`, sıfır güvenlik başlığıyla ve bunu ekletecek hiçbir checklist
maddesi olmadan gelir. Mevcut placeholder sayfada istismar edilebilir bir açık
yoktur; boşluk **kayıtsız** olduğu için MEDIUM'dur.

**Release blocker:** HAYIR.
**Zorunlu remediation:** `templates/operations/production-checklist.md`'e web
bölümü (CSP, HSTS, X-Frame-Options/frame-ancestors, Referrer-Policy,
Permissions-Policy) ya da `next.config.ts` `headers()` iskeleti + ADR.
**Sahip:** system-architect (içerik) / orkestratör (yazım).

---

### F4-LOW-01 — `docs/operations/production-checklist.md` yok

```text
ID:       F4-LOW-01
Severity: LOW
Domain:   docs
```

**Kanıt:** Dosya `docs/operations/` altında **yoktur**; gerçek yol
`templates/operations/production-checklist.md` (aktivasyon şablonu).
`docs/operations/` altında `release-attestation.md`, `ci.md` vb. mevcuttur.

**Etkisi:** Denetim/işletim kaynağı arayan okuyucu için yol belirsizliği;
işlevsel etkisi yoktur (şablon projeye alındığında `docs/`e taşınır).

**Release blocker:** HAYIR.
**Zorunlu remediation:** Yol referanslarının şablon konumunu göstermesi ya da
çekirdek bir işletim checklist'inin `docs/operations/` altına alınması.
**Sahip:** Orkestratör.

---

### F4-LOW-02 — Paket sürümleri ile release tag'i arasında yazılı ilişki yok

```text
ID:       F4-LOW-02
Severity: LOW
Domain:   release / governance
```

**Kanıt:** `package.json` → `"version": "0.1.0"`; `apps/web`, `apps/admin` aynı;
`apps/api/pom.xml` → `0.1.0-SNAPSHOT`. Release tag'i `v1.0.0-rc.1`.
Bu farkı açıklayan yazılı politika bulunamadı.

**Etkisi:** Sürümleme otoritesinin (tag mı, manifest mi) belirsiz kalması;
`v1.0.0` anında hangi dosyaların güncelleneceği tanımsızdır.

**Release blocker:** HAYIR.
**Zorunlu remediation:** Sürümleme politikasının bir satırla kayda geçmesi
(ör. "kaynak-of-truth git tag'idir; paket sürümleri private/sabit tutulur").
**Sahip:** Orkestratör.

---

### F4-LOW-03 — Ruleset, anayasanın yasakladığı merge yöntemlerine izin veriyor

```text
ID:       F4-LOW-03
Severity: LOW
Domain:   governance
```

**Kanıt:** `gh api …/rulesets/18469047` → `pull_request.allowed_merge_methods`
= `["merge","squash","rebase"]`. Repository çalışma protokolü ise merge'in
**her zaman** gerçek merge commit'i olmasını, squash/rebase'in yasak olmasını
şart koşar. Ayrıca `required_approving_review_count = 0`.

**Etkisi:** Kural teknik olarak zorlanmıyor; disiplin şu ana kadar **fiilen
korunmuştur** (son beş merge'in tamamı iki ebeveynli gerçek merge commit'i).
Tek maintainer bağlamında review sayısı 0 makuldür.

**Release blocker:** HAYIR.
**Zorunlu remediation:** `allowed_merge_methods` yalnız `["merge"]` olacak
şekilde daraltılabilir (opsiyonel sertleştirme).
**Sahip:** Repository maintainer.

---

### F4-LOW-04 — `apps/web` ürün metni core/optional ayrımı yapmadan "production-ready" diyor

```text
ID: F4-LOW-04 · Severity: LOW · Domain: scope / docs · Kaynak: code-reviewer
```

**Kanıt:** `apps/web/app/layout.tsx:15,20,29`, `apps/web/app/page.tsx:10`,
`apps/web/app/opengraph-image.tsx:12` — "A production-ready web project
skeleton" / "Production-ready monorepo starter".
**Etkisi:** README ve release notunda özenle kurulan "core production-ready;
optional modules require activation hardening" ayrımı, deponun kamuya açık
yüzeyinde niteliksiz kalır. **Yasaklı ifade değildir** (ne "fully" ne "tüm
modülleriyle"), yalnız nitelenmemiştir.
**Release blocker:** HAYIR. **Sahip:** frontend-developer + seo-specialist, PM onayı.

---

### F4-LOW-05 — `activationGates` marker sinyali, marker dosyasının dizinini "root" sayıyor

```text
ID: F4-LOW-05 · Severity: LOW · Domain: build / scope · Kaynak: code-reviewer
```

**Kanıt:** `scripts/verify-structure.mjs:262-278` — marker eşleşmesinde
`roots.add(dirRel)` **o alt dizini** ekler; `apps/foo/src/server.mjs`
senaryosunda `ACTIVATION.md` `apps/foo/src/` altında aranır (`:280-284`).
**Etkisi:** Yön **güvenlidir** (false-FAIL üretir, false-PASS değil), ancak
hata mesajı yanlış dizini gösterir → düzeltme yanlış yere yapılabilir. Negatif
testler marker'ı hep dizin kökünde tuttuğu için senaryo kapsanmaz.
**Release blocker:** HAYIR. **Sahip:** Orkestratör.

---

### F4-LOW-06 — `/api/health/ready` kimlik doğrulamasız iki DB sorgusu koşuyor

```text
ID: F4-LOW-06 · Severity: LOW · Domain: security · Kaynak: code-reviewer
```

**Kanıt:** `apps/api/.../health/HealthController.java:37-42` (`SELECT 1` +
`SELECT count(*) FROM flyway_schema_history`); depoda Spring Security kurulu
değildir (manifest `mustBeAbsent` ile tutarlı).
**Etkisi:** Public readiness probe her istekte DB'ye gider — küçük
amplifikasyon yüzeyi. **Veri sızıntısı yoktur**: hata yolunda loglar jenerik,
yanıt `{"status":"DOWN"}`.
**Release blocker:** HAYIR.
**Zorunlu remediation:** production-checklist'e "probe endpoint'lerini ağ
seviyesinde sınırla / rate-limit" maddesi.
**Sahip:** backend-developer (aktivasyon anı).

---

### Bulgu sayıları

| Severity | Yeni bulgu | ID'ler |
|---|---|---|
| CRITICAL | **0** | — |
| HIGH | **1** | F4-HIGH-01 |
| MEDIUM | **3** | F4-MEDIUM-01, -02, -03 |
| LOW | **6** | F4-LOW-01 … -06 |

Kaynak dağılımı: F4-HIGH-01, F4-MEDIUM-01 (ortak), F4-LOW-01/-02/-03 →
orkestratör doğrulaması; F4-MEDIUM-01 (ortak), -02, -03, F4-LOW-04/-05/-06 →
code-reviewer. F4-MEDIUM-01'e iki rol **bağımsız olarak** ulaşmıştır.

### Gözlemler (bulgu değil)

1. **Node.js 22 hattı Maintenance LTS'tir** (maintenance 2025-10-21, EOL
   2027-04-30). ADR-0009 kural 3'ün "desteklenen hat" ölçütünü karşılar, ancak
   Active LTS (v24) değildir; planlı yükseltme penceresi ~9 aydır.
2. **`apps/api` yalnız entegrasyon testi taşır** (surefire `Tests run: 0`,
   failsafe 5). İskelette domain kodu bulunmamasının doğal sonucudur.
3. **Memory'de MEDIUM-10 hâlâ `PENDING_USER_ACTION` görünür**
   (`Current Status.md:39,46`). Tag ağacı mühürlendiği anda release henüz
   yoktu, dolayısıyla kayıt o an **doğruydu**; `release-attestation.md:117-120`
   repo-içi doldurmayı açıkça yasakladığı (sonsuz closure döngüsü) için bu
   satır bir sonraki meşru memory closure'a kadar bu hâlde kalır. MEDIUM-10'un
   kapanış kanıtı repo içinde değil, dış immutable Release + geçerli
   attestation'dadır — bu denetimde doğrulanmıştır.
   `session-close-validator` bu ifadeyi bayat kalıp saymaz (exit 0).
4. **Auth/token değişmezleri şu an sözleşme düzeyindedir, implementasyon
   değil.** İskelette auth katmanı yoktur (Spring Security "approved default",
   kurulu değil); `apps/api/src/main` içinde `SecurityFilterChain`, CORS veya
   CSRF yapılandırması bulunmaz. Bu nedenle "refresh token rotation +
   reuse-revoke", "token localStorage'a yazılmaz" gibi değişmezler
   `CLAUDE.md:27` ve `.claude/rules/common/security.md:28`'de **bağlayıcı
   sözleşme** olarak kayıtlıdır ve denetim yalnız *ihlal bulunmadığını*
   doğrulayabilir (`localStorage` kullanımı: 0 — yalnız yasağı hatırlatan bir
   yorum satırı). Gerçek doğrulama ilk auth feature'ında yapılmalıdır.
   Baseline migration konvansiyonlara uyar: `BIGINT GENERATED ALWAYS AS
   IDENTITY` PK + `TIMESTAMPTZ` (`V1__baseline.sql`).

---

## Acceptance Matrix

| ID | Kriter | Sonuç | Kanıt |
|---|---|---|---|
| AC-01 | Tag exact commit'e pinli, denetlenen ağaç bu commit | **PASS** | `git rev-list`, `gh release view` |
| AC-02 | Tag target = terminal closure merge SHA | **PASS** | `f891910d` = PR #32 merge commit'i |
| AC-03 | `pnpm install --frozen-lockfile` OK, lockfile değişmez | **PASS** | exit 0, diff boş |
| AC-04 | `pnpm gate` 7/7 PASS | **PASS** | exit 0 |
| AC-05 | `pnpm audit --prod` critical 0 / high 0 | **PASS** | "No known vulnerabilities found" |
| AC-06 | `mvn verify` BUILD SUCCESS, gerçek Testcontainers | **PASS** | exit 0, Tests run 5, postgres:16 |
| AC-07 | Hook harness 302/94 | **PASS** | exit 0 |
| AC-08 | `verify-structure` ≥1074 check | **PASS** | 1074 |
| AC-09 | Negatif senaryolar 19/19 | **PASS** | exit 0 |
| AC-10 | Kritik-domain kapsam teli 2/2 | **PASS** | exit 0 |
| AC-11 | bootstrap-transaction 7/7 | **PASS** | exit 0 |
| AC-12 | bootstrap-e2e PASS | **PASS** | exit 0 |
| AC-13 | Ruleset active/strict, 7 required check | **PASS** | `gh api` |
| AC-14 | `dependency-review` main push'ta skipped = beklenen | **PASS** | run 30362297255 |
| AC-15 | Actions pin disiplini | **PASS** | negatif senaryolar + structure gate |
| AC-16 | Yasaklı kapsam iddiası 0 | **PASS** | 7 eşleşme = yasak beyanı |
| AC-17 | `activationGates` recursive + 3 sinyal + 12/12 checklist | **PASS** | negatif senaryolar |
| AC-18 | Dormant modüller build/gate dışında | **PASS** | `pnpm-workspace.yaml` |
| AC-19 | Kalan risk defteri: 3 risk kayıtlı/sahipli | **PASS** | risk tabloları |
| AC-20 | Açık risk varken PASS/production-ready hükmü verilmemiş | **PASS** | belgelerde tutarlı |
| AC-21 | MEDIUM-10 kapanışı: Release + tag gerçekten mevcut | **PASS** | immutable release + attestation |
| AC-22 | Memory tazeliği / closure disiplini | **PASS** | `session-close-validator --project SiteSkeleton` exit 0 ("7 başlık + commit kanıtı tamam"); `git merge-base --is-ancestor a9df4232 HEAD` → PASS |
| AC-23 | Kanıt yeniden-üretilebilirliği | **PASS** | tüm gate'ler bu denetimde yeniden koşuldu |
| AC-24 | Core değişmezler (ddl validate, Flyway-only, NUMERIC(12,2), TIMESTAMPTZ, localStorage yasağı, framer-motion yasağı) | **PASS** | `application.yml:14`, `V1__baseline.sql`, grep taramaları |
| AC-25 | Secret yüzeyi temiz, Gitleaks yeşil, muafiyet dar | **PASS** | run 30362297255 + `.gitleaks.toml` |
| AC-26 | Sürüm tutarlılığı politikası | **FAIL (LOW)** | F4-LOW-02 |
| AC-27 | HIGH-1..4 ve MEDIUM-1..10 izlenebilirliği, `NOT_MAPPED` yok | **PASS** | kanıt raporu + provenance addendum |
| AC-29 | Aktivasyon kapısı beyan edilen kapsamı karşılıyor | **FAIL (MEDIUM)** | F4-MEDIUM-01 |
| AC-31 | Toolchain (packageManager) desteklenen ve yamalı hatta | **FAIL (HIGH)** | F4-HIGH-01 |
| AC-32 | README/CLAUDE.md deponun RC durumunu bildiriyor | **FAIL (MEDIUM)** | F4-MEDIUM-02 |
| AC-33 | Core web için güvenlik başlığı politikası kayıtlı | **FAIL (MEDIUM)** | F4-MEDIUM-03 |

Karşılanmayan kriterler: **AC-31 (HIGH)**, AC-29 · AC-32 · AC-33 (MEDIUM),
AC-26 (LOW). Yalnız AC-31 release-blocking'dir.

---

## Formal Verdict

```text
FAIL
```

**Gerekçe (`.claude/rules/common/verdict-policy.md`):**

- Kural 1 tetiklenmedi: **CRITICAL/BLOCKER bulgu yoktur.**
- Kural 3, `PASS_WITH_RISKS` için kalan risklerin "kayıtlı, sahipli ve kabul
  edilmiş" olmasını **ve hiçbirinin production'ı engellememesini** şart koşar.
  F4-HIGH-01 önceden kayıtlı/kabul edilmiş bir risk **değildir** ve production
  iddiasını engeller → bu koşul sağlanmaz.
- Kural 4: "en az bir kabul kriteri karşılanmadı" → AC-31 karşılanmamıştır.

Bu nedenle bağlayıcı formel verdict **FAIL**'dir. Üç önceden kabul edilmiş
riskin ve yeni MEDIUM/LOW bulguların tek başına yol açacağı sonuç
`PASS_WITH_RISKS` olurdu; verdict'i FAIL'e taşıyan **yalnız F4-HIGH-01**'dir.

**Reviewer disposition ile farkın açıklaması (verdict-policy kural 5).**
code-reviewer disposition'ı **Approve** ve önerdiği rapor verdict'i
`PASS_WITH_RISKS`'tir. Bu, kendi incelediği yüzey içinde **doğrudur**: o
yüzeyde CRITICAL/HIGH yoktur. Ancak ajan hiçbir ağ sorgusu yapmamış ve
toolchain advisory yüzeyini incelememiştir; F4-HIGH-01 bu yüzeyden gelir.
Verdict-policy kural 5 gereği disposition ile rapor verdict'i otomatik
eşlenmez; bağlayıcı olan, **tüm gate bulgularını gören** final sentezdir.
Final Review, eksik yüzey bilgisiyle verilmiş bir alt-verdict'i
benimseyemez.

---

## Production-Readiness Disposition

```text
CORE_SKELETON_NOT_PRODUCTION_READY
```

`CORE_SKELETON_PRODUCTION_READY` için gereken sekiz koşuldan yedisi
sağlanmıştır: exact RC1 tag denetlendi · bütün zorunlu gate'ler yeniden
üretilebildi · karşılanmayan CRITICAL yok · optional-module kapsam sınırı
doğru ve build düzeyinde teknik olarak zorlanıyor · bootstrap ile üretilen yeni
proje kendi gate'ini geçiyor · release identity ve attestation doğrulandı ·
mevcut MEDIUM/LOW riskler kayıtlı ve sahipli.

Sağlanmayan koşul: **"CRITICAL veya HIGH release blocker bulunmamış"** —
F4-HIGH-01 açık bir HIGH tedarik zinciri blocker'ıdır. Ayrıca "karşılanmayan
kabul kriteri bulunmamış" koşulu da AC-31 nedeniyle sağlanmaz (AC-29/-32/-33
MEDIUM seviyesindedir ve tek başlarına bu hükmü doğurmazdı).

**Bu hüküm yalnız core site-skeleton kapsamı içindir. Dormant optional modules
kendi activation hardening süreçleri tamamlanmadan production-ready sayılmaz.**

---

## v1.0.0 Recommendation

```text
NO_GO_REMEDIATION_REQUIRED
```

Bağlayıcı eşleme gereği (`FAIL` veya `CORE_SKELETON_NOT_PRODUCTION_READY` →
`NO_GO_REMEDIATION_REQUIRED`). Kanıt eksikliği yoktur; bu bir
`NO_GO_EVIDENCE_INCOMPLETE` değildir — bütün zorunlu kanıtlar üretilebilmiştir.

Remediation tamamlanıp gate zinciri yeniden yeşillendiğinde, kalan tablo
yalnız üç kabul edilmiş riske dönecek ve o noktada
`PASS_WITH_RISKS + CORE_SKELETON_PRODUCTION_READY + GO_FOR_V1_0_0`
kombinasyonu erişilebilir olacaktır.

Bu görev tavsiye üretir; `v1.0.0` tag/release **oluşturulmamıştır**.

---

## Zorunlu Remediation

| # | Madde | Kaynak bulgu | Öncelik |
|---|---|---|---|
| R-1 | `packageManager`'ı yamalı pnpm hattına yükselt (≥10.34.4, tercihen 11.x), lockfile'ı yeniden üret | F4-HIGH-01 | **Blocker** |
| R-2 | `docs/setup/local-setup-windows.md:12` ve `docs/source-briefs/skeleton-brief.md:349` içindeki `corepack prepare pnpm@…` satırlarını eşitle | F4-HIGH-01 | **Blocker** |
| R-3 | Tam gate zincirini yeniden koş ve yeşil kanıtla commit'le (ADR-0009 kural 5) | F4-HIGH-01 | **Blocker** |
| R-4 | Toolchain sürüm/EOL kontrolünü kapılara ekle (packageManager + Node); mevcut `pnpm audit`/Trivy bu yüzeyi taramıyor | F4-HIGH-01 | Yüksek |
| R-5 | Aktivasyon garantisini gerçekle: eksik `ACTIVATION.md` + `activationGates` kayıtları ekle **veya** README/release dilini `admin-bff` ile sınırla | F4-MEDIUM-01 | Orta |
| R-6 | `production-checklist` yol referansını netleştir | F4-LOW-01 | Düşük |
| R-7 | Sürümleme politikasını (tag ↔ manifest) bir satırla kayda geçir | F4-LOW-02 | Düşük |
| R-8 | Ruleset `allowed_merge_methods` → yalnız `["merge"]` (opsiyonel sertleştirme) | F4-LOW-03 | Düşük |
| R-9 | README'ye RC şerhi + Faz 8.3 satırı ekle | F4-MEDIUM-02 | Orta |
| R-10 | Web güvenlik başlıkları: production-checklist web bölümü ve/veya `next.config.ts` `headers()` + ADR | F4-MEDIUM-03 | Orta |
| R-11 | `apps/web` ürün metnini core/optional ayrımıyla nitele | F4-LOW-04 | Düşük |
| R-12 | `activationGates` marker kökü semantiğini düzelt + negatif test ekle | F4-LOW-05 | Düşük |
| R-13 | Probe endpoint'leri için ağ sınırlama/rate-limit checklist maddesi | F4-LOW-06 | Düşük |

R-1…R-3 tamamlanmadan `v1.0.0` etiketi atılmamalıdır. R-4…R-13 blocker
değildir ancak `v1.0.0` öncesi kapatılması önerilir.

---

## Kapsam dışı bırakılan inceleme alanları (code-reviewer beyanı)

Şeffaflık için ajanın kendi bildirimi aynen korunur — bu alanlar
**incelenmemiştir**, tamamlanmış gibi gösterilmemektedir:

- Hook kaynak kodları satır satır okunmadı (yalnız `.claude/settings.json`
  bağlama tablosu ve fixture envanteri doğrulandı). *Not: hook davranışı
  orkestratör tarafından 302 assertion / 94 fixture harness'i ile fiilen
  koşularak doğrulanmıştır.*
- `scripts/bootstrap-project.mjs` tam okunmadı; `bootstrap-e2e.mjs` /
  `bootstrap-transaction.mjs` okunmadı. *Not: her ikisi de orkestratör
  tarafından koşuldu (7/7 ve tüm assertion'lar PASS).*
- `docs/api-contracts/openapi.yaml` ↔ `packages/api-types` uyumu manuel
  doğrulanmadı. *Not: `contract-drift` gate'i koşuldu ve PASS verdi.*
- Vitest kapsam eşikleri dosya düzeyinde okunmadı. *Not: kritik-domain %80
  teli negatif testle fiilen doğrulandı (2/2).*
- `.claude/agents/**` ve `.claude/skills/**` içerikleri derinlemesine
  okunmadı; governance authority-map + settings + manifest düzeyinde doğrulandı.
- Dormant modül kodları (`templates/admin-bff/server.mjs`, `templates/db/*.sql`,
  `templates/payments/*.java`) okunmadı — **kapsam dışı**.
- code-reviewer hiçbir build/test/gate komutu çalıştırmadı ve **hiçbir ağ
  sorgusu yapmadı**; toolchain advisory yüzeyi (F4-HIGH-01) onun kapsamında
  değildi.

---

## Kanıt İndeksi

| Kanıt | Konum / kimlik |
|---|---|
| Denetim clone'u | `%TEMP%\site-skeleton-fourth-mini-audit-2026-07-28\repo` @ `f891910d…` |
| Bağımsız `/new-project` kopyası | `…\userscenario` (slug `audit-probe-alpha`) |
| Sıfırdan yeniden üretim | `%TEMP%\sk4b` (slug `audit-probe-gamma`) — `All gates PASS` |
| install / gate / mvn logları | `…\install.log`, `…\gate.log`, `…\mvn.log` |
| Bootstrap E2E logu | `…\bootstrap-e2e.log` |
| Kullanıcı senaryosu logları | `…\us-dryrun.log`, `us-apply.log`, `us-structure.log`, `us-gate.log`, `us-idem.log`, `us-diff.log` |
| Attestation JSON | `…\attest.json` (3860 bayt) |
| Post-merge CI run | [30362297255](https://github.com/gokhan-kocaoglu/site-skeleton/actions/runs/30362297255) — success |
| Final evidence merge | `a9df4232e93c92c85573560341e73152c02f873b` (PR #30), CI 30357983558 |
| Terminal closure merge / RC1 target | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` (PR #32), CI 30362297255 |
| Ruleset | `main-branch-protection` id 18469047, active, strict, 7 required check |
| Release | https://github.com/gokhan-kocaoglu/site-skeleton/releases/tag/v1.0.0-rc.1 |
| Node.js destek verisi | nodejs/Release `schedule.json` (v22: maintenance 2025-10-21, end 2027-04-30) |
| Spring Boot destek verisi | spring.io/blog (4.1.0 GA 2026-06-10) + spring.io/support-policy (min. 13 ay OSS) |
| PostgreSQL destek verisi | postgresql.org/support/versioning (16 EOL 2028-11-09) |
| pnpm advisory verisi | GitHub Advisory DB (`gh api advisories?ecosystem=npm&affects=pnpm@9.15.4`) |
| pnpm sürüm verisi | npm registry (`9.15.4` 2025-01-13; 9.x son 9.15.9 2025-03-10; latest 11.17.0) |

Denetim boyunca kaynak repository'de **hiçbir dosya değiştirilmedi**, commit/
branch/PR oluşturulmadı, memory güncellenmedi, release/tag/ruleset'e
dokunulmadı, CI rerun edilmedi ve hiçbir token/credential değeri
loglanmadı veya rapora yazılmadı.
