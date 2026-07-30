# AC-32 / F4-MEDIUM-02 Remediation — Pre-Merge Kanıt Raporu

> Kanıt raporu (Katman 1, pre-merge). Mod: **Preparation Mode** (QA/Test
> Specialist, `docs/test-reports/**` fiziksel yazarı). Kod/test/manifest/
> README/CLAUDE/ADR/ledger/audit bu rapor tarafından değiştirilmemiştir —
> yalnız ölçülmüştür. Bu tur implementasyonu **yazmadı**; aşağıda kimliği
> verilen implementation/test tree üzerinde bizzat koşturulan komutlarla
> doğruladı.

## Kimlik

| Alan | Değer |
|---|---|
| Repository | `gokhan-kocaoglu/site-skeleton` |
| Dal | `fix/f4-release-state-registry` |
| Base SHA (main) | `cfe61e82c7b1458e1280187be6214ded0a702b49` |
| Implementation/test SHA (testlerin bizzat koştuğu commit, C7) | `1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd` |
| Tarih | 2026-07-29 |
| Hedef kriter | AC-32 / F4-MEDIUM-02 (README/CLAUDE RC durumunu bildirmiyordu) |
| Aynı kök nedenli komşu bulgu | F4R2-MEDIUM-01 (`docs/operations/release-attestation.md` durum tablosu bayat) |
| Kaynak ADR | `docs/adr/ADR-0018-release-state-registry.md` |
| Kaynak audit | `docs/audits/2026-07-28-fourth-mini-audit-rc2.md` (§F4-MEDIUM-02, §F4R2-MEDIUM-01, §Acceptance Matrix) |

## Ölçüm Bağlamı: Üç Ayrı Kavram (self-reference sınırı)

Bu raporun daha önceki sürümü "dal ucu, implementation SHA'sı ile birebir
aynıdır" iddiasını taşıyordu. Bu iddia **yapısal olarak yanlıştır ve
kaldırılmıştır**: kanıt raporu, kanıtladığı ağacın üzerine ayrı bir commit
olarak eklendiği anda dal ucu artık implementation SHA'sı değildir. Kanıt
zincirinin doğru modeli üç kavramı ayırır:

| Kavram | Değer / otorite | Bu raporda nasıl kullanılır |
|---|---|---|
| **Implementation/test tree** | `1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd` (C7) | Aşağıdaki **tüm** komut çıktıları, dosya satır sayıları, digest'ler ve senaryo sayıları bu ağaçta ölçüldü. Ölçümün tek bağlamı budur. |
| **Evidence commit** | Bu rapor dosyası | Implementation/test tree'den **sonra** oluşturulur; bu yüzden ölçtüğü ağacın parçası değildir ve **kendi SHA'sını yazmaz** (Katman 1/Katman 2 ayrımı, `docs/operations/release-attestation.md`). |
| **Final dal ucu** | Otoritesi **GitHub PR metadata'sı** | Bu rapor final dal ucunun ne olduğunu iddia etmez, tahmin etmez ve "ölçüm bağlamı" olarak kullanmaz. Dal ucu, kanıt commit'leri eklendikçe ilerler; kanıtın tazeliği implementation/test SHA'sına bakılarak denetlenir. |

Sonuç olarak bu raporda hiçbir ölçüm sembolik bir dal ucu referansına
bağlanmamıştır; her `git` komutu **exact SHA aralığı** ile yazılmıştır, böylece
üçüncü bir taraf aynı komutu aynı sonuçla yeniden koşturabilir.

Tarihsel bağlam: `d1066ca529aa97bdb5b7b50342a354a18370ae13` bu raporun **önceki
evidence commit'idir** (C5). Bu SHA yalnız tarihsel zincir bağlamında geçer;
"current" veya final dal ucu olarak sunulamaz.

## Commit Zinciri (base → implementation/test tree)

```bash
git log --reverse --format="%H %s" \
  cfe61e82c7b1458e1280187be6214ded0a702b49..1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd
```

Yedi commit:

