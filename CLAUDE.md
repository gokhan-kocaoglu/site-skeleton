# Site Skeleton — Çalışma Anayasası

## Kimlik
Monorepo: pnpm 9 + Turborepo + Node 22.
- apps/web: Next.js 15, React 19, TS strict, Tailwind v4 (CSS-first), TanStack Query, RHF+Zod, motion.
- apps/admin: Vite 5, React 19, React Router v7, Zustand.
- apps/api: Java 21, Spring Boot 3.3, Spring Security 6, JPA+Hibernate, PostgreSQL 16, Flyway, JJWT, Bucket4j, springdoc.
- Test: Vitest/Testing Library/MSW + JUnit5/Testcontainers.

## Mutlak Kurallar
- Hibernate DDL: validate. Şema değişikliği YALNIZ Flyway `V<n>__desc.sql`.
- Para: NUMERIC(12,2). Tarih: TIMESTAMPTZ (UTC). Public ID: UUID, internal PK: BIGINT identity.
- Token'lar localStorage'a YAZILMAZ. Refresh token DB'de hash; rotation + reuse-revoke.
- framer-motion import YASAK → "motion" paketi kullanılır (motion/react).
- Ham hex renk YASAK → packages/design-tokens. Inline style YASAK.
- Secret hiçbir dosyaya yazılmaz (.env.example placeholder hariç).
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
