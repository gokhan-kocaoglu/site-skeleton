---
name: qa-quality-gate
description: >
  Kanıt-tabanlı kalite kapısı: doğrulama döngüsü (build → statik analiz →
  test + kapsam → güvenlik taraması → diff incelemesi), kontrol listesi ve
  PASS / PASS_WITH_RISKS / FAIL verdict'i. /quality-gate ile ve her feature
  kapanışı öncesi kullanılır. Kanıtsız PASS yasak.
---

# QA Quality Gate

## Temel Kural

**Kanıtsız PASS bildirimi yasak.** Her verdict, çalıştırılan komutların
gerçek çıktısını (veya özetini) içermek zorunda. "Testler geçti" cümlesi
komut + çıktı olmadan geçersizdir. **Kanıt dosyası, üretildiği koşunun
commit hash'ini içerir; commit'lenmemiş kodla üretilen kanıt geçersizdir**
(audit #8 — yeniden-üretilebilirlik).

## Doğrulama Döngüsü (sırayla; biri kırılırsa dur, düzelt, baştan)

1. **Build** — `pnpm build` (API değiştiyse ayrıca
   `cd apps/api; mvn verify -DskipTests` derleme kontrolü)
2. **Statik analiz** — `pnpm type-check` + `pnpm lint`
3. **Test + kapsam** — `pnpm test`; API değiştiyse `cd apps/api; mvn verify`
   (Docker yoksa `mvn verify -Pit-local`); kapsam hedefi ≥ %80
4. **Güvenlik taraması** — `pnpm audit --prod` (high/critical → FAIL);
   diff'te secret/credential taraması
5. **Diff incelemesi** — değişen dosya listesi task card owned-files ile
   örtüşüyor mu; sürpriz dosya var mı

Kestirme: `pnpm gate` (scripts/quality/) 1–4'ü tek komutla koşar.

## Kontrol Listesi

1. Gereksinimler karşılandı mı?
2. Kabul kriterleri tek tek doğrulandı mı (kanıtla)?
3. Frontend/backend entegrasyonu kontrol edildi mi?
4. Testler/test planı güncellendi mi? Edge case'ler kapsandı mı?
5. Güvenlik riskleri incelendi mi (auth/girdi/sorgu değiştiyse Security gate)?
6. Web işiyse: SEO gate + frontend-style-audit çalıştı mı?
7. Docs ve memory güncellendi mi (memory kapanışta, steward üzerinden)?

## Verdict (tam olarak biri)

Severity tanımları ve verdict kuralları TEK kaynaktan gelir:
`.claude/rules/common/verdict-policy.md`. Özet (bağlayıcı metin oradadır):

- **PASS** — CRITICAL ve HIGH yok; tüm kriterler kanıtla karşılandı.
- **PASS_WITH_RISKS** — CRITICAL yok; kalan riskler kayıtlı + sahipli +
  kabul edilmiş (her risk: açıklama + sahip + takip adımı).
- **FAIL** — HERHANGİ bir gate'te CRITICAL/BLOCKER bulgu VEYA karşılanmayan
  kriter; bulgular implementer'a döner, önceki PASS'ler geçersiz ve tüm
  gate zinciri yeniden koşar (remediation: `feature-workflow` skill'i).

## Modlar

- **Preparation Mode**: test/inceleme hazırlığı; `docs/test-reports/**`
  yazılabilir.
- **Final Gate Mode**: tamamen salt-okunur; yalnız bulgular + verdict.
  **Gate ajanı kendi değişikliğine PASS veremez.** PM gate öncesi/sonrası
  diff karşılaştırır.

## Rapor Şablonu (docs/test-reports/ altına)

```markdown
# Quality Gate Raporu — <feature>
**Tarih:** YYYY-MM-DD  **Mod:** Final Gate  **Verdict:** PASS/PASS_WITH_RISKS/FAIL
**Commit:** <git log --oneline -1 — kanıtın üretildiği koşunun hash'i>
## Çalıştırılan Komutlar
- `pnpm gate` → (çıktı özeti / exit code)
- `mvn verify` → (çıktı özeti)
## Karşılanan Kriterler
## Eksik Kriterler
## Riskler
## Zorunlu Düzeltmeler
## Sonraki Adım
```
