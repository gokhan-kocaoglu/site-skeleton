# Karar: Kupon Durum Modeli (ACTIVE / PASSIVE / DISABLED)

**Tarih:** 2026-07-03 · **Statü:** ACCEPTED · Kanonik kayıt: `docs/adr/ADR-0011-coupon-status-model.md`

## Karar

Kupon `status` kümesi üç değer: **ACTIVE / PASSIVE / DISABLED**; her durum kullanım kolonlarına tek CHECK ile bağlıdır (`chk_coupons_status_usage`):
- ACTIVE — kullanılabilir; `used_at IS NULL AND used_by_order_id IS NULL`.
- PASSIVE — ödeme onayında otomatik pasifleşti (terminal); iki kolon da NOT NULL.
- DISABLED — admin'in hiç kullanılmamış kuponu manuel iptali; iki kolon da NULL (audit izi korunur).

Sipariş başına tek kupon: `uq_coupons_used_by_order` partial unique (`WHERE used_by_order_id IS NOT NULL`). Geçişler: DISABLED'a yalnız ACTIVE'den; PASSIVE terminal. Apply + payment confirm + PASSIVE tek transaction'da, `SELECT ... FOR UPDATE` ile.

## Gerekçe (özet)

DELETE yerine DISABLED → audit izi korunur; ayrı soft-delete kolonu status varken YAGNI.

## Uygulama Yeri

Şablon: `templates/db/coupons.sql` (aktivasyonda `V<n>__create_coupons.sql` olarak kopyalanır). İskelette migration/entity YOKTUR — kupon modülü opsiyonel aktivasyondur.

## Kanıt

Commit `4abd5a4`; baseline security review PASS (`docs/audits/2026-07-03-baseline-security-review.md`).
