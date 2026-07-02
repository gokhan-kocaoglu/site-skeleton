-- Template: coupon system (activates on paid sites only).
-- DEPENDS ON: users(id) and orders(id) must exist BEFORE this migration.
-- Activate: copy to apps/api/src/main/resources/db/migration/V<n>__create_coupons.sql
-- SQL is verbatim from the binding brief (§7) — keep all constraints.
--
-- Service-layer rules (backend, binding):
-- * Code generation: 8 chars, SecureRandom, no confusable chars (0/O, 1/I);
--   uniqueness guaranteed by the DB UNIQUE + retry. A code is NEVER generated
--   twice, active or passive (UNIQUE is global).
-- * Admin UI: percent picker 5..50 step 5; "Create" writes code + percent, listed ACTIVE.
-- * Admin lists ALL coupons (active + passive) with filters.
-- * Apply coupon + confirm payment + set status='PASSIVE' in ONE transaction;
--   racing the same coupon across two orders is prevented with SELECT ... FOR UPDATE.

CREATE TABLE coupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code CHAR(8) NOT NULL UNIQUE,                 -- sistem üretir, karışan harfler yok (0/O,1/I)
  discount_percent SMALLINT NOT NULL
    CHECK (discount_percent BETWEEN 5 AND 50 AND discount_percent % 5 = 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PASSIVE')),
  created_by BIGINT NOT NULL REFERENCES users(id),
  used_at TIMESTAMPTZ,
  used_by_order_id BIGINT REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
