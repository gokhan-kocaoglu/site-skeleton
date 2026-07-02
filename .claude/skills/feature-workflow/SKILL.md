---
name: feature-workflow
description: >
  Varsayılan feature gate zinciri: PM → (Architect) → (UX) → Dev → PM diff →
  QA → Security → (web ise SEO + style-audit) → Final Review → memory →
  commit. /start-feature ile tetiklenir; gereksinim, UX etkisi, API etkisi ve
  kabul kriterleri netleşmeden kod yazılmaz.
---

# Feature Workflow

## Gate Zinciri (sıra bağlayıcı; atlama yok)

```text
İnsan: brief onayı
→ PM: scope + risk sınıfı + task DAG        [İNSAN ONAYI: plan]
→ Architect: contract/ADR (gerekirse)
→ (web işiyse) UX + frontend-design-gate
→ Developer(lar): implementation
→ PM: bağımsız diff denetimi
→ QA gate                                   [FAIL → developer'a döner]
→ Security gate (auth/ödeme/veri işiyse zorunlu)
→ (web işiyse) SEO gate + frontend-style-audit
→ Final review (code-reviewer)
→ memory-steward: memory closure
→ PM: memory diff denetimi → commit/push    [İNSAN ONAYI: push]
→ Final kanıt raporu
```

İnsan onayı yalnız 3 noktada: **brief, plan, push** (+ hook'ların yakaladığı
riskli git/secret işlemleri).

## Hangi Gate Ne Zaman (risk sınıfına göre)

- **LOW** (metin, doküman, küçük stil): ilgili specialist → Final review.
  QA yalnız davranış/regresyon etkisi varsa.
- **MEDIUM** (standart CRUD/form/feature): + QA gate.
- **HIGH** (PM tetikleyici listesi): + plan onayı zorunlu + Security gate +
  adversarial QA.
- `apps/web`'e dokunan her iş: + SEO gate + frontend-style-audit (risk
  sınıfından bağımsız).

## Küçük Görev Sadeleştirmesi

Tek dosyalık düzeltmede zincir kısalır (specialist → Final review) ama şunlar
asla atlanmaz: kabul kriteri · kanıt · memory güncellemesi.

## Dosya Tabanlı Handoff

Subagent'lar birbirini göremez. Her ajan çıktısını dosyaya/rapora yazar ve
`HANDOFF → <sonraki-rol>` bloğuyla kapatır; orkestratör sonraki ajanı bu
dosyaları referans göstererek çağırır. Format:
`00_System/HANDOFF-template.md`.

## Sahiplik Kuralları

- Bir dosya = bir sahip; aynı dosyada paralel yazım yasak.
- Aynı anda en fazla 3 aktif specialist; aynı karar üstünde sıralı çalışılır.
- Yazma yolları: `docs/operations/authority-map.md`.

## Remediation Döngüsü (FAIL sonrası)

Herhangi bir gate FAIL verirse **önceki PASS'ler geçersizdir**:

1. PM, orijinal implementer'a remediation görevi açar.
2. Implementer düzeltir; PM diff'i yeniden denetler.
3. FAIL veren gate + Final review YENİDEN koşar.
4. Ancak o zaman kapanışa geçilir. Gate ajanı kendi düzeltmesine PASS veremez.

## Memory-Last (kapanış tek yönlü)

QA + Security + Final Review hepsi PASS
→ memory-steward yazar → PM memory diff denetimi → commit/push → final sentez.

## Kanıt Kuralı

Her gate raporu komut çıktısı içermek zorunda. Kanıtsız PASS bildirimi yasak
(`qa-quality-gate` skill'i).
