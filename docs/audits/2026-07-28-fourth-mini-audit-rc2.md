# Site Skeleton — Dördüncü Bağımsız Mini-Denetim (RC2 Yeniden Koşumu)

## 1. Denetim Kimliği

| Alan | Değer |
|---|---|
| Repository | `gokhan-kocaoglu/site-skeleton` |
| Denetlenen release | `v1.0.0-rc.2` |
| Release ID | `361341678` |
| Release adı | `site-skeleton v1.0.0-rc.2` |
| Denetlenen exact commit | `175213d519acf199498a8efa7b307f5b4d5f44cd` |
| draft / prerelease / immutable | `false` / `true` / **`true`** |
| publishedAt | `2026-07-28T19:57:09Z` |
| Tarihsel karşılaştırma | `v1.0.0-rc.1` · id `361113458` · target `f891910d…` · verdict `FAIL / CORE_SKELETON_NOT_PRODUCTION_READY / NO_GO_REMEDIATION_REQUIRED` |
| Denetim ortamı | `%TEMP%\site-skeleton-fourth-mini-audit-rc2-2026-07-28\repo` — **ağdan** temiz clone |
| Denetim tarihi | 2026-07-28 |

Kaynak çalışma repository'si (`D:\Kodlar\Claude\site-skeleton`) bu denetimde
**hiç kullanılmadı**: install, build, test, checkout, edit veya commit
yapılmadı.

## 2. Rol Zinciri ve Dürüstlük Şerhi

1. **project-manager** — audit charter, kapsam, RC1 bulgu envanteri + "RC2'de
   nasıl yeniden üretilir" kontrol listesi, acceptance matrix, baseline
   sayıları, RC1→RC2 beklenen değişiklik kapsamı, R-4 doğrulama planı,
   memory/attestation semantiği. **Tamamlandı.** Kendi beyanı: bu rol
   oturumunda komut çalıştırılmadı (yalnız Read/Grep/Glob); tüm komut kanıtı
   QA'ya devredildi.
2. **qa-test-specialist kapsamındaki doğrulama** — orkestratör tarafından izole
   clone üzerinde **birebir koşuldu**; her komutun gerçek exit code'u ve
   sayısal sonucu §9'da kayıtlıdır. Hiçbir komut geçmiş rapordan PASS
   sayılmadı.
3. **code-reviewer** — security · supply chain · governance · scope boundary ·
   release doğruluğu · RC1 bulgularının yeniden değerlendirilmesi. Bu turda
   toolchain sürümü, pnpm advisory yüzeyi ve Node/EOL borcu **açıkça kapsama
   alınarak** başlatıldı (RC1'deki "bu yüzey incelenmedi" sınırlaması
   tekrarlanmasın diye). **Tamamlandı.** Disposition: **Approve** ·
   scope boundary: **RESPECTED** · önerdiği rapor verdict'i:
   **`PASS_WITH_RISKS`**.

   Ajan on RC1 bulgusunu bağımsız olarak yeniden ölçtü (sonuçları
   orkestratörün ölçümleriyle **birebir örtüştü**), guard'ın bypass yüzeyini
   statik olarak izledi ve **dört yeni LOW bulgu** ile F4-LOW-03 için bir
   **düzeltme** üretti. Bunların tamamı bu raporda §16 ve §18'e işlendi;
   orkestratör her birini denetlenen ağacın aynısı üzerinde (kaynak repo
   `main` = `175213d5…`) **bağımsız olarak doğruladı** — hiçbiri teyitsiz
   alınmadı.

   **Ajanın kendi kapsam şerhi (aynen korunur):** hiçbir build/test/gate
   komutu çalıştırmadı ve **hiçbir ağ sorgusu yapmadı**; release/tag/
   attestation/ruleset/CI/advisory yüzeyi onun tarafından doğrulanmadı.
   Bu yüzeylerin kanıtı orkestratörün canlı koşumlarındadır (§5, §13, §14.3)
   ve ajanın verdict'i açıkça o kanıtlara bağımlı olduğunu belirtir. Ayrıca
   ajan `bootstrap-*`, hook harness, `openapi.yaml`↔`api-types`, `pnpm-lock`
   paket-bazlı denetimi ve dormant `templates/**` kodunu incelemediğini
   beyan etmiştir; bunların bir kısmı orkestratör tarafından fiilen koşulmuş
   (§9), `templates/**` ise tanım gereği kapsam dışıdır (§25).
4. **project-manager sentezi** — bu raporun verdict/disposition/tavsiye
   bölümleri.

Developer ajanları ve memory-steward **çağrılmadı**.

**Bağımsızlık notu:** RC1 bulgularının her biri RC2 ağacında orkestratör
tarafından **yeniden ölçüldü**; önceki raporun sonucu kopyalanmadı. Advisory
sayıları canlı GitHub Advisory Database sorgusuyla yeniden üretildi.

## 3. Yönetici Özeti

`v1.0.0-rc.2` tag'i, ağdan alınan temiz clone'da exact commit
`175213d519acf199498a8efa7b307f5b4d5f44cd`'ye çözülür; release immutable
prerelease'tir ve GitHub'ın kriptografik release attestation'ı **11/11 alanda**
doğrulanmıştır (`gh release verify` exit 0).

**RC1'in tek release blocker'ı olan F4-HIGH-01 bağımsız olarak KAPANMIŞTIR.**
Kapanış repository raporuna güvenilerek değil, canlı kanıtla doğrulandı:
`packageManager` exact `pnpm@10.34.4`; çalışan pnpm 10.34.4; toolchain guard
`pnpm gate` zincirinin ilk adımı ve 12/12 negatif senaryo canlı;
**canlı advisory sorgusunda `pnpm@10.34.4` için toplam advisory sayısı 0**
(eski pin `pnpm@9.15.4` için unwithdrawn HIGH **10**).

Bütün zorunlu gate'ler temiz clone'da yeniden üretildi: `pnpm gate` **8/8
PASS**, `mvn verify` BUILD SUCCESS (gerçek Testcontainers 2.0.5 + postgres:16 +
Flyway), `verify-structure` **1089**, structure negative **19/19**, hook harness
**302/94**, toolchain negative **12/12**, bootstrap transaction **7/7**,
bootstrap E2E tüm assertion PASS, kritik-domain teli **2/2**,
`pnpm audit --prod` temiz. Bağımsız `/new-project` senaryosunda üretilen proje
`pnpm@10.34.4` pinini devraldı ve **kendi gate'ini 8/8** geçti.

RC1→RC2 farkı beklenen **9 commit**tir ve `apps/**`, `templates/**`,
`packages/**`, `.github/**` altında **hiçbir değişiklik yoktur** — kapsam dışı
mutation bulunmadı.

