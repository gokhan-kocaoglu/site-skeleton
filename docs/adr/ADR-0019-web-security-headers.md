# ADR-0019: Core Web Security Header Policy

- Status: ACCEPTED
- Date: 2026-08-06
- Authors: system-architect (analiz), orkestratör (kayıt); AC-33 /
  F4-MEDIUM-03 remediation
- Kabul tetikleyicisi: Dördüncü bağımsız mini-denetim (RC2) — AC-33
  karşılanmadı (`docs/audits/2026-07-28-fourth-mini-audit-rc2.md`)

## Context

İskelet hiçbir uygulamada güvenlik yanıt header'ı emit etmiyordu; konu yalnız
serbest metinde anılıyordu. ADR-0017 bu kalıbı adlandırdı: doküman bulunması
sertleştirme yerine geçmez ve beyan ile enforcement ayrıştığında bulgu üretir
(F4-MEDIUM-01'in kök nedeni). AC-33 aynı kalıbın header yüzeyindeki tekrarıdır.

Ölçülen kısıtlar (Next 16.2.12, bu ağaç):

- `headers()` eklendikten sonra dokuz route'un tamamı `○ (Static)` kalır;
  header sözleşmesi statik prerender'ı dinamik render'a düşürmez.
- `routes-manifest.json` kuralı `["headers","regex","source"]` anahtarlarını
  taşır; `/(.*)` kaynağı `^(?:/(.*))(?:/)?$` regex'ine derlenir.
  `required-server-files.json` → `config.poweredByHeader = false`.
- Next nonce **üretmez**, gelen istek header'ından **okur** (`app-render.js`);
  tam statik prerender'da inline RSC bootstrap script'leri nonce taşımaz. Hash
  tabanlı varyant da mümkün değildir: `headers()` build başında
  `loadCustomRoutes` içinde değerlendirilir, HTML çok sonra prerender edilir.
- `/_next/image` yanıtı CSP'yi `res.setHeader` ile **ezer**
  (`image-optimizer.js`, `image-config.js`); varsayılanı sandbox'lı ve
  script'siz bir politikadır.
- `apps/admin/dist` ölçümü: inline script 0, inline `on*` 0, inline `<style>` 0,
  `style=""` 0, cross-origin script 0, `data:` URI 0, `modulepreload` 0,
  `@font-face` 0, `url()` 0, `createElement("style")` 0, `insertRule` 0,
  `cssText=` 0, `eval`/`new Function` 0.

Web'de gerçeklenebilir en katı politika ile admin'de gerçeklenebilir en katı
politika **aynı değildir**; tek ortak CSP ya web'i kırar ya admin'i gevşetir.

## Decision

1. **Model B — ikili sahiplik.** `apps/web` header sözleşmesini Next.js
   runtime'ında **emit eder**; `apps/admin` sözleşmesi provider-nötr tanımlanır
   ve statik host/edge tarafından uygulanır. Model A (yalnız doküman)
   reddedildi: ADR-0017 bu yaklaşımı adlandıran terimi yasakladı ve tam olarak
   bu drift'i bulgu saydı. Model C (nonce) ertelendi — madde 7.
2. **Uygulama CSP'si tek canonical modülde literal olarak sabitlenir**
   (production ve development varyantı). Direktif gerekçeleri:

   | Direktif | Değer | Gerekçe |
   |---|---|---|
   | `default-src` | `'self'` | Adlandırılmamış tüm fetch tipleri için kapalı taban. |
   | `base-uri` | `'self'` | `<base>` enjeksiyonuyla göreli URL hijack'ini kapatır. |
   | `object-src` | `'none'` | Legacy plugin/embed yürütme yüzeyini siler. |
   | `frame-ancestors` | `'none'` | Clickjacking; XFO'nun modern karşılığı. |
   | `form-action` | `'self'` | Form gönderimiyle dış origin'e veri sızmasını kapatır. |
   | `script-src` | `'self' 'unsafe-inline'` | Dış script origin'i kapalı; inline bugün zorunlu (madde 6). |
   | `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 ve Next kritik CSS'i inline enjekte eder. |
   | `img-src` | `'self'` | Uzak görsel kaynağı yok; genişletme proje kararıdır. |
   | `font-src` | `'self'` | Dış font CDN'i yok. |
   | `connect-src` | `'self'` | Ayrı origin API'de ilk genişletilecek direktif. |

   Development varyantı yalnız iki delta taşır: `script-src` içinde
   `'unsafe-eval'` (React Refresh) ve `connect-src` içinde localhost HMR
   WebSocket origin'leri. Delta yalnız `NODE_ENV` development iken uygulanır;
   production dalı hiçbir koşulda gevşemez ve bilinmeyen değerler production
   dalına düşer.
3. **`/_next/image` ayrı bir yanıt sınıfıdır.** Image Optimizer kendi CSP'sini
   `res.setHeader` ile yazar ve global kuralı ezer. İstisna sessiz kalmasın
   diye `images.contentSecurityPolicy` üzerinden açıkça pinlenir; pinlenen
   değer global politikadan **daha katıdır**. Bu yanıtlarda `frame-ancestors`
   kaybolur; `X-Frame-Options: DENY` hayatta kaldığı için clickjacking
   koruması sürer.
4. **HSTS edge/TLS terminatörü sahipliğindedir; `apps/web` emit etmez.**
   RFC 6797 §7.2: kullanıcı ajanı güvensiz taşımadan gelen STS başlığını yok
   sayar. Next reverse proxy arkasında düz HTTP konuşur; uygulamadan emit
   edilen HSTS bazı topolojilerde hiçbir şey zorlamadığı hâlde "garanti"
   izlenimi üretir — AC-33'ün kapattığı sapmanın aynısı. Edge değeri
   `max-age=31536000`'dir; `includeSubDomains` varsayılan **değildir** (her
   subdomain HTTPS-capable olmayabilir), `preload` varsayılan **değildir**
   (pratikte geri alınamaz; iskelet kendi domain'ini bilmez).
5. **`apps/admin` sözleşmesi statik host/edge tarafından uygulanır.**
   `vite.config.ts` içine dev/preview header'ı eklemek **reddedildi**: dev
   sunucusu `dist/` çıktısına tek byte yazmaz, üretimde hiçbir şey zorlamaz
   ama "admin sertleştirildi" izlenimi üretir; beyan ile enforcement
   arasındaki bu sapma F4-MEDIUM-01'in kök nedenidir. Admin CSP'si ölçülmüş
   `dist/` sayesinde `'unsafe-inline'` **içermez**; ek olarak
   `X-Robots-Tag: noindex, nofollow` taşır ve aynı XFO/XCTO/Referrer/
   Permissions değerlerini ve HSTS'i kapsar.
6. **`'unsafe-inline'` sınırı dürüstçe beyan edilir.** Bu politika script
   enjeksiyonuna karşı koruma **sağlamaz**. Kapattıkları: dış script origin'i,
   `object-src` yüzeyi, base-uri hijack'i, form ile veri sızdırma,
   clickjacking, MIME sniffing, referrer sızıntısı. **Kritik invariant:**
   `'unsafe-inline'` ile birlikte `script-src`'ye herhangi bir `nonce-` veya
   `sha256-` kaynağı girerse CSP2+ tarayıcıları `'unsafe-inline'`ı **sessizce
   yok sayar**; ikisi aynı direktifte asla bulunmaz.
7. **Nonce modeli ertelenir; önkoşulu mimaridir.** Edge, istemciden gelen CSP
   ve CSP-Report-Only **istek** header'larını strip etmeden bu modele
   geçilemez: Next nonce'u o header'dan okuduğu için saldırgan kendi nonce'unu
   dayatabilirdi. Ayrıca nonce dinamik render ister; dokuz statik route'un
   tamamı SSR'a düşer.
8. **Genişletme tek noktadan yapılır.** Üretilen proje CSP'yi yalnız canonical
   modülde genişletir; literal-locked test kırılır ve
   `docs/operations/deployment.md` kanonik bloğu **aynı turda** güncellenir.
   Env-driven genişletme (`NEXT_PUBLIC_CSP_*` gibi) **reddedildi**: politikayı
   deploy-zamanı veriyle değiştirilebilir ve gate'i bypass edilebilir kılar.
   CSP içinde mutlak origin/domain literali **yasaktır**; proje-özel origin'ler
   o projenin kendi ADR'sinde kararlaştırılır.

## Bilinen kırıcılar

| Direktif | Kırdığı akış | Not |
|---|---|---|
| `frame-src` tanımsız → `default-src 'self'` | 3DS challenge iframe'i, reCAPTCHA, harita embed'i | Üçüncü taraf iframe kullanan proje bu direktifi açıkça eklemelidir. |
| `form-action 'self'` | Iyzico 3DS akışının banka ACS URL'ine auto-POST'u | `templates/payments` `PENDING_3DS` durumu taşır; aktivasyonda ACS origin'i eklenmelidir. |
| `connect-src 'self'` | Ayrı origin'de yayınlanan API'ye fetch/XHR | Web ve API farklı origin'lerdeyse **ilk** kırılacak direktiftir. |

## Kapsam dışı bırakılanlar

| Header | Neden yok |
|---|---|
| COEP | `require-corp`, CORP taşımayan cross-origin subresource'ları kırar; karşılığı olmayan izolasyon maliyeti. |
| CORP | Public site için istenmeyen davranış; kaynakların meşru gömülmesini engeller. |
| `X-DNS-Prefetch-Control` | Güvenlik başlığı değil; gizlilik/performans tercihi. |
| `Origin-Agent-Cluster` | İzolasyon **ipucu**, güvenlik sınırı değil. |
| `upgrade-insecure-requests` | Ağaçta same-origin göreli URL dışında kaynak referansı yok. |
| `payment=()` | Permissions-Policy'de **bilinçli** dışarıda: `templates/payments` aktive edilince Stripe Payment Request / Apple Pay yolunu kırardı. |
| COOP | Değerlendirildi, ertelendi: 3DS ve popup tabanlı ödeme akışlarıyla etkileşimi ölçülmeden pinlenmez. |

## Doğrulama mimarisi

Üç bağımsız oracle; hiçbiri diğerinin çıktısını girdi olarak almaz:

1. **Literal contract testi** — canonical modülün ürettiği header kümesi ve
   sırası, testte birebir sabitlenmiş literallerle karşılaştırılır.
2. **Doküman blok eşitliği** — `deployment.md` bounded blokları canonical
   değerlerle **tam string** eşitliğinde doğrulanır.
3. **Build artefaktı** — `routes-manifest.json` header kuralı ve
   `required-server-files.json` değerleri gerçek build çıktısından okunur.

## Consequences

Pozitif: header'lar web'de gerçekten emit edilir ve statik prerender korunur;
admin sözleşmesi provider-nötr ve uygulanabilirdir; politika sapması üç
oracle'dan en az birini kırar; genişletme noktası tektir.

Negatif / üstlenilen borç: `'unsafe-inline'` nedeniyle CSP script enjeksiyonuna
karşı koruma vermez (kayıtlı, sahipli risk); HSTS ve admin sözleşmesi repo
dışında uygulanır; literal-locked test her meşru genişletmede elle güncellenir.

## Alternatives considered

1. **Model A — yalnız doküman** — reddedildi: ADR-0017 doküman bulunmasını
   sertleştirme saymayı yasakladı; AC-33 bu kalıbın bulgusudur.
2. **Model C — nonce tabanlı strict CSP** — reddedildi (bu turda): Next nonce
   üretmez, istek header'ından okur; statik prerender'da inline bootstrap
   nonce'suzdur ve dokuz route dinamik render'a düşer. Hash varyantı da mümkün
   değildir: `headers()` prerender'dan önce değerlendirilir.
3. **`vite.config.ts` dev/preview header'ı** — reddedildi: `dist/` çıktısına
   etki etmez, sahte sertleştirme sinyali üretir.

## Deferred work

- Nonce tabanlı strict CSP: önkoşulu edge'de inbound CSP istek header'ı strip'i
  (madde 7); dinamik render maliyeti ayrıca ölçülmelidir.
- COOP ve `payment=()` kararı: `templates/payments` aktivasyon-anı turuna aittir.
- F4-MEDIUM-04 bu ADR'nin kapsamında **değildir**: `scripts/verify-structure.mjs`
  bullet toplayıcıları (satır 606 ve 626) yalnız `-` biçimini görür, oysa
  markdown `*`, `+` ve `1.` de liste üretir. Durum: OPEN_ADJACENT_DEBT.
