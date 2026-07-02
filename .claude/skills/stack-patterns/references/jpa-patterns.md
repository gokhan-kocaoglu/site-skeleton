# JPA / Hibernate Desenleri

Veri modelleme, repository ve performans ayarı için. Zemin:
`ddl-auto: validate` — şema değişikliği YALNIZ Flyway migration'ıyla
(`database-migrations.md`).

## Entity Tasarımı (bu iskeletin kimlik kuralı)

Internal PK: `BIGINT identity`; dışa açılan kimlik: `UUID public_id`.

```java
@Entity
@Table(name = "products", indexes = {
  @Index(name = "idx_products_public_id", columnList = "public_id", unique = true),
  @Index(name = "idx_products_slug", columnList = "slug", unique = true)
})
@EntityListeners(AuditingEntityListener.class)
public class ProductEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "public_id", nullable = false, unique = true, updatable = false)
  private UUID publicId = UUID.randomUUID();

  @Column(nullable = false, length = 200)
  private String name;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal price;              // para: NUMERIC(12,2)

  @Enumerated(EnumType.STRING)
  private ProductStatus status = ProductStatus.ACTIVE;

  @CreatedDate private Instant createdAt;   // TIMESTAMPTZ (UTC)
  @LastModifiedDate private Instant updatedAt;
}
```

Auditing'i aç:

```java
@Configuration
@EnableJpaAuditing
class JpaConfig {}
```

## İlişkiler ve N+1 Önleme

```java
@OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
private List<VariantEntity> variants = new ArrayList<>();
```

- Varsayılan LAZY; koleksiyonda `EAGER` YASAK
- İhtiyaç halinde `JOIN FETCH`; okuma yollarında DTO projeksiyonu:

```java
@Query("select p from ProductEntity p left join fetch p.variants where p.id = :id")
Optional<ProductEntity> findWithVariants(@Param("id") Long id);
```

## Repository Desenleri

```java
public interface ProductRepository extends JpaRepository<ProductEntity, Long> {
  Optional<ProductEntity> findByPublicId(UUID publicId);

  @Query("select p from ProductEntity p where p.status = :status")
  Page<ProductEntity> findByStatus(@Param("status") ProductStatus status, Pageable pageable);
}
```

Hafif sorgular için interface projeksiyonu:

```java
public interface ProductSummary {
  UUID getPublicId();
  String getName();
  ProductStatus getStatus();
}
Page<ProductSummary> findAllBy(Pageable pageable);
```

## Transaction'lar

- Service metodlarında `@Transactional`; okuma yollarında `readOnly = true`
- Transaction'ları kısa tut; dış çağrıyı (HTTP, e-posta) transaction içinde yapma

```java
@Transactional
public Product updateStatus(UUID publicId, ProductStatus status) {
  ProductEntity entity = repo.findByPublicId(publicId)
      .orElseThrow(() -> new EntityNotFoundException("Product"));
  entity.setStatus(status);
  return Product.from(entity);   // dirty checking flush'lar; save gerekmez
}
```

## Sayfalama

```java
PageRequest page = PageRequest.of(pageNumber, pageSize, Sort.by("createdAt").descending());
Page<ProductEntity> products = repo.findByStatus(ProductStatus.ACTIVE, page);
```

Büyük listelerde cursor benzeri sayfalama: JPQL'e `p.id > :lastId` + sıralama.

## İndeksleme ve Performans

- Sık filtrelenen kolonlara indeks (`status`, `slug`, FK kolonları)
- Sorgu desenine uyan kompozit indeks (`status, created_at`)
- `select *` yerine gerekli kolon projeksiyonu
- Toplu yazımda `saveAll` + `hibernate.jdbc.batch_size`
- SQL verimliliğini logla doğrula: `logging.level.org.hibernate.SQL=DEBUG`

## HikariCP

```
spring.datasource.hikari.maximum-pool-size=20
spring.datasource.hikari.minimum-idle=5
spring.datasource.hikari.connection-timeout=30000
```

## Cache Notları

- 1. seviye cache EntityManager başınadır; entity'yi transaction'lar arası taşıma
- 2. seviye cache'i yalnız okuma-ağırlıklı entity'de ve eviction stratejisini
  doğrulayarak düşün

## Veri Erişim Testi

`@DataJpaTest` + Testcontainers (`postgres:16`) — üretimi aynala, H2 kullanma.
Ayrıntı: `springboot-tdd.md`.

**Unutma**: Entity yalın, sorgu kasıtlı, transaction kısa. N+1'i fetch
stratejisi ve projeksiyonla önle; okuma/yazma yollarına göre indeksle.