RC1'in blocker olmayan dokuz bulgusu (F4-MEDIUM-01/-02/-03 ve F4-LOW-01…-06)
**bilinçli olarak açık** bırakılmıştır ve RC2'de aynen doğrulanmıştır; hepsi
kayıtlı, sahipli ve non-blocking'dir. Bu denetim **bir yeni MEDIUM ve üç yeni LOW
bulgu** tespit etti: operasyon/release dokümantasyonunun release gerçekliğiyle
senkron olmaması (MEDIUM — ağaç, dördüncü denetimin raporunu taşırken "denetim
başlatılmadı" der); guard'ın **çalışan** pnpm ikilisini değil yalnız beyanı
doğrulaması (LOW — merge yolunda CI tarafından kapatılır); `skeleton-brief.md`
içindeki kısmi güncelleme kaynaklı iç tutarsızlık (LOW); ve brief'in major
yükseltme maliyetini olduğundan küçük göstermesi (LOW). **Hiçbiri yapıya,
güvenliğe veya build'e etkili değildir ve hiçbiri release-blocking değildir.**

Ayrıca RC1'in **F4-LOW-03 çerçevelemesi düzeltildi**: anayasa squash/rebase'i
yazılı olarak yasaklamıyor (grep = 0 sonuç), dolayısıyla "ruleset ↔ anayasa
çelişkisi" değil bir **yazılı kural boşluğudur**.

Açık CRITICAL veya HIGH release blocker **yoktur**. Verdict-policy kural 3/6
gereği açık kayıtlı riskler mevcut olduğundan `PASS` erişilemez; ulaşılan
sonuç **`PASS_WITH_RISKS`**, production-readiness hükmü
**`CORE_SKELETON_PRODUCTION_READY`** (yalnız core kapsamı) ve tavsiye
**`GO_FOR_V1_0_0`**'dır.

## 4. Kapsam ve Kapsam Dışı

**Kapsam içi (core):** `apps/web` · `apps/admin` · `apps/api` · `packages/**` ·
`scripts/**` (RC2 ile eklenen toolchain guard dosyaları dahil) · `.claude/**` ·
`.github/workflows/ci.yml` · `docs/**` · kök konfig · dış attestation yüzeyi
(Release/tag/ruleset/post-merge CI).

**Kapsam dışı (dormant optional modules):** `templates/admin-bff` ·
`templates/payments` · `templates/e2e` · `templates/db` ·
`templates/operations`. Bunlar yalnız kendi aktivasyon checklist'i ve hardening'i
tamamlandıktan sonra production kapsamına girer.

**Denetlenmeyen ve verilmeyen iddia:** *"Tüm optional modülleriyle
production-ready."*

## 5. Release/Tag/Attestation Kimliği

`gh release view v1.0.0-rc.2` (salt-okuma):

```text
databaseId = 361341678
tagName    = v1.0.0-rc.2
name       = site-skeleton v1.0.0-rc.2
target     = 175213d519acf199498a8efa7b307f5b4d5f44cd
draft      = false
prerelease = true
immutable  = true
publishedAt= 2026-07-28T19:57:09Z
```

Beklenen değerlerin **tamamı** eşleşti.

**Release body doğrulaması:** placeholder taraması eşleşme vermedi (exit 1);
target SHA, PR #33/#34 zinciri ve dört CI run kimliği (`30390258046`,
`30391043626`, `30392688620`, `30393181957`) mevcut; `GHSA-qrv3-253h-g69c` ve
`GHSA-fr4h-3cph-29xv` kimlikleri kayıtlı. "production-ready" geçen beş satırın
**tamamı olumsuzlama/koşuldur** (`production-ready hükmü vermez`,
`GO_FOR_V1_0_0 kararı vermez`, …) — doğrudan GO veya production-ready iddiası
**yoktur**. Node/EOL borcu `MEDIUM` olarak kayıtlıdır. Release target,
terminal closure merge SHA'sı ile aynıdır.

**Attestation — `gh release verify` exit 0 (insan-okur):**

```text
Resolved tag v1.0.0-rc.2 to sha1:175213d519acf199498a8efa7b307f5b4d5f44cd
Loaded attestation from GitHub API
✓ Release v1.0.0-rc.2 verified!
```

JSON koşusu da **exit 0** (3860 bayt). Şema önce fiilen incelendi
(`attestation` / `verificationResult` → `bundle.dsseEnvelope`); alan yolları
tahmin edilmedi.

| Alan | Değer | Sonuç |
|---|---|---|
| `statement._type` | `https://in-toto.io/Statement/v1` | **PASS** |
| `predicateType` | `https://in-toto.io/attestation/release/v0.2` | **PASS** |
| subject URI | `pkg:github/gokhan-kocaoglu/site-skeleton@v1.0.0-rc.2` | **PASS** |
| subject digest sha1 | `175213d519acf199498a8efa7b307f5b4d5f44cd` | **PASS** |
| predicate tag | `v1.0.0-rc.2` | **PASS** |
| predicate repository | `gokhan-kocaoglu/site-skeleton` | **PASS** |
| predicate databaseId | `361341678` | **PASS** |
| signer SAN | `https://dotcom.releases.github.com` | **PASS** |
| bundle mediaType | `application/vnd.dev.sigstore.bundle.v0.3+json` | **PASS** |
| DSSE payloadType | `application/vnd.in-toto+json` | **PASS** |
| imza sayısı | `1` | **PASS** |

