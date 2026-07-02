---
name: adr-decision
description: >
  Mimari kararların standart ADR formatına dökülmesi: ne zaman ADR gerekir,
  numaralandırma, format, statü yaşam döngüsü ve supersede kuralı.
  /create-adr ile tetiklenir; system-architect üretir.
---

# ADR Decision

## Ne Zaman ADR Gerekir

- Uygulama mimarisi / app sınırı değişikliği
- Auth modeli (JWT, session, cookie stratejisi)
- Veritabanı stratejisi (şema yaklaşımı, önemli tablo tasarımı, derinlik sınırı gibi kurallar)
- API stili / contract yaklaşımı
- Ödeme sağlayıcı seçimi (`templates/payments/` aktivasyonu)
- Deployment stratejisi
- Büyük bağımlılık/framework kararı
- Mevcut bir ADR'yi değiştiren karar (supersede — HIGH risk)

Geri dönüşü zor veya birden çok uygulamayı etkileyen her karar ADR adayıdır;
şüphede ADR yaz.

## Süreç

1. Kararı **system-architect** analiz eder (trade-off: artılar/eksiler/
   alternatifler).
2. ADR taslağı üretilir; dosya adı `docs/adr/ADR-<NNNN>-<kebab-baslik>.md`
   (sıradaki numara mevcut en büyük + 1).
3. Statü `PROPOSED` ile başlar; insan/PM onayıyla `ACCEPTED` olur.
4. Kabul edilen ADR değişmez; fikir değişirse YENİ ADR yazılır ve eskisi
   `SUPERSEDED by ADR-<NNNN>` işaretlenir.
5. Vault'a kayıt: `HANDOFF → memory-steward` (06_Decisions altına link).

## Format (şablon: `docs/adr/ADR-0000-template.md`)

```markdown
# ADR-NNNN - Karar Başlığı

## Status
PROPOSED | ACCEPTED | DEPRECATED | SUPERSEDED by ADR-XXXX

## Context
(Kararı zorlayan durum; kısıtlar; neden şimdi)

## Decision
(Seçilen yaklaşım — emir kipinde, net)

## Consequences
(Pozitif + negatif sonuçlar; üstlenilen borç)

## Alternatives Considered
(Değerlendirilen diğer seçenekler + neden reddedildi)
```

## Kurallar

- Bir ADR = bir karar; iki kararı tek ADR'ye sıkıştırma.
- Context'te kanıt kullan (ölçüm, kısıt, brief maddesi); "daha iyi olur" yetmez.
- Statüsü `PROPOSED` olan ADR implementasyona yetki VERMEZ.
