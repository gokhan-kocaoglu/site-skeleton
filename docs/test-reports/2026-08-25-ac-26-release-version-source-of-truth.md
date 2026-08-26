# AC-26 / F4-LOW-02 — Release Version Source-of-Truth Remediation Evidence

- Tarih: 2026-08-25 — Europe/Istanbul
- Kriter: **AC-26 / F4-LOW-02** — tag ↔ manifest version source-of-truth
- Karar kaydı: `docs/adr/ADR-0020-release-version-source-of-truth.md`

## 1. Kimlik

```text
base SHA:  b58273ecdce97f1d8bcce5c214c89422e57c642d
C1:        659ccf92055888872aae652f3542587c857ef495
           docs(adr): record release version source-of-truth policy
C2:        1f39fa9e684850edd269ba41736971379c8bc966
           feat(quality): add release version contract oracle
C3:        9be728f742a0d01ec7f38013e37cfc317abbb73d
           feat(structure): bind release version policy to manifest and release procedure
C4:        e36c75a529ba109239a7712d3292c67504b4526f
           docs(test): record AC-26 remediation evidence
C5:        96a5337095ed0c3e4ec3f5029f5b63cc3b4ac92e
           fix(quality): enforce exact non-authoritative version sources
           (bağımsız review düzeltmesi — R1)
```

Bu rapor C4'te doğdu ve C6'da düzeltildi; kendi commit SHA'sını, branch head'ini,
PR numarasını veya CI kimliğini taşımaz.

## 2. Canonical audit bulgusu

`docs/audits/2026-07-28-fourth-mini-audit-rc2.md` (değiştirilmedi):

```text
AC-26   Sürüm tutarlılığı politikası   FAIL (LOW) — F4-LOW-02        (satır 805)
F4-LOW-02  OPEN — "package.json version 0.1.0, tag v1.0.0-rc.2;
           sürümleme politikası kaydı bulunamadı"                    (satır 572)
Remediation: "Tag ↔ manifest version source-of-truth politikası
             kayda geçsin"                                            (satır 944)
```

## 3. Ölçülen başlangıç durumu

Bulgunun hâlâ geçerli olduğu, tasarım turunda salt-okuma ile ölçüldü:

```text
repository release version taşıyan alan       YOK
package.json / apps/* / packages/*            0.1.0  (hepsi private, yayımlanmaz)
apps/api/pom.xml project version              0.1.0-SNAPSHOT
git tag'leri                                  v1.0.0-rc.1, v1.0.0-rc.2 (LIGHTWEIGHT)
tag ↔ sürüm alanı makine ilişkisi             YOK
bulunan tek kontrol                           verify-structure.mjs private
                                              RELEASE_TAG_RE — yalnız ŞEKİL,
                                              hiçbir sürümle karşılaştırmaz
release-attestation.md tag alanı              `v<sürüm>` — <sürüm> tanımsız
manifest top-level exact key-set sabiti       YOK (sameKeySet yalnız provenance'ta)
bootstrap manifest müdahalesi                 yalnız mode + projectSlug
```

Tarihsel snapshot'lar (`git show <ref>:<path>`):

| Alan | v1.0.0-rc.1 | v1.0.0-rc.2 | base |
|---|---|---|---|
| root package.json version | `0.1.0` | `0.1.0` | `0.1.0` |
| pom project version | `0.1.0-SNAPSHOT` | `0.1.0-SNAPSHOT` | `0.1.0-SNAPSHOT` |
| manifest auditedCandidateTag | (yok) | (yok) | `v1.0.0-rc.2` |

## 4. Final kapsam — 9 dosya

```text
A  docs/adr/ADR-0020-release-version-source-of-truth.md
A  scripts/quality/assert-release-version-contract.mjs
A  scripts/tests/release-version-contract-negative.mjs
M  docs/releases/README.md
M  docs/operations/release-attestation.md
M  scripts/structure-manifest.json
M  scripts/verify-structure.mjs
M  scripts/tests/verify-structure-negative.mjs
A  docs/test-reports/2026-08-25-ac-26-release-version-source-of-truth.md
```

