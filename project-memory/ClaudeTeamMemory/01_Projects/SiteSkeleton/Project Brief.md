# Project Brief — Site Skeleton

> `/new-project` bu dosyayı `docs/source-briefs/<proje-adi>-brief.md`'den
> doldurur. Uzun brief buraya kopyalanmaz — özet + link.

## Vizyon

pnpm 9 + Turborepo monorepo iskeletinin inşası: web (Next.js 15), admin (Vite 5), api (Spring Boot 3.3), 8 faza ayrılmış, her faz gate zinciri ile tamamlanmış.

## Hedef Kullanıcılar

Şirkete özel SaaS/e-ticaret projelerinin hızlı başlangıcı için geliştiriciler.

## Kapsam Özeti

- **apps/web** — Next.js 15, React 19, TypeScript strict, Tailwind CSS v4, TanStack Query, React Hook Form + Zod, framer-motion
- **apps/admin** — Vite 5, React 19, React Router v7, Zustand, aynı design tokens
- **apps/api** — Java 21, Spring Boot 3.3, Spring Security 6, JPA+Hibernate, PostgreSQL 16, Flyway, JJWT, Bucket4j, springdoc-openapi
- **packages/design-tokens** — CSS custom properties, marka renkleri, typography
- **packages/api-types** — OpenAPI contract, TypeScript araç/type tanımları
- **Test** — Vitest/Testing Library/MSW (frontend), JUnit 5/Testcontainers (backend)
- **Docs** — ADR kaydı, SEO/quality-gate raporları, migration şablonları (kategori, kupon, ödeme), domain şablonları

## Non-Goal'lar

- Gerçek e-ticaret/SaaS özellikleri (şablon kütüphanesi); yalnız iskeleton.
- Playwright E2E (kasıtlı erteleme — ilk gerçek feature'da başlayacak).
- Çok dillilik (gelecek proje isteğinde).

## Aktif Şablon Modülleri

- [x] `templates/db/categories.sql` (hiyerarşik kategori, adjacency list + derinlik sınırı = 3)
- [ ] `templates/db/coupons.sql` (kupon modülü, henüz kopyalanmadı)
- [ ] `templates/payments/` (ödeme portu, henüz kopyalanmadı)
- [ ] `templates/admin-bff/` (ayrı admin subdomain'i, henüz kopyalanmadı)

## Özel Kısıtlar

- Hibernate `ddl-auto: validate` — tek DDL kaynağı Flyway (V*__*.sql)
- Para: NUMERIC(12,2); Tarih: TIMESTAMPTZ (UTC)
- Token: localStorage YASAK; refresh token DB'de hash + rotation
- Kategoriler: hiyerarşik (parent_id, opsiyonel); maksimum `depth` = 3 (dökümü ADR-0008'de)

## Kaynak

Tam brief: `docs/source-briefs/skeleton-brief.md`
