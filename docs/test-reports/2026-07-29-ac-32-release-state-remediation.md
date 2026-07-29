# AC-32 / F4-MEDIUM-02 Remediation — Pre-Merge Kanıt Raporu

> Kanıt raporu (Katman 1, pre-merge). Mod: **Preparation Mode** (QA/Test
> Specialist, `docs/test-reports/**` fiziksel yazarı). Kod/test/manifest/
> README/CLAUDE/ADR/ledger/audit bu rapor tarafından değiştirilmemiştir —
> yalnız ölçülmüştür. Bu tur implementasyonu **yazmadı**; C4 implementation
> SHA'sı üzerinde bizzat koşturulan komutlarla doğruladı.

## Kimlik

| Alan | Değer |
|---|---|
| Repository | `gokhan-kocaoglu/site-skeleton` |
| Dal | `fix/f4-release-state-registry` |
| Base SHA (main) | `cfe61e82c7b1458e1280187be6214ded0a702b49` |
| Implementation SHA (testlerin koştuğu commit, C4) | `36d91a668eee31d7081640e90b166e6e2df92886` |
| Tarih | 2026-07-29 |
| Hedef kriter | AC-32 / F4-MEDIUM-02 (README/CLAUDE RC durumunu bildirmiyordu) |
| Aynı kök nedenli komşu bulgu | F4R2-MEDIUM-01 (`docs/operations/release-attestation.md` durum tablosu bayat) |
| Kaynak ADR | `docs/adr/ADR-0018-release-state-registry.md` |
| Kaynak audit | `docs/audits/2026-07-28-fourth-mini-audit-rc2.md` (§F4-MEDIUM-02, §F4R2-MEDIUM-01, §Acceptance Matrix) |

Dal HEAD, implementation SHA'sı ile birebir aynıdır; rapor bu commit'in
üzerinde koşturulan komutları belgeler.

## Değişiklik Özeti (raporlanıyor, yazılmadı)

`git log --reverse cfe61e82c7b1458e1280187be6214ded0a702b49..HEAD` dört
commit gösteriyor:

```text
c2308d03080ecbc4ca21fbcfce567183340f270 docs(adr): define audited upstream release provenance
3100bc2f3ade4d8db992cc07047575bca12544d docs(release): align audited release status and historical snapshots
4a526933647869d34740493a8f4f298eb324d5d feat(structure): enforce upstream release provenance and bootstrap semantics
36d91a668eee31d7081640e90b166e6e2df92886 test(structure): cover release provenance and generated-project behavior
```

Bu QA turunun kod okuyarak + testleri koşturarak doğruladığı nihai değişiklik
kümesi (dördüncü commit dahil):

1. **`scripts/structure-manifest.json` → `upstreamReleaseProvenance`** —
   `auditedState` (7 alan: `auditedCandidateTag`, `auditReport`,
   `auditSha256`, `verdict`, `productionReadiness`, `recommendation`,
   `stableReleaseStatusAtAudit`) + `auditedImmutableReleases` (iki kayıt:
   `v1.0.0-rc.1`, `v1.0.0-rc.2`). `releaseName` alanı **kayıtta yok**
   (ADR-0018 madde 5: bootstrap kimlik ikamesinde bozulurdu).
2. **Alanlar audit-scoped, canlı-envanter değil.** `stableReleaseStatusAtAudit:
   NOT_PUBLISHED` yalnız canonical audit yürütüldüğü andaki durumu kaydeder;
   `latest*`/`current*`/`stableReleaseExists` gibi temporal alanlar ADR-0018
   madde 10 gereği yasaklı ve manifest'te yok.
3. **`docs/releases/README.md`** — yeni canonical ledger (insan-okur), audited
   state özetini ve iki kayıtlı release history satırını taşıyor.
4. **`docs/operations/release-attestation.md`** — bayat "Mevcut durum"
   tablosu çıkarıldı; yerine ledger'a yönlendirme + "Adım 9 (ADR-0018)"
   prosedürel kuralı geldi. maxLines manifest kaydı 180 → **165**; ölçülen
   gerçek satır sayısı **164** (limit altında).