```text
c2308d03080ecbc4ca21fbcfce567183340f270b docs(adr): define audited upstream release provenance
3100bc2f3ade4d8db992cc07047575bca12544d8 docs(release): align audited release status and historical snapshots
4a526933647869d34740493a8f4f298eb324d5dc feat(structure): enforce upstream release provenance and bootstrap semantics
36d91a668eee31d7081640e90b166e6e2df92886 test(structure): cover release provenance and generated-project behavior
d1066ca529aa97bdb5b7b50342a354a18370ae13 docs(test): record AC-32 remediation evidence
45edcbb0aee2a16888b35088a2fce42fdbe83579 fix(structure): enforce exact audited release provenance schema
1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd test(structure): cover provenance schema and stale-state regressions
```

| # | Commit | Rolü |
|---|---|---|
| C1 | `c2308d03…` | ADR-0018 karar kaydı |
| C2 | `3100bc2f…` | Ledger + tarihsel snapshot hizalaması |
| C3 | `4a526933…` | Enforcement + bootstrap semantiği |
| C4 | `36d91a66…` | Regresyon kapsamı (ilk negatif tur) |
| C5 | `d1066ca5…` | Kanıt raporunun ilk sürümü (evidence, tarihsel) |
| C6 | `45edcbb0…` | Bağımsız denetimin iki açığına düzeltme (exact şema + ledger bütünlüğü + bounded-section/bayat-durum kuralları) |
| C7 | `1c4b4b2a…` | C6 kurallarının negatif regresyon kanıtı (+ bir gerçek false-negative düzeltmesi) |

### C6 / C7 kapsamları (gerçek `git diff --name-status`)

| Commit | Değişen dosyalar |
|---|---|
| C6 `45edcbb0…` | `docs/releases/README.md`, `scripts/verify-structure.mjs` |
| C7 `1c4b4b2a…` | `scripts/tests/verify-structure-negative.mjs`, `scripts/verify-structure.mjs` |

`docs/operations/release-attestation.md` C6/C7'de **değişmedi** — Düzeltme D
(aşağıda) kuralı doğrulama tarafında bağlam-exact hale getirdiği için sözleşme
dosyasının içeriğinde değişiklik gerekmedi.

C7'nin kapsamında test dosyası dışında `scripts/verify-structure.mjs`'ye de bir
hunk taşınması **bilinçli bir kapsam sapmasıdır** ve burada açıkça kayıtlıdır:
ALL-CAPS Türkçe senaryosu kuralda gerçek bir false-negative açığa çıkardı
(gerekçe: Düzeltme D, i-varyantı maddesi), düzeltme onu kanıtlayan testle aynı
commit'te durur.

## Doğrulanan Değişiklik Kümesi (raporlanıyor, yazılmadı)

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
   state özetini ve iki kayıtlı release history satırını taşıyor. C6 ile
   geçmiş tablosu **sekiz kolona** genişletildi. Ölçülen satır sayısı **69**
   (manifest `maxLines` kaydı **120**, limit altında).
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
7. **`scripts/verify-structure.mjs` yeni 7k bloğu** — `node:crypto` ile
   audit dosyası digest'i + RC1 korunan bölüm digest bağını doğruluyor;
   mode-aware doküman sözleşmesi (skeleton-dev'de upstream bölümü zorunlu,
   project modda yasak); exact canonical şema; bounded-section yasak desenleri;
   bayat-durum kuralları. Kod okumasıyla doğrulandı: ADR-0018 madde 11 gereği
   **ağ/git-ancestry kuralı yok** — yalnız offline, ağaç-içi kanıt kullanılıyor.
8. **`scripts/bootstrap-project.mjs`** — `EXCLUDE_DIRS += docs/releases`;
   README/CLAUDE bounded section'ı aynı `replace` operasyonunun final byte
   çıktısından kaldırılıyor. maxLines manifest kaydı **500 korundu**; ölçülen
   gerçek satır sayısı **492** (limit altında).
9. **Negatif suite + `bootstrap-e2e` genişletildi** — aşağıda ayrıntılı.

## Review Düzeltmeleri (C6 + C7)

### Düzeltme A — exact canonical schema (fail-closed)

Doğrulama artık zorunlu alanların **varlığını** değil **exact anahtar
kümesini** ölçüyor:

- top-level `upstreamReleaseProvenance` exact iki anahtar: `auditedState`,
  `auditedImmutableReleases`.
- `auditedState` exact yedi anahtar: `auditedCandidateTag`, `auditReport`,
  `auditSha256`, `verdict`, `productionReadiness`, `recommendation`,
  `stableReleaseStatusAtAudit`.
- Uygulama: `sameKeySet(value, expected)` — sıralı anahtar listelerinin birebir
  eşitliği (`scripts/verify-structure.mjs`, kod okumasıyla teyit edildi).

