-- Template: hierarchical categories (optional module). No dependencies.
-- Activate: copy to apps/api/src/main/resources/db/migration/V<n>__create_categories.sql
-- SQL is verbatim from the binding brief (§7) — keep all constraints.
-- Depth limit (3) is an ADR topic; the skeleton guards it with a CHECK.
-- Category tree is fetched in one query with a recursive CTE (admin + web).

CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT,  -- NULL = kök
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth <= 3),           -- ADR ile sınır
  deleted_at TIMESTAMPTZ,                                          -- soft delete
  UNIQUE (parent_id, slug)
);
