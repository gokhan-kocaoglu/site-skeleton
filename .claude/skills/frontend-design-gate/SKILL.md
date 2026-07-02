---
name: frontend-design-gate
description: >
  UI implementasyonu ÖNCESİ tasarım kapısı: tool preflight → UI UX Pro Max →
  (gerekirse) 21st Magic → UX seçimi → token mapping → Tailwind v4 planı →
  motion sınırı → a11y/responsive → evidence. Yeni sayfa, büyük section,
  admin shell, form/tablo, design-system değişikliği ve büyük component
  refactor'ünde zorunludur.
---

# Frontend Design Gate

Her major UI işinin **uygulamadan önce** kanıtlanabilir (evidence'lı),
token-sadık ve proje kimliğine uygun planlanmasını sağlar.

## Ne Zaman Zorunlu

Yeni sayfa/route · büyük section (hero, feature, CTA, footer) · dashboard/
admin shell · navbar/sidebar · kart/form/tablo · design-system değişikliği
(palet, tipografi, spacing, token) · responsive refactor · büyük component
refactor. Küçük metin/prop düzeltmesinde gerekmez.

## Adımlar

### 1. Tool preflight (secret-safe)
- Bağlantı kontrolü YALNIZ `claude mcp list` ile yapılır ve sonuç raporlanır.
  **`claude mcp get magic` KULLANILMAZ** — çıktısı gerçek credential
  gösterebilir; secret hiçbir terminal çıktısına/rapora/memory'ye giremez.
- `ui-ux-pro-max` skill'i (user-level) erişilebilir mi? 21st Magic MCP
  araçları (`mcp__magic__*`) görünüyor mu? Gerçek minimum çağrıyla kanıtla.
- Sonuç EVET/HAYIR evidence'a yazılır. Araç yoksa → yazılı tasarım
  kurallarıyla devam + **limitation kaydı**. Aracı kullanılmış gibi gösteren
  çıktı reddedilir.

### 2. UI UX Pro Max — tasarım zekâsı (varsa)
Palet/kontrast, font eşleşmesi, spacing, bileşen hiyerarşisi, a11y,
responsive ve jenerik-AI-UI elemesi için kullan. Palet kararları
`packages/design-tokens/tokens.css` üzerinden ifade edilir — ham hex ile
konuşma; token adı ve ölçek öner.

### 3. 21st Magic (seçici, opsiyonel)
hero / navigation / kart / form-tablo / modal için aday pattern.
Kullanım kararını **ux-ui-designer** verir. Kullanılırsa: birden fazla
alternatif iste, projenin token sistemine adapte et, generated kodu doğrudan
kabul etme; ek bağımlılık PM/Architect onayı ister.

### 4. UX seçimi
Seçilen yön + reddedilen alternatifler + gerekçe evidence'a yazılır.

### 5. Token mapping
Tüm görsel değerler `packages/design-tokens` → Tailwind v4 `@theme`
utility'lerine map edilir. **Ham hex YOK; inline style YOK.**

### 6. Tailwind v4 implementation planı
CSS-first (`@import "tailwindcss"` + `@theme`); v3 `tailwind.config.*` /
`theme.extend` YOK. Tekrarlayan pattern → component/ortak utility.

### 7. Motion sınırı
`motion` paketi + `motion/react` importu (framer-motion YASAK).
Reduced-motion zorunlu. Checkout/auth/admin/form akışlarında animasyon
minimum. SEO-kritik içerik animasyon/canvas'ın tek taşıyıcısı olamaz.

### 8. A11y / responsive kontrolü
375 / 768 / 1024 / 1440 · yatay taşma yok · kontrast AA · focus-visible ·
44×44 dokunma hedefi · semantic heading/landmark.

### 9. Evidence çıktısı (zorunlu)
`docs/ux/` altına: Görev · Tool availability (EVET/HAYIR) · Tasarım zekâsı
bulguları · 21st Magic adaptasyon notları · Seçilen yön · Reddedilenler ·
Token mapping · Motion sınırı · A11y bulguları.

## Çıkış Kuralı

Evidence tamamlanmadan ve UX onayı alınmadan implementation'a geçilmez.
Kapanış öncesi `frontend-style-audit` çalıştırılır.
