# ADR-0018: Audited Upstream Release Provenance Registry

- Status: ACCEPTED
- Date: 2026-07-29
- Authors: system-architect (analiz), orkestratör (kayıt); AC-32 / F4-MEDIUM-02
  remediation
- Kabul tetikleyicisi: Dördüncü bağımsız mini-denetim (RC2) — AC-32 FAIL ve
  F4R2-MEDIUM-01 (`docs/audits/2026-07-28-fourth-mini-audit-rc2.md`)

## Context

Depo iki farklı bilgi türünü tek dosyada tutuyordu: **zamansız kanıt
sözleşmesi** ve **zamana bağlı release olgusu**.

- `docs/operations/release-attestation.md` sözleşme bölümleri hâlâ doğrudur;
  aynı dosyanın "Mevcut durum" tablosu ise `v1.0.0-rc.1` ve `v1.0.0-rc.2`
  yayımlandıktan sonra bile "Release/Tag oluşturulmadı", `PENDING_USER_ACTION`
  ve "Dördüncü mini-denetim başlatılmadı" diyordu — oysa aynı ağaç o denetimin
  raporunu taşıyor (F4R2-MEDIUM-01).
- `README.md` ve `CLAUDE.md` release durumunu **hiç** bildirmiyordu (AC-32).
- `docs/releases/v1.0.0-rc.1.md` bir yayın-öncesi snapshot'ı bugünkü zaman
  kipiyle sunuyordu.
- Ölçülen kısıt: attestation dosyası satır bütçesinin sınırındadır; 30 satırlık
  durum tablosu orada büyüyemez.
- Ölçülen kısıt: `scripts/bootstrap-project.mjs` `EXCLUDE_DIRS`'i
  `docs/releases`'i içermiyordu; kimlik ikamesi, rc.1 taslağındaki gerçek CI run
  URL'lerini üretilen projenin adına yeniden yazıyor ve **uydurma provenance**
  üretiyordu.

Kök neden tek cümlede: **politika ile olgu aynı dosyada yaşadığında, olgu
bayatlarken politika doğru kalır ve çelişki denetimde bulguya dönüşür.**

## Decision

1. **Policy ile audited upstream provenance ayrı yüzeylerdir.** Zamansız
   sözleşme `docs/operations/release-attestation.md`'de kalır; olgu registry ve
   ledger'a taşınır.
2. **Manifest tek makine source-of-truth'tur:** `scripts/structure-manifest.json`
   → `upstreamReleaseProvenance` (`auditedState` + `auditedImmutableReleases`).
3. **`docs/releases/README.md` insan-okur ledger'ıdır** ve registry'ye karşı
   doğrulanır; ikinci bir doğruluk kaynağı değildir.
4. **README ve CLAUDE yalnız bounded audited-state özeti taşır**
   (`<!-- release-state:start/end -->`), ilk içerik satırı verdict'tir.
5. **Publication tek başına repository mutation'ı üretmez.** Yeni bir candidate
   yayımlandığı için hiçbir repo alanı güncellenmez.
6. **Registry yalnız canonical audit raporu repository'ye alındığında
   güncellenir**; o turda registry, ledger ve iki bounded section aynı PR'da
   eşitlenir.
7. **Registry external GitHub release envanterinin canlı aynası değildir**;
   adı ve anlamı *audited upstream immutable release history*'dir.
8. **Audited state, main'in anlık remediation durumunu göstermez.** Açık
   kriterler canonical audit ve `project-memory` içindedir.
9. **Generated project'in kendi release durumu değildir.** Bootstrap, README ve
   CLAUDE'daki bounded section'ı kaldırır; `docs/releases/**` kimlik ikamesinin
   dışında tutulur ve upstream provenance olarak byte-korunur.
10. **Current/latest isimli temporal alanlar yasaktır:** `latestRelease`,
    `latestCandidate`, `currentRelease`, `currentTag`, `currentMainVerdict`,
    `stableReleaseExists`. Stable durumu yalnız audit kapsamına bağlı olarak
    ifade edilir: `stableReleaseStatusAtAudit`.
11. **Network ve git-ancestry structural doğrulamanın parçası değildir.**
    `verify-structure` yalnız offline, ağaç-içi kanıt kullanır; bu kısıt review
    gate'inde denetlenir, runtime kuralı olarak kodlanmaz.
