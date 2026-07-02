# Faz 8.1 — Remediation ve Gerçek Sertifikasyon (Bağlayıcı Brief)

> Kaynak: Bağımsız üçüncü-taraf denetim raporu (27 madde) + Fable doğrulaması.
> Kritik iddialar resmi Claude Code dokümantasyonuyla teyit edildi (TaskCreated
> event şeması, subagent `skills:` preload alanı, `$CLAUDE_PROJECT_DIR`).
> Bu brief docs/source-briefs/ altına konur ve Faz 8.1'in bağlayıcı spesifikasyonudur.
> Çalışma kuralı: Sprint sınırlarında DUR, doğrulama komutunu bildir, insan onayı bekle.
> Her sprint sonunda commit önerisi sun. Kanıt yalnızca commit'li kodla üretilir;
> kanıt dosyası, üretildiği koşunun commit hash'ini içerir.

---

## SPRINT 1 — Mekanik P0 düzeltmeleri (hook/ajan/gate altyapısı)

### 1.1 task-card-validator'ı TaskCreated'a taşı (Denetim #2) [P0]
- settings.json: `PreToolUse + matcher:"TaskCreate"` bağlaması kaldırılır;
  `TaskCreated` top-level event olarak bağlanır (TaskCreated matcher desteklemez).
- Validator ÇİFT-ŞEMA okur: önce top-level `task_subject`/`task_description`,
  yoksa legacy `tool_input.subject`/`.description` (geçiş güvenliği).
