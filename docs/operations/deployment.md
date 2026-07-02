# Deployment

> Taslak — proje-özel deployment kararları yeni projede ADR ile verilir.

İskelet deployment hedefi dayatmaz. Beklenen üretim şekli:

- apps/web → Node hosting / Vercel benzeri (SSR/ISR destekli)
- apps/admin → statik build (`dist/`) + herhangi bir statik host / reverse proxy
- apps/api → JVM artifact (`target/*.jar`) + PostgreSQL 16; Flyway migration'ları
  deploy pipeline'ında `mvn -DskipTests package` sonrası uygulamanın açılışında koşar

Karar noktaları (yeni projede ADR): hosting sağlayıcısı, ortam sayısı (staging/prod),
secret yönetimi, admin SPA için ayrı subdomain + BFF gerekip gerekmediği
(templates/admin-bff).