Denylist temiz: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `.npmrc`,
`apps/**`, `packages/**`, `templates/**`, `bootstrap-project.mjs`,
`run-gates.mjs`, `.github/workflows/**`, `project-memory/**`, `docs/audits/**`,
`README.md`, `CLAUDE.md` — hiçbirine dokunulmadı.

## 5. Policy şeması

`scripts/structure-manifest.json` → yeni top-level anahtar:

```json
"upstreamReleaseVersionPolicy": {
  "authority": "manifest",
  "canonicalVersion": "1.0.0",
  "tagPrefix": "v",
  "prereleaseChannels": ["rc"],
  "nonAuthoritativeVersionSources": [
    "package.json", "apps/web/package.json", "apps/admin/package.json",
    "packages/api-types/package.json", "packages/design-tokens/package.json",
    "apps/api/pom.xml"
  ],
  "generatedProjectScope": "upstream-only"
}
```

Exact key-set `sameKeySet` ile fail-closed doğrulanır. `packageManifestAuthority`
alanı **bilinçli olarak yoktur** (kendi literaline eşitlenmekten başka invariant
üretmiyordu; semantiği `nonAuthoritativeVersionSources` executable olarak taşıyor).

## 6. Üç authority sınıfı

```text
historical provenance   grammar + AC-32 kuralları · core == canonicalVersion YOK
current release line    canonicalVersion = 1.0.0
proposed release        release-time --tag: core == canonicalVersion ZORUNLU
```

`canonicalVersion`; `package.json` sürümü, Maven sürümü, üretilen projenin
uygulama sürümü ve tarihsel registry **değildir**.

## 7. Tag grammar

```text
tag     := tagPrefix core [ "-" channel "." number ]
core    := num "." num "." num
num     := "0" | [1-9][0-9]*
channel := prereleaseChannels üyesi
number  := "0" | [1-9][0-9]*
```

Build metadata, whitespace ve leading zero reddedilir; anchored. **Tam SemVer
değildir** ve öyle olduğu iddia edilmez. Yeni `semver` bağımlılığı eklenmedi;
yalnız Node stdlib kullanıldı.

## 8. Non-authoritative kaynak kanıtı

Altı yolun tamamı var ve gerçekten sürüm alanı taşıyor (aksi hâlde
`SOURCE_PATH_MISSING`). Maven tarafında `<parent>`, `<dependencies>`,
`<dependencyManagement>`, `<build>` ve `<profiles>` blokları **çıkarılarak**
project version okunur; ölçülen değer `0.1.0-SNAPSHOT`, bağımlılık sürümü değil.

Hiçbiri `canonicalVersion` ile eşitlenmez. Amaç kayıt altına almaktır:
`0.1.0` değerleri bir çelişki değil, **beyan edilmiş** bir ayrımdır.

## 9. Doküman bağı

`docs/releases/README.md` içindeki bounded blok manifest ile **birebir string**
karşılaştırılır (hiçbir satır ayrıştırılmaz → F4-MEDIUM-04 bullet grameri
açığına bağışık):

```text
<!-- release-version-policy:start -->
- authority: `manifest`
- current release version: `1.0.0`
- tag prefix: `v`
- prerelease channels: `rc`
- generated project scope: `upstream-only`
<!-- release-version-policy:end -->
```

Blok dışında, prose olarak zorunlu üç ayrım ifadesi aranır (npm/Maven
application versions · generated project'in kendi release version'ı · historical
audited provenance registry). Eskiden dosyada duran **"Sürüm politikası burada
tanımlanmaz; AC-26 açıktır."** ifadesi kaldırıldı — AC-26 kapandığında yanlış
olurdu.

Dosya 69 → 97 satır; `maxLines` 120 **değişmedi**.

## 10. Release prosedürü bağı

`docs/operations/release-attestation.md` adım 7, in-place ve **net sıfır satır**
deltasıyla güncellendi:

