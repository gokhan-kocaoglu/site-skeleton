# Deployment

> Taslak — proje-özel deployment kararları yeni projede ADR ile verilir.
> İstisna: aşağıdaki iki bounded güvenlik bloğu taslak değildir ve makine
> tarafından doğrulanır (karar: `docs/adr/ADR-0019-web-security-headers.md`).

İskelet deployment hedefi dayatmaz. Beklenen üretim şekli:

- apps/web → Node hosting / Vercel benzeri (SSR/ISR destekli)
- apps/admin → statik build (`dist/`) + herhangi bir statik host / reverse proxy
- apps/api → JVM artifact (`target/*.jar`) + PostgreSQL 16; Flyway migration'ları
  deploy pipeline'ında `mvn -DskipTests package` sonrası uygulamanın açılışında koşar

Karar noktaları (yeni projede ADR): hosting sağlayıcısı, ortam sayısı (staging/prod),
secret yönetimi, admin SPA için ayrı subdomain + BFF gerekip gerekmediği
(templates/admin-bff).

## Güvenlik yanıt header'ları

Marker'lar arasındaki içerik canonical değerlerle **tam string** eşitliğinde
doğrulanır; elle düzenlenirse yapısal doğrulama başarısız olur. Değer
değişikliği yalnız canonical header modülü, literal-locked test ve bu blok
**aynı turda** güncellenerek yapılır.

<!-- web-security-contract:start -->
**apps/web — Next.js runtime tarafından emit edilir**

- Content-Security-Policy (production): `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'`
- Content-Security-Policy (development): `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self' ws://localhost:* ws://127.0.0.1:*`
- Content-Security-Policy (/_next/image): `default-src 'self'; script-src 'none'; sandbox;`
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Referrer-Policy: `strict-origin-when-cross-origin`
- Permissions-Policy: `camera=(), microphone=(), geolocation=()`
- Header source: `/(.*)`
- X-Powered-By: `emit edilmez (poweredByHeader: false)`
- Strict-Transport-Security: `bu repo tarafından ZORLANMAZ — edge/TLS terminatörü sorumluluğu`
<!-- web-security-contract:end -->

<!-- admin-security-contract:start -->
**apps/admin — statik host / edge tarafından uygulanmalıdır; bu repo ZORLAMAZ**

- Content-Security-Policy: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'`
- X-Frame-Options: `DENY`
- X-Content-Type-Options: `nosniff`
- Referrer-Policy: `strict-origin-when-cross-origin`
- Permissions-Policy: `camera=(), microphone=(), geolocation=()`
- X-Robots-Tag: `noindex, nofollow`
- Strict-Transport-Security: `max-age=31536000`
<!-- admin-security-contract:end -->

## Edge / TLS terminatörü sorumlulukları

HSTS bu repo tarafından emit **edilmez**. Gerekçe ADR-0019'dadır: kullanıcı
ajanı güvensiz taşımadan gelen HSTS başlığını yok sayar ve Next reverse proxy
arkasında düz HTTP konuşur; uygulamadan emit edilen değer bazı topolojilerde
hiçbir şey zorlamadığı hâlde "garanti" izlenimi üretir.

Edge'de HSTS açılırken önkoşullar:

- `includeSubDomains` **varsayılan değildir**: apex domain'in altındaki TÜM
  subdomain'ler (staging, admin, statik CDN, iç araçlar) HTTPS-capable
  olmadan eklenirse erişilemez hâle gelirler.
- `preload` **varsayılan değildir**: listeye girmek pratikte geri alınamaz;
  kaldırma süreci aylar sürer ve tarayıcı sürüm döngüsüne bağlıdır.
- Ömür değeri önce kısa tutulup kademeli yükseltilmelidir; bloktaki değer
  hedef durumdur, ilk gün değeri değildir.

## apps/admin sözleşmesi hakkında

Admin bloğu bir **hedef sözleşmedir**; "repository tarafından uygulanmıştır"
iddiası **taşımaz**. `apps/admin` statik bir `dist/` üretir ve statik çıktı
kendi HTTP yanıt header'ını yazamaz. Vite dev/preview sunucusuna header eklemek
bu sözleşmeyi karşılamaz: dev sunucusu `dist/` çıktısına tek byte yazmaz ve
üretimde hiçbir şey zorlamaz.

Uygulama noktası, admin'i yayınlayan statik host / CDN / reverse proxy
konfigürasyonudur (host header kuralları, edge fonksiyonu, nginx `add_header`).
Bu konfigürasyon üretilen projenin kendi deposundadır ve orada doğrulanmalıdır.

## Genişletme uyarıları

- **Ayrı origin API.** Web ve API farklı origin'lerde yayınlanıyorsa, tarayıcı
  fetch/XHR hedeflerini kısıtlayan politika satırı ilk kırılacak yerdir; API
  origin'i canonical modülde eklenir ve web bloğu aynı turda güncellenir.
  Deploy-zamanı ortam değişkeniyle genişletme ADR-0019'da reddedilmiştir.
- **Üçüncü taraf iframe.** 3DS challenge, reCAPTCHA ve harita embed'leri
  varsayılan politikada bloklanır; `templates/payments` aktive edilirken banka
  ACS akışı için ayrı bir karar gerekir.
- **Statik export.** `next.config` içinde `output: 'export'` kullanılırsa
  `headers()` **etkisiz** kalır — statik export bir Node yanıt katmanı üretmez.
  O senaryoda web de admin gibi tamamen host/edge sorumluluğuna geçer ve web
  bloğu artık "runtime tarafından emit edilir" iddiasını karşılamaz.
- **Ters proxy.** Önde duran proxy aynı header'ı ikinci kez eklerse çift değer
  oluşur; tarayıcı CSP'de en katı kesişimi uygular, diğer header'larda davranış
  tanımsızdır. Tek bir emit noktası seçilmelidir.

## İstek header'ı hijyeni

Edge, istemciden gelen CSP ve CSP-Report-Only **istek** header'larını strip
etmelidir. Next nonce üretmez, gelen istek header'ından okur; bu strip
yapılmadan nonce tabanlı sertleştirmeye geçilemez (ADR-0019, ertelenen iş).
