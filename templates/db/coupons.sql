-- Template: coupon system (activates on paid sites only).
-- DEPENDS ON: users(id) and orders(id) must exist BEFORE this migration.
-- Activate: copy to apps/api/src/main/resources/db/migration/V<n>__create_coupons.sql
-- Base SQL from the binding brief (§7), hardened per faz-8-1 brief §4.2.
-- Status model (ADR-0011): ACTIVE / PASSIVE / DISABLED.
--
-- Service-layer rules (backend, binding):
-- * Code generation: 8 chars, SecureRandom, no confusable chars (0/O, 1/I);
--   uniqueness guaranteed by the DB UNIQUE + retry. A code is NEVER generated
--   twice, active or passive (UNIQUE is global).
-- * Admin UI: percent picker 5..50 step 5; "Create" writes code + percent, listed ACTIVE.
-- * Admin lists ALL coupons (active + passive + disabled) with filters.
-- * Apply coupon + confirm payment + set status='PASSIVE' in ONE transaction;
--   racing the same coupon across two orders is prevented with SELECT ... FOR UPDATE.
-- * DISABLED = manual admin cancellation of a never-used coupon (audit trail kept).
--   Only ACTIVE -> DISABLED is allowed; PASSIVE is terminal (ADR-0011).

CREATE TABLE coupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code CHAR(8) NOT NULL UNIQUE,                 -- sistem üretir, karışan harfler yok (0/O,1/I)
  discount_percent SMALLINT NOT NULL
    CHECK (discount_percent BETWEEN 5 AND 50 AND discount_percent % 5 = 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','PASSIVE','DISABLED')),
  created_by BIGINT NOT NULL REFERENCES users(id),
  used_at TIMESTAMPTZ,
  used_by_order_id BIGINT REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Status/usage invariant (ADR-0011): usage fields are set if and only if the
  -- coupon was consumed by a paid order (PASSIVE). ACTIVE and DISABLED never
  -- carry usage data.
  CONSTRAINT chk_coupons_status_usage CHECK (
    (status = 'ACTIVE'   AND used_at IS NULL     AND used_by_order_id IS NULL) OR
    (status = 'PASSIVE'  AND used_at IS NOT NULL AND used_by_order_id IS NOT NULL) OR
    (status = 'DISABLED' AND used_at IS NULL     AND used_by_order_id IS NULL)
  )
);

-- One coupon per order, enforced at the DB even if the service rule is bypassed.
CREATE UNIQUE INDEX uq_coupons_used_by_order
  ON coupons (used_by_order_id)
  WHERE used_by_order_id IS NOT NULL;

-- FK lookups (admin "coupons by creator" listing); FKs are not auto-indexed.
CREATE INDEX idx_coupons_created_by ON coupons (created_by);