```text
7. `assert-release-version-contract.mjs --tag <TAG>` PASS → kullanıcı Release/
   tag'i oluşturur, dış attestation mühürlenir; tag target = adım 6'nın SHA'sı
```

Alan tablosundaki `v<sürüm>` belirsizliği de aynı satır sayısında bağlandı:
`` `v<canonicalVersion>[-<kanal>.<n>]` — authority: manifest / ADR-0020 ``.

```text
dosya: 164 satır → 164 satır  ·  maxLines 165 DEĞİŞMEDİ  ·  numstat 3 / 3
```

Tag/release hâlâ dış kullanıcı adımıdır; repository otomatik release oluşturmaz
ve `tag target = final evidence closure merge SHA` kuralı korunur.

## 11. CLI kabul matrisi

```text
--tag v1.0.0-rc.3   exit 0   PASS
--tag v1.0.0        exit 0   PASS
--tag v1.0.0-rc.2   exit 1   TAG_ALREADY_AUDITED
--tag v1.1.0-rc.1   exit 1   CORE_MISMATCH  (core 1.1.0 != canonicalVersion 1.0.0)
(argümansız)        exit 2   TAG_MISSING
--wat x             exit 2   INVOCATION
```

## 12. Future version-line oracle (FE-1/2/3)

Bağlayıcı düzeltmenin kalıcı regression oracle'ı:

```text
FE-1  canonicalVersion = 1.1.0 · historical v1.0.0-rc.1 / v1.0.0-rc.2
      → static contract SIFIR failure (negatif harness + verify-structure-negative)
FE-2  canonicalVersion = 1.1.0 · proposed v1.1.0-rc.1  → PASS
FE-3  canonicalVersion = 1.1.0 · proposed v1.0.0-rc.3  → CORE_MISMATCH
```

