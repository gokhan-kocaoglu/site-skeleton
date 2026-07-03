# SEO Denetim Raporu — apps/web home, Sprint 3 remediation yeniden-denetimi

**Commit:** `1a512db feat(phase-8.1): sprint 3 — evidence reproducibility, closure cycle, site-url guard, three-list, boot 3.5, bootstrap` (denetim bu içerikle koşuldu; commit-öncesi working tree bu commit'le birebir aynıdır)

**Tarih:** 2026-07-03 **Denetçi:** seo-specialist (salt-okunur) **Verdict:** PASS_WITH_RISKS

Kapsam: `docs/audits/seo/2026-07-02-web-home.md` raporundaki CRITICAL + HIGH
bulguların Sprint 3 remediation sonrası yeniden doğrulanması. Kod okuması +
gerçek `next build` kanıtı ile teyit; MEDIUM bulgular (favicon, sitemap
lastModified) bu sprint'in kapsamı dışında, yalnız durum notu.

## Bulgular (önem sıralı)

### [CRITICAL → KAPANDI] Env guard doğrulandı
- **Konum:** `apps/web/lib/site-url.ts:16-44`, `apps/web/.env.example`, `turbo.json:6`
- **Doğrulama:** `getSiteUrl()` — env boşsa ve `NODE_ENV==="production"` ve
  `SITE_SKELETON_ALLOW_LOCALHOST_URL!=="1"` ise `throw`; aksi halde
  localhost fallback. Değer varsa `new URL(raw)` ile parse edilip
  `http:`/`https:` dışı protokol reddediliyor, `url.origin` (trailing
  slash'siz) dönüyor. `.env.example` açıklamalı ve zorunluluğu belirtiyor.
  `turbo.json.tasks.build.env` iki değişkeni de bildiriyor (cache doğruluğu).
- **Kanıt:** Aşağıdaki "Kanıt" bölümü — env'siz build
  `NEXT_PUBLIC_SITE_URL is required for production builds...` mesajıyla
  gerçekten duruyor; env'li build canonical/OG/sitemap'i doğru domain'e yazıyor.
- **Kalan gözlem (bilgi amaçlı, blocker değil):** Guard `layout.tsx` modül
  seviyesinde tek sefer çağrılıyor — build zamanı fail-fast davranışı tam
  beklendiği gibi. `scripts/quality/gate-build.mjs:17`
  `SITE_SKELETON_ALLOW_LOCALHOST_URL: '1'` set ederek iskeletin kendi quality
  gate'inin deploy hedefi olmadan build doğrulamasını sağlıyor (belgeli kaçış kapısı).

### [HIGH → KAPANDI] OG image + Twitter Card doğrulandı
- **Konum:** `apps/web/app/layout.tsx:25-30` (metadata.twitter),
  `apps/web/app/opengraph-image.tsx`, `apps/web/app/twitter-image.tsx`
- **Doğrulama:** `opengraph-image.tsx` → `next/og` `ImageResponse`, 1200×630,
  satori'nin dahili Tailwind palet desteği (`tw` prop) — ham hex yok, inline
  `style={{}}` yok (satori render bağlamı design-tokens CSS custom
  property'lerine erişemez; kabul edilebilir istisna). `twitter-image.tsx`
  aynı asset'i re-export ediyor (Next.js twitter etiketlerini og'den otomatik
  türetmez). `layout.tsx` metadata'sında `twitter: { card: "summary_large_image" }`.
- **Kanıt:** Build çıktısında `○ /opengraph-image` ve `○ /twitter-image`
  statik route olarak üretildi; `index.html` içinde `og:image`,
  `og:image:width/height=1200/630`, `twitter:card=summary_large_image`,
  `twitter:image` etiketleri gerçek domain URL'siyle mevcut.

### [MEDIUM — kapsam dışı, kayıtlı] Favicon / icon dosyaları hâlâ yok
- **Konum:** `apps/web/app/` — `favicon.ico`/`icon.png`/`apple-icon.png` yok.
- **Not:** Sprint 3 kapsamı dışı; ilk gerçek web feature'ına taşınmalı.

### [MEDIUM — kapsam dışı, kayıtlı] sitemap `lastModified` hâlâ `new Date()`
- **Konum:** `apps/web/app/sitemap.ts:8` — build anında `2026-07-03T08:58:52.438Z` üretti.
- **Not:** Sprint 3 kapsamı dışı; gerçek içerik `updatedAt`'ine bağlanmalı.

### [INFO] Birim testleri
- `apps/web/test/site-url.test.ts` — 6/6 PASS (fallback, production fail-fast,
  escape-hatch, origin normalize, göreli URL reddi, izinsiz protokol reddi).

## Kontrol Listesi

| Kontrol | Durum | Not |
|---|---|---|
| Canonical env yoksa build'de fail-fast | PASS | env'siz build hata ile durdu |
| Canonical/OG/sitemap doğru domain'e yazıyor (env'li) | PASS | `https://demo.example.com` üçünde de doğrulandı |
| OG image (1200×630) | PASS | `og:image:width=1200`, `height=630` |
| Twitter Card (summary_large_image) + twitter:image | PASS | Meta etiketleri doğrulandı |
| `.env.example` mevcut ve açıklayıcı | PASS | Zorunluluk + fail-fast davranışı dokümante |
| `turbo.json` build.env cache doğruluğu | PASS | İki değişken de bildirilmiş |
| Guard birim testleri | PASS | 6/6 yeşil |
| Ham hex / inline style ihlali (OG image) | PASS | satori `tw` prop |
| Favicon/icon | AÇIK (kapsam dışı) | 2026-07-02 MEDIUM bulgusu geçerli |
| sitemap lastModified | AÇIK (kapsam dışı) | 2026-07-02 MEDIUM bulgusu geçerli |

## Kanıt (komut çıktıları)

```text
# 1) Env'siz build — fail-fast guard tetiklendi
$ cd apps/web && rm -rf .next && pnpm build
[Error: Failed to collect configuration for /_not-found] {
  [cause]: Error: NEXT_PUBLIC_SITE_URL is required for production builds:
  canonical, sitemap, robots and Open Graph URLs are frozen at build time and
  would point at localhost. Set it (see apps/web/.env.example) or — only for
  skeleton self-validation — set SITE_SKELETON_ALLOW_LOCALHOST_URL=1. }
 ELIFECYCLE  Command failed with exit code 1.

# 2) Env'li build — başarılı, tüm route'lar statik
$ NEXT_PUBLIC_SITE_URL=https://demo.example.com pnpm build
 ✓ Generating static pages (8/8)
┌ ○ /  ├ ○ /_not-found  ├ ○ /opengraph-image  ├ ○ /robots.txt
├ ○ /sitemap.xml  └ ○ /twitter-image

# 3) canonical
$ grep -o 'rel="canonical"[^>]*' .next/server/app/index.html
rel="canonical" href="https://demo.example.com"/

# 4) OG / Twitter meta
property="og:image" content="https://demo.example.com/opengraph-image?32e36387d2486a93"
property="og:image:width" content="1200" · property="og:image:height" content="630"
name="twitter:card" content="summary_large_image"
name="twitter:image" content="https://demo.example.com/twitter-image?782e1deffee3c1ed"

# 5) sitemap.xml.body
<url><loc>https://demo.example.com</loc><lastmod>2026-07-03T08:58:52.438Z</lastmod>
<changefreq>weekly</changefreq><priority>1</priority></url>

# 6) robots.txt.body
User-Agent: * · Allow: / · Sitemap: https://demo.example.com/sitemap.xml

# 7) Guard birim testleri
$ pnpm vitest run test/site-url.test.ts → 6 passed (6)

# 8) Quality-gate escape hatch
$ grep -n "SITE_SKELETON_ALLOW_LOCALHOST_URL" scripts/quality/gate-build.mjs
17:  env: { ...process.env, SITE_SKELETON_ALLOW_LOCALHOST_URL: '1' },
```

## Verdict Gerekçesi

verdict-policy.md sözlüğüne göre: CRITICAL bulgu (env guard eksikliği) kod ve
build kanıtıyla **kapandı** — production build artık env'siz sessizce
localhost yayınlayamıyor, açıkça fail ediyor. HIGH bulgu (OG image + Twitter
Card) **kapandı**. Kalan iki MEDIUM bulgu (favicon, sitemap lastModified)
kayıtlı ve production'ı engelleyen nitelikte değil (kural 3). CRITICAL yok,
HIGH yok, kalan riskler kayıtlı → **PASS_WITH_RISKS**. MEDIUM bulgular ilk
gerçek web feature'ında kapatılmalı.
