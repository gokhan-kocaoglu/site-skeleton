# Veritabanı Migration Desenleri (Flyway)

Bu repoda şema değişikliğinin TEK yolu Flyway'dir: Hibernate
`ddl-auto: validate` — otomatik DDL yok, elle üretim değişikliği yok.

## Dosya Kuralları

- Konum: `apps/api/src/main/resources/db/migration/`
- Ad: `V<n>__<kisa_aciklama>.sql` (örn. `V2__add_products_table.sql`);
  `<n>` ardışık artar, çakışma yasak
- Deploy edilmiş migration DEĞİŞTİRİLMEZ (checksum kırılır) — düzeltme
  yeni migration'la yapılır
- Üretimde ileri-yönlüdür: "rollback" = ters işlemi yapan YENİ migration
- Domain şablonları (`templates/db/`) canlı migration dizinine kopyalanıp
  `V<n>__` adıyla etkinleştirilir; sarkan FK'ları hedef tablolar var olunca

## Temel İlkeler

1. Her değişiklik bir migration — üretim DB'sine elle ALTER yasak
2. Şema ve veri migration'ı AYRI dosyalarda (DDL ile DML karışmaz)
3. Üretim boyutunda veriye karşı test et — 100 satırda çalışan, 10M satırda kilitleyebilir
4. Her migration idempotent düşünceyle yazılır; yıkıcı adım (DROP) plansız atılmaz

## Güvenlik Kontrol Listesi

- [ ] Büyük tabloda tam kilit yok (concurrent işlemler kullan)
- [ ] Yeni kolon nullable veya default'lu (default'suz NOT NULL ekleme)
- [ ] Veri backfill'i şema değişikliğinden ayrı migration
- [ ] Üretim kopyasında test edildi; geri dönüş planı yazıldı

## PostgreSQL Desenleri

**Güvenli kolon ekleme**:

```sql
-- DOĞRU: nullable, kilitsiz
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- DOĞRU: default'lu (PG 11+ anlık, rewrite yok)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- YANLIŞ: mevcut tabloda default'suz NOT NULL (tam rewrite + kilit)
-- ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

**Kesintisiz indeks** — `CONCURRENTLY` transaction içinde çalışmaz; Flyway
dosyasının başına `-- flyway:executeInTransaction=false` koy:

```sql
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

**Kolon yeniden adlandırma (expand-contract)** — üretimde doğrudan RENAME yok:

```sql
-- Migration 1: yeni kolonu ekle
ALTER TABLE users ADD COLUMN display_name TEXT;
-- Migration 2 (veri): backfill
UPDATE users SET display_name = username WHERE display_name IS NULL;
-- Uygulama: her iki kolona yaz/oku → deploy → yalnız yeniden oku
-- Migration 3: eski kolonu düşür
ALTER TABLE users DROP COLUMN username;
```

**Kolon silme**: önce koddaki tüm referansları kaldır + deploy, SONRA
`DROP COLUMN` migration'ı.

**Büyük veri migration'ı** — tek transaction'da tüm tabloyu güncelleme;
partiler halinde:

```sql
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users WHERE normalized_email IS NULL
      LIMIT batch_size FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

## Sıfır-Kesinti Stratejisi (expand-contract)

```
Faz 1 EXPAND:   yeni kolon/tablo ekle (nullable/default) →
                uygulama HEM eskiye HEM yeniye yazar → backfill
Faz 2 MIGRATE:  uygulama YENİden okur, ikisine yazar → tutarlılığı doğrula
Faz 3 CONTRACT: uygulama yalnız YENİyi kullanır → eskiyi ayrı migration'la düşür
```

## Doğrulama

- Lokal: `cd apps/api; mvn verify` — Testcontainers taze PostgreSQL 16'da
  tüm migration zincirini uygular; kırık migration burada yakalanır
- `flyway_schema_history` tablosunda checksum/success kontrol et

## Anti-Desenler

| Anti-Desen | Neden Kırılır | Doğrusu |
|------------|---------------|---------|
| Üretimde elle SQL | İz yok, tekrarlanamaz | Her zaman migration dosyası |
| Deploy edilmiş migration'ı düzenleme | Ortamlar arası drift + checksum hatası | Yeni migration |
| Default'suz NOT NULL | Tablo kilidi + tam rewrite | Nullable ekle → backfill → constraint |
| Büyük tabloda inline indeks | Yazmaları bloklar | `CREATE INDEX CONCURRENTLY` |
| Şema + veri tek migration'da | Uzun transaction, zor geri dönüş | Ayrı migration'lar |
| Kod dururken kolon silme | Uygulama hatası | Önce kodu kaldır, sonra düşür |
