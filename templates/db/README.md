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
public ID `UUID`, internal PK `BIGINT` identity. The SQL below is verbatim from
the binding brief (`docs/source-briefs/skeleton-brief.md` §7) — keep all CHECKs.
