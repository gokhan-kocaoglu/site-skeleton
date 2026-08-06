# apps/admin

Vite 8 + React 19 admin SPA'sı. `pnpm --filter admin build` statik `dist/`
üretir.

## Güvenlik header'ları

Admin production güvenlik header'ları bu repository runtime'ı tarafından
uygulanmaz. `vite build` yalnız statik dosya üretir; statik çıktı kendi HTTP
yanıt header'ını yazamaz.

Uygulama noktası, admin'i yayınlayan statik host / CDN / reverse proxy
konfigürasyonudur; bu konfigürasyon üretilen projenin kendi deposundadır.

Canonical sözleşme `docs/operations/deployment.md` içindedir
(`admin-security-contract` bounded bloğu). Değerler için oraya bakılmalıdır.

`vite.config.ts` içine dev/preview header eklemek bu sözleşmeyi karşılamaz —
dev sunucusu `dist/` çıktısına tek byte yazmaz. Karar kaydı:
`docs/adr/ADR-0019-web-security-headers.md`.
