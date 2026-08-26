# ADR-0020: Release Version Source-of-Truth Policy

- Status: ACCEPTED
- Date: 2026-08-25
- Authors: system-architect (analiz), orkestratör (kayıt); AC-26 /
  F4-LOW-02 remediation
- Kabul tetikleyicisi: Dördüncü bağımsız mini-denetim (RC2) — AC-26
  karşılanmadı (`docs/audits/2026-07-28-fourth-mini-audit-rc2.md`)

## Context

Denetim şunu ölçtü: `package.json` sürümü `0.1.0`, en son tag `v1.0.0-rc.2`, ve
sürümleme politikasının hiçbir kaydı yok. İki değer çelişiyor görünüyordu çünkü
hangisinin release authority olduğu **hiçbir yerde tanımlanmamıştı**.

Bu ağaçta ölçülen kısıtlar:

- Repository'de release version taşıyan **hiçbir alan yoktur**. `package.json`
  `0.1.0` (`private: true`, hiç yayımlanmaz), `apps/*` ve `packages/*` aynı,
  `apps/api/pom.xml` `0.1.0-SNAPSHOT`. Hiçbiri `1.0.0` demiyor.
- `v1.0.0-rc.1` ve `v1.0.0-rc.2` **lightweight** tag'lerdir
  (`git cat-file -t` → `commit`). Annotated tag yok.
- Tag'lerin işaret ettiği ağaçlarda `upstreamReleaseProvenance` **hiç yoktu**;
  o yapı AC-32 ile her iki tag'den sonra girdi. Tarihsel tag'ler kendi
  ağaçlarında hiçbir sürüm kaydı taşımaz.
- Tag ile herhangi bir sürüm alanını ilişkilendiren makine kontrolü **yoktur**.
  Bulunan tek kontrol `verify-structure.mjs` içindeki private
  `RELEASE_TAG_RE` sabitidir; yalnız provenance kayıtlarının **şeklini**
  doğrular, hiçbir sürümle karşılaştırmaz ve politika olarak kayıtlı değildir.
- `docs/operations/release-attestation.md` tag alanını `v<sürüm>` diye tarif
  eder ama `<sürüm>`ü tanımlamaz.
- Manifest'te **top-level exact key-set sabiti yoktur**; `sameKeySet` yalnız
  `upstreamReleaseProvenance` ve `auditedState` üzerinde koşar.
- `bootstrap-project.mjs` manifest'te yalnız `mode` ve `projectSlug` yazar;
  başka hiçbir anahtar silinmez veya yeniden yazılmaz.

ADR-0017'nin adlandırdığı kalıp burada da geçerlidir: doküman bulunması
sertleştirme yerine geçmez. Bu yüzden AC-26 hem politikayı kayda geçirir hem de
makine ile doğrulanabilir kılar.

## Decision

### 1. Manifest authoritative

Repository release version authority'si `scripts/structure-manifest.json`
içindeki yeni top-level `upstreamReleaseVersionPolicy` anahtarıdır. Exact
key-set fail-closed doğrulanır; eksik veya fazla anahtar FAIL üretir.

```text
authority                       "manifest"
canonicalVersion                current release line (ör. "1.0.0")
tagPrefix                       "v"
prereleaseChannels              ["rc"]
nonAuthoritativeVersionSources  npm/Maven manifest yolları
generatedProjectScope           "upstream-only"
```

Anahtar adı bilinçlidir: `upstreamReleaseProvenance` ile aynı sözcüksel aileye
girer, böylece üretilen projeye taşındığında anlamı kendiliğinden **upstream
template'in** politikasıdır — kullanıcının projesinin değil. Bu, bootstrap
değişikliğini gereksiz kılar.

`packageManifestAuthority` alanı **bilinçli olarak yoktur**: kendi literaline
eşitlenmekten başka bir invariant üretmezdi ve taşıdığı semantik
`nonAuthoritativeVersionSources` tarafından zaten executable biçimde ifade
ediliyor.