**11/11 PASS.** subject sayısı 1 (asset yok; subject release/tag'in kendisidir).
verifiedIdentity regexp `^https://dotcom\.releases\.github\.com$`; timestamp
`TimestampAuthority` / `timestamp.githubapp.com` / `2026-07-28T19:57:10Z`.

## 6. RC1 Değişmezlik Kontrolü

```json
{"databaseId":361113458,"isDraft":false,"isImmutable":true,"isPrerelease":true,
 "publishedAt":"2026-07-28T13:37:11Z","tagName":"v1.0.0-rc.1",
 "targetCommitish":"f891910d9e6877b4ce40d5833cb42579c6d3d9f1"}
```

`git rev-list -n 1 v1.0.0-rc.1` → `f891910d9e6877b4ce40d5833cb42579c6d3d9f1`
(değişmedi). RC1 release/tag ve audit raporu üzerinde **hiçbir mutation
yapılmadı**.

**Release envanteri:**

```text
v1.0.0-rc.2  draft=false  prerelease=true  immutable=true  2026-07-28T19:57:09Z  → 175213d5…
v1.0.0-rc.1  draft=false  prerelease=true  immutable=true  2026-07-28T13:37:11Z  → f891910d…
```

`v1.0.0` release **yok** ("release not found"), `v1.0.0` tag **yok**.

## 7. RC1→RC2 Commit ve Dosya Farkı

`git rev-list --count v1.0.0-rc.1..v1.0.0-rc.2` = **9** (beklenen 9).

```text
*   175213d (tag: v1.0.0-rc.2) Merge pull request #34 …memory-close…
|\
| * 6573cc2 fix(memory): correct F4 closure record
| * 5f2227d chore(memory): seal 2026-07-28-session-09 — closure hash 30b1276c…
| * 30b1276 chore(memory): close session 2026-07-28
|/
*   aed4c9e Merge pull request #33 …fix/f4-pnpm-toolchain-hardening
*   8ed0786 fix(toolchain): correct advisory identifiers and remediation scope
*   9cef87f docs(toolchain): record pnpm remediation evidence
*   9ee531d fix(toolchain): upgrade pnpm to 10.34.4
*   2cdb78f docs(audit): record rc1 fourth mini-audit no-go
```

Beklenen dokuz SHA'nın tamamı birebir eşleşti.

**Dosya farkı (16 dosya, +2165 / −53):**

```text
M  .claude/skills/stack-patterns/SKILL.md
M  CLAUDE.md
M  README.md
A  docs/audits/2026-07-28-fourth-mini-audit-rc1.md
M  docs/setup/local-setup-windows.md
A  docs/source-briefs/f4-pnpm-toolchain-remediation-brief.md
M  docs/source-briefs/skeleton-brief.md
A  docs/test-reports/2026-07-28-f4-pnpm-toolchain-remediation.md
M  package.json
A  project-memory/…/08_Session_Logs/2026-07-28-session-09.md
M  project-memory/…/Current Status.md
A  scripts/quality/assert-toolchain-policy.mjs
A  scripts/quality/gate-toolchain.mjs
M  scripts/quality/run-gates.mjs
M  scripts/structure-manifest.json
A  scripts/tests/toolchain-policy-negative.mjs
```

**Sınıflandırma:** audit kanıtı (1) · pnpm toolchain remediation (2) · guard ve
negatif testler (4) · aktif doküman eşitlemeleri (5) · terminal memory closure
(2) · manifest kaydı (1) · brief/evidence raporu (2).

**Kapsam dışı mutation taraması:** `apps/**`, `templates/**`, `packages/**`,
`.github/**` altında **hiçbir değişiklik yok**. `pnpm-lock.yaml`
**değişmemiştir** (frozen install yeşil olduğu için yeniden üretim yasağına
uyulmuştur). **AC-36 PASS.**

Ağaçtaki audit kanıt dosyasının SHA-256'sı hâlâ
`a9897fea2d5e30a01e7deb8121794108194221f9a8e12d09368166c85226dc9b` — RC1
raporu byte-for-byte korunmuştur.

## 8. Ortam Envanteri

| Araç | Sürüm |
|---|---|
| Node.js | v22.19.0 |
| corepack | 0.34.0 |
| **pnpm** | **10.34.4** (pin ile birebir aynı) |
| Java | 21.0.8 LTS |
| Maven | 3.9.9 |
| Docker | Engine 29.6.1 |
| git | 2.51.0.windows.1 |
| GitHub CLI | 2.96.0 |
| `package.json` packageManager | **`pnpm@10.34.4`** |

Exact pin ile çalışan sürüm **eşleşiyor**. Global sistem ayarı değiştirilmedi;
kullanıcı-alanı Corepack shim'i kullanıldı.

## 9. Çalıştırılan Komutlar ve Exit Code'lar

Tümü izole clone kökünde koşuldu. Hiçbiri geçmiş rapordan PASS sayılmadı.

| # | Komut | Exit | Süre | Sonuç |
|---|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | **0** | 3 s | lockfile değişmedi; tracked diff yok |
| 2 | `pnpm gate` | **0** | 51 s | **8/8 PASS** |
| 3 | `node scripts/tests/critical-domain-coverage-negative.mjs` | **0** | 5 s | **2/2** workspace PASS |
| 4 | `node scripts/verify-structure.mjs` | **0** | <1 s | **1089 checks OK** |
| 5 | `node scripts/tests/verify-structure-negative.mjs` | **0** | 5 s | **19/19** senaryo PASS |
| 6 | `node .claude/hooks/tests/run-tests.js` | **0** | 28 s | **302 assertion / 94 fixture** |
| 7 | `node scripts/tests/toolchain-policy-negative.mjs` | **0** | <1 s | **12/12** senaryo PASS |
| 8 | `node scripts/tests/bootstrap-transaction.mjs` | **0** | 25 s | **7/7** senaryo PASS |
| 9 | `pnpm audit --prod` | **0** | 1 s | "No known vulnerabilities found" |
| 10 | `mvn --batch-mode verify` (apps/api) | **0** | 19 s | BUILD SUCCESS · Tests run 5 |
| 11 | `node scripts/tests/bootstrap-e2e.mjs` | **0** | 47 s | tüm assertion PASS |
| 12 | `gh release view` / `verify` / `verify --format json` | **0** | — | attestation 11/11 |
| 13 | Bağımsız `/new-project` senaryosu (S1–S10) | tümü beklendiği gibi | — | §12 |

`pnpm gate` tablosu:

```text
toolchain PASS · build PASS · typecheck PASS · lint PASS
test PASS · audit PASS · structure PASS · contract-drift PASS
All gates PASS
```

**Baseline karşılaştırması — hiçbir sayı azalmadı:**

| Ölçüt | Beklenen | Ölçülen | Sonuç |
|---|---|---|---|
| `pnpm gate` | 8/8 | **8/8** | eşit |
| `verify-structure` | ≥1089 | **1089** | eşit |
| structure negative | 19/19 | **19/19** | eşit |
| hook harness | 302 / 94 | **302 / 94** | eşit |
| toolchain negative | 12/12 | **12/12** | eşit |
| bootstrap transaction | 7/7 | **7/7** | eşit |
| coverage negative | 2/2 | **2/2** | eşit |
| Java test | 5 | **5** | eşit |
| required check | 7 | **7** | eşit |

## 10. Clean Clone Reproducibility

```text
git clone --no-local --single-branch --branch v1.0.0-rc.2 \
  https://github.com/gokhan-kocaoglu/site-skeleton.git repo   → exit 0
HEAD                        = 175213d519acf199498a8efa7b307f5b4d5f44cd
git rev-list -n 1 v1.0.0-rc.2 = 175213d519acf199498a8efa7b307f5b4d5f44cd
git describe --tags --exact-match = v1.0.0-rc.2
is-shallow                  = false
working tree                = clean
remote                      = https://github.com/gokhan-kocaoglu/site-skeleton.git
```

Install öncesi ve sonrası `git status --short` boş; `git diff --exit-code` ve
`git diff --cached --exit-code` exit 0; `git diff --stat -- pnpm-lock.yaml`
boş. `--force` / `--no-frozen-lockfile` kullanılmadı, lockfile silinmedi.

**Sonuç: exact RC2 tag'i ağdan alınan temiz ortamda tam olarak yeniden
üretilebilir.**

## 11. Full Gate Sonuçları

Ayrıntı §9'dadır. Öne çıkanlar:

- **Backend gerçek Testcontainers kanıtıdır** (`-Pit-local` fallback'i
  kullanılmadı):

```text
Testcontainers version: 2.0.5
Container postgres:16 started in PT1.5491505S
Creating Schema History table "public"."flyway_schema_history" ...
Tests run: 2 -- com.skeleton.api.contract.JacksonContractIT
Tests run: 3 -- com.skeleton.api.health.HealthEndpointIT
BUILD SUCCESS
```

- **pnpm 10 davranışı:** `Ignored build scripts: msw@2.15.0` uyarısı mevcut;
  `pnpm.onlyBuiltDependencies` tanımlı değil ve gate zinciri bu blokla
  yeşildir. Varsayılan-deny güvenli tarafta olduğu için bulgu sayılmadı.
- `bootstrap-e2e` **browser Playwright E2E'si değildir**; üretilen
  repository'nin kendi gate'ini koşan bootstrap sertifikasyonudur.

## 12. Bağımsız `/new-project` Senaryosu

Audit clone'undan **ayrı** ikinci geçici kopyada, ağdan clone ile, slug
`audit-probe-rc2`:

| # | Adım | Exit | Sonuç |
|---|---|---|---|
| S1 | Kirli ağaçta `--apply` | **1** | **reddedildi** (temiz-ağaç ön koşulu canlı) |
| S2 | Dry-run | **0** | sonrasında `git status` boş → **tek bayt yazılmadı** |
| S3 | `--apply` | **0** | başarılı |
| S4 | Üretilen `packageManager` | — | **`pnpm@10.34.4`** (pin devralındı) |
| S5 | Manifest | — | `mode=project` · `projectSlug=audit-probe-rc2` |
| S6 | Üretilen projede `pnpm install` | **0** | başarılı |
| S7 | Üretilen projede `SKIP_API=1 pnpm gate` | **0** | **8/8 PASS** (tabloda `toolchain` dahil) |
| S8 | Üretilen projede toolchain negative suite | **0** | **12/12** — guard devralındı |
| S9 | Aynı slug ikinci koşu | **0** | idempotent; ağaç değişmedi |
| S10 | Farklı slug | **1** | kontrollü reddedildi; **hiçbir şey yazılmadı** |

**AC-35 PASS:** üretilen proje hem yamalı pini hem guard'ı devralır ve kendi
gate'ini 8/8 geçer. Audit clone'u bu senaryodan etkilenmedi.

**Kesinlik şerhi:** `scripts/tests/bootstrap-e2e.mjs` gate adlarını tek tek
doğrularken hâlâ **özgün yedi** gate'i sayar; `toolchain` o listede yoktur.
Bu turda gate tablosu **manuel sayıldı** ve sekiz satır olduğu doğrulandı,
dolayısıyla kanıt dolaylı değil doğrudandır. Yedi adın listesine `toolchain`
eklenmesi hâlâ açık bir izleme işidir (RC2 evidence raporunda kayıtlı).

## 13. Remote CI ve Ruleset

**Ruleset** `main-branch-protection` (id `18469047`) · target `branch` ·
enforcement **`active`** · `strict = true` · `bypass_actors` **boş** ·
**7 required check**: `quality-gate-ubuntu` · `api-verify-testcontainers` ·
`hooks-and-structure-windows` · `gitleaks-full-history` · `supply-chain-trivy` ·
`dependency-review` · `bootstrap-e2e`. Ruleset **değiştirilmedi**.

`allowed_merge_methods` = **`merge, squash, rebase`** → F4-LOW-03 hâlâ açık
(§16).

**RC2 target post-merge main CI — run `30393181957`:**

```text
event=push · head_branch=main · head_sha=175213d5… · completed / success
quality-gate-ubuntu          success
api-verify-testcontainers    success
hooks-and-structure-windows  success
gitleaks-full-history        success
supply-chain-trivy           success
bootstrap-e2e                success
dependency-review            skipped   (main push için beklenen)
```

Altı aktif job success. CI **rerun edilmedi**.

**Actions pin disiplini (AC-15):** tüm harici `uses:` referansları tam 40-hex
SHA + exact tag yorumludur; floating tag referansı **0**.

## 14. F4-HIGH-01 Kapanış Doğrulaması

Bu bölüm repository raporuna güvenilerek değil, canlı kanıtla üretildi.

**14.1 Exact pin.** `package.json` → `packageManager = pnpm@10.34.4`; exact pin
(aralık belirteci yok); guard sabitleri `MIN_PNPM = '10.34.4'`,
`ALLOWED_MAJOR = 10`. Çalışan `pnpm --version` = **10.34.4** — pin ile aynı.

**14.2 Guard.** `run-gates.mjs` GATES dizisinde `toolchain` **ilk sıradadır**.
`gate-toolchain.mjs` iki iş yapar: canlı `package.json` pinini doğrular **ve**
negatif süiti yeniden koşar. Canlı koşum:

```text
[gate-toolchain] packageManager exact-pin + security floor >= 10.34.4
[gate-toolchain] PASS — pnpm@10.34.4 — exact pin, güvenlik tabanı karşılanıyor
[toolchain-policy] 12/12 senaryo PASS
```

Negatif süit reddettiği değerler (canlı koşumda doğrulandı):
`pnpm@9.15.4` → `MAJOR_NOT_REVIEWED` · `pnpm@10.34.3` → `BELOW_SECURITY_FLOOR` ·
`pnpm@^10.34.4` ve `pnpm@10.x` → `NOT_EXACT_PIN` · `npm@10.9.0` →
`WRONG_MANAGER` · alan yok → `MISSING` · metin değil → `NOT_A_STRING` ·
`pnpm@11.0.0` → `MAJOR_NOT_REVIEWED` (sessiz PASS yok). Kabul ettikleri:
`pnpm@10.34.4`, `pnpm@10.35.0`, Corepack integrity ekli exact pin, ve **canlı
`package.json`**. Gerçek repository dosyası **değiştirilmedi**.

**14.3 Canlı advisory sorgusu** (GitHub Advisory Database, denetim anında):

```text
advisories?ecosystem=npm&affects=pnpm@10.34.4
  toplam advisory            : 0
  unwithdrawn CRITICAL       : 0
  unwithdrawn HIGH           : 0
  unwithdrawn MEDIUM         : 0

karşılaştırma — affects=pnpm@9.15.4
  toplam advisory            : 23
  unwithdrawn CRITICAL       : 0
  unwithdrawn HIGH           : 10
```

İki maddenin CVE'siz olduğu **bağımsız doğrulandı** (`identifiers` yalnız
`GHSA` içerir, `cve_id` boş):

