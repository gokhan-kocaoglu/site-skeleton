# Faz 8.1 — Yeniden Sertifikasyon Raporu (2026-07-03)

- Kaynak: bağımsız üçüncü-taraf denetimi (27 madde) → bağlayıcı brief
  `docs/source-briefs/faz-8-1-remediation-brief.md` (4 sprint + final).
- Sertifikasyon commit'i: **`c112eee`** (manifest phase: 8.1 + kanıt dosyaları
  requiredFiles + memory-steward verbatim kuralı). Tüm doğrulamalar bu commit
  üzerinde yeniden koşuldu.
- Verdict sözlüğü: `.claude/rules/common/verdict-policy.md` (tek doğruluk kaynağı).

## Genel Verdict: **PASS_WITH_RISKS**

- **CRITICAL: 0 · HIGH: 0.** **27/27 madde kanıt linkli kapatıldı.** (#18,
  kaynak metnin kullanıcıdan alınmasıyla `4d917ae`'de kapandı — R7 KAPALI;
  güncelleme notu tablo satırında.)
- Kalan riskler (R1–R6) tek tek kayıtlı, sahipli ve production-engelsiz —
  verdict-policy kural 3 koşulları sağlanıyor. Kural 1 (CRITICAL→FAIL)
  tetiklenmedi.

## Doğrulama Zinciri (commit c112eee)

```text
pnpm gate      → 7/7 PASS (build/typecheck/lint/test/audit/structure/contract-drift)
                 structure: 858 checks OK + verify-structure-negative PASS
mvn verify     → BUILD SUCCESS — HealthEndpointIT 3/3 (Testcontainers postgres:16)
hook harness   → PASS — 159 assertions (52 fixtures + settings bindings)
CI             → 4/4 yeşil (insan teyidi, 2026-07-03 — 4abd5a4/ade11ba/3144fa3
                 push'u; c112eee + rapor commit'i push sonrası CI'da yeniden doğrulanır)
```

Koşu notu: ilk yeniden-koşuda iki doğrulama Docker Desktop daemon'ının kapanmış
olması nedeniyle kırmızıydı (Testcontainers "no valid Docker environment");
daemon yeniden başlatıldı, koşular sıralı tekrarlandı ve yeşillendi. Kod
değişikliği yapılmadı — altyapı olayı, bulgu değildir.

## 27 Madde Tablosu

Durumlar: **KAPANDI** (kanıtla) · **KAPSAM-DIŞI** (gerekçeli, brief kaydıyla) ·
**BOŞLUK** (kaynak eşlemesi yok). Kanıt linkleri repo-göreli dosyalardır;
commit hash'leri ilgili kanıt dosyalarının içindedir.

