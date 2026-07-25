# ADR-0014: Next.js 16 / Vitest 4 Geçişi (web)

- Status: ACCEPTED
- Date: 2026-07-25 (Faz 8.3 PR-A3; brief P0-1 / 1.3)

## Context

apps/web Next 15.5.21'deydi; Next 15 OSS EOL'ü 2026-10-21 (ADR-0009 kural 3)
ve üçüncü denetim HIGH-1 baseline'ın desteklenen hatta çekilmesini bağlayıcı
kıldı. Web ayrıca Vitest 3'te kalmıştı; admin PR-A2'de 4'e geçtiğinden
workspace iki Vitest majoru barındırıyor, bu da jest-dom için geçici bir
packageExtensions köprüsü gerektiriyordu (ADR-0013).

## Decision

**Next 16.2.11 + Vitest 4.1.10.** Birlikte: react/react-dom 19.2.8,
@next/eslint-plugin-next 16.2.11, @vitest/coverage-v8 4.1.10 (exact),
@vitejs/plugin-react 6.0.4; TypeScript ~5.8.3 KORUNDU (TS 7 kapsam dışı).
Migration **manuel ve deterministik**; `@next/codemod` çalıştırılmadı — kod
yüzeyi Next 16 kırılımlarına değmiyordu (dynamic params, generateSitemaps,
middleware, next/image yok). Gerçek hata kanıtlayan iki config düzeltmesi:
`next.config.ts`'ten kaldırılan `eslint.ignoreDuringBuilds` silindi;
`eslint.config.mjs` plugin 16'da kalkan `flatConfig` yerine
`configs["core-web-vitals"]` kullanır.

## Köprü ve override yaşam döngüsü (kapanış)

- **jest-dom packageExtensions köprüsü KALDIRILDI** — ADR-0013'teki kaldırma
  kriteri karşılandı (iki app tek Vitest 4 majorunda). Kanıt: lockfile'da tek
  jest-dom bağlamı, `packageExtensionsChecksum` yok, `vitest@3.2.6` yok.
- **Override'lar körlemesine taşınmadı:** Next 16.2.11 hâlâ `postcss 8.4.31`
  (exact) + `sharp ^0.34.5` istediğinden parent-scoped override'lar aynı exact
  değerlerle yeniden ölçeklendi (`next@16.2.11>postcss 8.5.18`,
  `next@16.2.11>sharp 0.35.0`); `next@15.5.21>*` girdileri silindi.

## Generated tip dosyası politikası (canonical kaynak)

`apps/web/next-env.d.ts` **generated ve untracked**'tır: Next 16 dosyayı her
`next typegen` / `next dev` / `next build` koşusunda üretir; izlemek her build
sonrası sahte diff üretir. `.gitignore` exact-path kuralıyla yok sayılır ve
`structure-manifest` `trackedForbidden` girdisi yeniden commit'i gate'te
engeller (negatif kanıt: `git add -f` → verify-structure FAIL). Dosya
`tsconfig.json` include ve ESLint ignore listelerinde KALIR — yerelde
üretildiğinde tipler çözülsün, lint kapsamına girmesin. Standalone type-check
generated tipleri kendisi üretir: `type-check` = `next typegen && tsc
--noEmit` (temiz checkout'ta build koşulmadan çalışır).

## Doğrulama, Dependabot ve rollback

Commit'ler: **`becd6ad`** (C1 toolchain) · **`3fc08b6`** (C1b untracking) ·
**`e72dffa`** (C1c typegen). Kanıt: web build 9/9 statik (Turbopack) +
type-check + lint + 20/20 test (statements %84.61, eşik %60); admin
type-check + 2/2 test; `pnpm gate` 7/7 PASS; `audit --prod` 0 bulgu;
`install --frozen-lockfile` temiz; harness 162 assertion. **Temiz worktree**:
dosya yokken standalone type-check tipleri üretti, dosya untracked+ignored
kaldı, gate 7/7 PASS.

Geçiş Dependabot'la GELMEDİ; bot major'lara kapalıdır (ADR-0009 kural 4) ve
yalnız minor/patch taşır — hat içi güncellik (16.x) böyle korunur; açık bot
PR'ları migration sırasında bekletilir, sonra tazelenir.

Rollback: üç commit sırayla revert (`e72dffa`→`3fc08b6`→`becd6ad`); lockfile
Next 15.5.21'e, köprü ve eski override'lar geri gelir. Eşik: yeşile
çekilemeyen gate FAIL; Next 15 EOL'ü nedeniyle yalnız geçici önlemdir.
