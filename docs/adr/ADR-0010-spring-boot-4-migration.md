# ADR-0010: Spring Boot 4.x Geçişi

- Status: ACCEPTED
- Date: 2026-07-03 (PROPOSED) → 2026-07-23 (ACCEPTED, Faz 8.3 PR-A1)
- Authors: system-architect (öneri, Faz 8.1 S3); Faz 8.3 uygulaması

## Context

İskelet Boot 3.5.16'daydı; 3.5 OSS desteği 2026-06-30'da bitti (extended
2032'ye sürer ama OSS CVE akışı durdu). ADR-0009 kural 1 gereği bu ADR ilk
projede / en geç 2026-Q4'te değerlendirme şartıyla PROPOSED açılmıştı.
**Kabul tetikleyicisi:** Üçüncü bağımsız denetim HIGH-1 — production-ready
template baseline'ı EOL hatta kalamaz; Faz 8.3 brief'i (P0-1) yükseltmeyi
bağlayıcı yaptı, değerlendirme öne çekildi.

## Decision

**Spring Boot 4.1.0'a geçildi** (karar anındaki güncel sürüm, Maven Central
teyitli). 4.0 atlandı (EOL 2026-12-31; ADR-0009 kural 1 kısa ömürlü hattı da
yasaklar). 4.1 EOL'ü 2027-07-31; hat içi güncellik Dependabot minor/patch
akışıyla korunur, sonraki major yine ADR sürecinden geçer.

## Migration sonuçları (kanıt: Faz 8.3 PR-A1, commit `2e18d08`)

1. **Modüler starter'lar:** starter-web → **starter-webmvc**; flyway-core →
   **starter-flyway** (+ flyway-database-postgresql kalır); starter-test →
   **starter-webmvc-test**. Beklenmedik gereksinim: TestRestTemplate
   auto-config'i RestTemplateBuilder'ı introspect eder; webmvc-test
   resttestclient'ı getirir ama **spring-boot-restclient'ı getirmez** →
   test scope'ta eklendi (production classpath büyümedi; dependency:tree
   kanıtlı). TestRestTemplate paketi `org.springframework.boot.
   resttestclient`e taşındı; `@AutoConfigureTestRestTemplate` artık zorunlu.
2. **Jackson 3:** BOM `tools.jackson` 3.1.4 getirir; custom serializer
   olmadığından kod değişmedi. Sözleşme `JacksonContractIT` ile telli:
   typed record (String+enum+Instant) → alan adları, enum temsili, ISO-8601,
   Content-Type, typed round-trip. Endpoint yalnız o IT'nin @Import'uyla
   kayıtlı RouterFunction bean'i (scan sızıntısı yapısal engelli).
3. **Testcontainers 2.0.5:** Boot 4.1 BOM'u testcontainers-bom 2.0.5 import
   eder. TC 2.x rename uygulandı: `testcontainers-junit-jupiter`,
   `testcontainers-postgresql`; paket `org.testcontainers.postgresql`.
   Docker Engine 29 şartı (≥1.21.4) fazlasıyla karşılanır.
4. **Flyway 12.4.0** (BOM, pinsiz); `ddl-auto: validate` + Flyway-only
   migration kuralı aynen geçerli.
5. **Property'ler:** spring-boot-properties-migrator iki fazlı koşuldu —
   teşhis **0 uyarı**; migrator kaldırılıp temiz pom ile verify tekrarlandı
   (son pom'da migrator yok).
6. **Kanıt:** `mvn clean verify` (Docker, postgres:16) ve `-Pit-local`
   (gerçek PostgreSQL 16.14) BUILD SUCCESS, 5/5 IT; `SKIP_API=1 pnpm gate`
   7/7 PASS (installedBaseline yeni artifact adlarına çekildi).

## Consequences

- OSS CVE akışı yeniden açık; baseline desteklenen hatta (4.1).
- Starter adları 4.x sözlüğünden seçilir; test starter'ları teknolojiye özgü.
- Jackson 3 API baseline'dır; Jackson 2 köprüsü (`use-jackson2-defaults`)
  kullanılmaz — davranış kayması JacksonContractIT'de yakalanır.
- Testcontainers 2.x baseline'dır; TC 1.x örnek/dokümanları geçersizdir.