### 2. Üç authority sınıfı ayrıdır

**Historical provenance** — `auditedState.auditedCandidateTag` ve
`auditedImmutableReleases[].tag` yalnız grammar'a ve mevcut AC-32 kurallarına
uyar. `core == canonicalVersion` **zorunlu değildir**.

**Current release line** — `canonicalVersion` current repository release
hattıdır. `package.json` sürümü değildir, Maven sürümü değildir, üretilen
projenin uygulama sürümü değildir, tarihsel registry değildir.

**Proposed release** — yalnız release-time explicit `--tag` için
`parse(tag).core == canonicalVersion` zorunludur.

Bu ayrım kritiktir: release hattı `1.0.0 → 1.1.0` ilerlediğinde tarihsel
`v1.0.0-rc.*` kayıtları **doğru** kalır ve structure gate'i kırmamalıdır.
Tarihsel tag'leri current sürüme eşitlemek ne mümkün ne de istenirdir.

### 3. Grammar contract

```text
tag     := tagPrefix core [ "-" channel "." number ]
core    := num "." num "." num
num     := "0" | [1-9][0-9]*
channel := prereleaseChannels üyesi
number  := "0" | [1-9][0-9]*
```

Build metadata, whitespace ve leading zero **reddedilir**; grammar
anchored'dır. `canonicalVersion` yalnız core taşır — `v` prefix'i veya
prerelease eki taşıyamaz.

Bu **tam SemVer değildir** ve öyle olduğu iddia edilmez; dar, açık ve
fail-closed bir alt kümedir. `semver` paketi değerlendirildi ve reddedildi:
bugün doğrudan bağımlılık değildir (yalnız transitive), ve bu dar grammar için
supply-chain ile Dependabot yükü orantısızdır. İleride tam SemVer gerekirse
tek değişim noktası `parseReleaseTag`'dır.

`tagPrefix` ve `prereleaseChannels` repository-wide grammar contract'ıdır.
`canonicalVersion` serbestçe ilerleyebilir; grammar ilerlemez. Gelecekte
`prereleaseChannels`'tan `rc` kaldırılırsa tarihsel doğrulamanın FAIL vermesi
**doğru** davranıştır — bu ADR yeni kanal tasarlamaz.

### 4. Version bump lifecycle

```text
1. canonicalVersion normal governance PR ile değişir (1.0.0 -> 1.1.0)
2. Branch/main gate'leri yalnız şemayı ve grammar'ı doğrular
3. Historical provenance kayıtları DEĞİŞMEZ
4. Release-time'da proposed tag current canonicalVersion'a karşı doğrulanır
5. Release/tag dış kullanıcı adımı ile oluşturulur
6. Publication tek başına provenance mutation'ı üretmez (ADR-0018)
7. Yeni candidate'ın audit'i alındığı turda AC-32 registry kendi
   protokolüyle güncellenir
```

AC-26 adım 1–5'i, AC-32 adım 6–7'yi yönetir. Tek temas noktası ortak
grammar'dır; iki yaşam döngüsü tek alana indirgenmez.

### 5. Release procedure binding

`docs/operations/release-attestation.md` bağlayıcı sırasının 7. adımı,
validator PASS'ini tag oluşturmanın **ön koşulu** yapar. Politika yalnız bu
ADR'de kalsaydı operatörün canonical prosedüründe görünmez ve
document ↔ executable drift'i doğardı.

Tag/release **hâlâ dış kullanıcı adımıdır**; repository otomatik release
oluşturmaz, placeholder'lar post-release PR ile doldurulmaz ve
`tag target = final evidence terminal memory closure merge SHA` kuralı
korunur. Eklenen tek şey tag öncesi bir precondition'dır.

### 6. Generated-project scope

