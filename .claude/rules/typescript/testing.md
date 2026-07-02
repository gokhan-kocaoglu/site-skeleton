---
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "apps/admin/**/*.{ts,tsx}"
  - "packages/**/*.{ts,tsx}"
---
# TypeScript Test

> Bu dosya [common/testing.md](../common/testing.md)'yi TypeScript'e
> özgü içerikle genişletir.

## Araçlar

| Katman | Araç |
|--------|------|
| Birim / bileşen | Vitest + Testing Library |
| API mock | MSW (Mock Service Worker) |
| E2E | Playwright |

## Kurallar

- Bileşen testinde kullanıcı davranışını test et, implementasyonu değil
  (`getByRole` > `getByTestId` > CSS seçici)
- Ağ çağrılarını MSW ile mock'la; fetch'i elle stub'lama
- Snapshot testini yalnız kasıtlı ve küçük çıktılar için kullan

## E2E

Kritik kullanıcı akışları Playwright ile yazılır; desenler için
`.claude/skills/stack-patterns/references/e2e-testing.md`.

## Komutlar

- `pnpm test` — Vitest (Turborepo üzerinden tüm workspace'ler)
- `pnpm type-check` — testler dahil tip kontrolü
