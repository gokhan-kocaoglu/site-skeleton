---
paths:
  - "**/*"
---
# Test Gereksinimleri

## Minimum Kapsam: %80

Üç test tipi de gereklidir:
1. **Birim** — fonksiyonlar, util'ler, bileşenler
2. **Entegrasyon** — API endpoint'leri, veritabanı işlemleri
3. **E2E** — kritik kullanıcı akışları (Playwright)

Bu repodaki araçlar: frontend Vitest + Testing Library + MSW;
backend JUnit 5 + Mockito + Testcontainers (`postgres:16`).

## TDD (zorunlu akış)

1. Önce testi yaz (RED) — çalıştır, BAŞARISIZ olmalı
2. Geçirecek minimum kodu yaz (GREEN)
3. Refactor et (IMPROVE)
4. Kapsamı doğrula (≥ %80)

## Test Yapısı (AAA)

```typescript
test('sorguyla eşleşen ürün yoksa boş dizi döner', () => {
  // Arrange
  const query = 'xyz-yok'
  // Act
  const result = searchProducts(query)
  // Assert
  expect(result).toEqual([])
})
```

## Test İsimlendirme

Davranışı anlatan açıklayıcı isim kullan:
- `throws error when API key is missing`
- `falls back to cache when network is unavailable`

## Başarısız Test Giderme

1. Test izolasyonunu kontrol et (paylaşılan state, sıra bağımlılığı)
2. Mock'ların doğruluğunu doğrula
3. **Testi değil implementasyonu düzelt** (test yanlış değilse)
4. Kanıtsız PASS raporu yasak — komut çıktısını rapora ekle

## Komutlar

- Frontend: `pnpm test` (Turborepo üzerinden Vitest)
- Backend: `cd apps/api; mvn verify` (Docker yoksa `mvn verify -Pit-local`)

Stack'e özgü desenler: `.claude/skills/stack-patterns/references/`
(springboot-tdd, e2e-testing).
