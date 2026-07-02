# REST API Tasarım Desenleri

Yeni endpoint tasarımı ve sözleşme incelemesi için. Sözleşmenin tek doğruluk
kaynağı: `docs/api-contracts/openapi.yaml` (frontend tipleri buradan üretilir).

## Kaynak Tasarımı

```
# Kaynaklar isimdir: çoğul, küçük harf, kebab-case
GET    /api/v1/products
GET    /api/v1/products/:id          # :id = public UUID, internal BIGINT değil
POST   /api/v1/products
PATCH  /api/v1/products/:id
DELETE /api/v1/products/:id

# Sahiplik için alt-kaynak
GET    /api/v1/users/:id/orders

# CRUD'a oturmayan eylemler (fiili az kullan)
POST   /api/v1/orders/:id/cancel
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
```

YANLIŞ: `/getUsers` (fiil), `/user` (tekil), `/team_members` (snake_case).

## HTTP Metodları ve Status Kodları

| Metod | İdempotent | Kullanım |
|-------|-----------|----------|
| GET | Evet | Okuma |
| POST | Hayır | Oluşturma, eylem tetikleme |
| PUT | Evet | Tam değiştirme |
| PATCH | Hayır* | Kısmi güncelleme |
| DELETE | Evet | Silme |

```
200 OK          — GET/PUT/PATCH (gövdeli)     400 Bad Request  — bozuk istek/JSON
201 Created     — POST (+ Location header)    401 Unauthorized — kimlik yok/geçersiz
204 No Content  — DELETE                      403 Forbidden    — kimlik var, yetki yok
                                              404 Not Found    — kaynak yok
409 Conflict    — tekrar kayıt, durum çakışması
422 Unprocessable Entity — geçerli JSON, anlamsız veri
429 Too Many Requests    — rate limit (+ Retry-After)
500/502/503    — sunucu hataları (detay ASLA sızdırılmaz)
```

Sık hatalar: her şeye 200 dönmek; doğrulama hatasına 500; oluşturmaya 200
(201 + Location olmalı).

## Yanıt Formatı

```json
// Başarı
{ "data": { "id": "a1b2...", "name": "Ürün", "created_at": "2026-01-15T10:30:00Z" } }

// Koleksiyon + sayfalama
{
  "data": [ ... ],
  "meta": { "total": 142, "page": 1, "per_page": 20, "total_pages": 8 }
}

// Hata
{
  "error": {
    "code": "validation_error",
    "message": "Request validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address", "code": "invalid_format" }
    ]
  }
}
```

## Sayfalama

- **Offset** (`?page=2&per_page=20`): basit; admin panelleri ve küçük veri
  setleri (<10K) için. Büyük offset yavaş, eşzamanlı insert'te tutarsız.
- **Cursor** (`?cursor=...&limit=20`): sonsuz kaydırma, feed, büyük veri.
  `WHERE id > :cursor ORDER BY id LIMIT 21` (has_next için +1 çek).

## Filtreleme, Sıralama, Arama

```
GET /api/v1/orders?status=active&customer_id=abc
GET /api/v1/products?price[gte]=10&price[lte]=100
GET /api/v1/products?category=electronics,clothing
GET /api/v1/products?sort=-featured,price
GET /api/v1/products?q=kablosuz+kulaklik
```

## Yetkilendirme Deseni

- Kaynak düzeyi: sahiplik kontrolü (`order.userId == auth.userId` değilse 403;
  kaynak yoksa 404 — varlığı sızdırma)
- Rol düzeyi: `@PreAuthorize` (bkz. `springboot-security.md`)

## Rate Limiting

Yanıt header'ları: `X-RateLimit-Limit/Remaining/Reset`; aşımda
`429` + `Retry-After`. Implementasyon: Bucket4j (`springboot-patterns.md`).

## Sürümleme

- URL yolu sürümlemesi: `/api/v1/...` (önerilen; açık ve cache'lenebilir)
- En fazla 2 aktif sürüm (mevcut + önceki)
- Kırıcı olmayan değişiklikler yeni sürüm İSTEMEZ: alan ekleme, opsiyonel
  parametre ekleme, yeni endpoint
- Kırıcı değişiklikler yeni sürüm İSTER: alan silme/yeniden adlandırma,
  tip değişikliği, URL yapısı, auth yöntemi

## Endpoint Yayın Kontrol Listesi

- [ ] URL konvansiyona uygun (çoğul, kebab-case, fiilsiz)
- [ ] Doğru metod + doğru status kodları
- [ ] Girdi şemayla doğrulanıyor (Bean Validation / Zod)
- [ ] Hata yanıtları standart format (code + message + details)
- [ ] Liste endpoint'inde sayfalama var
- [ ] Auth zorunlu (veya açıkça public işaretli); sahiplik kontrolü var
- [ ] Rate limit yapılandırılmış; iç detay (stack trace, SQL) sızmıyor
- [ ] `docs/api-contracts/openapi.yaml` güncellendi ve api-types yeniden üretildi
