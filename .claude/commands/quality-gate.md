---
description: >
  Kanıt-tabanlı kalite kapısı zincirini uçtan uca koşar: pnpm gate + (API
  değiştiyse) mvn verify + QA + Security + (web ise) SEO + style-audit.
  Raporlar docs/ altına kanıtla yazılır.
---

# /quality-gate

1. `qa-quality-gate` skill'ini yükle.
2. Doğrulama döngüsünü koş: `pnpm gate`; API değiştiyse
   `cd apps/api; mvn verify` (Docker yoksa `mvn verify -Pit-local`).
   Çıktıları rapora göm — kanıtsız PASS yasak.
3. **qa-test-specialist** (Final Gate Mode, salt-okunur) → verdict.
4. Auth/ödeme/kullanıcı verisi değiştiyse **code-reviewer** ile Security
   Gate (ayrı faz, salt-okunur).
5. `apps/web` değiştiyse: `/seo-audit` + `frontend-style-audit` skill'i.
6. **code-reviewer** ile Final Review (Approve/Warning/Block).
7. Raporları kaydet: `docs/test-reports/` + `docs/audits/`.
   Herhangi bir FAIL'de remediation döngüsü (`feature-workflow`); önceki
   PASS'ler geçersiz.
