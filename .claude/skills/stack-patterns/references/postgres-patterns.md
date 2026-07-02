# PostgreSQL Desenleri

Sorgu optimizasyonu, şema tasarımı, indeksleme ve kilitleme için hızlı
referans. Zemin: PostgreSQL 16; şema değişikliği yalnız Flyway.

## İndeks Seçim Tablosu

| Sorgu Deseni | İndeks Tipi | Örnek |
|--------------|-------------|-------|
| `WHERE col = value` | B-tree (varsayılan) | `CREATE INDEX idx ON t (col)` |
| `WHERE col > value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Kompozit | `CREATE INDEX idx ON t (a, b)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| Tam metin arama | GIN | `CREATE INDEX idx ON t USING gin (tsv)` |
| Zaman-serisi aralıkları | BRIN | `CREATE INDEX idx ON t USING brin (col)` |

## Veri Tipi Tablosu (bu iskeletin kuralları)

| Kullanım | Doğru Tip | Kaçın |
|----------|-----------|-------|
| Internal PK | `bigint identity` | `int`, rastgele UUID PK |
| Public ID | `uuid` (unique kolon) | PK olarak uuid |
| Metin | `text` | `varchar(255)` refleksi |
| Zaman | `timestamptz` (UTC) | `timestamp` |
| Para | `numeric(12,2)` | `float`, `money` |
| Bayrak | `boolean` | `varchar`, `int` |

## Yaygın Desenler

**Kompozit indeks sırası** — önce eşitlik, sonra aralık kolonları:

```sql
CREATE INDEX idx ON orders (status, created_at);
-- Şunun için çalışır: WHERE status = 'pending' AND created_at > '2026-01-01'
```

**Kapsayan indeks**:

```sql
CREATE INDEX idx ON users (email) INCLUDE (name, created_at);
```

**Kısmi indeks**:

```sql
CREATE INDEX idx ON users (email) WHERE deleted_at IS NULL;
```

**UPSERT**:

```sql
INSERT INTO settings (user_id, key, value)
VALUES (123, 'theme', 'dark')
ON CONFLICT (user_id, key)
DO UPDATE SET value = EXCLUDED.value;
```

**Cursor sayfalama** (OFFSET O(n), bu O(1)):

```sql
SELECT * FROM products WHERE id > $last_id ORDER BY id LIMIT 20;
```

**Yarış-durumsuz tek-kullanım tüketimi** — kupon kullanımının deseni
(şablon: `templates/db/coupons.sql`):

```sql
BEGIN;
SELECT * FROM coupons
 WHERE code = $1 AND is_active = true
 FOR UPDATE;          -- eşzamanlı ikinci kullanım burada bloklanır
UPDATE coupons SET is_active = false, used_at = now() WHERE code = $1;
COMMIT;
```

**Kuyruk işleme**:

```sql
UPDATE jobs SET status = 'processing'
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

## Anti-Desen Tespiti

```sql
-- İndekssiz foreign key'leri bul
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Yavaş sorgular (pg_stat_statements uzantısı gerekir)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Tablo şişmesi
SELECT relname, n_dead_tup, last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

## Sunucu Ayar Şablonu

```sql
ALTER SYSTEM SET idle_in_transaction_session_timeout = '30s';
ALTER SYSTEM SET statement_timeout = '30s';
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
REVOKE ALL ON SCHEMA public FROM public;
SELECT pg_reload_conf();
```

## İlişkili

- Entity/ORM tarafı: `jpa-patterns.md`
- Migration güvenliği: `database-migrations.md`
- Domain SQL şablonları (hiyerarşik kategori, kupon): `templates/db/`
