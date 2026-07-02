-- V1__baseline.sql — skeleton baseline.
-- Conventions (binding, see CLAUDE.md): money NUMERIC(12,2), dates TIMESTAMPTZ (UTC),
-- public ID = UUID, internal PK = BIGINT identity. Never edit a published migration.

CREATE TABLE app_meta (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meta_key TEXT NOT NULL UNIQUE,
  meta_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_meta (meta_key, meta_value) VALUES ('schema.baseline', 'v1');
