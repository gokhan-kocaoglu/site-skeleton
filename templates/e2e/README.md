# E2E Şablonu (Playwright) — opsiyonel aktivasyon modülü

Bu klasör build'e dahil DEĞİLDİR (Faz 8.1 kapsam kararı: Playwright çekirdeğe
zorunlu girmez). Kritik kullanıcı akışları netleşince kopyala-etkinleştir.

## Aktivasyon Adımları

1. Klasörü kopyala:
   `templates/e2e/` → `apps/e2e/` (yeni bir pnpm workspace olur; `pnpm-workspace.yaml`
   `apps/*` desenini zaten kapsar).
2. `apps/e2e/package.json` oluştur:

   ```json
   {
     "name": "e2e",
     "private": true,
     "scripts": {
       "test": "playwright test",
       "test:ui": "playwright test --ui"
     },
     "devDependencies": {
       "@playwright/test": "^1.53.0"
     }
   }
   ```

3. `pnpm install`, ardından tarayıcıları kur: `pnpm --filter e2e exec playwright install chromium`
4. `pnpm --filter e2e test` — config, web sunucusunu (`pnpm --filter web dev`)
   kendisi ayağa kaldırır.
5. CI'da koşacaksa `.github/workflows/ci.yml`'e ayrı bir job ekle
   (ubuntu-latest + `playwright install --with-deps chromium`).

Not: `gate-test` her workspace'te `test` script'i arar; kopyalanan modül
yukarıdaki `package.json` ile bu kurala otomatik uyar.

## İçerik

- `playwright.config.ts` — chromium, `http://localhost:3000`, dev-server autostart.
- `tests/home.spec.ts` — ana sayfa smoke akışı (tek h1 + başlık + erişilebilir ana bölge).

Desenler: `.claude/skills/stack-patterns/references/e2e-testing.md`.
