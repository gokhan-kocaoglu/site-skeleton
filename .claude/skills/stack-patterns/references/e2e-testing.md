# E2E Test Desenleri (Playwright)

Kritik kullanıcı akışları için stabil, hızlı, bakımı kolay E2E süitleri.

## Dosya Organizasyonu

```
tests/
├── e2e/
│   ├── auth/          # login.spec.ts, register.spec.ts
│   └── features/      # browse.spec.ts, search.spec.ts
├── fixtures/          # auth.ts, data.ts
└── playwright.config.ts
```

## Page Object Model

```typescript
import { Page, Locator } from '@playwright/test'

export class ProductsPage {
  readonly page: Page
  readonly searchInput: Locator
  readonly productCards: Locator

  constructor(page: Page) {
    this.page = page
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.productCards = page.locator('[data-testid="product-card"]')
  }

  async goto() {
    await this.page.goto('/products')
    await this.page.waitForLoadState('networkidle')
  }

  async search(query: string) {
    await this.searchInput.fill(query)
    await this.page.waitForResponse((r) => r.url().includes('/api/products'))
  }
}
```

## Test Yapısı

```typescript
import { test, expect } from '@playwright/test'
import { ProductsPage } from '../../pages/ProductsPage'

test.describe('Ürün Arama', () => {
  let productsPage: ProductsPage

  test.beforeEach(async ({ page }) => {
    productsPage = new ProductsPage(page)
    await productsPage.goto()
  })

  test('anahtar kelimeyle arar', async () => {
    await productsPage.search('test')
    await expect(productsPage.productCards.first()).toContainText(/test/i)
  })

  test('sonuç yoksa boş durumu gösterir', async ({ page }) => {
    await productsPage.search('xyzyok123')
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible()
  })
})
```

## Konfigürasyon

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'pnpm --filter web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## Flaky Test Stratejisi

Tespit: `npx playwright test x.spec.ts --repeat-each=10`

Karantina: `test.fixme(true, 'Flaky - Issue #123')` — silme, izle.

Sık nedenler ve çözümleri:

```typescript
// Yarış durumu — locator otomatik bekler, page.click('...') kullanma
await page.locator('[data-testid="button"]').click()

// Ağ zamanlaması — keyfi timeout YASAK
// YANLIŞ: await page.waitForTimeout(5000)
await page.waitForResponse((r) => r.url().includes('/api/data'))

// Animasyon — görünürlüğü bekle, sonra tıkla
await page.locator('[data-testid="menu-item"]').waitFor({ state: 'visible' })
await page.locator('[data-testid="menu-item"]').click()
```

## Artefaktlar ve Rapor

- Ekran görüntüsü/trace/video config'te failure'a bağlı; ekstra kanıt için
  `page.screenshot({ path: 'artifacts/...' })`
- E2E raporu `docs/test-reports/` altına şu şablonla yazılır:

```markdown
# E2E Test Raporu
**Tarih:** YYYY-MM-DD  **Durum:** PASSING/FAILING
## Özet
- Toplam: X | Geçen: Y | Kalan: A | Flaky: B
## Kalan Testler
### <test-adı>
**Dosya:** tests/e2e/feature.spec.ts:45
**Hata:** ...  **Önerilen düzeltme:** ...
```

## Kurallar

- Seçici önceliği: `data-testid` > role > CSS; XPath yasak
- Testler birbirinden bağımsız; sıra varsayımı yok
- Üretim ortamına karşı yıkıcı akış (ödeme vb.) çalıştırılmaz:
  `test.skip(process.env.NODE_ENV === 'production', ...)`
