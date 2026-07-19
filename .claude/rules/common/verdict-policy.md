---
paths:
  - "**/*"
---
# Verdict Politikası (tek doğruluk kaynağı)

> Bütün gate'ler (QA, Security, SEO, style-audit, Final Review) severity ve
> verdict kelimelerini YALNIZ bu dosyadaki anlamlarıyla kullanır.
> Referanslar: `qa-quality-gate` skill'i, `feature-workflow` skill'i,
> `code-reviewer` ajanı, [code-review.md](code-review.md).

## Severity Sözlüğü (tek tanım)

| Severity | Tanım |
|----------|-------|
| CRITICAL | Güvenlik açığı, veri kaybı/bozulması riski, yasal/finansal zarar, production'ı kıran hata. BLOCKER eş anlamlıdır. |
| HIGH | Yanlış davranış üreten bug veya ciddi kalite sorunu; production'a çıkmadan düzeltilmeli. |
| MEDIUM | Bakım/okunabilirlik/performans endişesi; planlı düzeltme. |
| LOW | Stil, küçük öneri; opsiyonel. |

## Verdict Kuralları (bağlayıcı)

1. HERHANGİ bir gate CRITICAL (veya BLOCKER) bulgu üretirse genel verdict
   otomatik **FAIL — remediation required**'dır (production bağlamında
   **BLOCKED FOR PRODUCTION**). Hiçbir gate veya insan özeti bunu
   PASS_WITH_RISKS'e yumuşatamaz.
2. **PASS** — CRITICAL ve HIGH yok; tüm kriterler kanıtla karşılandı.
3. **PASS_WITH_RISKS** — CRITICAL yok; kalan riskler (HIGH dahil) tek tek
   kayıtlı, sahipli ve kabul edilmiş; hiçbiri production'ı engellemiyor.
   Kayıtsız risk = FAIL.
4. **FAIL** — kural 1 tetiklendi VEYA en az bir kabul kriteri karşılanmadı.
5. code-reviewer eşlemesi: Approve→PASS · Warning→PASS_WITH_RISKS · Block→FAIL.
6. Açık risk YOK → **PASS**. LOW/MEDIUM/HIGH risk bilinçli + kayıtlı + sahipli →
   **PASS_WITH_RISKS**. CRITICAL/BLOCKER → **FAIL**. **Ertelenmiş riskler de
   açık risktir**: rapora "sonraya bırakıldı" diye kaydedilen bulgu varken
   verdict PASS olamaz — doğru verdict PASS_WITH_RISKS'tir.

## Remediation Döngüsü

FAIL sonrası düzeltme yapıldığında **önceki PASS'ler geçersizdir**:
QA + Security + (web ise) SEO + style-audit + Final Review YENİDEN koşar.
Yalnız FAIL veren gate'i tekrar koşmak yetmez; zincir kirlenmiştir.

## Gate Sırası (bağlayıcı)

```text
Dev → PM diff → QA → Security → (web ise) SEO + style-audit → Final Review
```

Final Review, önceki TÜM gate bulgularını (raporlar + verdict'ler) görmeden
verdict veremez; eksik rapor varsa Final Review sonucu FAIL'dir.

## Kanıt

Her verdict, üreten komutların gerçek çıktısını referanslar
(`qa-quality-gate` kanıt kuralı). Kanıtsız verdict geçersizdir.
