# AC-29 / F4-MEDIUM-01 Remediation — Pre-Merge Kanıt Raporu

> Kanıt raporu (Katman 1, pre-merge). Mod: **Preparation Mode** (QA/Test
> Specialist, `docs/test-reports/**` fiziksel yazarı). Kod/test/manifest/
> README/CLAUDE/ADR bu rapor tarafından değiştirilmemiştir — yalnız
> ölçülmüştür.
>
> **Güncelleme notu.** Bu rapor, Security gate'in bulduğu bir HIGH bulgu
> üzerine tamamen yeniden koşulmuştur (verdict-policy "Remediation Döngüsü":
> FAIL/HIGH sonrası önceki ölçümler geçersizdir). Rapor **tek** implementation
> SHA'sını (`d9c2331…`) referanslar; bu SHA'dan önceki ara ölçümler (registry
> turu, marker-root ilk sürümü) bu belgeye taşınmamıştır — aşağıdaki tüm
> sayılar bu SHA üzerinde bizzat koşturulan komutların doğrudan çıktısıdır.

## Kimlik

| Alan | Değer |
|---|---|
| Repository | `gokhan-kocaoglu/site-skeleton` |
| Dal | `fix/f4-activation-scope-registry` |
| Base SHA (main) | `f43709351e1f9b43b39054482fd6429cf8f251c6` |
| Implementation SHA (testlerin koştuğu commit) | `d9c23317741a4e1bf216ff66e400361ff65031ae` |
| Tarih | 2026-07-29 |
| Hedef kriter | AC-29 / F4-MEDIUM-01 (aktivasyon kapısı beyan↔enforcement uyuşmazlığı) |
| Komşu bulgu | F4-LOW-05 (marker-root hata mesajı yanlış dizini gösteriyordu) |
| Kaynak ADR | `docs/adr/ADR-0017-activation-enforcement-scope.md` |
| Kaynak audit | `docs/audits/2026-07-28-fourth-mini-audit-rc2.md` §19 (kök: rc1 §F4-MEDIUM-01, §F4-LOW-05) |

Dal HEAD implementation SHA'sı ile birebir aynıdır; rapor bu commit'in
üzerinde koşturulan komutları belgeler, sonradan üstüne eklenen hiçbir
commit'i kapsamaz.

## Değişiklik Özeti (raporlanıyor, yazılmadı)

`git log --reverse f43709351e1f9b43b39054482fd6429cf8f251c6..HEAD` beş
commit gösteriyor:

```text
e83b26c3e067eb2b1fcab72dfa4aca6e099ca358 docs(adr): define optional-module enforcement scope
9ab2d7af90d0185ee8c9f051f6c744a3efff6e2c feat(structure): enforce optional-module registry and activation roots
aa550c9fd7ef50e819b0e9085a1d19f268f22baa test(structure): cover activation registry and marker-root regressions
c00ff352c4f3d7712c73359c1be0f0a19e8e5962 docs: align optional-module claims with enforced scope
d9c23317741a4e1bf216ff66e400361ff65031ae fix(structure): never drop a marker-derived activation root
```

Bu QA turu implementasyonu **yazmadı**, yalnız aşağıdaki nihai değişiklik
kümesini (beşinci commit dahil) kod okuyarak + testleri koşturarak doğruladı:

1. **`activationModules` registry** (`scripts/structure-manifest.json`) —
   `templates/` altındaki beş modülün (`admin-bff`, `db`, `e2e`, `operations`,
   `payments`) her biri `id`, `templatePath`, `enforcementMode`,
   `activationTarget`, `activationDocument` taşıyor; yalnız `admin-bff` ek
   olarak `activationGateId` taşıyor.
2. **İki değerli enforcement taksonomisi** — `automatic-gate` (yalnız
   `admin-bff`, yapısal `verify-structure` denetimi var) vs.
   `manual-hardening` (`payments`/`db`/`e2e`/`operations` — otomatik gate
   yok, proje-özel sertleştirmeye kadar core production-ready iddiasının
   dışında). `documented-only` terimi kullanılmıyor (ADR-0017 karar 3).
