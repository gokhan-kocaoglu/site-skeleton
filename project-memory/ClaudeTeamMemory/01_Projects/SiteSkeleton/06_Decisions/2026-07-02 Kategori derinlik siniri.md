# Karar: Kategori Derinlik Sınırı

**Tarih:** 2026-07-02  **Statü:** ACCEPTED  **Ajan:** system-architect (analiz), orkestratör (kayıt)

## Özet

Hiyerarşik kategori modeli adjacency list + denormalize `depth` sütunu ile uygulanır. Maksimum `depth` ordinali = 3 (kök 0 dahil 4 gezinme katmanı: `Elektronik(0) › Telefon(1) › Akıllı Telefon(2) › Katlanabilir(3)`). Sınır service-side türetme (birincil) + DB CHECK `depth <= 3` (backstop) ile iki katmanlı olarak korunur.

Gerekçe: UX (menü/breadcrumb/mobil navigasyon), SEO (URL segment derinliği, crawl budget), performans (recursive CTE worst-case öngörülebilirliği), admin basitliği.

## Repo Referansı (zorunlu)

Full karar ve alternatifleri: `docs/adr/ADR-0008-category-depth-limit.md`

Söz konusu shipping şablonu: `templates/db/categories.sql` (adjacency list + CHECK kuralı)

## Sonraki Adımlar

- Kategori modülü aktive edilirken backend'le soft delete (`deleted_at`) + `UNIQUE(parent_id, slug)` etkileşimi netleştirilmeli (parçası dökümasyonda "Sonraki Adım"a yazıldı).
- Derinlik sınırı değişimi → yeni ADR + yeni Flyway migration (yayınlanmış migration düzenlenmez).
