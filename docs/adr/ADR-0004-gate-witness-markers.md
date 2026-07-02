# ADR-0004: Gate Başına Açık Geçme Kriterleri ve Witness Marker'lar

- Status: PROPOSED
- Date: 2026-07-02
- Authors: system-architect (kaynak: refs/ruflo incelemesi — yalnız desen; kurulum/kopya yok)

## Context

İskeletin gate zinciri kanıt ister ("kanıtsız PASS yasak") ama geçme kriterleri
kısmen sözeldir. ruflo iki tamamlayıcı desen kullanır
(`refs/ruflo/v3/docs/adr/ADR-102…`, `ADR-103-witness-temporal-history.md`):

1. **Sayısal gate kriterleri**: her gate'in makine-denetimli eşiği vardır
   (ör. promotion gate: `quality > 2% AND cost < 1% AND latency < 5%`, `--strict`
   sağlanmazsa exit 1).
2. **Witness marker**: yayınlanmış her düzeltme `{ id, desc, file, marker }` olarak
   kaydedilir; `marker` kodda bulunması zorunlu bir alt-dizgidir. CI'da
   `witness-verify` işi marker kaybolduğunda kırılır — ADR-102'nin gerekçesi,
   hiçbir testin "kullanıcının gördüğü çağrı yolunu" denetlemediği gerçek
   regresyonlardır.

Bizim `scripts/verify-structure.mjs` zaten witness-benzeri çalışır (zorunlu path,
yasak desen, satır bütçesi) ama düzeltme-bazlı marker kavramı yoktur.

## Decision

1. **Gate kriterlerini yaz**: `qa-quality-gate` skill'ine gate başına açık tablo —
   typecheck/lint/test: exit 0; audit: high+critical = 0 (moderate → WARN);
   kapsam ≥ %80. (Bu kriterler `scripts/quality/*.mjs`'te bugün zaten kodludur;
   skill dokümanı onları sözleşme olarak sabitler.)
2. **Witness marker'ları manifest'e ekle**: kritik düzeltmeler (ör. Testcontainers
   `1.21.4` pini) `structure-manifest.json`'a "bu dosyada bu alt-dizgi bulunmalı"
   kaydı olarak girer; `verify-structure.mjs`'e `requiredMarkers` denetimi eklenir.
   İmzalı manifest/temporal history (Ed25519, JSONL) alınmaz — git geçmişi yeter.

## Consequences

- (+) "Sessiz geri alma" regresyonları (yanlış merge, üzerine yazma) otomatik yakalanır.
- (−) Marker'lar refactor'da güncellenmelidir; bakım maliyeti düşük ama sıfır değil.
- Takip: `requiredMarkers` implementasyonu + ilk marker seti (pom pini, ddl-auto validate).

## Alternatives Considered

- **ruflo'nun imzalı witness altyapısı (SHA-256 + Ed25519 + JSONL history)**:
  Reddedildi — tek-repo iskelette git commit geçmişi aynı izlenebilirliği verir.
- **Yalnız CI testlerine güvenmek**: Reddedildi — ADR-102'nin gösterdiği sınıf
  (çağrı-yolu regresyonları) birim testlerden kaçar; marker ucuz bir ikinci hattır.