3. **README/CLAUDE bounded section senkronu** — README ve `CLAUDE.md`
   içinde `<!-- activation-modules:start/end -->` işaretli bölümler
   registry ile birebir karşılaştırılıyor (modül kümesi + enforcement
   modu); uyuşmazlık `verify-structure` FAIL'i. README'de bu artık ayrıca
   **satır yapısına** bağlı: `Enforcement` kolonu `Template`'ten hemen
   sonra gelmek zorunda; parser bu iki kod span'ini pozisyonla okuyor.
4. **Marker-root düzeltmesi (F4-LOW-05) — nihai hâl.** Marker eşleşmesinde
   activation root, marker dizininden `apps/` yönünde yukarı yürünerek
   bulunan en yakın `package.json` sahibi ancestor; `apps` dizininin kendisi
   ve üstü asla değerlendirilmiyor, ancestor yoksa marker dizinine güvenli
   fallback yapılıyor. **Hiçbir kök artık düşürülmüyor** (aşağıdaki
   "Güvenlik kapısı turu" bölümüne bakın — bu son adım bir HIGH bulgusunun
   doğrudan remediation'ıdır).
5. **Tespit sinyalleri kodda sabitlendi.** `nameFragment` ve `marker`
   sinyalleri artık manifest verisi değil, `scripts/verify-structure.mjs`
   içinde sabit; ayrıca (a) şablonun gerçekten marker imzasını taşıdığı ve
   (b) checklist madde sayısının kodda sabitlenen 12 ile eşleştiği çapraz
   doğrulanıyor.
6. Mevcut `activationGates` döngüsü (yalnız `admin-bff`, `apps/` tarama
   kökü, `unchecked === 0 && ticked === checklistItems` katı eşitliği)
   **değiştirilmedi**.

## Güvenlik Kapısı Turu (bulgu gizlenmiyor)

Security gate incelemesi, dördüncü commit'teki (`c00ff352…`) marker-root
düzeltmesinin **ilk sürümünde** bir **HIGH** bulgu tespit etti:

**Bulgu.** İlk sürüm, bir marker kökünü "daha spesifik başka bir kökün
gerçek atasıysa" (gruplama dizini varsayımıyla) düşürüyordu. Security gate
bunun **false-PASS** ürettiğini kanıtladı: sertleştirilmemiş bir kopya
(`apps/gw/` — gerçek `admin-bff` kopyası, kendi ACTIVATION.md'si eksik/
işaretsiz) altına, tamamen 12/12 işaretli bir "decoy" alt-checklist
yerleştirildiğinde, ata-daraltma mantığı üstteki gerçek kopyanın kökünü
"gruplama dizini" sanıp eliyor ve yalnız derindeki (zaten hardened) decoy'u
denetliyordu. Sonuç: taban durumda (`c00ff352…` öncesi, ata-daraltması yok)
bu senaryo doğru şekilde FAIL veriyordu; ata-daraltmalı ara sürüm ise
**exit 0** (false-PASS) döndürüyordu — yani düzeltme, düzelttiğini iddia
ettiği sınıftan yeni bir güvenlik açığı açmıştı.

**Remediation (`d9c23317741a4e1bf216ff66e400361ff65031ae`, commit mesajından
birebir):**

```text
Security gate proof: an interim ancestor-narrowing step hid an unhardened
copy behind a deeper decoy checklist (base FAIL -> interim exit 0).
Detection signals are pinned in code too, so blanking nameFragment/marker
in the manifest can no longer disarm the gate silently.
```

Somut değişiklik: ata-daraltması **tamamen kaldırıldı** — artık hiçbir
marker kökü, başka bir kökün atası olduğu gerekçesiyle düşürülmüyor;
gruplama dizini senaryosunda kasıtlı olarak **iki ayrı talep** üretiliyor
(fazladan talep fail-closed gürültüdür, düşürülen talep false-PASS'tır —
ADR-0017 bu tercihi açıkça gerekçelendiriyor). Ayrıca gate'in tespit
sinyalleri (`nameFragment`, `marker`) manifest'ten koda taşınarak, manifest
düzenlemesiyle sessizce silahsızlandırılabilme yüzeyi kapatıldı.

**Negatif testle çivileme.** Beşinci commit üç yeni regresyon senaryosu
ekledi (tam adları, bu turda koşturulan gerçek komut çıktısından):

- `derindeki decoy ACTIVATION.md üstteki sertleştirilmemiş kopyayı gizleyemez (marker kökü)`
  — doğrudan bu HIGH bulgunun regresyon testi; ata-daraltması geri gelirse
  bu senaryo FAIL üretir.
- `manifest'te tespit sinyallerini boşaltmak FAIL üretir (gate sinyalleri kodda sabit)`
  — sinyallerin koda sabitlenmesinin regresyon testi.
- `README tablosunda kolon sırası bozulursa FAIL üretir (beyan yapısı)`
  — satır-yapısına bağlı doküman parse'ının regresyon testi.

Bu üç senaryo, aşağıdaki "Çalıştırılan Komutlar" bölümündeki
`verify-structure-negative` çıktısında **PASS** olarak görünüyor (satır 21-23,
34/34 toplamın parçası).

## Çalıştırılan Komutlar × Exit Code × Gerçek Sayısal Çıktı

Tüm komutlar bu QA turunda, `fix/f4-activation-scope-registry` dalının
`d9c23317741a4e1bf216ff66e400361ff65031ae` HEAD'inde bizzat koşturuldu.

| # | Komut | Exit | Gerçek çıktı |
|---|---|---|---|
| 1 | `node scripts/verify-structure.mjs` | **0** | `PASS — 1144 checks OK (manifest: scripts/structure-manifest.json)` |
| 2 | `node scripts/tests/verify-structure-negative.mjs` | **0** | `34/34 senaryo PASS (mode=skeleton-dev; toplam 34)` |
| 3 | `node .claude/hooks/tests/run-tests.js` | **0** | `PASS — 302 assertions OK (94 fixtures + settings bindings + git closure-context scenarios)` |
| 4 | `node scripts/tests/bootstrap-transaction.mjs` | **0** | `7/7 senaryo PASS` |
| 5 | `node scripts/tests/bootstrap-e2e.mjs` | **0** | tüm assertion PASS (10 bölüm, ayrıntı aşağıda) |
| 6 | `pnpm gate` | **1** | Gate tablosu: toolchain/build/typecheck/lint/audit/structure/contract-drift **PASS**, **test FAIL** (Docker daemon yok) |
| 7 | `SKIP_API=1 pnpm gate` | **0** | `All gates PASS` — toolchain·build·typecheck·lint·test·audit·structure·contract-drift = **8/8 PASS** |

Her komuttan sonra `git status --short` bu rapor dosyası dışında **boş**
döndü (üç noktada ayrıca teyit edildi: 4/5 sonrası, tam gate sonrası,
SKIP_API gate sonrası) — komutların hiçbiri kod/manifest/doküman dosyası
yazmadı; tek görülen değişiklik, bu raporun kendisinin oluşturulmasıydı
(bu belge, izin verilen tek yazma yolu).

## Before/After

### `verify-structure`: 1089 → **1144** (+55)

Baseline (bu daldan önce, `main` üzerinde ölçülmüştü): **1089**. Bu turda
(`d9c2331…` üzerinde) ölçülen nihai değer: **1144**. Artışın kaynağı kod
okumasıyla doğrulandı (`scripts/verify-structure.mjs` 7j bloğu, ADR-0017
"Enforcement model" tablosu ile tutarlı):

- Registry bütünlük kontrolleri: id/templatePath benzersizliği, gerçek
  `templates/*` kümesiyle eşitlik, `activationDocument` varlığı,
  mod↔gate tutarlılığı (yalnız `admin-bff` `activationGateId` taşıyabilir),
  orphan gate yasağı, `checklistItems === 12` sabiti.
- Doküman senkron kontrolleri: README ve `CLAUDE.md` bounded section'ları
  ↔ registry (modül kümesi + enforcement modu) eşitliği; README'de ayrıca
  kolon-sırası yapı kontrolü.
- Tespit sinyali sabitleme kontrolleri: `nameFragment`/`marker` sinyallerinin
  koddaki sabit değerlerle eşleşmesi, marker imzasının gerçek şablonda
  bulunduğunun ve checklist sayısının (12) gerçek `ACTIVATION.md` ile
  çapraz doğrulanması.
- Ata-daraltmasının kaldırılmasıyla marker-root çözümlemesinin artık iki
  ayrı talep üretebildiği (gruplama dizini senaryosu) yeni dallanma yolları.
- `docs/adr/ADR-0017-activation-enforcement-scope.md` dosyasının
  `requiredFiles`/`maxLines`/`noBom` manifest kayıtları (yeni ADR dosyası
  yapısal olarak zorunlu kılındı).

`scripts/structure-manifest.json` diff'i (base→HEAD, tek implementation
SHA'sı) +41 satır (`activationModules` registry bloğu).

### `verify-structure-negative`: 19 → **34** (+15)

Baseline: 19/19. Bu turda (`d9c2331…` üzerinde) ölçülen nihai değer:
**34/34**. Eklenen 15 senaryo, base commit (`f43709351e1f9b43b39054482fd6429cf8f251c6`)
ile HEAD (`d9c2331…`) arasındaki `scripts/tests/verify-structure-negative.mjs`
`name:` alanları satır satır karşılaştırılarak ve gerçek komut çıktısıyla
(madde 2) çapraz doğrulanarak tespit edildi:

1. `registry'de olmayan templates/ dizini FAIL üretir (activationModules)`
2. `registry templatePath gerçekte yoksa FAIL üretir (activationModules)`
3. `yinelenen registry id FAIL üretir (activationModules)`
4. `manual-hardening kayıtta activationGateId FAIL üretir (activationModules)`
5. `automatic-gate kaydın geçersiz gate id'si FAIL üretir (activationModules)`
6. `README bölümünden modül silinirse FAIL üretir (beyan ↔ registry)`
7. `CLAUDE.md bölümünden modül silinirse FAIL üretir (beyan ↔ registry)`
8. `README'de enforcement modu değiştirilirse FAIL üretir (beyan ↔ registry)`
9. `alt dizindeki marker paket kökünü işaret eder (F4-LOW-05)`
10. `alt dizin marker + kökte 12/12 ACTIVATION.md FAIL ÜRETMEZ (F4-LOW-05)`
11. `derindeki decoy ACTIVATION.md üstteki sertleştirilmemiş kopyayı gizleyemez (marker kökü)` — **güvenlik kapısı turunun regresyon testi**
12. `manifest'te tespit sinyallerini boşaltmak FAIL üretir (gate sinyalleri kodda sabit)` — **güvenlik kapısı turunun regresyon testi**
13. `README tablosunda kolon sırası bozulursa FAIL üretir (beyan yapısı)` — **güvenlik kapısı turunun regresyon testi**
14. `13 işaretli madde (beklenen 12) FAIL üretir (ticked === checklistItems)`
15. `dokunulmamış templates/ + senkron beyan FAIL ÜRETMEZ (registry taban kontrolü)`

19 + 15 = 34, komut çıktısındaki toplamla eşleşiyor. Senaryo 11-13 beşinci
commit'te (`d9c2331…`) eklendi; 1-10 ve 14-15 dördüncü commit'te (`c00ff352…`)
eklenmişti — rapor bu ayrımı yalnız izlenebilirlik için not eder, doğrulama
tek implementation SHA'sı üzerinden koşturuldu.

### `scripts/verify-structure.mjs` dosya boyutu: **800 satır**

`wc -l scripts/verify-structure.mjs` → **800**. Bu, coding-style.md'deki
800 satır tavanına tam eşit; ADR-0017 "Consequences" bölümü bunu açıkça
"800 satır tavanına yaklaşıldı, bölme borcu kaydedildi" olarak işaretliyor
— bölme henüz yapılmadı ve bu turda kayıtlı bir risktir (aşağıya bakın).

### Hook harness: **302 assertion / 94 fixture** — değişmedi

Bu tur bu sayıları yeniden ölçtü, artış/azalış yok. Beklenen: bu
remediation hook sistemine dokunmuyor.

## Generated-Project Kanıtı (bootstrap-e2e)

`node scripts/tests/bootstrap-e2e.mjs` çıktısından ilgili bölümler (tam
çıktı bu turda, `d9c2331…` HEAD'inde bizzat koşturuldu, exit 0):

**Adım 6 — generated project quality gate:**

```text
=== 6. generated project quality gate ===
  PASS  pnpm gate exit 0 (SKIP_API=1)
  PASS  gate tablosu "All gates PASS"
  PASS  gate build PASS
  PASS  gate typecheck PASS
  PASS  gate lint PASS
  PASS  gate test PASS
  PASS  gate audit PASS
  PASS  gate structure PASS
  PASS  gate contract-drift PASS
```

**Adım 7 — project-mode structure:**

```text
=== 7. project-mode structure ===
  PASS  verify-structure exit 0
  PASS  structure PASS satırı
```

ADR-0017 "Generated-project effect" bölümünün savı burada ampirik olarak
doğrulandı: registry/README/CLAUDE bölümlerindeki token'lar
(`templates/<id>/`, `automatic-gate`, `manual-hardening`, beş modül id'si)
bootstrap metin ikame anahtarlarını içermediği için, `certified-demo` adıyla
üretilen projede de üç yüzey (registry, README bölümü, CLAUDE bölümü) eşit
kaldı ve `verify-structure` project-mode altında da PASS verdi. `[bootstrap-e2e]
tüm assertion'lar PASS` ve `[bootstrap-e2e] temp temizlendi: evet` ile
sonuçlandı; fixture dizini otomatik temizlendi, kaynak repo hiçbir noktada
yazılmadı.

## Lokal Docker Sınırı

Tam `pnpm gate` bu makinede **exit 1** verdi. Neden: `mvn verify` adımındaki
Testcontainers, Docker daemon'ı bulamıyor:

```text
[main] ERROR org.testcontainers.dockerclient.DockerClientProviderStrategy --
Could not find a valid Docker environment. Please check configuration.
...
Caused by: java.lang.IllegalStateException: Could not find a valid Docker
environment. Please see logs and check configuration
    at ... GenericContainer.start(GenericContainer.java:316)
    at com.skeleton.api.AbstractIntegrationTest.<clinit>(AbstractIntegrationTest.java:34)
```

Bu, bu remediation'ın bir hatası **değildir**: `apps/api` bu dalda hiç
değişmedi (`git diff --name-status` — bkz. aşağıki tablo — `apps/**` hiç
görünmüyor). Frontend testleri (`web`, `admin`) bu koşuda geçti. `SKIP_API=1
pnpm gate` **8/8 PASS** verdi (exit 0).

**Bu rapor tam `pnpm gate`'i PASS olarak göstermez.** Bağlayıcı kanıt PR
CI'daki `api-verify-testcontainers` job'ıdır (Linux runner'da gerçek Docker
daemon ile koşar) — bu job **bu turda henüz koşmadı**; PR açıldığında/CI
tetiklendiğinde ayrıca doğrulanmalıdır.

## Changed-File Listesi (gerçek `git diff --name-status`, base → `d9c2331…`)

```text
M	CLAUDE.md
M	README.md
A	docs/adr/ADR-0017-activation-enforcement-scope.md
M	scripts/structure-manifest.json
M	scripts/tests/verify-structure-negative.mjs
M	scripts/verify-structure.mjs
```

`git diff --stat` (base → `d9c2331…`): 6 dosya, **743 ekleme / 20 silme**
(beşinci commit dahil kümülatif toplam).

Allowlist teyidi: bu QA turu **hiçbir dosyayı değiştirmedi**
(`git status --short` her ölçümden sonra yalnız bu rapor dosyasını
gösterdi). Yukarıdaki altı dosya implementation dalının kendi
değişikliğidir, bu rapor tarafından üretilmemiştir. Sürpriz dosya yok:
değişiklik kümesi tamamen `scripts/structure-manifest.json` (registry),
`scripts/verify-structure.mjs` (7j enforcement + marker-root fix),
`scripts/tests/verify-structure-negative.mjs` (regresyon kapsamı),
`README.md`/`CLAUDE.md` (bounded section beyanı) ve yeni
`docs/adr/ADR-0017-*.md` ile sınırlı. `apps/**`, `templates/**`,
`project-memory/**`, `.github/**` dokunulmadı.

## Kalan Riskler / Kapsam Dışı Bırakılanlar

ADR-0017 "Deferred work" ve "Kalan Riskler" bölümleriyle tutarlı, bu QA
turunda ayrıca doğrulanmış:

1. **`payments`/`db`/`e2e`/`operations` için ACTIVATION.md ve otomatik gate
   ertelendi.** Bu dört modül `manual-hardening` olarak kayıtlı ama
   `verify-structure` bunları yapısal olarak denetlemiyor — kayıt yalnız
   repository claim kapsamını gerçek enforcement kapsamıyla eşitliyor,
   modülleri güvenli hale getirmiyor. `payments` en güvenlik-hassas
   modüldür ve aktivasyon anındaki sertleştirme (webhook imza doğrulaması,
   idempotency, tutar bütünlüğü, log redaction) proje sorumluluğunda kalır.
2. **`packages/` scan root eklenmedi.** Aktivasyon taraması `apps/**` ile
   sınırlı kalmaya devam ediyor; bu turda bilinçli olarak genişletilmedi.
3. **Bounded section dışına eski genelleştirilmiş garantinin geri
   yazılması makine tarafından yakalanmıyor.** `<!-- activation-modules:start/end
   -->` işaretleri dışında birinin README'ye "tüm şablonlar otomatik gate'li"
   gibi bir cümle eklemesi `verify-structure` tarafından tespit edilmez; bu
   artık risk insan incelemesiyle (code-reviewer/Final Gate) kapanır.
   README'nin bounded section içindeki **serbest metni** de denetlenmez,
   yalnız `Enforcement` kolonunun `Template`'ten hemen sonra gelen yapısı
   denetlenir (ADR-0017 "Security limitations").
4. **Marker-root düzeltmesinin kabul edilen artık riski (nihai hâl).**
   Sertleştirme birimi artık paket sınırıdır: 12/12 işaretli bir paketin
   içine, kendi `package.json`'ı **olmadan** vendor'lanmış ikinci bir kopya
   ayrı FAIL üretmez; o paketin checklist sahibinin sorumluluğundadır. Kendi
   `package.json`'ı olan iç kopya ise ayrı bir kök olarak denetlenmeye
   devam eder. Ata-daraltmasının kaldırılmasıyla, artık gruplama dizini
   senaryosunda **iki ayrı talep** üretilebilir — bu, önceki turun
   çözdüğü false-PASS'a kıyasla kabul edilebilir bir gürültü artışıdır
   (fail-closed).
5. **`verify-structure.mjs` 800 satır tavanına ulaştı, bölme borcu
   kaydedildi.** ADR-0017 bunu açıkça "üstlenilen borç" olarak işaretliyor;
   bu turda bölme yapılmadı.
6. **Local Docker sınırı** (yukarıda ayrı bölüm) — bağlayıcı kanıt PR
   CI'daki `api-verify-testcontainers` job'ı, henüz koşmadı.

## Sahte-PASS Karşı-Önlemleri (hangi negatif senaryo hangi invariant'ı ısırıyor)

| Invariant | Isıran negatif senaryo(lar) |
|---|---|
| Registry, gerçek `templates/*` kümesiyle birebir örtüşmeli | #1 (registry'de olmayan dizin), #15 (dokunulmamış templates/ + senkron beyan FAIL ÜRETMEZ — pozitif kontrol taban çizgisi) |
| `templatePath` gerçek dosya sistemine karşılık gelmeli | #2 |
| Registry id'leri benzersiz olmalı | #3 |
| Yalnız `admin-bff` `activationGateId` taşıyabilir (`manual-hardening` kaydında olamaz) | #4 |
| `automatic-gate` kaydın gate id'si gerçek bir gate'e karşılık gelmeli (orphan gate yasağı) | #5 |
| README bounded section, registry modül kümesiyle eşit olmalı | #6 |
| CLAUDE.md bounded section, registry modül kümesiyle eşit olmalı | #7 |
| README'deki enforcement modu, registry'deki modla eşit olmalı | #8 |
| Marker-root, en yakın `package.json` sahibi ancestor olmalı (alt dizin marker → paket kökü, `apps` kökünün kendisi değil) | #9, #10 |
| **Hiçbir marker kökü "gruplama dizini" varsayımıyla düşürülmemeli** (güvenlik kapısı HIGH bulgusunun regresyonu — üstteki sertleştirilmemiş kopya, altındaki decoy'un arkasına gizlenemez) | #11 |
| Tespit sinyalleri (`nameFragment`, `marker`) manifest'ten değil koddan gelmeli; manifest'te boşaltmak kapıyı etkisizleştiremez | #12 |
| README doküman yapısı (kolon sırası) beyan parse'ının ön koşulu | #13 |
| Checklist `ticked === checklistItems` katı eşitliği (13 işaretli ≠ 12 beklenen → FAIL; fazladan sahte madde eksik zorunlu maddeyi maskeleyemez) | #14 |

## Statü (bağlayıcı dil — tahmin edilmiş SHA/PR/CI yok)

```text
AC-29:          IMPLEMENTED_PENDING_REVIEW_AND_PR_CI
F4-MEDIUM-01:   REMEDIATED_PENDING_REVIEW_AND_PR_CI
F4-LOW-05:      REMEDIATED_PENDING_REVIEW_AND_PR_CI
```

PR numarası: `<açık — PR henüz açılmadı>`.
PR CI run ID / `api-verify-testcontainers` sonucu: `<açık — henüz koşmadı>`.
Merge SHA: `<açık — henüz merge edilmedi>`.
Post-merge main CI run: `<açık — henüz yok>`.

Bu rapor bunları **tahmin etmez**; final zincir (merge SHA + post-merge CI
run URL + kanıt linkleri) dış immutable attestation'da mühürlenir
(`docs/operations/release-attestation.md`).

## Sonraki Adım

PR açılır → required check'ler (`quality-gate-ubuntu`,
`api-verify-testcontainers` dahil) koşar → code-reviewer + Security gate
Final Gate Mode'da bu raporu ve implementasyon diff'ini (özellikle
güvenlik kapısı turunda düzeltilen marker-root mantığını) birlikte inceler
→ tüm gate'ler yeşilse merge → memory closure protokolü
(`fix/f4-activation-scope-registry` dalında DEĞİL, ayrı
`chore/memory-close-*` dalında).
