---
description: >
  Yeni proje açılışı — iskeletin varlık sebebi. Bootstrap script'iyle iskeleti
  yeniden adlandırır, source-brief ister, vault'ta proje klasörü açar, şablon
  modüllerin aktivasyonunu önerir, PM'e ilk task DAG'ını çıkarttırır.
  Kullanım: /new-project <proje-adi>
---

# /new-project

Bu iskeletten kopyalanan yeni bir projeyi ayağa kaldırır. Adımlar:

1. **Bootstrap (deterministik rename):**
   `node scripts/bootstrap-project.mjs <proje-adi>` (dry-run) → çıktıyı
   kullanıcıya göster → onayla `--apply` → `pnpm install` + `pnpm gate`.
   Kapsam ve kapsam-dışı (tarihsel kanıtlara dokunmaz) README "Bootstrap"
   bölümünde belgelidir; script idempotent'tir.
2. **Brief iste.** Kullanıcıdan "şöyle bir site olacak" brief'ini al
   (hedef, kullanıcılar, ödemeli mi, kategori yapısı, özel kısıtlar).
3. **Brief'i kaydet:** `docs/source-briefs/<proje-adi>-brief.md`.
4. **Vault proje klasörünü aç:**
   `project-memory/ClaudeTeamMemory/01_Projects/_TEMPLATE/` klasörünü
   `01_Projects/<ProjeAdi>/` olarak kopyala (PowerShell:
   `Copy-Item -Recurse`). `Project Brief.md` ve `Current Status.md`
   placeholder'larını brief'ten doldur.
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
