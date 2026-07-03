# Production Checklist — apps/api (aktivasyon listesi)

İskelet bilinçli olarak minimal kalır (elle yazılmış health endpoint'leri,
Actuator yok). Bir proje production'a yaklaşırken aşağıdaki maddeler tek tek
değerlendirilir ve etkinleştirilir; her madde kendi PR'ında, gate zincirinden
geçerek girer. Bu dosya kopyala-etkinleştir şablonudur — projeye alınınca
`docs/operations/production-checklist.md` olarak taşınır ve işaretlenir.

## Gözlemlenebilirlik

- [ ] **Spring Boot Actuator**: `spring-boot-starter-actuator`;
      `management.endpoints.web.exposure.include` bilinçli ve dar tutulur
      (health, info, metrics, prometheus). Elle yazılmış
      `/api/health/live|ready` endpoint'leriyle çakışma çözülür: Actuator
      probe'ları (`/actuator/health/liveness|readiness`) tercih edilirse
      elle yazılanlar kaldırılır — ikisi birden yaşatılmaz.
- [ ] **Metrics**: Micrometer + Prometheus registry; JVM, HTTP server,
      HikariCP havuz metrikleri. Alarm eşikleri deploy ortamında tanımlanır.
- [ ] **Structured logging**: JSON log encoder (örn. logstash-logback-encoder);
      log seviyeleri profil başına; token/credential/PII asla loglanmaz
      (`.claude/rules/common/security.md`).
- [ ] **Correlation ID**: gelen `X-Request-Id` yoksa filter üretir; MDC'ye
      konur, tüm loglara ve hata yanıtlarına eklenir; upstream çağrılara taşınır.

## Dayanıklılık

- [ ] **Graceful shutdown**: `server.shutdown=graceful` +
      `spring.lifecycle.timeout-per-shutdown-phase` (deploy platformunun
      SIGTERM penceresiyle hizalı).
- [ ] **Ortak hata yanıt standardı**: RFC 7807 ProblemDetail
      (`spring.mvc.problemdetails.enabled=true` veya @ControllerAdvice);
      stack trace ve iç detay yanıta sızmaz; correlation ID alanı eklenir.
- [ ] **Connection pool ayarı**: HikariCP max/min boyutu DB kapasitesi ve
      replica sayısıyla hesaplanır (varsayılan 10 körlemesine bırakılmaz).

## Tedarik Zinciri

- [ ] **Maven dependency taraması**: OWASP Dependency-Check veya ekosistem
      eşdeğeri CI job'u; HIGH+ bulgu merge engeli. (npm tarafı `pnpm gate`
      audit'iyle zaten kapsanır; bu madde Maven tarafını kapatır.)
- [ ] **Dependabot/Renovate**: `.github/dependabot.yml` iskelette var —
      major sürümler ADR süreciyle (ADR-0009 §4); config projeye taşınırken
      ekosistem listesi gözden geçirilir.

## Aktivasyon notu

Her madde işaretlenirken kanıt (config diff'i + doğrulama komutu çıktısı)
ilgili PR açıklamasına eklenir; kanıtsız işaretleme geçersizdir
(`.claude/rules/common/verdict-policy.md`).
