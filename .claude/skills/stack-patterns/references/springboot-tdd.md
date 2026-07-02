# Spring Boot TDD ve Doğrulama Döngüsü

Yeni özellik, bug fix ve refactor'da kullan. Hedef: %80+ kapsam
(birim + entegrasyon). Zemin: JUnit 5, Mockito, MockMvc, Testcontainers.

## Akış

1) Önce test yaz (FAIL etmeli) → 2) Geçirecek minimum kod → 3) Testler
yeşilken refactor → 4) Kapsamı JaCoCo ile doğrula.

## Birim Testi (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class ProductServiceTest {
  @Mock ProductRepository repo;
  @InjectMocks ProductService service;

  @Test
  void createsProduct() {
    CreateProductRequest req = new CreateProductRequest("Ürün", new BigDecimal("49.90"), List.of("genel"));
    when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Product result = service.create(req);

    assertThat(result.name()).isEqualTo("Ürün");
    verify(repo).save(any());
  }
}
```

Desenler: Arrange-Act-Assert; kısmi mock yerine açık stub;
varyantlar için `@ParameterizedTest`; AssertJ (`assertThat`) tercih;
istisna için `assertThatThrownBy`.

## Web Katmanı (MockMvc)

```java
@WebMvcTest(ProductController.class)
class ProductControllerTest {
  @Autowired MockMvc mockMvc;
  @MockBean ProductService productService;

  @Test
  void returnsProducts() throws Exception {
    when(productService.list(any())).thenReturn(Page.empty());
    mockMvc.perform(get("/api/products"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.content").isArray());
  }

  @Test
  void rejectsInvalidBody() throws Exception {
    mockMvc.perform(post("/api/products")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"\"}"))
        .andExpect(status().isBadRequest());
  }
}
```

## Entegrasyon Testi (Testcontainers)

Gerçek PostgreSQL 16'ya karşı test et — H2 değil:

```java
@SpringBootTest
@AutoConfigureMockMvc
class ProductIntegrationIT extends AbstractIntegrationTest {
  // AbstractIntegrationTest: @ServiceConnection'lı postgres:16 container'ı;
  // it-local profili aktifse lokal skeleton_it DB'sine düşer (Docker'sız yol)
  @Autowired MockMvc mockMvc;

  @Test
  void createsProduct() throws Exception {
    mockMvc.perform(post("/api/products")
        .contentType(MediaType.APPLICATION_JSON)
        .content("""
          {"name":"Test","price":49.90,"categorySlugs":["genel"]}
        """))
      .andExpect(status().isCreated());
  }
}
```

Persistence odaklı testte `@DataJpaTest` +
`@AutoConfigureTestDatabase(replace = Replace.NONE)` kullan.

## Test Veri Kurucusu

```java
class ProductBuilder {
  private String name = "Test";
  ProductBuilder withName(String name) { this.name = name; return this; }
  Product build() { return new Product(null, UUID.randomUUID(), name, new BigDecimal("10.00")); }
}
```

## Doğrulama Döngüsü (PR öncesi / büyük değişiklik sonrası)

Sırayla; bir faz kırılırsa DUR ve düzelt:

1. **Build**: `mvn -T 4 clean verify -DskipTests`
2. **Statik analiz** (yapılandırıldıysa): `mvn spotbugs:check pmd:check checkstyle:check`
3. **Test + kapsam**: `mvn verify` (Docker yoksa `mvn verify -Pit-local`);
   JaCoCo raporundan satır/dal yüzdesini oku, ≥ %80 doğrula
4. **Güvenlik taraması**: bağımlılık CVE kontrolü; kaynakta secret grep'i
   (`password=`, `sk-`, `api_key`); `System.out.print`, ham `e.getMessage()`
   yanıtı ve wildcard CORS kalıntılarını ara
5. **Diff incelemesi**: `git diff --stat; git diff` — debug log kalıntısı yok,
   anlamlı hata/HTTP statüsü, gereken yerde transaction + validation var

## Rapor Şablonu (kanıtsız PASS yok)

```
DOĞRULAMA RAPORU
================
Build:     [PASS/FAIL]
Statik:    [PASS/FAIL/N-A]
Test:      [PASS/FAIL] (X/Y geçti, %Z kapsam)
Güvenlik:  [PASS/FAIL] (CVE bulgusu: N)
Diff:      [X dosya değişti]
Sonuç:     [HAZIR / HAZIR DEĞİL]
```

Her satırın yanına dayanak komut çıktısı eklenir; çıktı yoksa PASS yazılamaz.

**Unutma**: Testler hızlı, izole, deterministik olmalı. Davranışı test et,
implementasyon detayını değil. Testi değil kodu düzelt.