FE-1 `verify-structure-negative` içinde **gerçek dosya mutasyonu** ile de koşar
(manifest + ledger bloğu birlikte 1.1.0'a taşınır) ve `expectOk: true` bekler.
Biri geri çekilen `all historical core == canonicalVersion` invariant'ını
yeniden eklerse FE-1 kırılır.

## 13. AC-32 uyumluluğu

```text
upstreamReleaseProvenance key set      DEĞİŞMEDİ
auditedState key set                   DEĞİŞMEDİ
release history alan anlamları         DEĞİŞMEDİ
audit digest semantiği                 DEĞİŞMEDİ
ledger release-history tablosu         DEĞİŞMEDİ
```

Tek temas: private `RELEASE_TAG_RE` **tamamen kaldırıldı**; historical tag
doğrulaması artık politikadan türeyen `validateHistoricalTag` ile yapılır.
Repository'de tek grammar kaldı. Mevcut AC-32 negatif senaryosu
(`tag geçersiz veya yinelenmiş`) **sıfır beklenti değişikliğiyle** geçmeye
devam ediyor. Tarihsel tag'ler `TAG_ALREADY_AUDITED` üretmez.

## 14. Ölçülen sayılar

| Ölçüm | Önce | Sonra |
|---|---|---|
| `verify-structure` checks | 1316 | **1340** |
| `verify-structure-negative` tanımlı | 119 | **130** |
| `verify-structure-negative` koşan (skeleton-dev) | 116 | **127** |
| `verify-structure-negative` project-only | 3 | **3 (değişmedi)** |
| `release-version-contract-negative` | yok | **60** |
| `scripts/verify-structure.mjs` satır | 1390 | **1401 (+11)** |
| `docs/operations/release-attestation.md` satır | 164 | **164 (+0)** |
| `docs/releases/README.md` satır | 69 | **97** |
| hook harness | 302 / 94 | **302 / 94 (değişmedi)** |
| bootstrap transaction | 7/7 | **7/7 (değişmedi)** |

Ara adımlar: base 1316 · C1 sonrası 1320 · C2 sonrası 1330 · **C3 sonrası 1337** ·
C4 sonrası 1340 · C5 sonrası 1340 (final).

C4, kanıt raporunu manifest'e üç kayıtla (`requiredFiles` + `maxLines` + `noBom`)
tescil ettiği için structure check sayısını **+3** artırdı: 1337 → 1340. İlk
yazımda final tablo C3 ara değerini (1337) taşıyordu; bu, C6 review düzeltmesiyle
gerçek final değere çekildi.

## 15. Gate sonuçları

Her commit öncesi tam `pnpm gate` koşuldu; Docker mevcuttu, yani `test` gate'i
gerçek `mvn verify` + Testcontainers çalıştırdı (`SKIP_API` kullanılmadı).

```text
toolchain PASS · build PASS · web-headers PASS · typecheck PASS · lint PASS
test PASS · audit PASS · structure PASS · contract-drift PASS
All gates PASS (9/9) — C1, C2, C3, C4, C5
```

Diğerleri: `bootstrap-transaction` 7/7 · `bootstrap-e2e` tüm assertion'lar PASS ·
hook harness 302/94.

## 16. TDD RED kanıtı

C2 öncesi, helper yokken (commit EDİLMEMİŞ ağaç):

```text
node scripts/tests/release-version-contract-negative.mjs → exit 1
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
  '.../scripts/quality/assert-release-version-contract.mjs'
```

Helper yazıldıktan sonra ilk koşu 48/54 verdi; üç beklenti düzeltmesi
(whitespace → `TAG_MALFORMED` guard'ı, `rc.01` → `CHANNEL_NUMBER_MALFORMED`) ve
politika manifest'e girene kadar CLI senaryolarının **görünür SKIP** olarak
işaretlenmesiyle GREEN'e ulaşıldı. C3'ten sonra SKIP kalmadı: 55/55 koşuyor.

## 17. Generated-project kabulü

Gerçek `bootstrap-project.mjs --apply` koşusu (`acme-shop`, repository dışı
geçici dizin):

```text
upstreamReleaseVersionPolicy          deep-equal (JSON eşitliği doğrulandı)
generated canonicalVersion            1.0.0 · generatedProjectScope upstream-only
manifest mode / projectSlug           project / acme-shop
root package.json                     0.1.0        (DEĞİŞMEDİ)
apps/web · apps/admin                 0.1.0        (DEĞİŞMEDİ)
packages/api-types · design-tokens    0.1.0        (DEĞİŞMEDİ)
apps/api/pom.xml                      0.1.0-SNAPSHOT (DEĞİŞMEDİ)
ADR-0020 · README.md · release-attestation.md  byte-identical
skeleton kimlik sızıntısı             0
project verify-structure              PASS — 1009 checks
SKIP_API=1 pnpm gate                  All gates PASS (9/9)
generated CLI --tag v1.0.0-rc.3       exit 0
generated CLI --tag v1.1.0-rc.1       exit 1
```

`canonicalVersion` üretilen projenin hiçbir sürüm alanına sızmadı.

## 17b. Bağımsız review düzeltmesi (R1) — exact source set

İlk implementasyonda `nonAuthoritativeVersionSources` yalnız *şekil* olarak
doğrulanıyordu (dizi mi, boş değil mi, yollar var mı). Bağımsız review bunun
approved contract'ı karşılamadığını tespit etti ve üretilebilir olduğu ölçüldü:
liste tek yola (`["package.json"]`) daraltıldığında contract **sıfır failure**
veriyordu.

C5 ile helper artık altı yollu exact kümeyi fail-closed doğruluyor:

```text
tam altı yol         eksik yok · fazla yok · duplicate yok
sıra                 anlamlı DEĞİL (duplicate-free set equality)
reason code          POLICY_SCHEMA (yeni kod icat edilmedi)
```

Beklenen küme helper içinde executable governance contract olarak tanımlıdır;
manifest ile kod bilinçli bir enforcement pair'idir. Negatif harness beklenen
listeyi helper'dan **import etmez**.

İki failure sınıfı ayrı ayrı korunur ve ayrı ayrı test edilir:

```text
A. POLICY SET DRIFT           -> POLICY_SCHEMA
   yol çıkarma · tek yola daraltma · duplicate ile kayıp · fazladan yol
B. LISTED PATH DISAPPEARANCE  -> SOURCE_PATH_MISSING
   küme exact kalır, fixture'da dosya fiziksel olarak silinir
   veya npm manifesti version alanını kaybeder
```

`verify-structure-negative` tarafındaki eski "ghost path" senaryosu artık önce
exact-set kontrolüne takıldığı için beklentisi dürüstçe `POLICY_SCHEMA` +
`exact küme dışı` olarak düzeltildi; `SOURCE_PATH_MISSING` oracle'ı kaybolmadı,
unit harness tarafında fiziksel dosya silme ile korunuyor.

C5 mevcut satır bütçelerine sığdırıldı; hiçbir `maxLines` yükseltilmedi:
`assert-release-version-contract.mjs` **399** (limit 400),
`release-version-contract-negative.mjs` **357** (limit 360).

## 18. Kayıtlı riskler ve borçlar

Hiçbiri kapanmış sayılmaz:

- **External operator residual risk.** Repository script'i, bir insanın GitHub
  üzerinde doğrudan tag atmasını fiziksel olarak engelleyemez. Bu makine
  enforcement'ının sınırıdır. Ancak canonical binding procedure artık validator
  PASS şartını açıkça taşıdığı için prosedür düzeyinde bypass bir **policy
  ihlalidir** ve denetlenebilirdir. Makine sınırı ile governance sınırı ayrıdır.
- **Rakip top-level anahtar yakalanmaz.** Manifest'te top-level exact key-set
  sabiti yoktur; `releaseVersion` gibi rakip bir anahtar eklenirse makine bunu
  görmez. Alias blacklist'i bilinçli olarak **icat edilmedi**.
- **Duplicate raw JSON key test edilmiyor.** `validJson` düz `JSON.parse`
  kullanır ve son değeri sessizce tutar; repository'de raw duplicate-key
  tarayıcısı yoktur. Yakalanan gerçek sınıf yalnız *unexpected/extra policy key*
  (exact key-set) sınıfıdır. Bu rapor daha fazlasını iddia etmez.
- **Grammar dar.** Tam SemVer desteklenmez (build metadata reddedilir, kanal
  kümesi `["rc"]`). Genişletme tek noktadan (`parseReleaseTag`) yapılır.
- **Version bump atomik değildir.** `canonicalVersion` bump'ı ile release
  oluşturma iki ayrı adımdır; CLI merge sonrası ağaca karşı doğrular.
- **`scripts/verify-structure.mjs` 1401 satır**; `coding-style.md` tavanı 800.
  Domain mantığı helper'da tutuldu, yalnız wiring eklendi ve `RELEASE_TAG_RE`
  kaldırıldı; yine de net **+11** satır eklendi. Bu, Session 11 R-6 /
  Session 12 / Session 13'teki borcun dördüncü tur ölçümüdür — tek borç.
- **F4-MEDIUM-04** `OPEN_ADJACENT_DEBT` — düzeltilmedi; AC-26 doküman katmanı
  blok eşitliği kullandığı için etkilenmiyor.
- **PostCSS `CVE-2026-69153` / MODERATE** `OPEN_ADJACENT_RISK` — çözülmedi.
- **AC-26 formal olarak yalnız merge + post-merge CI sonrası kapanabilir.**

## 19. Dokunulmayan alanlar

Canonical RC2 audit'i · tarihsel tag'ler ve GitHub Release'leri · yeni tag /
release / immutable candidate · `upstreamReleaseProvenance` semantiği ·
AC-29 / AC-32 / AC-33 implementasyonları · workflow · ruleset · Dependabot
config · PR #46 · `project-memory/**`.

## 20. Genel verdict

```text
FAIL
CORE_SKELETON_NOT_PRODUCTION_READY
NO_GO_REMEDIATION_REQUIRED
```

Değişmedi. Bu rapor AC-26'yı **kapalı** ilan etmez; merge ve post-merge main CI
öncesi geçerli durum `IMPLEMENTED_PENDING_REVIEW_AND_PR_CI`'dır.
