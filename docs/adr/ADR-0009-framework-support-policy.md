# ADR-0009: Framework Destek Politikası — "EOL Hatta Başlamama"

- Status: ACCEPTED
- Date: 2026-07-03
- Authors: system-architect (analiz), orkestratör (kayıt); Faz 8.1 Sprint 3 (denetim #15)

## Context

İskelet, Spring Boot 3.3.13 ile doğdu; 3.3'ün OSS desteği 2025-06-30'da
bitmişti — yani iskelet EOL bir hatta başlamıştı (denetim bulgusu). Sürüm
seçimini kişisel tahmine bırakmamak için bağlayıcı bir politika gerekir.
Destek verileri (endoflife.date, 2026-07-03): Boot 3.5 OSS EOL 2026-06-30
(extended/commercial 2032-06-30, son 3.x hattı); Boot 4.0 EOL 2026-12-31;
4.1 EOL 2027-07-31. Next.js 15 EOL 2026-10-21; Next 16 aktif LTS.

## Decision

1. **EOL hatta başlamama:** Yeni proje, OSS desteği bitmiş bir framework
   hattıyla AÇILAMAZ. Sürüm seçimi anında hattın OSS EOL tarihi ileri bir
   tarih olmalı; değilse bir üst hat seçilir veya karar ADR ile gerekçelenir.
2. **Boot 3.5.16'ya yükseltme (bu sprint):** Remediation brief'i 3.5.x'i
   bağlayıcı kılar. 3.5, son 3.x hattıdır (extended support 2032) ve Java 21
   ile uyumludur; ancak OSS EOL'ü (2026-06-30) geçmiştir → Boot 4.x geçişi
   ayrı PROPOSED ADR'dir (ADR-0010) ve ilk gerçek projede değerlendirilmesi
   ZORUNLUDUR. Testcontainers pini kaldırıldı: 3.5.16 BOM'u 1.21.4 yönetir
   (Docker Engine 29 gereksinimi, bkz. pom.xml notu).
3. **Next.js 15→16 takvimi:** Next 15 EOL 2026-10-21. İlk gerçek web
   projesi bu tarihten önce açılırsa Next 16 değerlendirmesi task DAG'ına
   girer; iskelet 2026-09 sonuna kadar 16'ya yükseltilmelidir.
4. **Dependabot stratejisi:** `.github/dependabot.yml` — npm (kök),
   maven (apps/api), github-actions ekosistemleri; haftalık; minor+patch
   gruplu tek PR (limit 3/ekosistem). MAJOR sürümler bot'a kapalıdır
   (`ignore: semver-major`): major yükseltme bu ADR'nin 1. kuralı
   çerçevesinde ADR süreciyle değerlendirilir, bot PR'ıyla gelmez.
   Her Dependabot PR'ı tam CI zincirinden geçer; yeşil olmadan merge edilmez.
5. **Kanıt kuralı:** Her framework yükseltmesi `mvn verify` / `pnpm gate`
   yeşil kanıtı olmadan commit'lenemez (verdict-policy kanıt kuralı).

## Consequences

Pozitif: sürüm seçimi ölçülebilir kurala bağlandı; güvenlik yamaları
haftalık akar; EOL sürprizi kalmaz. Negatif: Dependabot PR gürültüsü
(gruplama ile sınırlandı); extended-support hattında kalmak (3.5) OSS CVE
yaması akışını durdurur — 4.x geçişi ertelendikçe risk büyür (ADR-0010
takibi zorunlu). Politika ihlali tespiti şu an insan incelemesindedir;
otomatik EOL kontrolü (CI job'u) ileriye dönük borçtur.

## Alternatives Considered

- **Doğrudan Boot 4.x'e geçiş (bu sprint):** Brief 3.5.x'i bağlayıcı kılar;
  4.x major kırılımları (Jakarta/konfig değişimleri) remediation kapsamını
  aşar. Reddedildi → ADR-0010 PROPOSED.
- **Renovate:** Daha esnek ama ek servis/konfig yükü; GitHub-native
  Dependabot iskelet için yeterli (KISS). Reddedildi.
- **Politikasız kalmak:** Denetim #15'in kök nedeni buydu. Reddedildi.
