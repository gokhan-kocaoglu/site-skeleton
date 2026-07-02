---
name: project-planning
description: >
  Yeni proje ve feature planlama akışı: brief + Current Status okunur;
  hedef/kullanıcı/kısıt/non-goal çıkarılır; MVP sonraki fazlardan ayrılır;
  risk sınıfı ve kabul kriterleri üretilir; task DAG çıkarılır; sıradaki
  specialist atanır. /new-project ve büyük feature planlamasında kullanılır.
---

# Project Planning

Planlama **project-manager** ajanının işidir; bu skill akışı tanımlar.

## Adımlar

1. **Oku**: proje brief'i (`docs/source-briefs/`) + vault `Project Brief` +
   `Current Status`. Asla tüm vault okunmaz.
2. **Çıkar**: hedef, kullanıcılar, kısıtlar, non-goal'lar, varsayımlar.
3. **Ayır**: MVP vs sonraki fazlar. MVP = değer üreten en küçük dilim; her faz
   bağımsız teslim edilebilir olmalı.
4. **Risk sınıfla**: LOW / MEDIUM / HIGH (tetikleyiciler:
   `.claude/agents/project-manager.md`). Belirsizlikte yükseği seç. Sınıf,
   hangi gate'lerin çalışacağını belirler.
5. **Kabul kriteri yaz**: her feature için doğrulanabilir, komutla kanıtlanabilir
   kriterler ("çalışıyor" değil, "X komutu Y çıktısını verir").
6. **Task DAG üret**: küçük görevler + açık bağımlılıklar; her görevin tek
   sahibi ve task card'ı olur (şablon: vault `00_System/Task-Card-template.md`).
7. **Sıradaki specialist'i ata**: impact-based seçim — her görevde bütün
   ajanlar çağrılmaz (`.claude/rules/common/agents.md`).
8. **Memory'ye aktar**: plan özeti `HANDOFF → memory-steward` ile gönderilir;
   PM vault'a doğrudan yazmaz.

## Plan Formatı

Özet (2–3 cümle) · Gereksinimler · Non-goal'lar · Risk sınıfı + tetikleyiciler ·
Fazlar (her adımda: dosya yolu, eylem, neden, bağımlılık, risk) · Test
stratejisi · Riskler ve azaltmalar · Kabul kriterleri (checkbox listesi)

## Kurallar

- Plan onayı olmadan kod yazılmaz (insan onay noktası).
- Adımlar spesifik olmalı: tam dosya yolu, fonksiyon adı; "ilgili yerleri
  güncelle" yasak.
- Mimari etki varsa **system-architect** + ADR (`adr-decision` skill'i)
  plana dahil edilir.
- Test stratejisi olmayan plan eksiktir.
