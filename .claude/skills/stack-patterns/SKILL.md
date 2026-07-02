---
name: stack-patterns
description: Stack'e özgü mühendislik desenleri yönlendiricisi. Spring Boot, JPA, PostgreSQL, Flyway, REST API tasarımı, React/Next.js frontend ve Playwright E2E işlerinde ilgili referans dosyasını yükler. Backend, frontend, veritabanı veya API işi başlarken kullan.
---

# Stack Desenleri (Yönlendirici)

Bu skill bir **yönlendiricidir**: içerik taşımaz, görev tipine göre tek bir
referans dosyası yükletir. Tüm referanslar `references/` altındadır ve her
biri kendi başına yeterlidir — görevle ilgisiz referansı YÜKLEME.

## Görev Tipi → Referans Eşlemesi

| Görev | Referans |
|-------|----------|
| REST controller, service, DTO, exception handling, rate limit | `references/springboot-patterns.md` |
| Auth (JWT), yetkilendirme, CORS/CSRF, parola, secret | `references/springboot-security.md` |
| Backend test yazımı, TDD, Testcontainers, doğrulama döngüsü | `references/springboot-tdd.md` |
| Entity tasarımı, ilişkiler, N+1, transaction, sayfalama | `references/jpa-patterns.md` |
| SQL sorgu/indeks optimizasyonu, veri tipleri, kilitleme | `references/postgres-patterns.md` |
| Endpoint tasarımı, status kodları, zarf, sayfalama, sürümleme | `references/api-design.md` |
| Flyway migration, şema değişikliği, sıfır-kesinti | `references/database-migrations.md` |
| React bileşen/state/form/animasyon/performans | `references/frontend-patterns.md` |
| Playwright E2E, POM, flaky test, artefakt | `references/e2e-testing.md` |

## Kullanım Kuralları

1. Görevi sınıflandır, tablodan İLGİLİ TEK referansı oku (kesişen işte en
   fazla iki: örn. yeni endpoint → `api-design` + `springboot-patterns`).
2. Referanslar bu iskeletin değişmezleriyle uyumludur; çelişki görürsen
   `CLAUDE.md` ve `.claude/rules/` kazanır.
3. Bu stack'in sabitleri (her referansın varsaydığı zemin):
   - Backend: Java 21, Spring Boot 3.3, JPA (`ddl-auto: validate`),
     PostgreSQL 16, Flyway, JJWT, Bucket4j
   - Frontend: Next.js 15 (App Router), React 19, Tailwind v4,
     TanStack Query, RHF+Zod, `motion` paketi (framer-motion YASAK)
   - Admin: Vite 5, React Router v7, Zustand
   - Test: Vitest/Testing Library/MSW, JUnit 5/Testcontainers, Playwright

## İlişkili

- Güvenlik incelemesi kontrol listeleri: `code-reviewer` ajanı
- Kanıt-tabanlı doğrulama zinciri: `qa-quality-gate` skill'i
- Genel kurallar: `.claude/rules/common/` ve `.claude/rules/typescript/`