12. **Audit dosyası ve RC1 korunan snapshot bölümü SHA-256 ile bağlanır**
    (`auditSha256`, `snapshotProtectedSectionSha256`) — offline kriptografik
    bağ, ağ sorgusu değil.
13. **AC-26 bu ADR'nin kapsamı dışındadır:** tag ↔ manifest sürüm eşitliği veya
    SemVer source-of-truth politikası hakkında hiçbir iddia kurulmaz.

## Enforcement model

| Katman | Ne doğrular |
|---|---|
| `verify-structure` 7k | Registry şeması, sözlükler (kodda sabit), digest bağları, ledger/README/CLAUDE ile alan eşitliği, mode sözleşmeleri, yasak token'lar |
| `verify-structure-negative` | Her runtime kuralın gevşetildiğinde FAIL ürettiği (mode-aware) |
| `bootstrap-e2e` | Generated project'te bölümün yokluğu, provenance nesnesinin deep-equal kalması, `docs/releases` alt ağacının byte-korunması |
| Review gate (PM + code-reviewer) | Ağ/ancestry kuralı eklenmediği, tazeliğin canlı envanter olarak iddia edilmediği |

`verdict`/`productionReadiness`/`recommendation` sözlükleri ve tutarlılık
ilişkisi **kodda sabittir**; manifest verisi düzenlenerek gevşetilemez.

## Temporal model

```text
1. Yeni candidate external olarak yayımlanır.
2. Repository içinde hiçbir current/latest alan güncellenmez.
3. Bağımsız audit yürütülür.
4. Canonical audit raporu repository'ye alındığı turda registry + ledger +
   bounded section'lar aynı PR'da eşitlenir.
```

`stableReleaseStatusAtAudit` yalnız *"canonical audit yürütüldüğü sırada stable
`v1.0.0` yayımlanmamıştı"* anlamına gelir; release'in bugünkü varlığı hakkında
iddia taşımaz ve verdict'ten türetilmez.

## Consequences

Pozitif: release durumu tek yerde doğrulanır ve drift gate FAIL'ine dönüşür;
politika dosyası zamansız kalır; generated project uydurma provenance üretmez;
AC-32 ve F4R2-MEDIUM-01 tek turda kapanır.

Negatif / üstlenilen borç: bir yeni doküman, bir manifest bölümü ve bir
`verify-structure` bloğu bakım yüzeyi ekler; registry her yeni audited candidate
turunda elle güncellenir (unutulursa gate FAIL verir — bilinçli tercih);
`docs/releases/` rc.1 ve rc.2 arasında asimetriktir ve bu asimetri ledger'da
açıkça beyan edilir.

## Alternatives Considered

1. **Attestation dosyası hem politika hem durum taşımaya devam etsin** —
   reddedildi: bulgunun kök yapısı budur ve dosya satır bütçesinin sınırındadır.
2. **Dört dosyaya statik metin yaması** — reddedildi: dört kopya arasında
   eşitlik garantisi yoktur, makine kuralı üretmez, bulgu yeniden açılır.
3. **`docs/operations/release-status.md` konumu** — reddedildi: `docs/operations/`
   kimlik ikamesi kapsamındadır; oradaki durum metni generated projede bozulur.
4. **`docs/releases/v1.0.0-rc.2.md` üretmek** — reddedildi: dış immutable gövde
   tahmin edilemez; sonradan üretilen "taslak" olmayan bir hazırlık sürecini
   varmış gibi gösterir.
5. **`releaseName` alanını registry'de tutmak** — reddedildi: içinde kimlik
   token'ı taşıdığı için bootstrap ikamesinde bozulur ve provenance yanlışlanır.
6. **Generated projeden `docs/releases/` kaldırmak** — reddedildi: transaction'a
   yıkıcı bir `delete` primitifi ekler ve "arşivlenir, silinmez" değişmezini
   bootstrap'ın kendi kodunda deler.

## Deferred work

- AC-33 (core web security header politikası) ve AC-26 (tag ↔ manifest sürüm
  source-of-truth) ayrı turlardır.
- Tazelik prosedüreldir: gate yalnız iç tutarlılık kanıtlar, canlı envanter
  tazeliği kanıtlamaz.
- ADR-0016 numarası toolchain baseline politikası için rezervedir.
