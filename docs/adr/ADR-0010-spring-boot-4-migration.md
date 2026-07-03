# ADR-0010: Spring Boot 4.x Geçişi

- Status: PROPOSED
- Date: 2026-07-03
- Authors: system-architect (öneri kaydı); Faz 8.1 Sprint 3 (ADR-0009 §2 gereği)

## Context

İskelet Boot 3.5.16'dadır (son 3.x hattı). 3.5'in OSS desteği 2026-06-30'da
bitti; extended/commercial destek 2032-06-30'a kadar sürer ama OSS CVE
yaması akışı durmuştur. Boot 4.0 (EOL 2026-12-31) ve 4.1 (EOL 2027-07-31)
yayındadır ve Java 21'i destekler. ADR-0009 kural 1 ("EOL hatta başlamama")
gereği, iskeletten açılacak ilk gerçek proje bu geçişi değerlendirmek
ZORUNDADIR.

## Decision (öneri — henüz bağlayıcı değil)

İlk gerçek proje açılışında (/new-project) veya en geç 2026-Q4'te:

1. Boot 4.1.x hedeflenir (4.0 değil: EOL'ü 2026 sonu — ADR-0009 kural 1).
2. Geçiş kapsamı çıkarılır: starter/paket yeniden adlandırmaları, konfig
   property değişimleri, Spring Framework 7 / Jakarta sürüm atlamaları,
   Flyway/Hibernate BOM sıçramaları, Testcontainers uyumu.
3. Kanıt: `mvn verify` (Testcontainers PG16) + health IT'leri yeşil;
   openapi.yaml contract-drift gate'i temiz.
4. Kabul edilirse bu ADR ACCEPTED'a çekilir ve pom.xml güncellenir;
   reddedilirse gerekçe bu dosyaya işlenir (extended-support'ta kalma
   kararı da açıkça yazılır).

## Consequences

PROPOSED kaldığı sürece iskelet extended-support hattındadır; OSS yama
akışı olmadığı için her geçen çeyrek risk artar. Geçiş yapılana kadar
`pnpm audit` / güvenlik taramaları Boot bağımlılıklarında bulgu verirse
verdict-policy gereği değerlendirme öne çekilir.