5. **`docs/releases/v1.0.0-rc.1.md`** — bounded `<!-- historical-note:start/end
   -->` bloğu + yalnız dört zaman-kipi düzeltmesi eklendi; `## Attestation
   (dış immutable kanıt)` başlığından `**Bağlayıcı kural:**` satırına kadar
   olan korunan bölüm **değişmedi** ve SHA-256 ile manifest'e bağlandı
   (aşağıda ölçüldü).
6. **README.md + CLAUDE.md** — `<!-- release-state:start/end -->` bounded
   section; ilk içerik satırı verdict (`FAIL`).
7. **`scripts/verify-structure.mjs`** yeni **7k** bloğu — `node:crypto` ile
   audit dosyası digest'i + RC1 korunan bölüm digest bağını doğruluyor;
   mode-aware doküman sözleşmesi (skeleton-dev'de upstream bölümü zorunlu,
   project modda yasak); yasak token kuralları (self-reference SHA, skeleton
   kimlik token'ı). Kod okumasıyla doğrulandı: ADR-0018 madde 11 gereği
   **ağ/git-ancestry kuralı yok** — yalnız offline, ağaç-içi kanıt kullanılıyor.
8. **`scripts/bootstrap-project.mjs`** — `EXCLUDE_DIRS += docs/releases`;
   README/CLAUDE bounded section'ı aynı `replace` operasyonunun final byte
   çıktısından kaldırılıyor. maxLines manifest kaydı **500 korundu**; ölçülen
   gerçek satır sayısı **492** (limit altında).
9. **Negatif suite + `bootstrap-e2e` genişletildi** — aşağıda ayrıntılı.

## Çalıştırılan Komutlar × Exit Code × Gerçek Sayısal Çıktı

Tüm komutlar bu QA turunda, `fix/f4-release-state-registry` dalının
`36d91a668eee31d7081640e90b166e6e2df92886` HEAD'inde bizzat koşturuldu.

| # | Komut | Exit | Gerçek çıktı |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | **0** | `Lockfile is up to date, resolution step is skipped` / `Already up to date` |
| 2 | `node scripts/verify-structure.mjs` | **0** | `PASS — 1208 checks OK (manifest: scripts/structure-manifest.json)` |
| 3 | `node scripts/tests/verify-structure-negative.mjs` | **0** | `59/59 senaryo PASS (mode=skeleton-dev, 3 senaryo bu modda kapalı; toplam 62)` |
| 4 | `node .claude/hooks/tests/run-tests.js` | **0** | `PASS — 302 assertions OK (94 fixtures + settings bindings + git closure-context scenarios)` |
| 5 | `node scripts/tests/bootstrap-transaction.mjs` | **0** | `7/7 senaryo PASS` |
| 6 | `node scripts/tests/bootstrap-e2e.mjs` | **0** | `[bootstrap-e2e] tüm assertion'lar PASS` (11 bölüm, ayrıntı aşağıda) |
| 7 | `pnpm gate` | **0** | Gate tablosu: toolchain/build/typecheck/lint/test/audit/structure/contract-drift = **8/8 PASS** — `mvn verify` bu koşuda Docker daemon'a erişti, Testcontainers gerçek bir Postgres container ayağa kaldırdı (aşağıda ayrıntı) |
| 8 | `SKIP_API=1 pnpm gate` | **0** | `All gates PASS` — toolchain·build·typecheck·lint·test·audit·structure·contract-drift = **8/8 PASS** |
| 9 | `git diff --name-status cfe61e82c7b1458e1280187be6214ded0a702b49...HEAD` | **0** | 11 dosya (aşağıda tam liste) |
| 10 | `git log --reverse --format="%H %s" cfe61e82c7b1458e1280187be6214ded0a702b49..HEAD` | **0** | 4 commit (yukarıda tam liste) |

Her komuttan sonra `git status --short` **boş** döndü (bu rapor dosyası
oluşturulmadan önceki tüm ölçümlerde) — komutların hiçbiri kod/manifest/
doküman dosyası yazmadı.

## Before/After

### `verify-structure`: 1144 → **1208** (+64)

Tarihsel baseline (bir önceki remediation turunda ölçülmüştü): **1144**. Bu
turda (`36d91a6…` üzerinde) ölçülen nihai değer: **1208**. Artış, yeni **7k**
bloğunun (`scripts/verify-structure.mjs`) manifest şeması, dijest bağları,
mode-aware doküman sözleşmesi ve yasak-token kontrolleriyle tutarlı.

### `verify-structure-negative`: 34 → **59 (skeleton'da koşan) / 62 (toplam tanımlı)**

Tarihsel baseline: 34/34 (tamamı skeleton-dev modunda koşuyordu, mode-ayrımı
yoktu). Bu turda ölçülen: `MODE` değeri repo'nun kendi
`scripts/structure-manifest.json` → `mode` alanından türetiliyor (bu repo
`skeleton-dev`). Toplam **62** senaryo tanımlı; bunlardan:

- **59 senaryo `mode=skeleton-dev`'de koşuyor ve PASS veriyor** (bu ölçümün
  gerçek exit-0 çıktısı: `59/59 senaryo PASS`). Bu kümenin içinde,
  fixture-seviyesinde kendi izole manifest kopyasını `mode=project` olarak
  yamayan dört proje-modu senaryosu da var (ör. `mode=project ama
  projectSlug yoksa FAIL üretir`, `mode=project iken canlı SiteSkeleton
  varsa FAIL üretir`) — bunlar global `MODE` sabitini değiştirmediği için
  skeleton-dev koşusunda da çalışıp PASS veriyor.