- Bloklama: `permissionDecision` DEĞİL → stderr mesajı + **exit code 2**
  (TaskCreated'da görev oluşturmayı engellemenin resmi yolu).
- Harness fixture'ları resmi doküman payload örneğinden türetilir
  (session_id, cwd, hook_event_name:"TaskCreated", task_id, task_subject, ...).
- Hook başlığındaki sürüm notu güncellenir.

### 1.2 Tüm hook yollarını $CLAUDE_PROJECT_DIR'e taşı (Denetim #7) [P1→Sprint1, mekanik]
- settings.json'daki 7 hook komutu: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<ad>.js"`
  biçimine çevrilir (Windows'ta çift tırnak korunur).
- Harness'e yeni test: hook'lar repo kökü DIŞINDA bir CWD'den (örn. apps/api)
  fixture ile çağrılır ve doğru çalıştığı assert edilir.
  (Harness bunu env CLAUDE_PROJECT_DIR set edip cwd değiştirerek simüle eder.)

### 1.3 Ajanlara skills: preload ekle (Denetim #3) [P0]
Resmi davranış: subagent parent skill'lerini DEVRALMAZ; `skills:` alanı içeriği
başlangıçta enjekte eder. Rol bazlı MINIMAL listeler (context şişirme yasak):
- project-manager: project-planning, feature-workflow
- system-architect: adr-decision, stack-patterns
- ux-ui-designer: frontend-design-gate
- frontend-developer: frontend-design-gate, frontend-style-audit, stack-patterns
- backend-developer: stack-patterns
- seo-specialist: (kendi gövdesi yeterli; stack-patterns YOK)
- qa-test-specialist: qa-quality-gate
- code-reviewer: qa-quality-gate, stack-patterns
- memory-steward: memory-protocol
Not: token-optimization ve graphify preload edilmez (talep üzerine Skill tool'uyla).
Manifest: her ajan dosyasında `skills:` alanı zorunlu-doğrulanır (memory-steward
dahil 9/9) ve listelenen her skill'in gerçekten var olduğu assert edilir.

### 1.4 Gate zincirini genişlet (Denetim #4, #16, #17) [P0]
run-gates.mjs yeni sırası:
`build → typecheck → lint → test → audit → structure → contract-drift`
- gate-build: `turbo run build` (web + admin production build kanıtı zorunlu).
- gate-contract-drift: `pnpm --filter @skeleton/api-types generate` sonrası
  `git diff --exit-code packages/api-types/src/index.d.ts`; ayrıca openapi.yaml
  gerçek OpenAPI şema doğrulamasından geçirilir (redocly veya
  @seriousme/openapi-schema-validator gibi hafif bir araç — seçim ADR notu olur).
- gate-audit üç-durumlu olur: PASS / FAIL (high+critical) / **INCONCLUSIVE**
  (tarama koşamadı: registry yok, parse hatası). Lokalde INCONCLUSIVE uyarı,
  CI'da merge engeli. structure gate'i verify-structure.mjs'i sarar.

### 1.5 Manifest phase 8 + Faz 8 kanıtları (Denetim #10) [P0]
- structure-manifest.json → "phase": 8; zorunlu dosyalara eklenir:
  quality-gate raporu, SEO raporu, ADR-0008, SiteSkeleton Current Status +
  session log. (Faz 8.1 sonunda phase: 8.1 ve yeni kanıtlar da eklenir.)

Sprint 1 doğrulaması:
`node .claude/hooks/tests/run-tests.js` (CWD testi dahil, assertion sayısı artar)
`pnpm gate` (7 gate tablosu) · `node scripts/verify-structure.mjs`

---

## SPRINT 2 — Politika, test altyapısı, CI (P0)

### 2.1 Tek severity → verdict politikası (Denetim #1) [P0]
- Yeni dosya: .claude/rules/common/verdict-policy.md (≤60 satır):
  - Severity sözlüğü: CRITICAL / HIGH / MEDIUM / LOW tek tanım.
  - Kural: HERHANGİ bir gate CRITICAL veya BLOCKER üretirse genel verdict
    otomatik **FAIL — remediation required** (veya BLOCKED FOR PRODUCTION).
  - PASS_WITH_RISKS yalnız: kabul edilmiş + production'ı engellemeyen riskler.
  - Remediation sonrası QA + Security + SEO + Final Review YENİDEN koşar.
  - Gate sırası bağlayıcı: ... → QA → Security → SEO/style → Final Review.
    Final Review, önceki TÜM gate bulgularını görmeden verdict veremez.
- qa-quality-gate skill'i, feature-workflow skill'i ve code-reviewer ajanı bu
  dosyaya referans verecek şekilde güncellenir.

### 2.2 Frontend test altyapısı — placebo'nun sonu (Denetim #5) [P0]
- apps/web: Vitest + Testing Library + MSW + jsdom; 1 smoke test (sayfa render +
  tek h1 assert) + 1 metadata testi (title/description/canonical export'u).
- apps/admin: Vitest + Testing Library; 1 render/form testi + axe-core ile
  1 erişilebilirlik smoke testi.
- Coverage: vitest coverage provider + başlangıç threshold'u (statements %60,
  iskelet büyüdükçe %80 hedefi CLAUDE.md konvansiyonu) — gate coverage'ı okur.
- gate-test kuralı: test task'ı OLMAYAN workspace tespit edilirse FAIL
  ("no tasks executed" artık PASS sayılamaz).
- Playwright smoke flow: templates/e2e/ altında opsiyonel modül olarak iskelet +
  README aktivasyon adımı (çekirdeğe zorunlu girmez — kapsam kararı).

### 2.3 Gerçek CI (Denetim #6) [P0]
- .github/workflows/ci.yml:
  - ubuntu-latest: pnpm install (frozen-lockfile), pnpm gate
    (build/typecheck/lint/test/audit/structure/contract-drift), apps/api
    mvn verify (Testcontainers — GitHub runner'da Docker mevcut).
  - windows-latest: hook harness + verify-structure (path/CRLF paritesi).
  - Gitleaks job'u (bkz. 2.4). INCONCLUSIVE audit → job fail.
- docs/operations/ci.md taslaktan gerçek dokümana çevrilir; branch protection
  required-checks listesi yazılır (uygulama GitHub UI'da manuel — insan işi).

### 2.4 Secret taramasını derinleştir (Denetim #24) [P0/P1]
- pre-write-secret-scan pattern seti genişler: github_pat_, gho_, glpat-,
  xox[baprs]-, sk_live_, ASIA, eyJ (JWT, iki nokta ayrımıyla),
  postgres://user:pass@, npm_. PLACEHOLDER muafiyeti korunur.
- Bash yönlendirme riski için: pre-bash-git-guard'a ek desen DEĞİL, ayrı hafif
  kontrol — Bash komut metninde `>`/`>>` ile .env/.pem/config hedefli yazım +
  bilinen token önekleri görülürse ask. (Tam kapsama hook'la imkânsız —
  birinci savunma hattı; gerçek tarama CI Gitleaks.)
- CI'ya Gitleaks: tam git geçmişi taraması, bulgu → job fail.
- Harness'e yeni pattern sınıfları için fixture'lar.

Sprint 2 doğrulaması: `pnpm gate` (frontend testleri gerçek koşar) +
CI workflow'un push'ta yeşil bittiğinin ekran görüntüsü/log'u (insan kanıtı).

---

## SPRINT 3 — Doğruluk ve sürdürülebilirlik (P1)

### 3.1 Kanıt yeniden-üretilebilirliği (Denetim #8) [P1 — ilke ihlali]
- session-close-validator.js, session log'daki Test 2'de iddia edilen davranışla
  eşitlenir (proje algılama + geçerli proje listeleme + net hata metinleri)
  VEYA session log gerçek mevcut çıktıyla düzeltilir — hangisi doğruysa.
- Yeni kural (qa-quality-gate + memory-protocol): kanıt dosyaları üretildikleri
  koşunun commit hash'ini içerir; commit'lenmemiş kodla üretilen kanıt geçersizdir.

### 3.2 Memory kapanış commit döngüsü (Denetim #9) [P1]
- Current-Status-template.md: "Son Commit Kanıtı" ikiye ayrılır:
  `## Son Uygulama Commiti` ve `## Memory Closure Commiti`.
- finish-session akışı: implementation commit → memory closure yazımı →
  ayrı `chore(memory): close session <tarih>` commit'i.
- session-close-validator yeni iki başlığı doğrular; hook fixture'ları güncellenir.

### 3.3 SITE_URL production guard'ı (Denetim #13) [P1 — çekirdek]
- apps/web/.env.example: NEXT_PUBLIC_SITE_URL açıklamalı.
- lib/site-url.ts: URL parse/validation; NODE_ENV=production'da env yoksa
  build FAIL (fail-fast). robots/sitemap/metadata bu helper'ı kullanır.
- turbo.json: ilgili task'lara env tanımı (cache doğruluğu).
- Default OG image + Twitter card metadata eklenir.
- SEO raporundaki CRITICAL bulgu kapatılmış olarak yeniden denetlenir.

### 3.4 CLAUDE.md üç-liste modeli (Denetim #14) [P1]
- "Kimlik" bölümü yeniden yazılır:
  **Installed baseline** (gerçekten package dosyalarında olanlar) /
  **Approved defaults** (ilk ihtiyaçta kurulacak onaylı seçimler: TanStack, RHF,
  Zod, motion, React Router, Zustand, Spring Security, JJWT, Bucket4j, springdoc) /
  **Optional activation** (templates/: payments, admin-bff, e2e).
- Manifest'e drift kontrolü: Installed baseline'da listelenen her paketin ilgili
  package.json/pom.xml'de gerçekten var olduğu assert edilir.

### 3.5 Spring Boot 3.5.x yükseltmesi + sürüm politikası (Denetim #15) [P1]
- pom.xml: Spring Boot 3.3.13 → güncel 3.5.x (Java 21 korunur); Testcontainers
  1.21.4 pini gerekliliği yeniden değerlendirilir (BOM yönetiyorsa kaldırılır).
- mvn verify yeşil kanıtı zorunlu.
- docs/adr/ADR-0009-framework-support-policy.md: "EOL hatta başlamama" kuralı,
  Next 15→16 değerlendirme takvimi, Renovate/Dependabot stratejisi (CI'ya
  dependabot.yml eklenir: npm + maven + github-actions ekosistemleri).
- Spring Boot 4.x geçişi ayrı PROPOSED ADR olarak not edilir.

### 3.6 Tarama modu + bootstrap script (Denetim #11, #12) [P1]
- structure-manifest.json'a `"mode": "skeleton-dev"` alanı; cicekci|çiçek
  yasak-pattern'i YALNIZ skeleton-dev modunda koşar.
- scripts/bootstrap-project.mjs (deterministic, Node stdlib):
  isim/slug validation → dry-run çıktısı → onayla: root package adı,
  @skeleton/* namespace, com.skeleton Java package relocation, Maven artifactId,
  DB adları (skeleton/skeleton_it), OpenAPI title, web metadata, README başlığı
  rename → manifest mode: project → sonda pnpm gate çağrısı önerisi.
  Idempotent: hedef isim zaten uygulanmışsa güvenli çıkış.
- /new-project komutu bu scripti çağırır; README'de komutun tam kapsamı
  dürüstçe belgelenir.

Sprint 3 doğrulaması: `pnpm gate` + `mvn verify` (3.5.x ile) +
bootstrap-project --dry-run çıktısı + verify-structure (üç-liste drift kontrolü).

---

## SPRINT 4 — Domain, şablonlar, güvenlik baseline'ı

### 4.1 Kategori SQL düzeltmeleri (Denetim #19)
templates/db/categories.sql:
- `CHECK (depth BETWEEN 0 AND 3)`
- `UNIQUE NULLS NOT DISTINCT (parent_id, slug)` (PG16 — README'ye PG15+ notu)
- Soft-delete uyumu: unique kısıt yerine
  `CREATE UNIQUE INDEX ... ON categories (parent_id, slug) NULLS NOT DISTINCT
   WHERE deleted_at IS NULL;` (silinen slug yeniden kullanılabilir)
- `CREATE INDEX idx_categories_parent_id ON categories(parent_id);`
- Cycle önleme: başlık yorumunda servis kuralı (taşıma işleminde ancestor
  kontrolü) + ADR-0008'e cycle bölümü eklenir; istenirse örnek trigger
  templates/db/README'de gösterilir.

### 4.2 Kupon invariant'ları (Denetim #20)
templates/db/coupons.sql:
- `CHECK ((status='ACTIVE' AND used_at IS NULL AND used_by_order_id IS NULL)
   OR (status='PASSIVE' AND used_at IS NOT NULL AND used_by_order_id IS NOT NULL))`
  Not: manuel pasifleştirme (admin iptali) senaryosu isteniyorsa status'e
  'DISABLED' değeri eklenir ve CHECK üç durumu kapsar — karar ADR notu olur.
- Sipariş başına tek kupon: `CREATE UNIQUE INDEX ... ON coupons(used_by_order_id)
   WHERE used_by_order_id IS NOT NULL;`

### 4.3 BFF hardening (Denetim #21)
- templates/admin-bff/README: en üste "PRODUCTION-READY DEĞİLDİR" + zorunlu
  hardening checklist (body limit, upstream timeout/AbortController, Origin/CSRF,
  content-type doğrulama, CORS, response shape validation, cookie Max-Age,
  structured logging, rate limit, test).
- server.mjs'e üç ucuz düzeltme hemen: request body boyut limiti, upstream
  timeout (AbortController), Secure attribute'ün NODE_ENV'e bağlanması
  (yorumla davranışın eşitlenmesi).

### 4.4 Payment port asgari güçlendirme (Denetim #22)
- PaymentProvider'a eklenir: `idempotencyKey` parametresi (authorize/capture/
  refund), `PaymentStatus` enum'u (AUTHORIZED/CAPTURED/FAILED/REFUNDED/PENDING_3DS).
- ADR-0007'ye şerh: "Sağlayıcı seçiminde port, sağlayıcının webhook/3DS/partial
  capture modeline göre YENİDEN tasarlanır; mevcut port taslaktır."

### 4.5 Backend baseline (Denetim #25)
- HealthController → /api/health/live (sabit UP) + /api/health/ready
  (DB SELECT 1 + flyway_schema_history kontrolü). IT'ler iki endpoint'i de test eder.
- application.yml: default/prod profilde DB kullanıcı/parola için fallback YOK —
  env zorunlu (fail-fast); yalnız local/it-local profillerinde postgres/postgres.
- templates/operations/production-checklist.md: Actuator, metrics, structured
  logging, correlation ID, graceful shutdown, ortak hata response standardı,
  Maven dependency taraması — aktivasyon listesi olarak.

### 4.6 Baseline Security Gate (Denetim #23)
- code-reviewer, DIFF değil BASELINE kapsamıyla koşar: BFF şablonu, payment portu,
  kupon transaction modeli, secret hook'ları, settings permissions.
- Rapor: docs/audits/2026-XX-XX-baseline-security-review.md; CRITICAL çıkarsa
  verdict-policy gereği genel FAIL → düzelt → yeniden koş.

### 4.7 it-local kanıtı (Denetim #26)
- Lokal PostgreSQL'de skeleton_it DB oluşturulur (rehber komutlarıyla),
  `mvn verify -Pit-local` koşulur, kanıt docs/test-reports/'a girer.

### 4.8 Uçtan uca pilot: /new-project + /start-feature (Denetim #27)
- bootstrap-project --dry-run ile sahte proje adı denenir (rename mekaniği kanıtı).
- Küçük gerçek bir feature (/start-feature "web ana sayfaya son-güncelleme
  tarihi bölümü ekle" gibi) TAM gate zincirinden geçirilir: PM→UX→FE→PM diff→
  QA→Security→SEO/style→Final→memory→commit. Tüm HANDOFF'lar ve raporlar kanıttır.

---

## FİNAL — Yeniden sertifikasyon
1. Tam zincir: `pnpm gate` (7 gate) + `mvn verify` + hook harness + CI yeşil.
2. verdict-policy ile YENİ genel verdict üretilir (hedef: PASS, CRITICAL=0).
3. docs/audits/2026-XX-XX-recertification.md: 27 denetim maddesi → tek tek
   kapatıldı/kapsam-dışı-gerekçeli tablosu + kanıt linkleri.
4. Manifest phase: 8.1; commit: `feat: phase 8.1 remediation and recertification`.
5. İnsan onayıyla push; template işareti korunur.

## Kapsam-dışı (gerekçeli, kayda geçer)
- Playwright çekirdeğe zorunlu girmez → templates/e2e (aktivasyon modülü).
- Actuator/metrics çekirdeğe girmez → production-checklist.
- Spring Boot 4.x → ayrı PROPOSED ADR.
- Payment portunun tam production tasarımı → sağlayıcı seçimi ADR'ında.
