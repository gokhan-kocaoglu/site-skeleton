# Spring Security Desenleri

Auth, girdi işleme, endpoint oluşturma ve secret işlerinde kullan.
Zemin: Spring Security 6, JJWT, stateless API + HttpOnly refresh cookie.

## Kimlik Doğrulama

- Stateless JWT access token + DB'de hash'li refresh token
  (rotation + reuse-revoke — bu iskeletin değişmezi)
- Access token localStorage'a YAZILMAZ; yalnız bellekte
- Refresh çerezleri: `httpOnly`, `Secure`, `SameSite=Strict`

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {
  private final JwtService jwtService;

  public JwtAuthFilter(JwtService jwtService) { this.jwtService = jwtService; }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
      FilterChain chain) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      Authentication auth = jwtService.authenticate(header.substring(7));
      SecurityContextHolder.getContext().setAuthentication(auth);
    }
    chain.doFilter(request, response);
  }
}
```

## Yetkilendirme

- `@EnableMethodSecurity` aç; varsayılan REDDET, yalnız gerekli scope'u aç

```java
@PreAuthorize("hasRole('ADMIN')")
@GetMapping("/users")
public List<UserDto> listUsers() { ... }

@PreAuthorize("@authz.isOwner(#id, authentication)")
@DeleteMapping("/users/{id}")
public ResponseEntity<Void> deleteUser(@PathVariable Long id) { ... }
```

## Girdi Doğrulama

Controller'da `@Valid` + DTO kısıtları; HTML render edilecekse whitelist
tabanlı sanitize:

```java
public record CreateUserDto(
    @NotBlank @Size(max = 100) String name,
    @NotBlank @Email String email) {}
```

## SQL Injection Önlemi

```java
// YANLIŞ: string birleştirme
// "SELECT * FROM users WHERE name = '" + name + "'"

// DOĞRU: parametreli native sorgu
@Query(value = "SELECT * FROM users WHERE name = :name", nativeQuery = true)
List<User> findByName(@Param("name") String name);

// DOĞRU: türetilmiş sorgu (otomatik parametreli)
List<User> findByEmailAndActiveTrue(String email);
```

## Parola

```java
@Bean
public PasswordEncoder passwordEncoder() {
  return new BCryptPasswordEncoder(12);
}
```

Düz metin parola ASLA saklanmaz; elle hash yerine `PasswordEncoder` bean'i.

## CSRF ve CORS

- Bearer token'lı saf API: CSRF kapalı + `SessionCreationPolicy.STATELESS`
- Tarayıcı-oturumlu uygulama: CSRF açık, token form/header'da
- CORS security filter seviyesinde; üretimde `*` origin YASAK:

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
  CorsConfiguration config = new CorsConfiguration();
  config.setAllowedOrigins(List.of("https://app.example.com"));
  config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
  config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
  config.setAllowCredentials(true);
  UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
  source.registerCorsConfiguration("/api/**", config);
  return source;
}
```

## Güvenlik Header'ları

```java
http.headers(headers -> headers
  .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'"))
  .frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin)
  .referrerPolicy(rp -> rp.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER)));
```

## Secret Yönetimi

```yaml
# YANLIŞ: application.yml içinde credential
# DOĞRU: ortam değişkeni placeholder'ı
spring:
  datasource:
    password: ${DB_PASSWORD}
```

Kaynak kodda secret yok; `.env.example` yalnız placeholder taşır.

## Diğer

- Rate limiting: Bucket4j, pahalı endpoint'lerde; 429 + retry ipucu
  (implementasyon: `springboot-patterns.md`)
- Bağımlılık taraması CI'da (OWASP Dependency Check); bilinen CVE'de build kır
- Log'larda secret/token/parola/PII yok; hassas alanları redakte et
- Dosya yükleme: boyut + content-type + uzantı doğrula; web root dışında sakla

## Yayın Öncesi Kontrol

- [ ] Token doğrulama ve süre aşımı doğru; refresh rotation çalışıyor
- [ ] Her hassas yolda yetki guard'ı; girdiler doğrulanmış
- [ ] String-birleştirmeli SQL yok; CSRF duruşu uygulama tipine uygun
- [ ] Secret'lar dışsallaştırılmış; header'lar ve rate limit yapılandırılmış
- [ ] Bağımlılıklar taranmış; log'lar temiz

**Unutma**: Varsayılan reddet, girdiyi doğrula, en az yetki, önce
güvenli-konfigürasyon.
