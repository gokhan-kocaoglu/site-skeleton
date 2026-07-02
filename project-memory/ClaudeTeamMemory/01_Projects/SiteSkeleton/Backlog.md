# Backlog — Site Skeleton

> PM'in HANDOFF'larıyla memory-steward günceller. Sıralama öncelik sırasıdır.

## Yapılacak

1. **SEO CRITICAL remediation: env guard + .env.example + turbo build.env** — CRITICAL — BLOCKER (gerekçe: docs/audits/seo/2026-07-02-web-home.md; canonical/sitemap localhost fallback fix zorunlu) — Sahip: frontend-developer — Kanıt: build'de NEXT_PUBLIC_SITE_URL guard, production deploy'da eksik değişken fail-fast throws

2. **OG image + Twitter Card meta** — HIGH — (gerekçe: aynı SEO raporu) — Sahip: frontend-developer — 1200×630 varsayılan OG + metadata.twitter { card, ...} layout seviyesi fallback

3. **Frontend test gate bootstrap: Vitest + Testing Library + MSW** — QA MEDIUM risk — (gerekçe: docs/test-reports/2026-07-02-faz8-quality-gate.md §Risk 1) — Sahip: frontend-developer (web/admin package.json + test script + örnek suite) — Takip: ilk gerçek web feature'ında zorunlu

4. **Favicon + sitemap lastmod** — MEDIUM — Sahip: frontend-developer — App Router convention dosyalar (icon.png, favicon.ico, apple-icon.png); sitemap.ts lastModified gerçek güncelleme tarihine bağla

5. **Playwright E2E scaffold** — LOW — (kasıtlı erteleme, ilk kullanıcı akışında başlayacak) — Sahip: qa-test-specialist — playwright.config.ts + örnek spec

6. **Postcss CVE takibi (upstream Next.js)** — LOW — Sahib: frontend-developer (bakım) — GHSA-qx2v-qp2m-jg93, pratik sömürülebilirlik düşük; Next.js minor güncellemelerinde postcss ≥8.5.10 doğrula

## Beklemede (blocker'lı)

- İlk gerçek proje: `/new-project` ile proje açılması (SEO CRITICAL + HIGH bulgular kapatıldıktan sonra)

## Yapıldı (Faz 1-7)

- Faz 1: Monorepo + Turborepo + pnpm workspace (2026-06-25)
- Faz 2: Next.js 15 web, Vite 5 admin, React 19 + TypeScript strict (2026-06-28)
- Faz 3: Agent team + skill'ler + memory vault + quality gate scripts (2026-06-30)
- Faz 4: Fail-safe Node hooks, settings.json, self-test harness (2026-07-01)
- Faz 5: Design tokens (Tailwind v4 CSS), api-types (OpenAPI contract) (2026-07-01)
- Faz 6: Spring Boot 3.3 api, Flyway v1 baseline, domain şablonları + Testcontainers (2026-07-01)
- Faz 7: Quality gate scripts, docs, ADR templates (2026-07-02)
- Faz 8: Doğrulama turu — gate/review/audit, ADR-0008, session-close-validator negatif test (2026-07-02)