- **3 senaryo yalnız repo'nun kendi manifest'i `mode=project` iken koşar**
  ve bu turda `SKIP` olarak işaretlendi: `generated README'ye upstream
  release-state bölümü geri konursa FAIL üretir`, `generated CLAUDE.md'ye
  upstream release-state bölümü geri konursa FAIL üretir`, `generated RC1
  snapshot korunan bölümü değişirse FAIL üretir`. Bu üçü, `mode=project`
  kuralının generated-project tarafını doğrudan test ediyor; repo'nun kendi
  manifest'i `skeleton-dev` olduğu için burada anlamsız ve script bunları
  bilinçli olarak atlıyor (log: `kural mode=skeleton-dev için kapalı`).
  Bu üç senaryonun generated-project eşdeğeri `bootstrap-e2e` adım 11'de
  (aşağıda) ayrı bir mekanizmayla — gerçek bir `mode=project` fixture'ı
  üretilerek — pozitif yönden zaten doğrulanıyor; negatif-suite'in kendisi
  `mode=project` moduyla ayrıca koşturulmadı (bu, repo manifestini
  değiştirmeyi gerektirir ve bu QA turunun yazma yetkisi dışındadır).

25 yeni senaryo eklendiği ölçüldü (34 → 59 skeleton'da koşan; toplam 34 → 62):
audit digest/ledger/marker regresyonları (`README release-state alanı
silinirse`, `ledger audited-state alanı silinirse`, `audit digest
saptırılırsa`, `yinelenen release tag/ID`, `publication sırası bozulursa`,
`RC1 historical-note kimliği saptırılırsa`, `RC1 korunan placeholder tablosu
değişirse`, dört marker silme/ikizleme senaryosu, iki yasak-token senaryosu,
`release-attestation bayat durum tablosu geri konursa`, `indekssiz release
snapshot dosyası`, `manifest provenance'ına skeleton kimlik token'ı
eklenirse`, `dokunulmamış release provenance FAIL ÜRETMEZ`, iki project-mod
pozitif senaryosu, `project modda ledger manifestten saparsa`, `RC1 snapshot
project kimliğiyle yeniden yazılırsa`) + üç `SKIP` (generated-project
negatifleri, yukarıda listelendi).

### Hook harness: **302 assertion / 94 fixture** — değişmedi

Bu tur bu sayıları yeniden ölçtü, artış/azalış yok. Beklenen: bu remediation
hook sistemine dokunmuyor.

### `scripts/verify-structure.mjs` dosya boyutu: **1065 → ölçülen 1066 satır (kayıtlı borç)**

`wc -l scripts/verify-structure.mjs` → **1066**. `coding-style.md` genel stil
tavanı **800** satırdır; manifest `maxLines` sözlüğünde bu dosya için **hiçbir
kayıt yok** (`node -e "console.log(require('./scripts/structure-manifest.json').maxLines['scripts/verify-structure.mjs'])"`
→ `undefined`), yani `verify-structure.mjs` maxLines gate'i tarafından hiç
denetlenmiyor. Bu, ADR-0017/ADR-0018 hattında daha önce de kaydedilmiş bir
bölme borcudur; bu turda bölme yapılmadı ve borç büyüdü (dördüncü mini-audit
sonrası önceki turda 800'dü, bu turda 1066'ya çıktı — 7k bloğu eklendi).

## Generated-Project Kanıtı (`bootstrap-e2e` adım 11)

`node scripts/tests/bootstrap-e2e.mjs` çıktısından adım 11 (bu turda,
`36d91a6…` HEAD'inde bizzat koşturuldu, exit 0):

```text
=== 11. upstream release provenance ===
  PASS  README.md: upstream release-state marker'ı kaldırıldı
  PASS  README.md: upstream RC hükmü taşınmıyor
  PASS  CLAUDE.md: upstream release-state marker'ı kaldırıldı
  PASS  CLAUDE.md: upstream RC hükmü taşınmıyor
  PASS  docs/releases dosya kümesi ve byte hash'leri korundu
  PASS  manifest upstreamReleaseProvenance deep-equal korundu
  PASS  RC1 snapshot upstream başlığı korundu
  PASS  upstream GitHub linkleri project slug'a dönüşmedi
  PASS  ledger upstream provenance metni korundu
  PASS  ledger project slug'ı ile yeniden yazılmadı
```

ADR-0018 madde 9'un savı burada ampirik olarak doğrulandı: `certified-demo`
adıyla üretilen projede README/CLAUDE'daki `<!-- release-state:start/end
-->` bölümü kaldırılıyor, `docs/releases/` alt ağacı byte-seviyesinde
korunuyor (hash karşılaştırması PASS), manifest `upstreamReleaseProvenance`
nesnesi deep-equal kalıyor ve RC1 snapshot içindeki upstream GitHub linkleri
kimlik ikamesiyle slug'a dönüşmüyor. `[bootstrap-e2e] tüm assertion'lar
PASS` ve `[bootstrap-e2e] temp temizlendi: evet` ile sonuçlandı; fixture
dizini otomatik temizlendi, kaynak repo hiçbir noktada yazılmadı (`kaynak
repo hiç yazılmadı` — bkz. `bootstrap-transaction` çıktısı, aynı ilke).

Ayrıca adım 6 (generated project quality gate, `SKIP_API=1 pnpm gate`) ve
adım 7 (project-mode `verify-structure`) bu turda da **8/8 PASS** ve **PASS
satırı** üretti — generated project'te de yeni provenance registry'si
tutarlı kaldı.

## Audit Digest ve RC1 Korunan Bölüm Digest'i (bizzat ölçüldü)

`node:crypto` ile, `verify-structure.mjs` 7k bloğunun kullandığı **aynı**
yöntemle (dosyanın ham byte'ları `readFileSync` ile; RC1 korunan bölüm
`utf8` string üzerinden) bağımsız olarak yeniden hesaplandı:

| Alan | Ölçülen değer |
|---|---|
| `auditSha256` (`docs/audits/2026-07-28-fourth-mini-audit-rc2.md`, ham byte'lar) | `67fced3d02ccbb824c94d31d5e88f0e446e00c399fd2b050088e25dd7f499736` |
| RC1 korunan bölüm SHA-256 (`## Attestation (dış immutable kanıt)` dahil → `**Bağlayıcı kural:**` hariç, `docs/releases/v1.0.0-rc.1.md`, UTF-8 bytes) | `4a8d7b2fc90293ca35186e0a9506217d17f1044c132460dd1204b23c92fdf583` |

Her iki değer, `scripts/structure-manifest.json` içindeki kayıtlı değerlerle
(`upstreamReleaseProvenance.auditedState.auditSha256` ve
`auditedImmutableReleases[0].snapshotProtectedSectionSha256`) **birebir
eşleşti** — bu, `verify-structure` 7k bloğunun kendi runtime kontrolünün
(check #`auditDigest === auditedState.auditSha256` ve
`createHash(...) === rc1.snapshotProtectedSectionSha256`) bağımsız bir
ikinci ölçümle doğrulanmış olduğu anlamına gelir.

## Lokal Docker Durumu (bu turda beklenenin aksine erişilebilirdi)

Bu ortamda Docker Desktop 4.80.0 (Engine 29.6.1) daemon'ı **erişilebilir**
çıktı (`docker info` başarılı döndü) ve tam `pnpm gate` bu makinede **exit
0** verdi — `test` gate'i içindeki `mvn verify`, Testcontainers üzerinden
gerçek bir Postgres container ayağa kaldırdı ve `HealthEndpointIT` +
`JacksonContractIT` dahil tüm entegrasyon testleri geçti
(`Testcontainers version: 2.0.5`, `Ryuk started`, `Tests run: 5, Failures: 0,
Errors: 0, Skipped: 0`, `BUILD SUCCESS`). Bu tur, komut çıktısını kopyalamak
yerine **iki ayrı koşuda** (biri tail'e, biri tam log dosyasına yönlendirerek)
bağımsız olarak yeniden ölçtü; ikisi de aynı sonucu (8/8 PASS, exit 0)
üretti — flaky bir tek-seferlik başarı değil.

Bu, önceki remediation turlarında gözlemlenen "Docker client var, daemon'a
erişilemiyor" kısıtının **bu ortamda ve bu koşuda** geçerli olmadığı
anlamına gelir; makine/oturum farkına bağlı bir durumdur, bu remediation'ın
bir özelliği değildir. **Bu rapor yine de tam `pnpm gate` PASS'ini tek başına
bağlayıcı kanıt olarak sunmaz**: yerel koşu ortamdan ortama değişebilir
(Docker Desktop durumu, port çakışması, kaynak kısıtları) ve tekrarlanabilir
değildir. Bağlayıcı kanıt, PR açıldığında Linux runner'da sabit bir ortamda
koşan PR CI'daki `api-verify-testcontainers` job'ıdır — bu job **bu turda
henüz koşmadı**; PR açıldığında/CI tetiklendiğinde ayrıca doğrulanmalıdır.
`SKIP_API=1 pnpm gate` (Docker'dan bağımsız, 8/8 PASS) bu turda da ayrıca
ölçüldü ve tutarlıydı.

## Changed-File Listesi (gerçek `git diff --name-status`, base → `36d91a6…`)

```text
M	CLAUDE.md
M	README.md
A	docs/adr/ADR-0018-release-state-registry.md
M	docs/operations/authority-map.md
M	docs/operations/release-attestation.md
A	docs/releases/README.md
M	docs/releases/v1.0.0-rc.1.md
M	scripts/bootstrap-project.mjs
M	scripts/structure-manifest.json
M	scripts/tests/bootstrap-e2e.mjs
M	scripts/tests/verify-structure-negative.mjs
M	scripts/verify-structure.mjs
```

`git diff --stat` (base → `36d91a6…`), yalnız kod/script dosyaları için ayrıca
ölçüldü: `scripts/structure-manifest.json` +41/-satır, `scripts/tests/
bootstrap-e2e.mjs` +30, `scripts/tests/verify-structure-negative.mjs` +318,
`scripts/verify-structure.mjs` +266 (12 dosya toplam, **943 ekleme / 41
silme**).

Allowlist teyidi: bu QA turu **hiçbir dosyayı değiştirmedi** (`git status
--short` her ölçümden sonra bu raporun kendisi oluşturulana kadar boştu).
Yukarıdaki 12 dosya implementation dalının kendi değişikliğidir, bu rapor
tarafından üretilmemiştir. Sürpriz dosya yok: değişiklik kümesi
`scripts/structure-manifest.json` (registry), `scripts/verify-structure.mjs`
(7k enforcement), `scripts/tests/verify-structure-negative.mjs` (regresyon
kapsamı), `scripts/tests/bootstrap-e2e.mjs` (generated-project kanıtı),
`scripts/bootstrap-project.mjs` (exclude + section strip), `README.md`/
`CLAUDE.md` (bounded section), `docs/releases/**` (yeni ledger + RC1
historical-note), `docs/operations/{authority-map,release-attestation}.md`
ve yeni `docs/adr/ADR-0018-*.md` ile sınırlı. `apps/**`, `templates/**`,
`project-memory/**`, `.github/**` dokunulmadı.

## Kayıtlı Borç

`scripts/verify-structure.mjs` **1066** satıra çıktı; genel stil tavanı
**800**; manifest `maxLines` sözlüğünde bu dosya için kayıt **yok** — yani
gate bu dosyanın boyutunu hiç denetlemiyor. Bölme borcu ADR-0017/ADR-0018
hattında zaten kayıtlı; bu turda bölme yapılmadı, borç büyüdü (önceki
ölçümde 800, bu ölçümde 1066).

## Kalan Riskler

1. **Gate iç tutarlılık kanıtlar, tazelik prosedüreldir.** ADR-0018 madde 8 ve
   11 gereği `verify-structure` yalnız offline, ağaç-içi kanıtı doğrular
   (registry ↔ ledger ↔ README/CLAUDE ↔ digest bağları); registry'nin GitHub
   üzerindeki gerçek release durumunu **güncel** yansıttığını kanıtlamaz —
   bu tazelik, "Adım 9" prosedürünün insan/PR disiplinine bağlıdır.
2. **Registry değerlerinin doğruluğu code-reviewer/insan incelemesi
   gerektirir.** `verify-structure` yapısal tutarlılığı (şema, digest,
   bounded section eşitliği) denetler; `auditedCandidateTag`,
   `stableReleaseStatusAtAudit` gibi alanların **anlamsal olarak doğru**
   audit hükmünü yansıttığı makine tarafından doğrulanamaz, review gate'te
   insan gözüyle teyit edilmelidir.
3. **`verify-structure.mjs` 1066 satır, maxLines kaydı yok** (yukarıda
   "Kayıtlı Borç").
4. **Lokal Docker koşusu tekrarlanabilir değil** (yukarıdaki bölüm) —
   bağlayıcı kanıt PR CI, henüz koşmadı.
5. **`verify-structure-negative` üç senaryosu bu turda `SKIP` kaldı**
   (generated-project negatifleri, `mode=project` gerektiriyor); pozitif
   eşdeğerleri `bootstrap-e2e` adım 11'de doğrulandı ama negatif-suite'in
   kendisi `mode=project` altında ayrıca koşturulmadı.

## Statü (bağlayıcı dil — tahmin edilmiş SHA/PR/CI yok)

```text
AC-32:            IMPLEMENTED_PENDING_REVIEW_AND_PR_CI
F4-MEDIUM-02:     REMEDIATED_PENDING_REVIEW_AND_PR_CI
F4R2-MEDIUM-01:   REMEDIATED_PENDING_REVIEW_AND_PR_CI
```

PR numarası, PR CI run ID, merge SHA ve post-merge CI/C5 commit SHA'sı bu
raporda **yok** — bu rapor kendi SHA'sını içermez (Katman 1/Katman 2 ayrımı,
`docs/operations/release-attestation.md`). Bu rapor bunları **tahmin etmez**;
final zincir dış immutable attestation'da mühürlenir.

Genel proje verdict'i bu remediation ile **değişmedi**:
**FAIL / CORE_SKELETON_NOT_PRODUCTION_READY / NO_GO_REMEDIATION_REQUIRED**.
Açık kriterler: **AC-33** (core web security-header politikası, F4-MEDIUM-03)
ve **AC-26** (tag ↔ manifest sürüm source-of-truth politikası, F4-LOW-02) —
her ikisi de ADR-0018 kapsamı dışında bırakılmıştır (madde 13, Deferred work).

## Sonraki Adım

PR açılır → required check'ler (`quality-gate-ubuntu`,
`api-verify-testcontainers` dahil) koşar → code-reviewer + Security gate
Final Gate Mode'da bu raporu ve implementasyon diff'ini (özellikle 7k
enforcement bloğunu ve digest bağlarını) birlikte inceler → tüm gate'ler
yeşilse merge → memory closure protokolü (`fix/f4-release-state-registry`
dalında DEĞİL, ayrı `chore/memory-close-*` dalında).