| GHSA | CVE | Severity | Vulnerable range (pnpm) | First patched |
|---|---|---|---|---|
| `GHSA-qrv3-253h-g69c` | **yok** | high | `< 10.34.4` · `>= 11.0.0, < 11.8.0` | 10.34.4 · 11.8.0 |
| `GHSA-fr4h-3cph-29xv` | **yok** | high | `< 10.34.4` · `>= 11.0.0, < 11.7.0` | 10.34.4 · 11.7.0 |

`CVE-2026-59195` ve `CVE-2026-59196` kimlikleri **doğrulanmış olgu olarak
kullanılmamıştır**.

**14.4 npm registry hattı.** `pnpm@10.34.4` yayım 2026-06-18. 10.x hattının en
yeni sürümü **10.34.5** (2026-07-10); `latest` = 11.17.0. Pin, kendi hattı
içinde bir patch geridedir **ancak 10.34.4 için hiçbir advisory yoktur** —
"daha yeni sürüm var" tek başına bulgu değildir (denetim politikası).

**14.5 Kapanış kararı.** Yedi koşulun tamamı sağlandı: exact pin doğru ·
çalışan pnpm doğru · guard aktif ve ilk adım · negatif testler 12/12 ·
10.34.4'te unwithdrawn CRITICAL/HIGH **yok** · generated project pini ve
gate'i devralıyor · frozen install + gate zinciri başarılı.

```text
F4-HIGH-01: CLOSED
```

## 15. Node/EOL R-4 Durumu

**Repository Node politikası:** `package.json` → `engines.node = ">=22.12.0"`;
CI dört job'da `node-version: 22`; `CLAUDE.md` ve `README.md` "Node 22.12+";
ADR-0009 kural 3 baseline'ı desteklenen hatta tutmayı şart koşar.

**Çalışan audit ortamı:** Node v22.19.0.

**Node 22 hattının güncel durumu** (resmî `nodejs/Release schedule.json`):

```text
v22: start 2024-04-24 · lts 2024-10-29 · maintenance 2025-10-21 · end 2027-04-30
v24: start 2025-05-06 · lts 2025-10-28 · maintenance 2026-10-20 · end 2028-04-30
```

Node 22 **Maintenance LTS**'tir; EOL değildir (2027-04-30'a ~9 ay). ADR-0009'un
"desteklenen hat" ölçütünü karşılar; Active LTS (v24) değildir.

