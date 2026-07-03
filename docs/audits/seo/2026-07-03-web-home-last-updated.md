# SEO Regresyon Denetimi — web ana sayfa "Son güncelleme" bölümü (2026-07-03)

- Kapsam: Faz 8.1 Sprint 4 §4.8 pilot feature'ının SEO delta denetimi
  (tam site denetimi değil). Kıyas bazı: `2026-07-03-web-home-remediation.md`.
- Denetçi: seo-specialist ajanı; dosya yazımı orkestratör.
- Kod: **commit `4abd5a4`** (denetim koşusu working tree'de yapıldı; içerik
  bu commit'le birebir mühürlendi).

## Bulgular

1. **Metadata regresyonu yok** — layout.tsx diff'siz; title/description/
   canonical/OG/Twitter export'ları önceki denetimle birebir (build kanıtı:
   `rel="canonical" href="https://demo.example.com"`, tüm og:*/twitter:* aynı).
2. **Yeni içerik temiz** — tek h1 + tek h2 hiyerarşisi korunuyor; footer
   heading içermiyor. `<time dateTime="2026-07-03">3 Temmuz 2026</time>`
   doğru HTML5 semantiği (makine-okunur tarih — pozitif sinyal).
3. **lang karışımı düşük risk** — `html lang="en"` + `footer lang="tr"`
   geçerli fragment override'ı; sayfa-seviyesi dil sınıflandırmasını bozmaz,
   hreflang gereksinimi doğurmaz. (UX kararı, WCAG 3.1.2 gerekçeli.)
4. **robots/sitemap etkilenmedi** — iki dosyaya da dokunulmadı; build çıktısı
   önceki denetimle aynı.
5. **Render stratejisi korunuyor** — `/` route `○ (Static)` prerender;
   tarih build anında statik HTML'e gömülür; ek JS/hydration maliyeti yok.
6. **Önceki kayıtlı riskler kötüleşmedi** — favicon eksik (MEDIUM, taşınan);
   sitemap `lastModified` build-time sabit (MEDIUM, taşınan). Fırsat notu:
   `lastModified` ileride `getLastUpdated()` değerine bağlanabilir.

## Kanıt (denetim koşusu)

```text
NEXT_PUBLIC_SITE_URL=https://demo.example.com pnpm build → ○ / (Static), 8/8 sayfa
grep <time  .next/server/app/index.html → <time dateTime="2026-07-03">3 Temmuz 2026</time>
grep <footer .next/server/app/index.html → <footer lang="tr" class="mt-10 text-sm text-text-muted">
grep canonical → rel="canonical" href="https://demo.example.com"
robots.txt.body → User-Agent: * / Allow: / / Sitemap: https://demo.example.com/sitemap.xml
```

## Verdict: **PASS_WITH_RISKS**

Bu değişiklik delta olarak temiz (CRITICAL/HIGH yok, regresyon yok). Sayfanın
genel durumu, önceki denetimden taşınan iki kabul edilmiş MEDIUM riski
(favicon; sitemap lastModified) koruduğu için PASS_WITH_RISKS etiketi sürer.
Sahip: seo-specialist; takip: gerçek-proje SEO sprint'i + sitemap-lastmod
bağlama görevi.
