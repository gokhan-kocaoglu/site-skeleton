---
description: >
  seo-specialist ajanını tek başına çağırır: apps/web üzerinde teknik SEO
  denetimi yapar, raporu docs/audits/seo/ altına tarihli dosya olarak kaydeder.
---

# /seo-audit

1. Kapsamı belirle: hangi sayfa/route'lar denetlenecek (varsayılan: son
   değişen web sayfaları; argümanla tam site istenebilir).
2. **seo-specialist** ajanını çağır (salt-okunur; kontrol listesi ajan
   dosyasındadır: metadata, tek h1, semantic HTML, robots/sitemap, canonical,
   OG, JSON-LD, SSR/ISR, CWV bütçesi).
3. Dönen raporu kaydet:
   `docs/audits/seo/YYYY-MM-DD-<kapsam>.md` (bulgular önem sıralı, format:
   `[SEVERITY] başlık / Konum / Sorun / Düzeltme` + verdict).
4. CRITICAL bulgu varsa ilgili developer'a remediation görevi öner;
   web feature'ı CRITICAL bulgu açıkken kapanamaz.
