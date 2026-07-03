# ADR-0011: Kupon Durum Modeli (ACTIVE / PASSIVE / DISABLED)

- Status: ACCEPTED
- Date: 2026-07-03
- Authors: system-architect (analiz), orkestratör (kayıt); onay: kullanıcı (Faz 8.1 Sprint 4)

## Context

`templates/db/coupons.sql` başlangıçta yalnız iki durum tanır
(`status IN ('ACTIVE','PASSIVE')`) ve kupon–durum ile kullanım kolonları
(`used_at`, `used_by_order_id`) arasındaki bağı DB düzeyinde garanti etmez;
"kullanılmadan iptal" (admin manuel devre dışı bırakma) senaryosu ise hiç
karşılanmaz (brief §4.2, Denetim #20). Kupon tek-kullanımlıktır ve ödeme
onayıyla AYNI transaction'da pasifleşir (brief §7). Bu değişmezin yalnız
service disiplinine bırakılması, ham SQL veya hatalı akış karşısında
sessiz tutarsızlık üretir. Bu ADR durum kümesini ve DB düzeyi invariant'ları
bağlayıcı kılar.

## Decision

Kupon `status` kümesini üç değere sabitliyoruz: **ACTIVE / PASSIVE / DISABLED**.
Her durum, kullanım kolonlarıyla tek bir CHECK içinde bağlanır:

- **ACTIVE** — kullanılabilir: `used_at IS NULL AND used_by_order_id IS NULL`.
- **PASSIVE** — ödeme onayında otomatik pasifleşti (terminal):
  `used_at IS NOT NULL AND used_by_order_id IS NOT NULL`.
- **DISABLED** — admin'in hiç kullanılmadan manuel iptali:
  `used_at IS NULL AND used_by_order_id IS NULL`.

DB invariant'ları (bağlayıcı):
- `CHECK` üç durumu da kapsar (her durum kendi kolon koşuluyla eşlenir).
- Sipariş başına tek kupon: `CREATE UNIQUE INDEX ... ON coupons(used_by_order_id)
  WHERE used_by_order_id IS NOT NULL;`

Service kuralları (backend, bağlayıcı — mevcut kural korunur):
- `apply coupon + confirm payment + set status='PASSIVE'` TEK transaction'da;
  aynı kuponun iki sipariş arasında yarışması `SELECT ... FOR UPDATE` ile önlenir.
- Durum geçişleri: `DISABLED`'a geçiş YALNIZ `ACTIVE`'den yapılır;
  `PASSIVE` terminaldir (geri dönüş yok). `ACTIVE → PASSIVE` yalnız ödeme
  onay akışında gerçekleşir.

## Consequences

- (+) Kupon–kullanım tutarsızlığı DB düzeyinde imkânsız (CHECK backstop).
- (+) Manuel iptal ile kullanılmış-pasif ayrımı `status` alanından okunur;
  admin listesi/filtre net (ACTIVE/PASSIVE/DISABLED).
- (+) Sipariş başına tek kupon partial unique ile DB'de garanti; yarış SFU ile.
- (−) `coupons.sql` CHECK'i genişler; aktivasyonda migration bu ADR'ye dayanır.
- (−) ACTIVE ile DISABLED aynı kolon koşulunu paylaşır → ayrım YALNIZ `status`
  değerinde; geçiş yönü kuralı service'te disiplinle korunmalı.

## Alternatives Considered

- **İki durum + kaydı silme (DELETE):** iptal edilen kupon için audit izi
  kaybolur, "kim ne zaman iptal etti" izlenemez. Reddedildi.
- **Ayrı `deleted_at` soft-delete kolonu:** `status` zaten yaşam döngüsünü
  taşırken ikinci ve örtüşen bir mekanizma; YAGNI + iki kaynaklı gerçek
  riski. Reddedildi.
