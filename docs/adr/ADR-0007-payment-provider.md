# ADR-0007: Ödeme Sağlayıcı Seçimi (ertelenmiş karar — port hazır)

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (iskelet inşası)

## Context

İskelet proje-bağımsızdır; hangi projenin ödeme alacağı ve hangi sağlayıcıyla
(Iyzico, Stripe, başka) çalışacağı önceden bilinemez. Ödeme kodu güvenlik-kritik
olduğundan sağlayıcıya özgü mantığın domain'e sızması geri dönüşü pahalı bir
bağımlılık yaratır. Kupon modülü de ödeme onayıyla aynı transaction'da
pasifleşmek zorundadır (brief §7) — port bu dikişi şimdiden tanımlamalıdır.

## Decision

Sağlayıcı-bağımsız bir port tanımlıyoruz: `PaymentProvider`
(authorize / capture / refund / verifyWebhook, `templates/payments/`).
Adaptörler (`IyzicoPaymentProvider`, `StripePaymentProvider`) iskelet içinde
boş bırakılır (`UnsupportedOperationException`). Sağlayıcı seçimi, ödemeli ilk
projede bu ADR'nin ACCEPTED'a çekilmesi (veya yeni bir ADR ile süpersede
edilmesi) ile yapılır; ancak o zaman ilgili SDK `apps/api/pom.xml`'e eklenir.

## Consequences

- Domain kodu (sipariş, kupon) yalnız porta bağımlı kalır; sağlayıcı değişimi
  adaptör değişimidir.
- İskelet build'i hiçbir ödeme SDK'sı taşımaz; `templates/` derlenmez.
- Karar verilene kadar ödeme akışı çalışmaz — bilinçli tercih; boş adaptörler
  yanlışlıkla çağrılırsa açık hata fırlatır, sessizce sahte başarı dönmez.
- Webhook doğrulaması port sözleşmesinde zorunlu kılındı (imza kontrolü).

## Alternatives Considered

- **Şimdiden Stripe'a bağlanmak**: TR pazarında Iyzico gereksinimi olan
  projelerde tam yeniden yazım gerektirir; reddedildi.
- **Şimdiden Iyzico'ya bağlanmak**: uluslararası projelerde aynı sorunun
  simetriği; reddedildi.
- **Port'suz bırakmak (karar tamamen projeye)**: kupon-ödeme transaction dikişi
  ve webhook doğrulama zorunluluğu iskelette güvence altına alınamazdı;
  reddedildi.

## Şerh — Sprint 4 (2026-07-03)

Port asgari düzeyde güçlendirildi (brief §4.4, Denetim #22): `authorize`,
`capture` ve `refund` çağrılarına `idempotencyKey` parametresi eklendi
(çift-gönderim/retry güvenliği) ve `PaymentStatus` enum'u tanımlandı
(`AUTHORIZED / CAPTURED / FAILED / REFUNDED / PENDING_3DS`). Bu değişiklik
YALNIZ `templates/payments/` içindedir; derlenen build'i etkilemez.

Bu güçlendirme portu üretime hazır kılmaz: **sağlayıcı seçiminde port, o
sağlayıcının webhook / 3DS / partial-capture modeline göre YENİDEN tasarlanır;
mevcut port bir taslaktır.** Port'un tam production sözleşmesi, sağlayıcıyı
belirleyen ADR'de (bu ADR'nin ACCEPTED'a çekilmesi veya süpersede eden yeni
ADR) sonlandırılır (bkz. brief Kapsam-dışı maddesi).
