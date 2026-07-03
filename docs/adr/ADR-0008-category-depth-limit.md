# ADR-0008: Kategori Derinlik Sınırı = 3

- Status: ACCEPTED
- Date: 2026-07-02
- Authors: system-architect (analiz), orkestratör (kayıt); onay: kullanıcı (Faz 8 doğrulama turu)

## Context

Brief §7, hiyerarşik kategoriler için adjacency list + denormalize `depth`
kolonunu bağlayıcı kılar ve "Derinlik sınırı (önerim 3) bir ADR konusudur;
iskelette CHECK ile korunur" der. Shipping şablon `templates/db/categories.sql`
bunu `depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth <= 3)` ve
`parent_id ... ON DELETE RESTRICT` (NULL = kök) ile kodlar; ağaç, admin ve
web'de recursive CTE ile tek sorguda çekilir. CLAUDE.md yalnız "kategoriler
hiyerarşiktir (parent_id, opsiyonel)" der; kesin sınır değeri bu ADR'ye
bırakılmıştır. Brief "3"ün katman sayısı mı yoksa `depth` ordinal değeri mi
olduğunu açıkça tanımlamaz; tek ölçülebilir kanıt shipping CHECK'tir.

**Semantik netleştirme (kararın parçası):** "Derinlik sınırı = 3" =
maksimum `depth` değeri 3. Kök `depth = 0` olduğundan izin verilen küme
`{0, 1, 2, 3}` = kök dahil **4 gezinme katmanı** (örn. `Elektronik(0) ›
Telefon(1) › Akıllı Telefon(2) › Katlanabilir(3)`). Bu yorum shipping
CHECK'i değiştirmeden korur; alternatif yorum (kök dahil 3 katman →
`CHECK (depth <= 2)`) şablonun brief'e "birebir" bağlılığını bozacağı ve
gereksiz migration/supersede yükü doğuracağı için reddedildi.

## Decision

Kategori hiyerarşisini adjacency list + denormalize `depth` kolonuyla
modelleyeceğiz ve derinliği maksimum `depth` değeri 3 ile sınırlayacağız,
çünkü sığ ağaç UX (menü/breadcrumb/mobil navigasyon), SEO (URL segment
derinliği, crawl budget), performans (recursive CTE'nin öngörülebilir
worst-case maliyeti) ve admin basitliği için yeterli ve konservatif bir
varsayılandır. Sınır iki katmanlı savunmayla uygulanır:

1. **Service (JPA) katmanı — birincil:** `depth` asla client'tan alınmaz;
   `parent == null ? 0 : parent.depth + 1` olarak türetilir, `> 3` erken ve
   net hata döndürür (`MAX_CATEGORY_DEPTH = 3` isimli sabit). Reparent'ta
   taşınan alt ağacın derinlikleri transaction içinde yeniden hesaplanır ve
   `yeniParentDepth + altAğaçYüksekliği <= 3` doğrulanır.
2. **DB CHECK `depth <= 3` — değişmez backstop:** service bypass edilse bile
   değer aralığını garanti eder.

DB CHECK tek başına yetmez: CHECK başka satıra referans veremediği için
`depth = parent.depth + 1` semantik değişmezini doğrulayamaz. `BEFORE
INSERT/UPDATE` trigger'ı, JPA tek yazar olduğu sürece YAGNI gereği
eklenmez; çok-yazarlı (ham SQL) senaryo doğarsa borç olarak eklenir.
Kategori DTO'sunda `depth` read-only'dir (openapi.yaml'a öyle işlenir).
Sınırı değiştirmek yeni ADR + yeni Flyway migration gerektirir; yayınlanmış
migration düzenlenmez.

## Consequences

Pozitif:
- JPA'da doğal `@ManyToOne` self-reference; ekstra tablo yok (KISS).
- Sınırlı özyineleme → `parent_id` index'iyle ucuz, öngörülebilir tek-sorgu
  ağaç çekimi (recursive CTE).
- Sığ menü/kısa URL → öngörülebilir UX ve sağlıklı crawl.
- CHECK ucuz, her zaman açık invariant; `ON DELETE RESTRICT` yanlışlıkla
  silmeyi DB'de durdurur.

Negatif (üstlenilen borç):
- Denormalize `depth` drift riski (trigger yok) — service tek-yazar
  disipliniyle azaltılır.
- Sınır değişimi maliyetli: yeni ADR + constraint drop/recreate migration.
- Reparent, alt-ağaç depth yeniden hesabı + yükseklik doğrulaması ile
  service'e ek mantık yükler.
- Sihirli sayı 3, CHECK ile app sabiti (`MAX_CATEGORY_DEPTH`) arasında
  senkron tutulmalı.
- Off-by-one yorum riski bu ADR'de sabitlendi: başlıktaki "3" katman sayısı
  değil, maksimum `depth` ordinalidir.
- Kapsam dışı ilişkili mikro-karar: soft delete (`deleted_at`) +
  `UNIQUE(parent_id, slug)` + `ON DELETE RESTRICT` etkileşimi (partial
  unique `WHERE deleted_at IS NULL` adayı) — kategori modülü aktive
  edilirken backend ile netleştirilmeli.

## Cycle Önleme

Adjacency list, `depth` sınırından bağımsız olarak döngü (bir düğümün kendi
alt ağacına parent olması) riskini taşır. Bunu birincil olarak **service
katmanında** önlüyoruz: bir reparent (taşıma) işleminde, hedef yeni parent'ın
taşınan düğümün alt ağacında (descendant) BULUNMADIĞI, AYNI transaction içinde
ancestor-yürüyüşüyle doğrulanır (yeni parent'tan köke çıkılır; yol üzerinde
taşınan düğüm görülürse işlem reddedilir). Bu kontrol, depth yeniden hesabı ve
`yeniParentDepth + altAğaçYüksekliği <= 3` doğrulamasıyla aynı transaction'da
yapılır (ADR-0008 Decision §1).

JPA tek yazar olduğu sürece DB tarafı koruma YAGNI gereği eklenmez; çok-yazarlı
(ham SQL) senaryo için örnek koruma trigger'ı `templates/db/README.md`'de
opsiyonel olarak gösterilir (etkinleştirme kararı ilgili projeye aittir).
`templates/db/categories.sql` başlık yorumu bu service kuralına işaret eder.

## Alternatives Considered

- **Sınırsız derinlik (saf adjacency list, CHECK yok):** öngörülemez
  UX/SEO/CTE maliyeti; çoğu site 2–3 seviye kullanır → YAGNI. Reddedildi.
- **Daha derin sınır (5+):** derin menü mobil UX'i ve crawl'ı bozar; ihtiyaç
  duyan proje yeni ADR + migration ile yükseltir. Erken genelleme. Reddedildi.
- **Closure table:** ekstra tablo + write amplification; depth-3 ağaç için
  aşırı mühendislik, PG16'da CTE okuması zaten ucuz. Reddedildi.
- **Materialized path / ltree:** extension bağımlılığı + taşımada path
  bakımı; depth 3'te gereksiz hareketli parça. Reddedildi.
- **Nested sets:** okuma-optimize ama her insert/move'da yeniden numaralama;
  sık taşımalı admin CRUD'una kötü uyum. Reddedildi.
