# Spring Boot Desenleri

Katmanlı, üretim kalitesinde servisler için mimari ve API desenleri.
Zemin: Java 21, Spring Boot 4.1, constructor injection, ince controller.

## REST Controller

```java
@RestController
@RequestMapping("/api/products")
@Validated
class ProductController {
  private final ProductService productService;

  ProductController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping
  ResponseEntity<Page<ProductResponse>> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    Page<Product> products = productService.list(PageRequest.of(page, size));
    return ResponseEntity.ok(products.map(ProductResponse::from));
  }

  @PostMapping
  ResponseEntity<ProductResponse> create(@Valid @RequestBody CreateProductRequest request) {
    Product product = productService.create(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(ProductResponse.from(product));
  }
}
```

## Service + Transaction

```java
@Service
public class ProductService {
  private final ProductRepository repo;

  public ProductService(ProductRepository repo) { this.repo = repo; }

  @Transactional
  public Product create(CreateProductRequest request) {
    return Product.from(repo.save(ProductEntity.from(request)));
  }

  @Transactional(readOnly = true)
  public Page<Product> list(Pageable pageable) {
    return repo.findAll(pageable).map(Product::from);
  }
}
```

## DTO ve Doğrulama (record)

```java
public record CreateProductRequest(
    @NotBlank @Size(max = 200) String name,
    @NotNull @DecimalMin("0.00") BigDecimal price,
    @NotEmpty List<@NotBlank String> categorySlugs) {}

public record ProductResponse(UUID publicId, String name, BigDecimal price) {
  static ProductResponse from(Product p) {
    return new ProductResponse(p.publicId(), p.name(), p.price());
  }
}
```

Dışa `publicId` (UUID) açılır; internal BIGINT `id` API'ye sızmaz.

## Merkezi Hata Yönetimi

```java
@ControllerAdvice
class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(e -> e.getField() + ": " + e.getDefaultMessage())
        .collect(Collectors.joining(", "));
    return ResponseEntity.badRequest().body(ApiError.validation(message));
  }

  @ExceptionHandler(EntityNotFoundException.class)
  ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of("Not found"));
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiError> handleGeneric(Exception ex) {
    // Beklenmedik hatayı stack trace ile logla; istemciye detay sızdırma
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("Internal server error"));
  }
}
```

## Loglama (SLF4J)

```java
private static final Logger log = LoggerFactory.getLogger(ReportService.class);
log.info("generate_report productId={}", productId);
log.error("generate_report_failed productId={}", productId, ex);
```

`System.out.println` yasak; hassas veri (token, parola, PII) loglanmaz.

## Rate Limiting (Bucket4j)

```java
@Component
public class RateLimitFilter extends OncePerRequestFilter {
  private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String clientIp = request.getRemoteAddr();
    Bucket bucket = buckets.computeIfAbsent(clientIp,
        k -> Bucket.builder()
            .addLimit(Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1))))
            .build());
    if (bucket.tryConsume(1)) {
      chain.doFilter(request, response);
    } else {
      response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
    }
  }
}
```

GÜVENLİK: `X-Forwarded-For` header'ı istemci tarafından sahtelenebilir —
doğrudan OKUMA. Reverse proxy arkasındaysan `server.forward-headers-strategy`
+ `ForwardedHeaderFilter` yapılandır; `request.getRemoteAddr()` o zaman doğru
istemci IP'sini döner.

## Üretim Varsayılanları

- Constructor injection; field injection yasak
- `spring.mvc.problemdetails.enabled=true` (RFC 7807 hataları)
- Okuma yollarında `@Transactional(readOnly = true)`
- HikariCP havuz boyutu/timeout'ları iş yüküne göre ayarla
- Cache gerekiyorsa `@EnableCaching` + `@Cacheable`; async iş için
  `@EnableAsync` + `@Async`; zamanlanmış işlerde handler idempotent olmalı

**Unutma**: controller ince, service odaklı, repository basit, hatalar
merkezi. Bakım ve test edilebilirlik için optimize et.
