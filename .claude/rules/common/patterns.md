---
paths:
  - "**/*"
---
# Ortak Desenler

## İskelet-Önce Yaklaşımı

Yeni işlevsellik eklerken:
1. Önce bu repodaki `templates/` ve mevcut desenleri ara
2. Kanıtlanmış açık kaynak iskelet/kütüphane var mı kontrol et
3. En iyi eşleşmeyi temel al, kanıtlanmış yapı içinde iterasyon yap
4. Sıfırdan yazmak son çare

## Repository Deseni

Veri erişimini tutarlı bir arayüz arkasına kapsülle:
- Standart işlemler: findAll, findById, create, update, delete
- Somut implementasyon depolama detayını taşır (DB, API, dosya)
- İş mantığı soyut arayüze bağımlıdır, depolamaya değil
- Veri kaynağı değişimi ve mock'la test kolaylaşır

## API Yanıt Zarfı

Tüm API yanıtlarında tutarlı zarf kullan:
- Başarı/durum göstergesi
- Veri yükü (`data`, hatada null)
- Hata mesajı alanı (başarıda null)
- Sayfalı yanıtlarda meta (total, page, limit)

Ayrıntı: `.claude/skills/stack-patterns/references/api-design.md`

## Domain Şablonları

- Hiyerarşik kategori ve kupon SQL şablonları: `templates/db/`
- Ödeme sağlayıcı portu (Iyzico/Stripe): `templates/payments/`
- Admin BFF (HttpOnly refresh cookie köprüsü): `templates/admin-bff/`

Şablonlar kopyala-etkinleştir içindir; build'e dahil değildir.
