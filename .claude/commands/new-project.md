---
description: >
  Yeni proje açılışı — iskeletin varlık sebebi. Bootstrap script'iyle iskeleti
  yeniden adlandırır, source-brief ister, vault'ta proje klasörü açar, şablon
  modüllerin aktivasyonunu önerir, PM'e ilk task DAG'ını çıkarttırır.
  Kullanım: /new-project <proje-adi>
---

# /new-project

Bu iskeletten kopyalanan yeni bir projeyi ayağa kaldırır. Adımlar:

1. **Bootstrap — dry-run:** `node scripts/bootstrap-project.mjs <proje-adi>`.
   Çıktı tüm planı gösterir (ikameler, taşımalar, üretilecek memory).
2. **Plan onayı:** planı kullanıcıya sun; onay olmadan `--apply` çalıştırma.
   Ön koşul: temiz git ağacı (bypass yok). Kayıtlı `projectSlug` varsa aynı
   slug idempotent çıkar, farklı slug reddedilir.
3. **Uygula:** `--apply` → `pnpm install` → `pnpm gate`. Herhangi bir adım
   hata verirse script tüm değişiklikleri geri alır; yarım dönüşüm bırakmaz.
   **Memory klasörünü script üretir** (`01_Projects/<slug>/`, başlıklar dolu)
   ve iskelet vault'unu `_ARCHIVE/SiteSkeleton/` altına taşır — elle kopyalama
   YOK. Kapsam README "Bootstrap" bölümünde belgelidir.
4. **Brief iste ve kaydet:** kullanıcıdan brief'i al (hedef, kullanıcılar,
   ödemeli mi, kategori yapısı, özel kısıtlar) → `docs/source-briefs/<proje-adi>-brief.md`.
   Üretilmiş `Project Brief.md` / `Current Status.md` içeriğini brief'ten doldur.
5. **Modül aktivasyonu öner (brief'e göre):**
   - Ödemeli site → `templates/payments/` + `templates/db/coupons.sql`
     (kupon modülü) + ödeme sağlayıcı ADR'si (`/create-adr`).
   - Hiyerarşik kategori → `templates/db/categories.sql`.
   - Ayrı admin subdomain'i → `templates/admin-bff/`.
   SQL dosyaları `apps/api/src/main/resources/db/migration/V<n>__<desc>.sql`
   olarak kopyalanır.
6. **Framework sürüm kontrolü:** ADR-0009 kural 1 (EOL hatta başlamama) +
   ADR-0010 (Spring Boot 4.x) bu açılışta DEĞERLENDİRİLMEK zorundadır.
7. **İlk planı çıkart:** **project-manager** ajanına `project-planning`
   skill'iyle scope + risk sınıfı + ilk task DAG'ını çıkarttır.
8. **DUR:** planı kullanıcı onayına sun (insan onay noktası: plan).
   Onay olmadan kod yazılmaz.
