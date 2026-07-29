# Audited Upstream Release Provenance

Bu dosya, iskeletin (upstream template) **denetlenmiş** release geçmişinin ve
son canonical audit hükmünün insan-okur canonical ledger'ıdır. Makine doğruluk
kaynağı `scripts/structure-manifest.json` → `upstreamReleaseProvenance`; aşağıdaki
alanlar ona karşı `verify-structure` ile doğrulanır. Karar kaydı:
`docs/adr/ADR-0018-release-state-registry.md`.

## Audited state

<!-- release-state:start -->

- verdict: `FAIL`
- audited candidate: `v1.0.0-rc.2`
- audit report: `docs/audits/2026-07-28-fourth-mini-audit-rc2.md`
- production readiness: `CORE_SKELETON_NOT_PRODUCTION_READY`
- recommendation: `NO_GO_REMEDIATION_REQUIRED`
- stable release status at audit: `NOT_PUBLISHED`

<!-- release-state:end -->

Bu hüküm **denetlenen candidate'a** aittir, `main`'in anlık durumuna değil.
Stable release status at the audited RC2 state: NOT_PUBLISHED — bu ifade yalnız
canonical audit yürütüldüğü andaki durumu kaydeder ve release'in bugünkü varlığı
hakkında iddia taşımaz.

## Audited immutable release history

| Tag | Release ID | Target commit | Published (UTC) | Repository snapshot |
|---|---|---|---|---|
| `v1.0.0-rc.1` | `361113458` | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` | `2026-07-28T13:37:11Z` | `docs/releases/v1.0.0-rc.1.md` |
| `v1.0.0-rc.2` | `361341678` | `175213d519acf199498a8efa7b307f5b4d5f44cd` | `2026-07-28T19:57:09Z` | `none` |

Her iki kayıt da prerelease ve immutable'dır. RC2 için GitHub'ın kriptografik
release attestation'ı doğrulanmıştır (11/11 alan). RC1 için repository'de bir
**yayın öncesi taslak snapshot'ı** vardır; RC2 için böyle bir taslak hiç
üretilmemiştir ve geriye dönük olarak da üretilmez.

## Bu ledger neyi kaydeder, neyi kaydetmez

- **Canlı envanter değildir.** Burası GitHub'daki güncel release'lerin aynası
  değildir; yalnız **denetlenmiş** upstream immutable release geçmişini kaydeder.
- **Publication tek başına bu dosyayı değiştirmez.** Yeni bir candidate
  yayımlandığı için hiçbir alan güncellenmez; kayıt, o candidate'ın canonical
  audit raporu repository'ye alındığı turda genişler.
- **Release gövdelerinin aynası değildir.** `v*.md` dosyaları yalnız yayın
  öncesi hazırlanmış taslakların dondurulmuş snapshot'larıdır; authoritative
  final body ve attestation **external immutable GitHub Release** yüzeyindedir.
- **Remediation durumu burada tutulmaz.** Açık acceptance criteria ve ilerleme
  canonical audit raporunda ve `project-memory/` vault'undadır.
- **Generated project'in release durumu değildir.** Bu dizin, iskeletten üretilen
  bir projede upstream provenance olarak korunur; o projenin kendi release
  geçmişi değildir ve README/CLAUDE'daki audited-state özeti üretilen projeye
  taşınmaz.
- **Sürüm politikası burada tanımlanmaz.** Tag ↔ manifest sürüm
  source-of-truth politikası bu belgenin konusu değildir; AC-26 açıktır.

## Güncelleme prosedürü

Yeni bir candidate yayımlandığında hiçbir şey yapılmaz. Bağımsız denetim
tamamlanıp canonical audit raporu repository'ye alındığında **tek turda**:
manifest registry'si, bu ledger ve `README.md` + `CLAUDE.md` bounded
section'ları aynı PR içinde eşitlenir. Sözleşmenin zamansal modeli:
`docs/operations/release-attestation.md`.