**Otomatik gate var mı? HAYIR — bağımsız olarak doğrulandı.** `scripts/`
altında `engines`/`node-version`/EOL kontrolü yapan **hiçbir kod yoktur**; tek
eşleşme guard'ın kendi dürüstlük yorumudur
(`assert-toolchain-policy.mjs:3-5`: *"deliberately NO Node version or EOL check
here — that half of R-4 is an open, non-blocking debt"*). `structure-manifest.json`
içinde `toolchain` anahtarı yok, `engines`/`node-version` geçmiyor.
`gate-toolchain` **yalnız** `packageManager`/pnpm politikasını kontrol eder.

```text
R-4 packageManager/pnpm yarısı : KAPALI
R-4 Node sürüm/EOL yarısı      : AÇIK
```

**Bağımsız severity kararı: MEDIUM, non-blocking.** Gerekçe: (a) Node 22 şu an
desteklenen hattadır, yani borç bugün somut bir açığa dönüşmüyor; (b) risk
kayıtlı ve sahiplidir (RC2 evidence raporu "Kalan Riskler" tablosu, MEDIUM);
(c) ADR-0009 zaten "otomatik EOL kontrolü ileriye dönük borçtur" diye kayıt
tutar; (d) verdict-policy kural 3 gereği kayıtlı + sahipli + production'ı
engellemeyen risk `PASS_WITH_RISKS` ile uyumludur. Önceki sınıflandırmayı
değiştirecek yeni kanıt bulunamadı; **MEDIUM/non-blocking teyit edildi.**

## 16. RC1 Bulguları — RC2 Disposition Tablosu

Her bulgu exact RC2 ağacında **yeniden ölçüldü**; önceki rapor kopyalanmadı.

| Bulgu | RC1 durumu | RC2 sonucu | Kanıt (RC2 ağacında yeniden üretildi) | Severity | Release-blocking |
|---|---|---|---|---|---|
| **F4-HIGH-01** | OPEN / blocker | **CLOSED** | pin `pnpm@10.34.4`; çalışan pnpm 10.34.4; guard ilk gate + 12/12; canlı advisory `affects=pnpm@10.34.4` → **0** (eski pin: 10 HIGH) | — | **HAYIR** (kapandı) |
| **F4-MEDIUM-01** | OPEN | **OPEN** (değişmedi) | `activationGates` **1 kayıt** (`admin-bff`); `templates/` **5 dizin**, `ACTIVATION.md` **1 adet**; README garantiyi genelliyor | MEDIUM | HAYIR |
| **F4-MEDIUM-02** | OPEN | **OPEN** (değişmedi) | `git grep -i "release candidate\|rc\.1\|rc\.2" -- README.md CLAUDE.md` → **eşleşme yok** (exit 1); RC2 durumu da bildirilmiyor | MEDIUM | HAYIR |
| **F4-MEDIUM-03** | OPEN | **OPEN** (değişmedi) | Güvenlik başlığı grep'inin **tek** eşleşmesi audit raporunun kendisi; `apps/web/next.config.ts` = `{}` (headers yok); production-checklist'te web bölümü yok | MEDIUM | HAYIR |
| **F4-LOW-01** | OPEN | **OPEN** | `docs/operations/production-checklist.md` hâlâ **yok** (yalnız `templates/operations/`) | LOW | HAYIR |
| **F4-LOW-02** | OPEN | **OPEN** | `package.json` version `0.1.0`, tag `v1.0.0-rc.2`; sürümleme politikası kaydı bulunamadı (eşleşmeler ilgisiz "source of truth" kullanımları + audit'in kendi remediation metni) | LOW | HAYIR |
| **F4-LOW-03** | OPEN | **OPEN / CHANGED** | Ruleset `allowed_merge_methods = merge, squash, rebase`; `required_approving_review_count = 0`. **Düzeltme:** `git grep -i "squash\|rebase" -- .claude/ CLAUDE.md docs/operations/` → **0 sonuç** (bağımsız doğrulandı). Yani anayasa squash/rebase'i **yazılı olarak yasaklamıyor**; RC1'in "ruleset ↔ anayasa çelişkisi" çerçevelemesi hatalıydı — bu bir **yazılı kural boşluğudur**. `closure-guard.js` de iki-ebeveyn doğrulaması yapmaz. *Disiplin fiilen korunmuş: RC1→RC2'deki iki merge de gerçek iki-ebeveynli merge commit'i.* Remediation sırası değişir: önce kuralı yaz, sonra ruleset'i daralt | LOW | HAYIR |
| **F4-LOW-04** | OPEN | **OPEN** | `apps/web/app/layout.tsx:15`, `page.tsx:10`, `opengraph-image.tsx:12` hâlâ niteliksiz "production-ready" | LOW | HAYIR |
| **F4-LOW-05** | OPEN | **OPEN** | `verify-structure.mjs:265-274` hâlâ `roots.add(dirRel)`; negatif testte marker-alt-dizin senaryosu **yok** (senaryo sayısı 19'da sabit) | LOW | HAYIR |
| **F4-LOW-06** | OPEN | **OPEN** | `HealthController.java:38,40` hâlâ iki kimliksiz DB sorgusu (`SELECT 1`, `SELECT count(*) FROM flyway_schema_history`); checklist'te actuator probe maddesi var ancak **rate-limit/ağ sınırı maddesi yok** | LOW | HAYIR |

**Özet:** 1 HIGH kapandı; 3 MEDIUM + 6 LOW açık kaldı. Açık dokuz bulgunun
tamamı RC2 evidence raporunda ve/veya RC1 audit raporunda **kayıtlı**, sahipli
ve **release-blocking değildir** — bu, RC2 remediation'ının bilinçli kapsam
kararıdır (blocker-only). Verdict-policy kural 3 ile uyumludur.

## 17. Önceden Kabul Edilmiş Riskler

| Risk | Durum | Kayıtlı | Sahip | Güvenlik ağı | Yeni bypass | Release-blocking |
|---|---|---|---|---|---|---|
| Optional module hardening (BFF-1/2/3) | **confirmed / open**, değişmedi | EVET (RC2 evidence raporu, satır 262) | Aktivasyon-anı implementer | `activationGates` — `ACTIVATION.md` 12 maddesi tamamlanmadan gate FAIL; negatif senaryolarla canlı doğrulandı | Bulunmadı | **HAYIR** |
| Hook tam shell parser değildir | **confirmed / open** | EVET (satır 263) | Orkestratör | `gitleaks-full-history` (run `30393181957` success); harness 302/94 yeşil | Bulunmadı | **HAYIR** |
| Type-aware lint derinliği (ADR-0012) | **confirmed / open** | EVET (satır 264) | Orkestratör | `pnpm gate` içinde `lint` + `typecheck` PASS | Bulunmadı | **HAYIR** |

**Bu üç tarihsel riskten ayrı olarak kaydedilen yeni borçlar** (RC2 evidence
raporu, satır 266-274): **R-4 Node sürüm/EOL kapısı — MEDIUM** (§15) · guard
`hooks-and-structure-windows`'ta koşmuyor — LOW · `MIN_PNPM` elle güncellenir —
LOW · pnpm 10 lifecycle bloğu (`msw`) — LOW · ADR-0016 yazılmadı — LOW.
Hepsi kayıtlı ve non-blocking'dir.

## 18. Yeni Bulgular

### F4R2-MEDIUM-01 — Operasyon dokümanı release gerçekliğiyle senkron değil

```text
ID:       F4R2-MEDIUM-01
Severity: MEDIUM
Domain:   docs / governance / release
```

**Kanıt:** `docs/operations/release-attestation.md` "Mevcut durum (2026-07-28)"
tablosu RC2 ağacında hâlâ şunları söyler:

```text
| Release                          | oluşturulmadı |
| Tag                              | oluşturulmadı |
| RC1 dış attestation (MEDIUM-10)  | PENDING_USER_ACTION |
| Dördüncü mini-denetim            | başlatılmadı |
| RC1 release target SHA           | RC1_RELEASE_TARGET_SHA (henüz yok) |
| Final evidence merge SHA         | FINAL_EVIDENCE_MERGE_SHA (henüz yok) |
```

`git log v1.0.0-rc.1..v1.0.0-rc.2 -- docs/operations/release-attestation.md`
→ **boş**: dosya RC2 zincirinde hiç güncellenmedi.
Ek olarak `docs/releases/v1.0.0-rc.1.md:3` hâlâ *"TASLAK — henüz yayınlanmadı"*
ve *"Release ve tag oluşturulmamıştır"* der; `docs/releases/` altında
`v1.0.0-rc.2.md` **yoktur**.

**Neden §9 istisnasının kapsamına girmiyor.** Terminal closure / self-reference
istisnası, bir ağacın **kendi** tag'i hakkındaki post-publication bilgiyi
(release id, publishedAt, kendi merge SHA'sı) taşıyamamasını meşrulaştırır.
Buradaki satırlar ise **geçmişe ait ve ağaçta doğabilecek** bilgilerdir:
`v1.0.0-rc.1` 2026-07-28T13:37:11Z'de, yani RC2 zincirinin ilk commit'i
(`2cdb78f7`) **öncesinde** yayımlanmıştı; dördüncü mini-denetimin yapıldığı
olgusu ise aynı commit'in eklediği `docs/audits/2026-07-28-fourth-mini-audit-rc1.md`
dosyasıyla o ağaçta zaten mevcuttur. Yani ağaç, "denetim başlatılmadı" derken
denetimin raporunu taşımaktadır — **iç çelişki**.

**Etkisi:** RC2'yi klonlayan bir okuyucu, operasyon dokümanına bakıp hiç
release/tag olmadığını ve dördüncü denetimin hiç başlamadığını sanır. Yapıya,
güvenliğe, build'e veya gate zincirine etkisi **yoktur**; yanıltıcı olan yalnız
dokümantasyondur. Kök neden F4-MEDIUM-02 (README/CLAUDE.md RC durumunu
bildirmiyor) ile **aynı sınıftır** — aktif operasyonel dokümantasyonun release
gerçekliğine eşitlenmemesi. Ayrı ID verilmiştir çünkü farklı dosya ve farklı
remediation gerektirir; aynı kök neden iki katına şişirilmemiştir.

**Release blocker:** **HAYIR.**

**Zorunlu remediation:** `release-attestation.md` "Mevcut durum" tablosunun
tarihsel satırları (RC1 target SHA, RC1 release/tag durumu, MEDIUM-10 kapanışı,
dördüncü denetimin yapıldığı) bir sonraki feature PR'ında güncellenir; RC1
release taslağına "yayımlandı" şerhi düşülür. **Uyarı:** bu güncelleme
`release-attestation.md:117-120`'deki "adım 7 placeholder'ları yeni repository
PR'ı ile doldurulmaz" kuralıyla karıştırılmamalıdır — o kural release notunun
mühürlü alanları içindir; buradaki iş, operasyon dokümanının **durum
özetidir**.

**Sahip:** Orkestratör / repository maintainer.

---

*Kapsam notu: code-reviewer bu bulgunun `docs/releases/` yarısını bağımsız
olarak buldu ve **LOW** olarak derecelendirdi. Ayrı ID verilmedi (aynı kök
neden şişirilmez). **MEDIUM** derecesi korunmuştur: gerekçe, ağacın dördüncü
denetimin raporunu taşırken "denetim başlatılmadı" demesi, yani salt eksiklik
değil **iç çelişki** olmasıdır. Derecelendirme farkı burada şeffafça kaydedilir.*

---

### F4R2-LOW-01 — Guard yalnız beyanı doğruluyor; çalışan pnpm ikilisi hiçbir yerde denetlenmiyor

```text
ID: F4R2-LOW-01 · Severity: LOW · Domain: security / supply-chain · Kaynak: code-reviewer
```

**Kanıt (orkestratör tarafından bağımsız doğrulandı):**
`git grep -n "pnpm --version\|pnpm -v\|npm_config_user_agent\|corepack" -- scripts/ .github/ .claude/`
→ **0 sonuç** (exit 1). `assert-toolchain-policy.mjs` girdisi yalnız parse
edilmiş `package.json`'dır; `verify-structure` `installedBaseline` kök
`packageManager`'ı kapsamaz.

**Etkisi:** Corepack shim'i etkin **olmayan** bir makinede tüm zincir
pnpm 9.15.4 ile koşup yine de `[gate-toolchain] PASS` yazabilir — çünkü guard
dosyadaki *beyanı* okur, çalışan ikiliyi değil. Bu teorik değildir: RC1'in
kendi ortam envanteri, `corepack enable`'ın **EPERM ile başarısız olduğu** ve
gate'lerin global pnpm ile koştuğu bir makineyi belgeler. **Merge yolunda
kapalıdır** (`pnpm/action-setup` sürümü `packageManager` alanından okur ve
`quality-gate-ubuntu` required check'tir), lokal/denetim yolunda açıktır.

*Bu denetimde risk gerçekleşmedi:* ortam envanteri `pnpm --version` = **10.34.4**
ölçtü ve pin ile eşleşti (§8) — ancak bunu **repo değil, denetçi** doğruladı.

**Release blocker:** HAYIR. **Remediation:** guard'a çalışan sürüm kontrolü
ekle (`process.env.npm_config_user_agent` guard sürecinde zaten mevcuttur);
okunamıyorsa açık uyarı üret. **Sahip:** Orkestratör.

---

### F4R2-LOW-02 — `skeleton-brief.md` kısmi güncellemeden dolayı kendi içinde çelişkili

```text
ID: F4R2-LOW-02 · Severity: LOW · Domain: docs · Kaynak: code-reviewer
```

**Kanıt (doğrulandı):** `docs/source-briefs/skeleton-brief.md:241` →
"Monorepo: **pnpm 9** + Turborepo + Node 22"; aynı dosya `:349` →
`corepack prepare pnpm@10.34.4 --activate`.

**Etkisi:** Tek belgede iki farklı toolchain sürümü. Bu tutarsızlık doğrudan
remediation PR'ının **bilinçli kapsam daraltmasının** sonucudur: yalnız
çalıştırılabilir `corepack` komutu güvenlik gerekçesiyle güncellendi, tarihsel
yığın tanımı (`:241` — Next 15 / Vite 5 / Boot 3.3 da içerir) korundu. Karar
gerekçeli ve kayıtlıdır; yan etkisi kayda geçirilmemişti.

**Release blocker:** HAYIR. **Remediation:** `:241` satırına tarihsel şerh
düş. **Sahip:** Orkestratör.

*Not: `project-memory/…/Project Brief.md` de "pnpm 9" der; o dosya açıkça
tarihsel proje tanımıdır (Next 15 / Vite 5 / Boot 3.3 ile birlikte) ve bulgu
sayılmamıştır.*

---

### F4R2-LOW-03 — Brief, guard'ın major yükseltme maliyetini olduğundan küçük gösteriyor

```text
ID: F4R2-LOW-03 · Severity: LOW · Domain: docs / process · Kaynak: code-reviewer
```

**Kanıt (doğrulandı):** `f4-pnpm-toolchain-remediation-brief.md:195` →
"Tavan `ALLOWED_MAJOR` sabitidir: yeni bir ADR ile birlikte **tek satırda**
yükseltilir." Oysa `ALLOWED_MAJOR` değiştirildiğinde negatif süitin **üç
senaryosu** birden kırılır ve gate FAIL verir.

**Etkisi:** Prosedür yanlış belgelenmiş; acil bir güvenlik yükseltmesinde
"tek satır" beklentisiyle gelen kişi beklenmedik gate FAIL'i ile karşılaşır.
**Kontrolün kendisi açısından bu iyi haberdir** — kural sessizce
gevşetilemez; yalnız dokümantasyon bu maliyeti yansıtmıyor.

**Release blocker:** HAYIR. **Remediation:** brief'e "negatif suite
beklentileri de güncellenir" satırı. **Sahip:** Orkestratör.

---

### Yeni bulgu sayıları

| Severity | Yeni bulgu | ID'ler |
|---|---|---|
| CRITICAL | **0** | — |
| HIGH | **0** | — |
| MEDIUM | **1** | F4R2-MEDIUM-01 |
| LOW | **3** | F4R2-LOW-01, -02, -03 |

Kaynak dağılımı: F4R2-MEDIUM-01 orkestratör (docs/releases yarısına
code-reviewer bağımsız olarak da ulaştı) · F4R2-LOW-01/-02/-03 code-reviewer,
üçü de orkestratör tarafından denetlenen ağaç üzerinde **doğrulandı**.

**Guard'ın olumlu bulgusu (bulgu değil, kayda değer):** code-reviewer guard'ın
**çift savunmalı** olduğunu statik izlemeyle gösterdi — `ALLOWED_MAJOR` veya
`MIN_PNPM` sabitlerinden **herhangi biri** gevşetilirse negatif süitin bir veya
daha fazla senaryosu kırılır ve gate FAIL verir. Tek sabiti sessizce gevşetmek
mümkün değildir; kuralı gevşetmek için negatif süiti de bilerek düzenlemek
gerekir ve bu diff incelemesinde görünür. Bu, RC1'in "dekoratif eşik"
eleştirisine verilmiş sağlam bir cevaptır. PIN_RE sınır durumları (scoped ad,
prerelease, dört bileşenli sürüm, iç boşluk, büyük harf) ayrıca test edildi ve
bypass üretmedi; sürüm karşılaştırması bileşen-bazlıdır (klasik `10.9 < 10.34`
string hatası yok).

Taranan ve **bulgu üretmeyen** yüzeyler: pnpm 10 davranış değişiklikleri ·
lifecycle script politikası (`msw` bloğu — varsayılan-deny güvenli) ·
`pnpm.onlyBuiltDependencies` (yokluğu bilinçli) · lockfile uyumluluğu (v9.0
pnpm 10 ile uyumlu, değişmedi) · `packageManager` guard bypass'ları ·
generated-project toolchain inheritance (devralıyor) · release notes doğruluğu ·
immutable attestation · branch protection/ruleset · GitHub Actions pinleri
(21/21 full SHA) · supply-chain taraması · bootstrap transaction · hook/secret/
memory guard'ları · `apps/web` security defaults (mevcut F4-MEDIUM-03 kapsamında)
· `apps/api` health/readiness (mevcut F4-LOW-06 kapsamında) · scope/optional
beyanları · secret yüzeyi.

## 19. Acceptance Matrix

| ID | Kriter | Sonuç |
|---|---|---|
| AC-01 | Exact tag kimliği | **PASS** |
| AC-02 | Tag target = PR #34 terminal closure merge SHA | **PASS** |
| AC-03 | Frozen install, lockfile değişmez | **PASS** |
| AC-04 | `pnpm gate` 8/8 | **PASS** |
| AC-05 | `pnpm audit --prod` | **PASS** |
| AC-06 | Maven / gerçek Testcontainers | **PASS** |
| AC-07 | Hook harness 302/94 | **PASS** |
| AC-08 | `verify-structure` ≥1089 | **PASS** |
| AC-09 | Structure negative 19/19 | **PASS** |
| AC-10 | Kritik-domain 2/2 | **PASS** |
| AC-11 | Bootstrap transaction 7/7 | **PASS** |
| AC-12 | Bootstrap E2E | **PASS** |
| AC-13 | Ruleset active/strict + 7 check | **PASS** |
| AC-14 | Main push `dependency-review` skip semantiği | **PASS** |
| AC-15 | Actions pin disiplini | **PASS** |
| AC-16 | Yasaklı kapsam iddiası yok | **PASS** (7 eşleşmenin tamamı yasak beyanı; iddia 0) |
| AC-17 | Activation gate davranışı (recursive + 3 sinyal) | **PASS** |
| AC-18 | Dormant modüller build dışında | **PASS** |
| AC-19 | Kalan risk defteri kayıtlı + sahipli | **PASS** |
| AC-20 | Açık risk ↔ verdict tutarlılığı | **PASS** |
| AC-21 | RC2 immutable Release + geçerli attestation | **PASS** (11/11) |
| AC-22 | Memory / terminal closure disiplini | **PASS** (§20) |
| AC-23 | Kanıt yeniden üretilebilirliği | **PASS** |
| AC-24 | Core değişmezler | **PASS** (`ddl-auto: validate`; `BIGINT … IDENTITY` + `TIMESTAMPTZ`; localStorage kullanımı 0 — yalnız yasak yorumu; framer-motion 0) |
| AC-25 | Secret yüzeyi + Gitleaks + dar muafiyet | **PASS** |
| AC-26 | Sürüm tutarlılığı politikası | **FAIL (LOW)** — F4-LOW-02 |
| AC-27 | Önceki bulgu izlenebilirliği | **PASS** |
| AC-29 | Activation gate beyan kapsamı | **FAIL (MEDIUM)** — F4-MEDIUM-01 |
| AC-31 | `packageManager` desteklenen + yamalı hatta | **PASS** |
| AC-32 | README/CLAUDE RC durumu | **FAIL (MEDIUM)** — F4-MEDIUM-02 |
| AC-33 | Core web security header politikası | **FAIL (MEDIUM)** — F4-MEDIUM-03 |
| AC-34 | Toolchain guard canlı pin + negatif suite | **PASS** |
| AC-35 | Generated project `pnpm@10.34.4` + gate 8/8 | **PASS** |
| AC-36 | RC1→RC2 zincirinde scope dışı mutation yok | **PASS** |

**Karşılanmayan kriterler:** AC-29 · AC-32 · AC-33 (MEDIUM) ve AC-26 (LOW).
**Hiçbiri release-blocking değildir**; dördü de kayıtlı, sahipli açık
bulgulara karşılık gelir ve verdict-policy kural 3 kapsamında
`PASS_WITH_RISKS` ile uyumludur. **Blocking FAIL yoktur.**

*Not: RC1 raporunun AC numaralandırmasında AC-28 ve AC-30 hiç tanımlanmamıştır
(numaralandırma boşluğu); eksik kriter değildir.*

## 20. Memory / Dış Attestation Semantiği (AC-22)

RC2 ağacındaki `Current Status.md` aktif görevi "`v1.0.0-rc.2` release ve
attestation hazırlığı" olarak tanımlar ve release id / publishedAt / kendi
closure merge SHA'sını içermez.

Bu **bayat memory blocker'ı değildir**, sözleşme gereğidir:

1. RC2 tag target'ı, sözleşme gereği **terminal closure merge SHA'sıdır**;
   dolayısıyla ağacın son memory yazımı closure merge'inden **önce** doğar.
   Release id (`361341678`) ve publishedAt (`2026-07-28T19:57:09Z`) o ağaçta
   **doğamaz**.
2. Bu bilgileri yazmak için yeni bir repository PR'ı açmak, "adım 7
   placeholder'ları repo PR'ı ile doldurulmaz" kuralını ve terminal closure
   istisnasını ihlal eder (sonsuz closure döngüsü).
3. Uydurma yasağı gereği tahmini SHA/tarih yazmak açıkça yasaktır.
4. Uygulanan ayrım: **tag ağacında doğamayacak post-publication bilgi ≠
   uydurulmuş veya hatalı pre-release bilgi.** Kayıt, yazıldığı anda doğruydu;
   yayın sonrası otorite dış immutable release + attestation'a geçmiştir ve bu
   denetimde doğrulanmıştır.
5. Memory'de uydurma sahiplik, yanlış severity veya doğrulanamayan CVE kimliği
   **kalmamıştır** (önceki turda düzeltildi).

**AC-22 PASS.** Buna karşılık `release-attestation.md`'nin durum tablosu bu
istisnanın kapsamına **girmez** ve F4R2-MEDIUM-01 olarak kaydedilmiştir (§18).

## 21. Formal Verdict

```text
PASS_WITH_RISKS
```

**Gerekçe (verdict-policy):**

- **Kural 1 tetiklenmedi:** CRITICAL/BLOCKER bulgu **yoktur**.
- **Kural 2 (PASS) erişilemez:** açık kayıtlı riskler mevcuttur (üç tarihsel
  risk + R-4 Node/EOL + dört yeni borç + dokuz açık RC1 bulgusu). Kural 6:
  "Ertelenmiş riskler de açık risktir; rapora kaydedilen bulgu varken verdict
  PASS olamaz."
- **Kural 3 karşılandı:** CRITICAL yok; kalan risklerin **tamamı** tek tek
  kayıtlı, sahipli ve kabul edilmiştir; **hiçbiri production'ı
  engellemiyor**. Kayıtsız risk bulunmadı.
- **Kural 4 tetiklenmedi:** karşılanmayan dört kabul kriteri (AC-26/-29/-32/-33)
  MEDIUM ve LOW seviyesindedir, **blocking değildir** ve tamamı kayıtlı açık
  bulgulara karşılık gelir. Blocking FAIL yoktur.

RC1'de verdict'i FAIL'e taşıyan tek etken F4-HIGH-01'di; bu denetimde
**bağımsız olarak CLOSED** verilmiştir (§14).

## 22. Production-Readiness Disposition

```text
CORE_SKELETON_PRODUCTION_READY
```

Sekiz koşulun tamamı sağlandı: exact RC2 tag denetlendi · bütün zorunlu
gate'ler temiz clone'da yeniden üretilebildi · **CRITICAL veya HIGH release
blocker yok** · karşılanmayan kabul kriterlerinin hiçbiri blocking değil ·
mevcut MEDIUM/LOW riskler kayıtlı, sahipli ve core release'i engellemiyor ·
optional-module kapsam sınırı doğru ve build düzeyinde teknik olarak zorlanıyor ·
bootstrap ile üretilen yeni proje kendi gate'ini (8/8) geçiyor ve toolchain
pinini devralıyor · release identity ve attestation doğrulandı.

**Bu hüküm yalnız core site-skeleton kapsamı içindir. Dormant optional modules
(`templates/admin-bff`, `templates/payments`, `templates/e2e`, `templates/db`,
`templates/operations`) kendi activation hardening süreçleri tamamlanmadan
production-ready sayılmaz.**

## 23. `v1.0.0` Recommendation

```text
GO_FOR_V1_0_0
```

Bağlayıcı eşleme gereği: `PASS_WITH_RISKS` + `CORE_SKELETON_PRODUCTION_READY`
→ `GO_FOR_V1_0_0` mümkündür ve bu denetimde kanıtla kazanılmıştır. Kanıt
eksikliği yoktur (`NO_GO_EVIDENCE_INCOMPLETE` değildir): bütün zorunlu kanıtlar
üretilebilmiştir.

`v1.0.0` etiketi verilirse **`175213d519acf199498a8efa7b307f5b4d5f44cd`**
commit'ini hedeflemelidir — RC2 ile birebir aynı ağaç.

## 24. Açık Riskler ve Önerilen Remediation

Hiçbiri `v1.0.0`'ı engellemez; `v1.0.0` sonrası planlanmalıdır.

| # | Madde | Kaynak | Severity |
|---|---|---|---|
| 1 | R-4'ün Node sürüm/EOL kapısını uygula (ADR-0009 borcuyla birlikte) | R-4 / §15 | MEDIUM |
| 2 | Aktivasyon garantisini gerçekle **veya** README/release dilini `admin-bff` ile sınırla | F4-MEDIUM-01 | MEDIUM |
| 3 | README/CLAUDE.md'ye RC durumu ve dördüncü denetim şerhi | F4-MEDIUM-02 | MEDIUM |
| 4 | Core web güvenlik başlığı politikası (CSP/HSTS/X-Frame-Options/Referrer/Permissions) | F4-MEDIUM-03 | MEDIUM |
| 5 | `release-attestation.md` durum tablosunu ve RC1 taslak şerhini güncelle | **F4R2-MEDIUM-01** | MEDIUM |
| 6 | `production-checklist` yol referansını netleştir | F4-LOW-01 | LOW |
| 7 | Sürümleme politikasını (tag ↔ manifest) kayda geç | F4-LOW-02 / AC-26 | LOW |
| 8 | **Önce** true-merge kuralını yazılı hâle getir (`git-workflow.md`), **sonra** ruleset `allowed_merge_methods` → `["merge"]` | F4-LOW-03 (CHANGED) | LOW |
| 8b | Guard'a çalışan pnpm sürümü kontrolü ekle (`npm_config_user_agent`) | F4R2-LOW-01 | LOW |
| 8c | `skeleton-brief.md:241` tarihsel şerhi | F4R2-LOW-02 | LOW |
| 8d | Brief'teki "tek satırda yükseltilir" ifadesini düzelt | F4R2-LOW-03 | LOW |
| 9 | `apps/web` ürün metnini core/optional ayrımıyla nitele | F4-LOW-04 | LOW |
| 10 | `activationGates` marker kökü semantiği + negatif test | F4-LOW-05 | LOW |
| 11 | Probe için ağ sınırlama/rate-limit checklist maddesi | F4-LOW-06 | LOW |
| 12 | `bootstrap-e2e` gate ad listesine `toolchain` ekle | §12 şerhi | LOW |
| 13 | Guard'ı `hooks-and-structure-windows` job'una da taşı (veya `verify-structure` kuralına dönüştür) | RC2 borcu | LOW |
| 14 | `MIN_PNPM` için düzenli advisory gözden geçirme ritmi | RC2 borcu | LOW |
| 15 | ADR-0016 (toolchain baseline politikası) yazımı | RC2 borcu | LOW |

## 25. Kapsam Dışı İnceleme Alanları

Şeffaflık için: bu denetimde **yapılmayanlar**.

- Browser tabanlı Playwright E2E koşulmadı (repository'de aktivasyon şablonu
  olarak dormant'tır; `bootstrap-e2e` farklı bir iştir).
- Dormant `templates/**` modüllerinin **kodu** incelenmedi — tanım gereği
  kapsam dışıdır.
- Yük/performans testi, penetrasyon testi ve gerçek bir deployment
  yapılmadı — bu denetimin kapsamında değildir.
- `apps/api`'de auth katmanı yoktur (Spring Security "approved default",
  kurulu değil); token/refresh-rotation değişmezleri **sözleşme düzeyinde**
  doğrulanmıştır, implementasyon düzeyinde değil — doğrulanacak kod yoktur.
- CI run'ları rerun edilmedi; job logları satır satır okunmadı (job sonuçları
  API'den alındı).
- `pnpm audit` proje bağımlılık yüzeyini kapsar; paket yöneticisinin kendisi
  ayrıca canlı advisory sorgusuyla denetlendi (§14.3).

## 26. Kanıt İndeksi

| Kanıt | Konum / kimlik |
|---|---|
| Audit clone (ağdan) | `%TEMP%\site-skeleton-fourth-mini-audit-rc2-2026-07-28\repo` @ `175213d5…` |
| Bağımsız `/new-project` kopyası | `…\userscenario` (slug `audit-probe-rc2`) |
| Komut logları | `…\gate.log`, `mvn.log`, `bootstrap-e2e.log`, `install.log`, `us-*.log` |
| RC2 release | https://github.com/gokhan-kocaoglu/site-skeleton/releases/tag/v1.0.0-rc.2 |
| RC2 attestation | `gh release verify v1.0.0-rc.2` exit 0 · JSON 3860 bayt · 11/11 |
| RC2 target post-merge CI | run `30393181957` — success |
| Remediation PR / merge | `#33` · `aed4c9edb613a77ca9e24571a4641de92a103266` · CI `30391043626` |
| Terminal closure PR / merge | `#34` · `175213d519acf199498a8efa7b307f5b4d5f44cd` · CI `30392688620` |
| RC1 audit evidence (ağaç içinde) | `docs/audits/2026-07-28-fourth-mini-audit-rc1.md` · SHA-256 `a9897fea…dc9b` |
| Ruleset | `main-branch-protection` id `18469047` · active · strict · 7 check · bypass 0 |
| Advisory verisi | GitHub Advisory DB: `affects=pnpm@10.34.4` → 0 · `affects=pnpm@9.15.4` → 10 HIGH |
| Node destek verisi | `nodejs/Release` `schedule.json`: v22 maintenance 2025-10-21, end 2027-04-30 |
| npm registry | `pnpm@10.34.4` 2026-06-18; 10.x en yeni 10.34.5 (2026-07-10); latest 11.17.0 |

**Kaynak repository bütünlüğü:** denetim boyunca `D:\Kodlar\Claude\site-skeleton`
üzerinde hiçbir dosya değiştirilmedi; yeni branch, PR, commit veya push yok;
release/tag/ruleset/Dependabot/memory mutasyonu yok. Audit clone'unda testler
sonrasında tracked diff **sıfırdır** (`git status --short` boş,
`git diff --exit-code` = 0).
