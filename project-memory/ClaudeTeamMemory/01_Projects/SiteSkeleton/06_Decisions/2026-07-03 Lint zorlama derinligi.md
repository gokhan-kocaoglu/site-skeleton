# Karar: Lint Zorlama Derinliği

**Tarih:** 2026-07-03 · **Statü:** ACCEPTED · Kanonik kayıt: `docs/adr/ADR-0012-lint-enforcement-depth.md`

## Karar

Şimdi enforce edilen: web'de @next/eslint-plugin-next coreWebVitals + react-hooks + jsx-a11y; admin'de react-hooks + jsx-a11y + react-refresh (vite); iki app'te cross-app `no-restricted-imports` sınırı (paylaşım yalnız @skeleton/* workspace paketleriyle). Ertelenen: type-aware lint (ölçüm: ~2× lint süresi, tsc gate ile mükerrer iş; benimseme yolu ADR'de belgeli) ve import-boundary plugin'i (2 app'lik iskelette YAGNI).

## Gerekçe (özet)

SEO/a11y gate'lerinin objektif bölümleri ajan yorumuna bırakılmaz, lint seviyesinde enforce edilir (denetim #18, P1). Erteleme iptal değildir; karar noktası ilk gerçek proje başlangıcıdır.

## Kanıt

Commit `4d917ae` (0 ihlal, gate 7/7 — 862 check); resertifikasyon 27/27 (`4397816`).