`generatedProjectScope: "upstream-only"`. Üretilen projede politika upstream
sözleşmesi olarak deep-equal taşınır; `canonicalVersion` o projenin hiçbir
sürüm alanına sızmaz ve onun kendi sürümleme politikasını **bağlamaz**.
Üretilen projenin `0.1.0` / `0.1.0-SNAPSHOT` değerleri aynen kalır.

### 7. AC-32 boundary

`upstreamReleaseProvenance` key-set'i, `auditedState` key-set'i, release
history alan anlamları, audit digest semantiği ve ledger tablosu
**değişmez**. Manifest'te top-level key-set sabiti olmadığı için yeni anahtar
hiçbir AC-32 sabitini zorlamaz.

Tek temas: private `RELEASE_TAG_RE` politikadan türeyen parser'a devredilir.
Bu duplikasyon kaldırmadır, semantik değişiklik değil — yeni grammar aynı dili
tanır artı leading-zero'yu reddeder, yani kesin olarak daha dardır. Kabul
kriteri: mevcut AC-32 negatif senaryoları **sıfır beklenti değişikliğiyle**
geçer. Tarihsel tag'ler `TAG_ALREADY_AUDITED` üretmez; o kod yalnız proposed
release yolunda yaşar.

## Consequences

Kazanılan: tag ile sürüm arasındaki ilişki ilk kez tanımlı ve makine ile
doğrulanır; `0.1.0` değerleri artık çelişki değil, **beyan edilmiş** bir
ayrımdır; grammar tek yerde yaşar.

Bedeli: manifest'e bir top-level anahtar ve bakım yüzeyi eklenir; her release
hattı değişimi bir governance PR'ı gerektirir.

## Residual risk — external operator action

Repository script'i, bir insan operatörün GitHub üzerinde doğrudan tag
atmasını **fiziksel olarak engelleyemez**. Bu makine enforcement'ının sınırıdır
ve gizlenmez.

Ancak bu "kontrol yok" demek değildir: canonical binding procedure artık
validator PASS şartını açıkça taşıdığı için prosedür düzeyinde bypass bir
**policy ihlalidir** ve denetlenebilirdir. Makine enforcement sınırı ile
governance enforcement sınırı ayrı kaydedilir.

Ayrıca kayıtlı bilinen sınır: manifest'te top-level exact key-set sabiti
olmadığı için, `releaseVersion` gibi **rakip** bir top-level anahtar eklenirse
makine bunu yakalamaz. Alias blacklist'i bilinçli olarak icat edilmemiştir.

## Alternatives considered

**Git tag authoritative** — reddedildi. Branch/PR/main-push context'inde tag
yoktur; kontrol ya fail-open olur (F4-MEDIUM-01 sınıfı sahte güvence) ya da
dokuz gate'in hiçbirinde test edilmez. Ayrıca metadata'yı tag'den türetmek bir
yazma adımı gerektirir; release-attestation bunu açıkça yasaklar.

**Package manifest authority** — reddedildi. Root `package.json` `private`'dır
ve hiç yayımlanmaz; sürümü hiçbir tüketiciye görünmez. Daha ağırı: bootstrap
onu üretilen projeye kopyalar, yani skeleton'un release sürümü doğrudan
kullanıcının uygulama sürümü olurdu. `pom.xml` ayrı bir ekosistem sürümü
taşıdığı için npm tarafını authority yapmak Maven'i sessizce dışarıda bırakır.

**Ayrı release-version dosyası** — reddedildi. Manifest zaten makine doğruluk
kaynağıdır; ikinci bir dosya yeni bir drift yüzeyi üretirdi.

## Deferred

`F4-MEDIUM-04` (verify-structure bullet toplayıcıları yalnız `-` tanır) bu
ADR'nin kapsamı dışındadır ve `OPEN_ADJACENT_DEBT` olarak açıktır. AC-26'nın
doküman katmanı bundan etkilenmez: bounded blok tek bir exact string olarak
karşılaştırılır, hiçbir satır ayrıştırılmaz.
