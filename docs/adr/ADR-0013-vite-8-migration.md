# ADR-0013: Vite 8 / Vitest 4 Geçişi (admin)

- Status: ACCEPTED
- Date: 2026-07-23 (Faz 8.3 PR-A2; brief P0-1 / 1.2)

## Context

apps/admin Vite 5.4'teydi; 5→8 arası üç major kırılım birikti (6: Environment
API, 7: Node 20.19+/browser baseline, 8: Rolldown). Üçüncü denetim HIGH-1 +
Faz 8.3 brief'i baseline'ın desteklenen hatta çekilmesini bağlayıcı yaptı.

## Decision

**Doğrudan Vite 5 → 8.1.5 geçişi** (kademeli değil): admin küçük (16 modül,
2 test) olduğundan ara-major maliyeti kanıt getirmez; kırılımlar tek koşuda
test yüzeyiyle doğrulandı. Birlikte: @vitejs/plugin-react **6.0.4** (peer:
yalnız vite ^8), tailwindcss + @tailwindcss/vite **4.3.3**, vitest
**4.1.10** ≡ @vitest/coverage-v8 **4.1.10** (Vitest 4 peer'ı vite ^6-8 —
Vite 5'i desteklemez; vite+vitest yükseltmesi bu yüzden atomik).
Kök **engines.node >=22.12.0** (vite 8 + plugin-react 6 engines tabanı).

## Sonuçlar ve kanıtlar (C1 commit `fdffa48`)

1. **Rolldown/Oxc etkisi:** mevcut vite.config/vitest.config DEĞİŞMEDEN yeşil
   — config'te rollupOptions/esbuild/custom build ayarı yoktu, dolayısıyla
   rename'lerden (rolldownOptions vb.) etkilenmedi. Build 132ms, JS 184.65 kB
   (baseline 187.65). Kullanılmayan uyumluluk ayarı EKLENMEDİ.
2. **Vitest 4 coverage davranışı:** include/exclude kapsamı korunmuş
   (coverage-summary.json: App.tsx ölçülüyor; main.tsx/test hariç); metin
   tablosu tam-kapsanan dosyaları gizliyor (skipFull — kozmetik); sayım
   AST-tabanlı. **%60 statements eşiği aktif** (CLI %101 → ERROR negatif
   kanıtı; %60 config → PASS).
3. **Geçici ayrışma:** web Vitest 3.2.6'da KALDI (bilinçli — PR-A3/Next 16
   kapsamı); admin 4.1.10. İki majorun yan yana yaşaması jest-dom'u kırdı:
   **kök neden** — jest-dom/vitest girişinin bildirilmemiş Vitest peer
   dependency'sinin, iki Vitest majoru bulunan pnpm workspace'inde yanlış
   Vitest instance'ına çözülmesi. **Köprü:** kök package.json
   packageExtensions ile `@testing-library/jest-dom@6.9.1`e opsiyonel
   `vitest >=3 <5` peer'ı tanıtıldı → lockfile web(3.2.6)/admin(4.1.10)
   bağlamlı iki ayrı jest-dom instance'ı kurar. **Kaldırma kriteri:**
   PR-A3'te web Vitest 4'e geçince extension silinir, lockfile yeniden
   çözülür, iki workspace testi yeniden doğrulanır.
4. **Doğrulama:** admin build/type-check/lint/test yeşil; web type-check +
   20/20 test (jest-dom matcher'ları runtime+TS); pnpm gate 7/7 PASS;
   audit --prod 0 bulgu; install --frozen-lockfile temiz.

## Alternatifler (reddedildi)

- **Vite 5'te kalmak:** EOL hat; HIGH-1'i açık bırakır.
- **Kademeli 5→6→7→8:** küçük kod tabanında üç kat doğrulama, ek kanıt yok.
- **rolldown-vite ara yolu:** yalnız doğrudan geçiş başarısız olsaydı
  devreye girecekti; gerek kalmadı.
- **Web'i erken Vitest 4'e almak:** A2 izolasyonunu bozar; A3'te yapılacak.

## Rollback ölçütleri

Rolldown kaynaklı, config ile çözülemeyen regresyon veya plugin-react 6
uyumsuzluğu → C1 revert (tek commit) + Vite 5 lockfile'ına dönüş; jest-dom
köprüsü birlikte geri alınır. Eşik: yeşile çekilemeyen herhangi bir gate FAIL.
