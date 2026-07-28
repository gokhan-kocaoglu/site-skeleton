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
→ Final kanıt raporu (pre-merge commit + PR run URL)
→ feature PR → required check'ler → MERGE      [İNSAN ONAYI: push]
→ MERGE SONRASI: closure dalı → memory-steward → PM memory diff → closure PR
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

## Task Card Formalitesi (bağlayıcı)

`/start-feature` zincirinde PM'nin ürettiği **her** task card formaldir:
başlık veya gövde `TASK CARD` işaretini taşır ve
`00_System/Task-Card-template.md` formatını kullanır. Formal kartta dört risk
alanı zorunludur (contract-impact · race-condition · auth-boundary ·
rollback-plani; `N/A — <gerekçe>` geçerli). `task-card-validator` formal kartta
eksik alan görürse kart oluşturmayı **exit 2** ile reddeder.

İşaretsiz mikro görevler serbesttir — bloklanmaz, yalnız hatırlatma alır.
Enforcement işarete bağlıdır: kısmi alan taşıyan işaretsiz bir görev formal
sayılmaz.

## Küçük Görev Sadeleştirmesi

Tek dosyalık düzeltmede zincir kısalır (specialist → Final review) ama şunlar
asla atlanmaz: kabul kriteri · kanıt · memory güncellemesi.

## Dosya Tabanlı Handoff

Subagent'lar birbirini göremez. Her ajan çıktısını dosyaya/rapora yazar ve
somut hedefli bir HANDOFF bloğuyla kapatır (örnek: `HANDOFF → project-manager`);
orkestratör sonraki ajanı bu dosyaları referans göstererek çağırır. Format:
`00_System/HANDOFF-template.md`.

Hedef, dokuz geçerli ajandan biri olmak ZORUNDADIR; boş hedef veya
`<...>` biçiminde yer tutucu `verify-structure` `handoffTargets` kuralıyla
FAIL üretir.

## Sahiplik Kuralları

- Bir dosya = bir sahip; aynı dosyada paralel yazım yasak.
- Aynı anda en fazla 3 aktif specialist; aynı karar üstünde sıralı çalışılır.
- Yazma yolları: `docs/operations/authority-map.md`.

## Remediation Döngüsü (FAIL sonrası)

Severity/verdict sözlüğü ve FAIL kuralları:
`.claude/rules/common/verdict-policy.md` (CRITICAL bulgu → genel verdict
otomatik FAIL; Final Review tüm gate raporlarını görmeden verdict veremez).

Herhangi bir gate FAIL verirse **önceki PASS'ler geçersizdir**:

1. PM, orijinal implementer'a remediation görevi açar.
2. Implementer düzeltir; PM diff'i yeniden denetler.
3. QA + Security + (web ise) SEO + style-audit + Final Review YENİDEN koşar
   (yalnız FAIL veren gate'i koşmak yetmez — verdict-policy).
4. Ancak o zaman kapanışa geçilir. Gate ajanı kendi düzeltmesine PASS veremez.

## Memory-Last (kapanış tek yönlü, MERGE SONRASI)

Ruleset main'e doğrudan push'u reddeder; memory closure implementasyon dalında
YAPILMAZ. QA + Security + Final Review hepsi PASS → feature PR merge edilir →
lokal main güncellenir → merge SHA + PR no + post-merge main CI run kaydedilir →
güncel main'den `chore/memory-close-<yyyy-mm-dd>-<project-slug>` dalı açılır →
memory-steward yazar → PM memory diff denetimi → memory-only closure PR.

Closure PR **terminaldir**: kendisi için yeni closure üretmez (sonsuz döngü
yasağı). Ayrıntı ve bayat-durum kalıpları: `memory-protocol` skill'i.

## Kanıt Kuralı

Her gate raporu komut çıktısı içermek zorunda. Kanıtsız PASS bildirimi yasak
(`qa-quality-gate` skill'i).
