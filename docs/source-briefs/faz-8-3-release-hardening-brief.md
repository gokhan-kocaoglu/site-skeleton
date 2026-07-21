# Faz 8.3 — Release Hardening (Bağlayıcı Brief)

> Kaynak: Üçüncü bağımsız denetim (nihai 7.8/10, PASS_WITH_RISKS / Koşullu GO)
> + Fable doğrulaması (Vite destek durumu birincil kaynaktan teyitli; Boot
> çelişkisi ADR-0009/0010'da yazılı). 4 HIGH + 10 MEDIUM'un tamamı geçerli.
> Hedef: "eksiksiz senior production-ready template" etiketinin önündeki tüm
> engellerin kapanması ve dış-attestation'lı ilk release.
>
> YENİ ÇALIŞMA AKIŞI (bağlayıcı): Ruleset aktif — main'e doğrudan push
> reddedilir. Tüm iş feature branch'te yapılır; push → PR → 4 required check
> yeşil → merge. Memory kapanışı MERGE SONRASI yapılır (HIGH-4'ün kök çözümü).
> Kanıt kuralı: repo-içi kanıt = pre-merge commit + PR run URL; final merge
> SHA + run ID = dış immutable attestation (GitHub Release/tag) — MEDIUM-10.

---

## BLOK P0-1 — Stack yükseltme (HIGH-1, eski #15 yeniden açıldı)

### 1.1 Spring Boot 4.1.x
- apps/api → Spring Boot 4.1.x (güncel patch). ADR-0010 ACCEPTED'a çevrilir
  (tetik: template baseline EOL hatta kalamaz; ADR-0009 kural 1).
- Migration resmi rehberden doğrulanarak yapılır (Jakarta/config/properties
  değişimleri; Testcontainers/Flyway sürümleri BOM'dan — pin yalnız kanıtlı
  gereklilikte). mvn verify (Docker + it-local) yeşil kanıtı zorunlu.
- CLAUDE.md Installed baseline + README + setup rehberi güncellenir
  (installedBaseline drift kontrolü zaten yakalar — dokümanlar kodla birlikte).

### 1.2 Vite 8.x (admin)
- apps/admin → Vite 8.x + uyumlu @vitejs/plugin-react + @tailwindcss/vite.
  Kırılan config/test güncellenir; pnpm gate yeşil kanıtı.

### 1.3 Next.js 16 (web)
- Hedef: 16.x Active LTS'e yükseltme DENENİR (kod tabanı minimal — tek sayfa,
  metadata, robots/sitemap). Başarılıysa geçilir; migration maliyeti beklenmedik
  şekilde büyükse gerekçeli ADR ile 15.5-Maintenance'ta kalınır ve ilk projede
  yeniden değerlendirme şartı yazılır (karar kanıtla, varsayımla değil).
- ADR-0009'a ek: baseline sürüm politikası "Active LTS/desteklenen hat" olarak
  netleştirilir; Dependabot minor/patch akışıyla nasıl korunacağı yazılır.

## BLOK P0-2 — Backend supply-chain gate (HIGH-3)

- CI'ya Java bağımlılık taraması: araç seçimi Claude'da (Trivy+CycloneDX SBOM
  veya OWASP Dependency-Check veya eşdeğer; hız/NVD-veri gereksinimleri
  karşılaştırılıp ADR notu yazılır). Kural: HIGH/CRITICAL → job FAIL (required
  check'e eklenir → ruleset güncellemesi kullanıcı adımı).
- SBOM artifact olarak yüklenir. Public repo avantajı: GitHub dependency
  review PR'larda etkinleştirilir (ücretsiz).
- production-checklist'teki ilgili madde "çekirdeğe alındı" şerhiyle kapanır.

## BLOK P0-3 — Gerçek /new-project sertifikasyonu (HIGH-2; #11/#12/#27 tam kapanış)

bootstrap-project.mjs yeniden güçlendirilir:
- **projectSlug kaydı:** apply sonrası manifest'e "projectSlug" yazılır.
  Yeniden çalıştırmada: aynı slug → idempotent temiz çıkış; FARKLI slug →
  kontrollü FAIL (açık hata mesajı). Sayaç-tabanlı idempotency kaldırılır.
- **Clean-worktree preflight:** kirli çalışma ağacında apply reddedilir.
- **Plan-sonra-uygula atomikliği:** tüm ikameler/taşımalar önce plana yazılır,
  hedefler doğrulanır, sonra uygulanır; herhangi bir adım hatasında rollback
  (git stash/checkout tabanlı veya ters-plan) — yarım dönüşüm bırakılmaz.
- **Memory üretimi script'e alınır (deterministik):** apply,
  project-memory/.../01_Projects/<Slug>/ klasörünü _TEMPLATE'ten kopyalar,
  Project Brief/Current Status/Backlog başlıklarını slug ile doldurur;
  SiteSkeleton operasyonel memory'si _ARCHIVE/SiteSkeleton/ altına taşınır
  (silinmez — tarihsel kanıt).
- **Dinamik memory manifesti:** mode=project iken verify-structure,
  01_Projects/<projectSlug>/ altındaki zorunlu dosyaları arar; SiteSkeleton
  yolu yalnız skeleton-dev modunda zorunludur.
- **Generated-repo otomatik testi:** scripts/tests/bootstrap-e2e.mjs —
  repo'yu geçici dizine kopyalar (refs/node_modules hariç) → --apply →
  pnpm install → pnpm gate (SKIP_API=1) → verify-structure (mode=project)
  → aynı slug ikinci koşu idempotent → farklı slug FAIL assert edilir.
  CI'da ayrı job: bootstrap-e2e (mvn verify hariç — süre; API kanıtı ana
  job'da zaten var). Job required-check listesine eklenir.

## BLOK P0-4 — Post-merge memory + dış attestation (HIGH-4, MEDIUM-10)

- **Akış güncellemesi (memory-protocol + finish-session):** PR akışında
  kapanış sırası: implementation branch'te biter → PR merge edilir →
  MERGE SONRASI main'de memory closure yapılır (Current Status gerçek
  duruma: merge SHA, PR no, final run) → seal. "Push bekleniyor" tipi
  ifadeler merge sonrası KALAMAZ.
- **Tazelik kontrolü (validator güçlendirmesi):** session-close-validator'a
  semantik asgari: kapanış anında Current Status'te "push bekleniyor/
  pending/onay bekliyor" kalıpları varsa VE working tree main'de temizse
  uyarı/blok (kalıp listesi dosyada belgeli). Ayrıca "Son Uygulama Commiti"
  hash'inin `git merge-base --is-ancestor` ile HEAD atası olduğu doğrulanır
  (git yoksa fail-safe atla).
- **Mevcut bayat durum düzeltilir:** Current Status + session-06 log'u
  gerçek duruma çekilir (şerhle; PR #14, merge f2389dd, CI #29 kayda girer).
- **Dış attestation:** Faz 8.3 sonunda GitHub Release (tag) oluşturulur;
  Release notunda: final merge SHA, final CI run URL, kanıt dosyaları
  linkleri. qa-quality-gate kuralı güncellenir: repo-içi kanıt pre-merge
  run'ı gösterir; final zincir Release'te mühürlenir (kanıt döngüsü biter).
  Release oluşturma kullanıcı adımıdır; Claude içerik taslağını hazırlar.

## BLOK P1 — Senior mühürleri (MEDIUM 2-9)

- **P1.1 Verdict eşlemesi tekleştirme (M2):** code-reviewer "Approve =
  CRITICAL+HIGH yok" → policy diliyle değiştirilir: açık MEDIUM/LOW varsa
  Approve verilebilir ama rapor verdict'i PASS_WITH_RISKS olmak ZORUNDA.
  rules/common/code-review.md aynı dile çekilir. Baseline security review
  sonundaki "genel Security gate sonucu PASS" cümlesine düzeltme şerhi.
- **P1.2 Placeholder handoff kapatma (M3):** system-architect ve
  qa-test-specialist'teki `HANDOFF → <sonraki-rol>` somut hedefe çevrilir;
  verify-structure regex'i genişletilir: `HANDOFF →` içeren her satırda
  hedef ya 9 geçerli ajan ya FAIL (placeholder/`<...>` dahil yakalanır).
  Negatif test güncellenir.
- **P1.3 Authority map netleştirme (M4):** tablo üç kolona ayrılır:
  İçerik sahibi / Fiziksel yazar (orkestratör|ajan) / Onaylayan.
  "Yazma yetkisi" ifadesi düzeltilir.
- **P1.4 Shell yazım guard'ı (M5):** yeni PreToolUse Bash|PowerShell hook'u
  (veya pre-bash-redirect-guard genişletmesi): dosya-yazan komut kalıpları
  (Set-Content, Out-File, Add-Content, tee, cp/copy, mv/move, >, >>)
  + hedef project-memory/** → ask ("tek yazar memory-steward"); hedef fark
  etmeksizin komut metninde secret pattern → ask. Sınır dürüstçe belgelenir
  (tam kapsama imkânsız; Gitleaks CI güvenlik ağı). Fixture'lar eklenir.
  Faz 8.2'deki fiilî bypass olayı lessons'a işlenir.
- **P1.5 Actions SHA pinleme (M6):** ci.yml'deki tüm action'lar full-length
  commit SHA'ya pinlenir (yanına sürüm yorumu); dependabot github-actions
  ekosistemi SHA güncellemelerini sürdürür (davranış teyit edilip not düşülür).
- **P1.6 Activation gate güçlendirme (M7):** tespit recursive (apps/**
  tüm derinlik) + üç sinyalden herhangi biri: dizin adı *bff*, package name
  *bff*, VEYA dosya içeriğinde şablon imza sabiti (server.mjs'e eklenecek
  `ADMIN_BFF_TEMPLATE_MARKER` yorumu — kopyalamada taşınır). Negatif testler:
  apps/auth-bff rename senaryosu FAIL üretmeli.
- **P1.7 Kritik-domain %80 coverage teli (M9):** vitest config'lerine
  path-tabanlı eşik: src/**/{auth,payment,billing}/** mevcutsa o dosyalar
  için %80 (glob-koşullu; iskelette dormant ama telli). Negatif kanıt:
  geçici sahte auth dosyası düşük coverage ile gate FAIL (test scriptiyle).
- **P1.8 Formal task card zorunluluğu (M8):** kural netleşir: başlığında/
  gövdesinde "Task Card" şablon işareti taşıyan kartlarda 4 risk alanı
  ZORUNLU (eksik → exit 2); işaretsiz mikro-görevlerde yalnız hatırlatma.
  /start-feature'ın ürettiği kartlar HER ZAMAN formal. Fixture'lar güncellenir.

## FİNAL — Release
1. Tam doğrulama: pnpm gate + mvn verify (4.1.x; Docker + it-local) +
   hook harness (assertion artar) + verify-structure negatif senaryolar
   (bootstrap-e2e dahil) + CI tüm job'lar (yeni supply-chain + bootstrap-e2e
   dahil) yeşil.
2. Kanıt raporu: docs/test-reports/<tarih>-faz8.3-release-hardening.md
   (pre-merge commit + PR run URL).
3. Resertifikasyona 8.3 eki: HIGH-1..4 + MEDIUM-1..10 kapanış tablosu;
   yeniden açılan #9/#11/#12/#15/#27 satırları "tam kapandı"ya çekilir.
4. PR → merge → POST-MERGE memory closure (yeni akışın ilk tam uygulaması)
   → seal.
5. Kullanıcı: GitHub Release **v1.0.0-rc.1** (Claude taslağıyla; merge SHA
   + run URL + kanıt linkleri). v1.0.0 etiketi, dördüncü mini-denetim
   "production-ready" hükmü verdikten sonra atılır.

## Kapsam kararları (değişmedi, kayda geçer)
- BFF/payment/E2E/backend-ops aktivasyon modülleri olarak kalır; genel
  anlatımda "tüm modülleriyle production-ready" İFADESİ KULLANILMAZ —
  README diline "core production-ready; optional modules require activation
  hardening" ayrımı eklenir.
