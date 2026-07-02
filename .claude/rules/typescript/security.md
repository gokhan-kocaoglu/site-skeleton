---
paths:
  - "apps/web/**/*.{ts,tsx}"
  - "apps/admin/**/*.{ts,tsx}"
  - "packages/**/*.{ts,tsx}"
---
# TypeScript Güvenlik

> Bu dosya [common/security.md](../common/security.md)'yi TypeScript'e
> özgü içerikle genişletir.

## Secret Yönetimi

```typescript
// ASLA: hardcoded secret
const apiKey = 'PLACEHOLDER-NEVER-REAL'

// HER ZAMAN: ortam değişkeni + başlangıç kontrolü
const apiKey = process.env.API_KEY
if (!apiKey) {
  throw new Error('API_KEY not configured')
}
```

- İstemciye sızan değişkenlere dikkat: Next.js'te yalnız `NEXT_PUBLIC_*`
  öneki tarayıcıya gider; secret'a bu önek ASLA verilmez.

## Token Kuralları (değişmez)

- Access/refresh token `localStorage`/`sessionStorage`'a YAZILMAZ
- Refresh token HttpOnly + Secure + SameSite çerezde taşınır
  (admin için köprü: `templates/admin-bff`)
- Access token yalnız bellekte tutulur; yenileme çerez üzerinden yapılır

## XSS

- `dangerouslySetInnerHTML` son çaredir; kullanılacaksa girdi whitelist
  tabanlı sanitize edilir
- Kullanıcı girdisini URL, attribute veya HTML bağlamına ham koyma

## Derin İnceleme

Auth/ödeme/kullanıcı verisine dokunan her değişiklikte **code-reviewer**
ajanı zorunludur — bkz. [common/code-review.md](../common/code-review.md).
