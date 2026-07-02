---
paths:
  - "**/*"
---
# Güvenlik Kuralları

## Her Commit Öncesi Zorunlu Kontroller

- [ ] Hardcoded secret yok (API anahtarı, parola, token)
- [ ] Tüm kullanıcı girdileri doğrulanıyor
- [ ] SQL injection önlemi (parametreli sorgu; string birleştirme yasak)
- [ ] XSS önlemi (kullanıcı HTML'i sanitize)
- [ ] CSRF duruşu uygulama tipine uygun
- [ ] Auth/yetkilendirme her hassas yolda doğrulanmış
- [ ] Endpoint'lerde rate limiting var
- [ ] Hata mesajları hassas veri sızdırmıyor

## Secret Yönetimi

- Secret hiçbir dosyaya yazılmaz (`.env.example` placeholder hariç)
- HER ZAMAN ortam değişkeni veya secret manager; başlangıçta varlık kontrolü
- Açığa çıkmış olabilecek secret derhal rotate edilir
- MCP gerçek konfigleri user-scope'tadır; repoda yalnız `.example.json` durur

## Token ve Oturum Kuralları (bu iskeletin değişmezleri)

- Access/refresh token localStorage'a YAZILMAZ
- Refresh token DB'de hash'li tutulur; rotation + reuse-revoke uygulanır
- Oturum çerezleri: `httpOnly`, `Secure`, `SameSite`

## Güvenlik Olayı Protokolü

1. DERHAL DUR
2. **code-reviewer** ajanına güvenlik incelemesi yaptır
3. CRITICAL bulgular çözülmeden devam etme
4. Açığa çıkan secret'ları rotate et
5. Benzer sorunlar için tüm kod tabanını tara

## İnceleme Tetikleyicileri

Auth, girdi işleme, DB sorgusu, dosya sistemi, dış API, kriptografi,
ödeme kodu değişiyorsa inceleme atlanamaz — bkz.
[code-review.md](./code-review.md).
