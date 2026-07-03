# DB Templates (copy-to-activate)

Optional domain modules as Flyway-ready SQL. They live here — **not** in
`apps/api/src/main/resources/db/migration/` — because they are optional and
`coupons.sql` has FKs to `users(id)` / `orders(id)`, which do not exist in the
bare skeleton; placing them in the live migration dir would break `mvn verify`.

## Activation

1. Make sure the tables the template depends on exist (see each file's header).
2. Copy the file into `apps/api/src/main/resources/db/migration/` and rename it
   to the next free version: `V<n>__<desc>.sql` (e.g. `V2__create_categories.sql`).
3. Run `mvn verify` — Flyway applies it; never edit a published migration.

| File | Module | Depends on |
|------|--------|------------|
| `categories.sql` | Hierarchical categories (optional) | — |
| `coupons.sql` | Coupon system (paid sites only) | `users`, `orders` |

Binding conventions (CLAUDE.md): money `NUMERIC(12,2)`, dates `TIMESTAMPTZ` (UTC),
public ID `UUID`, internal PK `BIGINT` identity. Base SQL comes from the binding
brief (`docs/source-briefs/skeleton-brief.md` §7), hardened in Faz 8.1 Sprint 4
(`docs/source-briefs/faz-8-1-remediation-brief.md` §4.1–4.2) — keep all CHECKs.

## PostgreSQL version note (PG15+)

`categories.sql` uses `NULLS NOT DISTINCT` on the partial unique index so that
root categories (`parent_id IS NULL`) also get slug uniqueness. This syntax
requires **PostgreSQL 15+** (skeleton baseline is PostgreSQL 16). On older PG,
replace it with two partial indexes (one `WHERE parent_id IS NULL`, one
`WHERE parent_id IS NOT NULL`).

## Category cycle prevention

Primary defense is the **service rule** (ADR-0008 "Cycle Önleme"): on reparent,
verify inside the transaction that the new parent is not a descendant of the
moved node. If a multi-writer scenario ever appears (raw SQL jobs, second app),
add this optional guard trigger as a new migration:

```sql
CREATE OR REPLACE FUNCTION categories_prevent_cycle() RETURNS trigger AS $$
DECLARE cur BIGINT := NEW.parent_id;
BEGIN
  WHILE cur IS NOT NULL LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'category cycle detected: % would become its own ancestor', NEW.id;
    END IF;
    SELECT parent_id INTO cur FROM categories WHERE id = cur;
  END LOOP;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_categories_prevent_cycle
  BEFORE INSERT OR UPDATE OF parent_id ON categories
  FOR EACH ROW EXECUTE FUNCTION categories_prevent_cycle();
```