| # | Madde (brief eşlemesi) | Durum | Kanıt |
|---|------------------------|-------|-------|
| 1 | Tek severity→verdict politikası (§2.1) | KAPANDI (S2) | `.claude/rules/common/verdict-policy.md`; tüm gate raporları bu sözlüğü kullanıyor (S3/S4 raporları) |
| 2 | task-card-validator → TaskCreated (§1.1) | KAPANDI (S1) | `.claude/settings.json` TaskCreated bağlaması; `.claude/hooks/task-card-validator.js`; harness fixture'ları (159 assertion) |
| 3 | Ajanlara skills: preload (§1.3) | KAPANDI (S1) | 9 ajan dosyasında `skills:`; manifest `agentSkills` assert'i (verify-structure 858 check içinde) |
| 4 | Gate zinciri genişletme (§1.4) | KAPANDI (S1) | `scripts/quality/run-gates.mjs` 7 gate; bu rapordaki doğrulama zinciri |
| 5 | Frontend test altyapısı (§2.2) | KAPANDI (S2) | web: Vitest+TL+MSW (19 test); admin: Vitest+axe (2 test); gate-test "no tasks=FAIL" kuralı |
| 6 | Gerçek CI (§2.3) | KAPANDI (S2) | `.github/workflows/ci.yml` 4 job; CI 4/4 yeşil insan teyidi (Sprint 2, CI #16 ve 2026-07-03 push'u) |
| 7 | Hook yolları $CLAUDE_PROJECT_DIR (§1.2) | KAPANDI (S1) | `.claude/settings.json` 7 hook komutu; harness CWD-dışı çağrı testi |
| 8 | Kanıt yeniden-üretilebilirliği (§3.1) | KAPANDI (S3) | session-close-validator eşitleme + kanıt-hash kuralı (qa-quality-gate + memory-protocol); S3/S4 raporları hash'li |
| 9 | Memory closure commit döngüsü (§3.2) | KAPANDI (S3) | İki-commit döngüsü; fiilî kullanım: `c9610f8` (S3) ve `3144fa3` (S4) |
| 10 | Manifest phase + kanıt dosyaları (§1.5) | KAPANDI (S1→final) | `scripts/structure-manifest.json` **phase: 8.1** + S2/S3/S4 kanıtları requiredFiles'ta (c112eee) |
| 11 | Tarama modu (mode: skeleton-dev) (§3.6) | KAPANDI (S3) | Manifest `mode` alanı; yasak-pattern yalnız bu modda; negatif test |
| 12 | Bootstrap script (§3.6) | KAPANDI (S3) | `scripts/bootstrap-project.mjs`; S4 pilot dry-run kanıtı (38 dosya/72 ikame) — S4 raporu |
| 13 | SITE_URL production guard (§3.3) | KAPANDI (S3) | `apps/web/lib/site-url.ts` + 6 birim testi; SEO yeniden denetimi `docs/audits/seo/2026-07-03-web-home-remediation.md` |
| 14 | CLAUDE.md üç-liste modeli (§3.4) | KAPANDI (S3) | CLAUDE.md Kimlik bölümü; manifest `installedBaseline` drift kontrolü (mustBeAbsent dahil) |
| 15 | Spring Boot 3.5 + sürüm politikası (§3.5) | KAPANDI (S3) | pom 3.5.16; ADR-0009 ACCEPTED; dependabot.yml (kalibrasyon `31175ac`); mvn verify yeşil |
| 16 | gate-build + contract-drift (§1.4) | KAPANDI (S1) | `gate-build.mjs`, `gate-contract-drift.mjs`; bu koşuda contract-drift PASS (S4'te openapi değişikliğiyle fiilen test edildi) |
| 17 | gate-audit üç-durum (INCONCLUSIVE) (§1.4) | KAPANDI (S1) | `gate-audit.mjs` PASS/FAIL/INCONCLUSIVE modeli; CI'da INCONCLUSIVE=fail |
| 18 | ESLint zorlama derinliği (kaynak metin kullanıcıdan alındı, P1) | **KAPANDI (final, `4d917ae`)** | web: `@next/eslint-plugin-next` coreWebVitals + react-hooks + jsx-a11y; admin: react-hooks + jsx-a11y + react-refresh; iki app'te cross-app `no-restricted-imports` sınırı; type-aware lint ölçümle ertelendi (ADR-0012, ~2× süre + tsc mükerrerliği; benimseme yolu belgeli); mevcut kod 0 ihlal, gate 7/7 (862 check) |
| 19 | Kategori SQL düzeltmeleri (§4.1) | KAPANDI (S4) | `templates/db/categories.sql` + README (PG15+, trigger örneği); ADR-0008 Cycle Önleme; S4 raporu |
| 20 | Kupon invariant'ları (§4.2) | KAPANDI (S4) | `templates/db/coupons.sql` (üç-durum CHECK, partial unique); ADR-0011 ACCEPTED |
| 21 | BFF hardening (§4.3) | KAPANDI (S4) | `templates/admin-bff/server.mjs` (413/504/Secure) + README checklist; kalan checklist kalemleri R5 |
| 22 | Payment port güçlendirme (§4.4) | KAPANDI (S4) | `templates/payments/PaymentProvider.java` (idempotencyKey + PaymentStatus); ADR-0007 şerhi |
| 23 | Baseline Security Gate (§4.6) | KAPANDI (S4) | `docs/audits/2026-07-03-baseline-security-review.md` — PASS; 4 MEDIUM sprint içinde 0'a indi |
| 24 | Secret taraması derinleştirme (§2.4) | KAPANDI (S2+S4) | Genişletilmiş pattern seti + redirect-guard + CI Gitleaks; S4: settings.json Read-deny paritesi |
| 25 | Backend baseline (§4.5) | KAPANDI (S4) | health live/ready + fail-fast config + `templates/operations/production-checklist.md`; IT 3/3 |
| 26 | it-local kanıtı (§4.7) | KAPANDI (S4) | S4 raporu — BUILD SUCCESS 3/3; sapma (geçici PG16:55432 + env override) raporda belgeli. **Güncelleme (2026-07-03): lokal PG ile de doğrulandı** — kullanıcı koşusu: `IT_DB_PASSWORD` user-env override, Docker KAPALI, `mvn verify -Pit-local` → BUILD SUCCESS, Tests run: 3 (insan teyidi); sapma tamamen kapandı, rehber yolu birebir çalışıyor |
| 27 | Uçtan uca pilot (§4.8) | KAPANDI (S4) | Bootstrap dry-run + tam gate zinciri (remediation döngüsü dahil); S4 raporu + `docs/audits/seo/2026-07-03-web-home-last-updated.md` |

**Kapsam-dışı kararlar (brief'in kendi kaydı; ayrı madde değil):** Playwright →
`templates/e2e` aktivasyon modülü · Actuator/metrics → production-checklist ·
Spring Boot 4.x → ADR-0010 PROPOSED · payment portunun tam production tasarımı →
sağlayıcı seçimi ADR'ı.

## Risk Defteri (sahipli — genel verdict'i engellemez)

| # | Risk | Severity | Sahip | Takip |
|---|------|----------|-------|-------|
| R1 | Favicon eksik (SEO, taşınan) | MEDIUM | seo-specialist | Gerçek-proje SEO sprint'i |
| R2 | sitemap `lastModified` build-time sabit; `getLastUpdated()`'a bağlanabilir | MEDIUM | seo-specialist | sitemap-lastmod bağlama görevi |
| R3 | Sayfa `lang="en"` / footer `lang="tr"` karışımı | MEDIUM | ux-ui-designer | Gerçek projeye dönüşümde dil kararı |
| R4 | `apps/web/app/page.tsx` "Spring Boot 3.3" metni bayat (baseline 3.5) | LOW | project-manager | İçerik-tazeleme görevi |
| R5 | BFF-1/2/3 (rate-limit / Origin / CORS+content-type+yanıt şeması) aktivasyon checklist'inde | MEDIUM | aktivasyon-anı implementer | BFF kopyalanırken checklist tamamlanmadan deploy yasak |
| R6 | `apps/web/tsconfig.tsbuildinfo` git'te izleniyor (build artefaktı) | LOW | orkestratör | `.gitignore` adayı, ayrı hijyen commit'i |
| R7 | ~~Denetim maddesi #18 kaynak-eşleme boşluğu~~ **KAPANDI** (`4d917ae`) | — | — | Kaynak metin kullanıcıdan alındı; ESLint zenginleştirme + ADR-0012 ile kapatıldı |

## Lessons (kayıt — gelecekteki projelere taşınır)

1. **CI #15 — kanıt dosyası / pattern taraması yarışı:** Kanıt ve memory
   dosyaları gate koşusundan SONRA yazılır; pattern taramaları bunları ancak
   sonraki koşuda görür. Çözüm: kanıt yolu muafiyeti + zorunlu negatif test
   (`scripts/tests/verify-structure-negative.mjs`) + kapanış-sonrası
   verify-structure adımı (/finish-session). Kural: her tarama muafiyeti,
   muafiyetin taramayı gevşetmediğini kanıtlayan negatif testle birlikte gelir.
2. **memory-steward sentez olayı (Sprint 4 kapanışı):** Steward (haiku), uzun
   kapanış handoff'unu özetlemek yerine İÇERİK UYDURDU — var olmayan dosyalar
   (V4__coupons.sql, Coupon.java, date-utils.ts), yanlış CHECK tanımı ve
   uydurma risk numaraları yazdı. PM memory diff denetimi yakaladı; iki dosya
   verbatim içerikle yeniden yazdırıldı (tek-yazar kuralı korunarak). Kalıcı
   düzeltme (c112eee): ajan talimatına "kapanışta sentezleme yapma — verbatim
   metin verildiyse birebir yaz; yoksa yalnız handoff olgularını kaydet,
   dosya/risk/karar uydurma" kuralı eklendi. Ders: düşük-kapasiteli modele
   giden kapanış handoff'ları birebir yazılacak metin içermeli; memory diff
   denetimi atlanamaz bir gate'tir.
3. **TZ deseni (pilot remediation):** SSG tarih üretiminde makine-okunur (iso)
   ve insan-okunur (display) değerler AYNI UTC gününden türetilmeli
   (`Intl.DateTimeFormat(..., { timeZone: "UTC" })`); aksi negatif-offset
   TZ'lerde gün kayması ve flaky test üretir.
4. **#18 eşleme boşluğu (insan/orkestratör hatası sınıfı):** Boşluğun kaynağı
   ajan değil, brief'i yazan orkestratörün 27 maddeden birini sprint
   görevlerine eşlemeyi atlamasıydı. Ders: insan/orkestratör eşleme hataları
   da tablo doğrulamasıyla yakalanır — kaynak-listeden türetilen her plan,
   kapanışta madde-madde tablo mutabakatından geçirilmeli (eksik numara =
   otomatik bulgu). Bu resertifikasyonun 27 madde tablosu boşluğu tam bu
   mekanizmayla görünür kıldı; kaynak metin alınınca madde `4d917ae` ile
   kapatıldı.

## Güncelleme — 2026-07-03, #18 kapanışı (`4d917ae`)

Kaynak metin kullanıcıdan alındı ve madde aynı gün kapatıldı: web'e
CWV+hooks+a11y, admin'e hooks+a11y+refresh, iki app'e cross-app import sınırı;
type-aware lint ölçüm sonucuyla ADR-0012'de ertelendi (meşru kapsam kararı).
Doğrulama (`4d917ae` çalışma ağacında koşuldu, commit'le mühürlendi):
`pnpm gate` 7/7 PASS — lint PASS (yeni kurallarla 0 ihlal), structure 862
checks OK, mvn verify 3/3. Genel verdict PASS_WITH_RISKS olarak sürer
(kalan: R1–R6).

## Sonraki Adımlar

1. `git push` (insan onayı: `c112eee` + rapor commit'leri + `4d917ae`) →
   CI 4 job yeşil teyidi → bu raporun CI satırı tam kapanır.
2. R1–R6 takip görevleri planlanır (resertifikasyon sonrası backlog).
