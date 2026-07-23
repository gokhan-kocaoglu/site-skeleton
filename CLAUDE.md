# Site Skeleton — Çalışma Anayasası

## Kimlik — Üç Liste (drift kontrolü: verify-structure `installedBaseline`)
Monorepo: pnpm 9 + Turborepo + Node 22.12+.

**Installed baseline** (package dosyalarında gerçekten var):
- apps/web: Next.js 15, React 19, TS strict, Tailwind v4 (CSS-first);
  test: Vitest + Testing Library + MSW.
- apps/admin: Vite 8, React 19, TS; test: Vitest 4 + Testing Library + axe-core.
  (web geçici olarak Vitest 3'te — Vitest 4 geçişi PR-A3 kapsamı; ADR-0013.)
- apps/api: Java 21, Spring Boot 4.1, JPA+Hibernate, PostgreSQL 16, Flyway;
  test: JUnit5 + Testcontainers. (Sürüm politikası: ADR-0009.)

**Approved defaults** (kurulu DEĞİL; ilk ihtiyaçta bunlar kurulur, seçim tartışması yeniden açılmaz):
- web: TanStack Query, RHF+Zod, motion (motion/react).
- admin: React Router v7, Zustand.
- api: Spring Security 6, JJWT, Bucket4j, springdoc.
Kurulunca ilgili paket bu listeden Installed baseline'a taşınır (manifest'i de güncelle).

**Optional activation** (templates/, kopyala-etkinleştir; build'e dahil değil):
payments (Iyzico/Stripe portu) · admin-bff (HttpOnly refresh köprüsü) ·
e2e (Playwright) · db (kategori/kupon SQL).

## Mutlak Kurallar
- Hibernate DDL: validate. Şema değişikliği YALNIZ Flyway `V<n>__desc.sql`.
- Para: NUMERIC(12,2). Tarih: TIMESTAMPTZ (UTC). Public ID: UUID, internal PK: BIGINT identity.
- Token'lar localStorage'a YAZILMAZ. Refresh token DB'de hash; rotation + reuse-revoke.
- framer-motion import YASAK → "motion" paketi kullanılır (motion/react).
- Ham hex renk YASAK → packages/design-tokens. Inline style YASAK.
- Secret hiçbir dosyaya yazılmaz (.env.example placeholder hariç).
- Kapsam: başlangıç minimumu %60 (gate eşiği); feature bazında hedef %80;
  auth/ödeme/para hesabı gibi kritik domainlerde %80 zorunlu.
- Kategoriler hiyerarşiktir (parent_id, opsiyonel). Kupon: 8 hane benzersiz, %5–%50 (5'er adım),
  tek kullanımlık, ödeme onayında pasifleşir. (SQL şablonları: templates/db/)

## Çalışma Düzeni
- Her iş /start-feature ile başlar; gate zinciri: PM → (Arch) → (UX) → Dev → PM diff → QA →
  Security → (web ise SEO + style-audit) → Final → memory → commit.
- project-memory/ tek writer: memory-steward. Diğer ajanlar HANDOFF gönderir.
- Memory okuma sırası: _CLAUDE.md → Project Brief → Current Status → rol dosyaları.
- Ajan tanımları .claude/agents/, iş akışları .claude/skills/ içindedir — oku, tekrar etme.

## Komutlar
- pnpm build | test | type-check | lint (Turborepo)
- API: cd apps/api; mvn verify (Testcontainers; Docker yoksa: mvn verify -Pit-local)
- Quality gate: pnpm gate (scripts/quality/)
