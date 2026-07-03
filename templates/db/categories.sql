-- Template: hierarchical categories (optional module). No dependencies.
-- Activate: copy to apps/api/src/main/resources/db/migration/V<n>__create_categories.sql
-- Base SQL from the binding brief (§7), hardened per faz-8-1 brief §4.1 + ADR-0008.
-- Depth limit (max depth ordinal = 3, root = 0) is decided in ADR-0008.
-- Category tree is fetched in one query with a recursive CTE (admin + web).
--
-- Cycle prevention (service rule, binding — ADR-0008 "Cycle Önleme"):
-- * On reparent, verify inside the transaction that the new parent is NOT a
--   descendant of the moved node (ancestor walk from new parent to root).
-- * The DB cannot express this in a CHECK; an optional guard trigger for
--   multi-writer scenarios is shown in templates/db/README.md.

CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT,  -- NULL = kök
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 3), -- ADR-0008
  deleted_at TIMESTAMPTZ                                           -- soft delete
);

-- Soft-delete-aware uniqueness: a deleted category frees its slug for reuse;
-- NULLS NOT DISTINCT makes root slugs (parent_id IS NULL) unique too (PG15+).
CREATE UNIQUE INDEX uq_categories_parent_slug_live
  ON categories (parent_id, slug) NULLS NOT DISTINCT
  WHERE deleted_at IS NULL;

-- Recursive CTE tree reads and FK lookups walk parent_id constantly.
CREATE INDEX idx_categories_parent_id ON categories (parent_id);