Yasak isimler tek tek özel-case **edilmedi**. `currentRelease`,
`latestRelease`, `stableReleaseExists`, hatta zararsız görünen `displayLabel`
gibi **bilinmeyen her alan** şema dışı olduğu için reddedilir. Bu, "yasak
kelime listesi" yaklaşımının kaçırdığı sınıfı kapatır.

### Düzeltme B — release-record schema + ledger bütünlüğü

- Zorunlu yedi alan: `tag`, `releaseId`, `targetCommit`, `publishedAt`,
  `prerelease`, `immutable`, `repositorySnapshot`.
- İzinli koşullu üç alan: `snapshotProtectedSectionSha256`,
  `attestationVerified`, `attestationChecks`. Başkası yasak (`releaseName`,
  `latest*`, `current*` dahil — değerinde skeleton kimlik token'ı olmasa bile).
- Koşullu kurallar **iki yönlü** bağlandı: `repositorySnapshot` string ise
  `snapshotProtectedSectionSha256` zorunlu ve lowercase 64-hex; `null` ise bu
  alan taşınmamalı (bağlanacak dosya yok). Attestation alanları ya ikisi
  birlikte ya hiç; `attestationVerified` boolean, `attestationChecks` pozitif
  integer.
- Ledger geçmiş tablosu **sekiz kolona** genişletildi: `Tag`, `Release ID`,
  `Target commit`, `Published (UTC)`, `Prerelease`, `Immutable`,
  `Attestation`, `Repository snapshot`. Önceden `prerelease`/`immutable`/
  attestation yalnız **düz metinde** duruyordu, dolayısıyla tek taraflı bir
  manifest düzenlemesi makinece görünmüyordu.
- Normalize edilmiş attestation hücresi: çift varsa `verified:<sayı>` (boolean
  true) / `unverified:<sayı>` (boolean false), yoksa `not-recorded`.
  Boolean'ın etiketi belirlemesi, `attestationVerified` tek başına
  çevrildiğinde mismatch doğmasını sağlar.
- Mevcut satırlar (ölçülen ledger içeriğiyle teyit edildi): RC1 →
  `true | true | not-recorded | docs/releases/v1.0.0-rc.1.md`; RC2 →
  `true | true | verified:11 | none`.
- Ek invariant: release-history satırları bounded `release-state` bölümünün
  **dışında** kalmalı (aksi hâlde yasak-token kuralı ancak bölümün içi
  boşaltılarak sağlanırdı).
- **Sınır:** registry ve ledger bilinçli olarak birlikte değiştirilirse dış
  gerçekliğin doğruluğu hâlâ human/code-review sorumluluğudur; structural
  gate'in görevi **tek-taraflı drift'i** engellemektir.

### Düzeltme C — bounded-section yasakları

`SECTION_FORBIDDEN_PATTERNS` etiketli desen listesine dönüştü
(`scripts/verify-structure.mjs`, kod okumasıyla teyit edildi):

- 40-hex commit SHA — artık **case-insensitive** `[0-9a-fA-F]{40}` (uppercase
  SHA aynı self-reference'tır),
- CI run URL (`actions/runs/<n>`),
- 7+ haneli sayı (release ID / CI run ID),
- PR numarası,
- skeleton kimlik token'ı,
- release metadata alanı (`publishedAt` / `prerelease` / `immutable`),
- olumlu attestation sinyali (`attestationVerified`, `verified:<n>`,
  attestation + "doğrulandı" yakınlığı).

Hata mesajı ihlalin **sınıfını** adlandırıyor (etiket listesi), böylece bulgu
tek bakışta okunuyor.

### Düzeltme D — release-attestation bayat-durum kümesi, bağlam-exact parser

`docs/operations/release-attestation.md` **zamansız bir sözleşmedir** ve kendi
placeholder modelini meşru olarak öğretir (`FINAL_MERGE_SHA`,
`FINAL_MAIN_CI_RUN_URL`, "Final evidence closure merge SHA" tablo etiketleri).
Basit repo-wide kelime yasağı bu meşru örnekleri kırardı. Bu yüzden yasak iki
**exact bağlama** ayrıldı:

- **Heading kuralı:** hangi casing/emphasis/tarih ekiyle olursa olsun bir
  `Mevcut durum` başlığı geri gelemez — tek istisna, durumun burada
  tutulMADIĞINI söyleyen `## Mevcut durum burada tutulmaz` yönlendirme başlığı.
- **Token kuralı:** SCREAMING_SNAKE status identifier'ları
  (`RC1_RELEASE_TARGET_SHA`, `FINAL_EVIDENCE_MERGE_SHA`,
  `FINAL_EVIDENCE_POST_MERGE_CI_RUN_URL`, `FINAL_EVIDENCE_CLOSURE_PR`,
  `FINAL_EVIDENCE_CLOSURE_MERGE_SHA`,
  `FINAL_EVIDENCE_CLOSURE_POST_MERGE_CI_RUN_URL`, `PENDING_USER_ACTION`) ve üç
  dış-durum cümlesi (`Dördüncü mini-denetim başlatılmadı`, `Release
  oluşturulmadı`, `Tag oluşturulmadı`) — casing ve Markdown vurgusundan
  bağımsız. Identifier biçimi ile düz prose biçimi asla karışamaz.
- **Ek gerçek (false-negative düzeltmesi):** ALL-CAPS Türkçe senaryosu kuralda
  gerçek bir açık ortaya çıkardı — `'I'.toLowerCase()` noktalı `i` üretirken
  yazılı biçim noktasız `ı` taşır, dolayısıyla düz `toLowerCase()`
  karşılaştırması tam büyük harfli cümleyi kaçırıyordu. **Test kuralın kör
  noktasına uydurulmadı; kural düzeltildi** (`foldCase`: i-varyantları —
  U+0307 birleşik nokta ve U+0131 noktasız `ı` — bare `i`'ye katlanıyor).

### Düzeltme E — bu raporun kendisi

Self-reference düzeltmesi: "dal ucu = implementation SHA" iddiası kaldırıldı,
üç kavram (implementation/test tree · evidence commit · final dal ucu) yukarıda
açıkça ayrıldı, tüm komut örnekleri exact SHA aralığına çevrildi.

## Yeni Negatif Senaryolar (C7)

Aşağıdaki senaryolar `1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd` ağacında
bizzat koşturuldu ve exit-0 çıktısında **PASS** verdi.

| Sınıf | Senaryo |
|---|---|
| Exact schema | `auditedState`'e `currentRelease` eklenmesi |
| Exact schema | provenance top-level'ına `latestRelease` eklenmesi |
| Exact schema | release kaydına kimlik token'ı **taşımayan** `displayLabel: "Audited candidate"` — kasıtlı olarak kimlik regex'iyle yakalanamaz, yalnız exact key-set kuralını ölçer |
| Koşullu şema | snapshot'sız kayda protected digest eklenmesi |
| Koşullu şema | bölünmüş attestation çifti (biri var, biri yok) |
| Ledger metadata drift | RC2 `immutable` false (yalnız manifest değişir, ledger dokunulmaz) |
| Ledger metadata drift | RC2 `prerelease` false |
| Ledger metadata drift | RC2 `attestationVerified` false → beklenen mismatch `unverified:11` |
| Ledger metadata drift | RC2 `attestationChecks` 10 → beklenen `verified:10` |
| Bayat durum | attestation yönlendirme bölümüne `FINAL_EVIDENCE_POST_MERGE_CI_RUN_URL` eklenmesi |
| Bayat durum | ALL-CAPS `**RELEASE OLUŞTURULMADI**` (i-varyantı katlama kanıtı) |
| Bounded section | uppercase 40-hex SHA |
| Bounded section | `publishedAt` alanı |
| Bounded section | olumlu attestation sinyali (`verified:11`) |
| Bounded section | release-history satırının bölüm içine taşınması |

Ayrıca **önceden var olan** `release-attestation bayat durum tablosu geri
konursa` senaryosunun beklentisi güncellendi: artık heading kuralı tetikliyor
(`kaldırılan current-status bölümü geri geldi`).

Her senaryonun ortak invariantları (suite mekanizması, kod okumasıyla teyit):
planted violation nedeniyle FAIL üretiyor, **exact hata fragment'ini**
doğruluyor, **byte-exact restore** yapıyor, worktree snapshot'ı başlangıca
dönüyor ve `modes` semantiği korunuyor.

## Çalıştırılan Komutlar × Exit Code × Gerçek Sayısal Çıktı

Tüm komutlar bu QA turunda, `fix/f4-release-state-registry` dalının
`1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd` ağacında bizzat koşturuldu.

| # | Komut | Exit | Gerçek çıktı |
|---|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | **0** | `Done in 741ms using pnpm v10.34.4` |
| 2 | `node scripts/verify-structure.mjs` | **0** | `PASS — 1227 checks OK (manifest: scripts/structure-manifest.json)` |
| 3 | `node scripts/tests/verify-structure-negative.mjs` | **0** | `74/74 senaryo PASS (mode=skeleton-dev, 3 senaryo bu modda kapalı; toplam 77)` |
| 4 | `node .claude/hooks/tests/run-tests.js` | **0** | `PASS — 302 assertions OK (94 fixtures + settings bindings + git closure-context scenarios)` |
| 5 | `node scripts/tests/bootstrap-transaction.mjs` | **0** | `7/7 senaryo PASS` + `kaynak repo hiç yazılmadı` |
| 6 | `node scripts/tests/bootstrap-e2e.mjs` | **0** | `[bootstrap-e2e] tüm assertion'lar PASS` · adım 11'in **on** assertion'ı PASS · `temp temizlendi: evet` |
| 7 | `pnpm gate` | **0** | `All gates PASS` — toolchain·build·typecheck·lint·test·audit·structure·contract-drift = **8/8 PASS** |
| 8 | `git log --reverse --format="%H %s" cfe61e82c7b1458e1280187be6214ded0a702b49..1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd` | **0** | 7 commit (yukarıda tam liste) |
| 9 | `git diff --name-status cfe61e82c7b1458e1280187be6214ded0a702b49...1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd` | **0** | 13 dosya (aşağıda tam liste) |

`SKIP_API=1 pnpm gate` bu turda **gerekmedi ve koşturulmadı**: Docker Engine
29.6.1 daemon'ı erişilebilirdi ve tam `pnpm gate` exit 0 verdi. Koşmamış bir
komutun sonucu bu raporda yer almaz.

Her komuttan sonra `git status --short` **boş** döndü (bu rapor dosyası
düzenlenmeden önceki tüm ölçümlerde) — komutların hiçbiri kod/manifest/
doküman dosyası yazmadı.

## Before/After

### `verify-structure` check sayısı: 1144 → 1208 → **1227**

| Ölçüm noktası | Değer |
|---|---|
| Tarihsel baseline (önceki remediation turu) | 1144 |
| Önceki evidence turu (C4 ağacı) | 1208 |
| **Şimdi (`1c4b4b2a…`)** | **1227** |

Artış, 7k bloğunun exact şema karşılaştırmaları, sekiz-kolonlu ledger
bütünlüğü, koşullu alan kuralları ve genişletilen bounded-section/bayat-durum
desenleriyle tutarlı.

### `verify-structure-negative`: 34 → 59/62 → **74 koşan / 77 tanımlı**

`MODE` değeri repo'nun kendi `scripts/structure-manifest.json` → `mode`
alanından türetiliyor (bu repo `skeleton-dev`; bizzat okundu).

| Ölçüm noktası | Koşan | Tanımlı |
|---|---|---|
| Tarihsel baseline | 34 | 34 |
| Önceki evidence turu (C4 ağacı) | 59 | 62 |
| **Şimdi (`1c4b4b2a…`)** | **74** | **77** |

- **74 senaryo `mode=skeleton-dev`'de koşuyor ve PASS veriyor** (gerçek exit-0
  çıktısı: `74/74 senaryo PASS`). Bu kümenin içinde, fixture seviyesinde kendi
  izole manifest kopyasını `mode=project` olarak yamayan proje-modu senaryoları
  da var — bunlar global `MODE` sabitini değiştirmediği için skeleton-dev
  koşusunda da çalışıyor.
- **3 senaryo yalnız repo'nun kendi manifest'i `mode=project` iken koşar** ve bu
  turda `SKIP` olarak işaretlendi: `generated README'ye upstream release-state
  bölümü geri konursa FAIL üretir`, `generated CLAUDE.md'ye upstream
  release-state bölümü geri konursa FAIL üretir`, `generated RC1 snapshot
  korunan bölümü değişirse FAIL üretir`. Repo'nun kendi manifest'i
  `skeleton-dev` olduğu için bu üçü burada anlamsızdır ve script onları bilinçli
  atlar (log: `kural mode=skeleton-dev için kapalı`). Generated-project
  eşdeğerleri `bootstrap-e2e` adım 11'de gerçek bir `mode=project` fixture'ı
  üretilerek **pozitif** yönden doğrulanıyor; negatif suite'in kendisi
  `mode=project` altında ayrıca koşturulmadı (bu, repo manifestini
  değiştirmeyi gerektirir ve bu QA turunun yazma yetkisi dışındadır).

### Hook harness: **302 assertion / 94 fixture** — değişmedi

Bu tur bu sayıları yeniden ölçtü; artış/azalış yok. Beklenen: bu remediation
hook sistemine dokunmuyor.

### Ölçülen dosya satır sayıları (gerçek `wc -l`)

| Dosya | Satır | Manifest `maxLines` |
|---|---|---|
| `scripts/verify-structure.mjs` | **1235** | **kayıt yok** (gate denetlemiyor) |
| `scripts/tests/verify-structure-negative.mjs` | **1072** | kayıt yok |
| `docs/releases/README.md` | **69** | 120 |
| `scripts/bootstrap-project.mjs` | **492** | **500 korundu** |
| `docs/operations/release-attestation.md` | **164** | 165 |

## Generated-Project Kanıtı (`bootstrap-e2e` adım 11)

`node scripts/tests/bootstrap-e2e.mjs`, `1c4b4b2a…` ağacında exit 0 ile
koştu; adım 11'in on assertion'ı PASS verdi:

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
adıyla üretilen projede README/CLAUDE'daki `<!-- release-state:start/end -->`
bölümü kaldırılıyor, `docs/releases/` alt ağacı byte-seviyesinde korunuyor
(hash karşılaştırması PASS), manifest `upstreamReleaseProvenance` nesnesi
deep-equal kalıyor ve RC1 snapshot içindeki upstream GitHub linkleri kimlik
ikamesiyle slug'a dönüşmüyor. Koşu `[bootstrap-e2e] tüm assertion'lar PASS` ve
`temp temizlendi: evet` ile sonuçlandı; fixture dizini otomatik temizlendi,
kaynak repo hiçbir noktada yazılmadı (`kaynak repo hiç yazılmadı` — aynı ilkeyi
`bootstrap-transaction` çıktısı da bağımsız olarak doğruluyor).

Ayrıca adım 6 (generated project quality gate) ve adım 7 (project-mode
`verify-structure`) bu turda da PASS satırı üretti — generated project'te de
yeni provenance registry'si tutarlı kaldı.

## Audit Digest ve RC1 Korunan Bölüm Digest'i (bizzat ölçüldü)

`node:crypto` ile, `verify-structure.mjs` 7k bloğunun kullandığı **aynı**
yöntemle (dosyanın ham byte'ları `readFileSync` ile; RC1 korunan bölüm `utf8`
string üzerinden) bağımsız olarak yeniden hesaplandı:

| Alan | Ölçülen değer |
|---|---|
| `auditSha256` (`docs/audits/2026-07-28-fourth-mini-audit-rc2.md`, ham byte'lar) | `67fced3d02ccbb824c94d31d5e88f0e446e00c399fd2b050088e25dd7f499736` |
| RC1 korunan bölüm SHA-256 (`## Attestation (dış immutable kanıt)` dahil → `**Bağlayıcı kural:**` hariç, `docs/releases/v1.0.0-rc.1.md`, UTF-8 bytes) | `4a8d7b2fc90293ca35186e0a9506217d17f1044c132460dd1204b23c92fdf583` |

Her iki değer `scripts/structure-manifest.json` içindeki kayıtlı değerlerle
(`upstreamReleaseProvenance.auditedState.auditSha256` ve
`auditedImmutableReleases[0].snapshotProtectedSectionSha256`) **birebir
eşleşti** — yani 7k bloğunun kendi runtime kontrolü bağımsız bir ikinci
ölçümle doğrulanmıştır. Ek teyit: canonical audit dosyası byte-for-byte
**değişmedi**; base → `1c4b4b2a…` changed-file listesinde `docs/audits/**`
yok. RC1 korunan bölüm digest'i de bu tur boyunca **değişmedi**.

## Lokal Docker Durumu

Bu ortamda Docker Desktop 4.80.0 (Engine 29.6.1) daemon'ı **erişilebilirdi** ve
tam `pnpm gate` **exit 0** ile **8/8 PASS** verdi — `test` gate'i içindeki
`mvn verify` Testcontainers üzerinden gerçek bir Postgres container ayağa
kaldırdı. Bu nedenle `SKIP_API=1 pnpm gate` bu turda gerekmedi ve
koşturulmadı.

Bu, önceki remediation turlarında gözlemlenen "Docker client var, daemon'a
erişilemiyor" kısıtının **bu ortamda ve bu koşuda** geçerli olmadığı anlamına
gelir; makine/oturum farkına bağlı bir durumdur, bu remediation'ın bir
özelliği değildir.

**Uyarı korunur:** bu rapor tam `pnpm gate` sonucunu tek başına bağlayıcı kanıt
olarak sunmaz. Yerel koşu ortamdan ortama değişebilir (Docker Desktop durumu,
port çakışması, kaynak kısıtları) ve tekrarlanabilir değildir. Bağlayıcı kanıt,
Linux runner'da sabit bir ortamda koşan PR CI'daki
**`api-verify-testcontainers`** job'ıdır; bu job **bu turda henüz koşmadı** ve
PR CI tetiklendiğinde ayrıca doğrulanmalıdır.

## Changed-File Listesi

```bash
git diff --name-status \
  cfe61e82c7b1458e1280187be6214ded0a702b49...1c4b4b2a279cecc996d9b12a8b0c25cee02d77cd
```

13 dosya, `13 files changed, 1621 insertions(+), 41 deletions(-)`:

```text
M	CLAUDE.md
M	README.md
A	docs/adr/ADR-0018-release-state-registry.md
M	docs/operations/authority-map.md
M	docs/operations/release-attestation.md
A	docs/releases/README.md
M	docs/releases/v1.0.0-rc.1.md
A	docs/test-reports/2026-07-29-ac-32-release-state-remediation.md
M	scripts/bootstrap-project.mjs
M	scripts/structure-manifest.json
M	scripts/tests/bootstrap-e2e.mjs
M	scripts/tests/verify-structure-negative.mjs
M	scripts/verify-structure.mjs
```

Listedeki `docs/test-reports/2026-07-29-ac-32-release-state-remediation.md`
girdisi, bu raporun C5'te eklenen **önceki** sürümüdür. Bu turda yapılan
düzeltme (Düzeltme E) ölçülen ağacın parçası **değildir** — bu, yukarıdaki üç
kavram ayrımının doğrudan sonucudur.

`git diff --stat` ile ölçülen değişen satır sayıları (aynı aralık):
`scripts/tests/verify-structure-negative.mjs` 489 · `scripts/verify-structure.mjs`
435 · `docs/adr/ADR-0018-release-state-registry.md` 130 · `docs/releases/README.md`
69 · `docs/operations/release-attestation.md` 52 ·
`scripts/structure-manifest.json` 41 · `scripts/tests/bootstrap-e2e.mjs` 30 ·
`docs/releases/v1.0.0-rc.1.md` 30 · `README.md` 20 · `CLAUDE.md` 14 ·
`scripts/bootstrap-project.mjs` 12 · `docs/operations/authority-map.md` 7.

Allowlist teyidi: bu QA turu implementasyon/test/manifest/doküman dosyalarının
**hiçbirini** değiştirmedi (`git status --short` her ölçümden sonra boştu);
yalnız bu kanıt raporu yazıldı. Yukarıdaki dosyalar implementation dalının
kendi değişikliğidir. Sürpriz dosya yok: değişiklik kümesi
`scripts/structure-manifest.json` (registry), `scripts/verify-structure.mjs`
(7k enforcement), `scripts/tests/verify-structure-negative.mjs` (regresyon
kapsamı), `scripts/tests/bootstrap-e2e.mjs` (generated-project kanıtı),
`scripts/bootstrap-project.mjs` (exclude + section strip), `README.md`/
`CLAUDE.md` (bounded section), `docs/releases/**` (yeni ledger + RC1
historical-note), `docs/operations/{authority-map,release-attestation}.md`,
yeni `docs/adr/ADR-0018-*.md` ve bu kanıt raporu ile sınırlı. `apps/**`,
`templates/**`, `project-memory/**`, `.github/**` dokunulmadı.

## Kayıtlı Borç

`scripts/verify-structure.mjs` **1235** satıra çıktı; `coding-style.md` genel
stil tavanı **800**; manifest `maxLines` sözlüğünde bu dosya için kayıt **yok**
(bizzat ölçüldü → `undefined`), yani gate bu dosyanın boyutunu hiç
denetlemiyor. Bölme borcu ADR-0017/ADR-0018 hattında zaten kayıtlıdır; bu
turda da bölme yapılmadı ve borç **büyüdü** (önceki ölçüm 1066 → şimdi 1235).

## Kalan Riskler

1. **Gate iç tutarlılık kanıtlar, tazelik prosedüreldir.** ADR-0018 madde 8 ve
   11 gereği `verify-structure` yalnız offline, ağaç-içi kanıtı doğrular
   (registry ↔ ledger ↔ README/CLAUDE ↔ digest bağları); registry'nin GitHub
   üzerindeki gerçek release durumunu **güncel** yansıttığını kanıtlamaz — bu
   tazelik "Adım 9" prosedürünün insan/PR disiplinine bağlıdır.
2. **Registry değerlerinin semantik doğruluğu insan review'u gerektirir.**
   `verify-structure` yapısal tutarlılığı (exact şema, digest, bounded section
   eşitliği, sekiz-kolon ledger eşitliği) denetler; `auditedCandidateTag`,
   `stableReleaseStatusAtAudit` gibi alanların **anlamsal olarak doğru** audit
   hükmünü yansıttığı makine tarafından doğrulanamaz.
3. **Registry + ledger bilinçli olarak birlikte değiştirilirse** structural
   gate mismatch üretmez; dış gerçekliğin doğruluğu code-review kapsamındadır.
   Gate'in tasarım hedefi **tek-taraflı drift**, iki-taraflı kasıtlı düzenleme
   değildir (Düzeltme B, "Sınır" maddesi).
4. **`verify-structure.mjs` 1235 satır, `maxLines` kaydı yok** (yukarıdaki
   "Kayıtlı Borç"); borç bu turda büyüdü.
5. **Lokal Docker koşusu tekrarlanabilir değil** (yukarıdaki bölüm) —
   bağlayıcı kanıt PR CI'daki `api-verify-testcontainers`, henüz koşmadı.
6. **`verify-structure-negative` üç senaryosu bu turda `SKIP` kaldı**
   (generated-project negatifleri, `mode=project` gerektiriyor); pozitif
   eşdeğerleri `bootstrap-e2e` adım 11'de doğrulandı, ama negatif suite'in
   kendisi `mode=project` altında ayrıca koşturulmadı.

## Statü (bağlayıcı dil — tahmin edilmiş SHA/PR/CI yok)

```text
AC-32:            IMPLEMENTED_PENDING_REVIEW_AND_PR_CI
F4-MEDIUM-02:     REMEDIATED_PENDING_REVIEW_AND_PR_CI
F4R2-MEDIUM-01:   REMEDIATED_PENDING_REVIEW_AND_PR_CI
```

PR numarası, PR CI run ID, merge SHA, post-merge CI bilgisi ve bu raporu taşıyan
evidence commit'in SHA'sı bu raporda **yok** — bu rapor kendi SHA'sını içermez
(Katman 1/Katman 2 ayrımı, `docs/operations/release-attestation.md`). Bu rapor
bunları **tahmin etmez**; final zincir dış immutable attestation'da mühürlenir.

Genel proje verdict'i bu remediation ile **değişmedi**:
**FAIL / CORE_SKELETON_NOT_PRODUCTION_READY / NO_GO_REMEDIATION_REQUIRED**.
Açık kriterler: **AC-33** (core web security-header politikası, F4-MEDIUM-03)
ve **AC-26** (tag ↔ manifest sürüm source-of-truth politikası, F4-LOW-02) —
her ikisi de ADR-0018 kapsamı dışında bırakılmıştır (madde 13, Deferred work).

## Sonraki Adım

Required check'ler (`quality-gate-ubuntu`, `api-verify-testcontainers` dahil)
PR CI'da koşar → code-reviewer + Security gate Final Gate Mode'da bu raporu ve
implementasyon diff'ini (özellikle exact şema bloğu, sekiz-kolon ledger bağı,
bounded-section desen listesi ve `foldCase` düzeltmesi) birlikte inceler → tüm
gate'ler yeşilse merge → memory closure protokolü
(`fix/f4-release-state-registry` dalında **değil**, ayrı
`chore/memory-close-*` dalında).
