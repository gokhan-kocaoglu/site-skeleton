---
paths:
  - "apps/web/**/*.{ts,tsx,css}"
  - "apps/admin/**/*.{ts,tsx,css}"
  - "packages/**/*.{ts,tsx,css}"
---
# TypeScript Hook Davranışları

> Bu dosya [common/hooks.md](../common/hooks.md)'u TypeScript/frontend'e
> özgü içerikle genişletir.

## PostToolUse — post-edit-style-guard

`.tsx` / `.css` düzenlemelerinden sonra otomatik kontrol (yalnız uyarı,
engelleme yok):

- **Ham hex renk** → `packages/design-tokens/tokens.css` dışında yasak;
  token değişkeni kullan
- **Inline style** (`style={{...}}`) → yasak; Tailwind utility kullan
- **framer-motion importu** → yasak; `motion` paketi (`motion/react`) kullan
- **console.log** → üretim kodunda uyarı

## Kapanış Denetimi

Oturum kapanışından önce değiştirilen dosyalarda yukarıdaki ihlaller ve
`console.log` kalıntısı gözden geçirilir (`/finish-session`).

## Doğrulama Komutları

- Tip kontrolü: `pnpm type-check` (`tsc --noEmit`)
- Lint: `pnpm lint` (ESLint 9 flat config)
