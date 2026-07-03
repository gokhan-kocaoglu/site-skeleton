# Faz 8.2 — Mühürleme Sprinti (Bağlayıcı Brief)

> Kaynak: İkinci bağımsız denetim (skor 6.5-7.0 → 8.0-8.3, Koşullu GO) +
> Fable doğrulaması. Tüm bulgular geçerli onaylandı. Hedef: kalan governance
> mühürleri + hijyen açıklarının TAMAMI (R1-R6 dahil) tek sprintte kapanır;
> yalnız bir madde (branch protection) insan kararına bağlıdır.
> Çalışma kuralı: tek sprint, sonunda DUR; kanıt raporu commit-hash'li;
> her kanıt raporuna CI workflow run URL'si yazılır (yeni kural, N4).

---

## BLOK 1 — Governance mühürleri

### 1.1 code-reviewer handoff düzeltmesi (C/N1)
- .claude/agents/code-reviewer.md: `HANDOFF → team-lead` → `HANDOFF → project-manager`
  (memory işi gerekiyorsa ayrıca `HANDOFF → memory-steward`).
- Tüm ajan/skill/komut dosyalarında `team-lead` ve diğer tanımsız rol
  referansları grep'lenir; bulunanlar düzeltilir.
- YAPISAL ÖNLEM: verify-structure'a yeni kontrol — governance dosyalarındaki
  (agents/skills/commands/rules) `HANDOFF →` hedefleri 9 geçerli ajan adından
  biri olmalı; değilse FAIL. Negatif test eklenir.

### 1.2 Verdict disiplini standardizasyonu (E/N2)
- verdict-policy.md'ye net kural bloğu:
  - Açık risk YOK → PASS
  - LOW/MEDIUM/HIGH bilinçli+kayıtlı risk var → PASS_WITH_RISKS
  - CRITICAL/BLOCKER → FAIL
  - Aktivasyona/ileriye ERTELENMİŞ riskler de "açık risk"tir → PASS diyemez.
- Baseline security review raporunun verdict'i PASS → PASS_WITH_RISKS olarak
  düzeltilir (düzeltme şerhi tarihli; orijinal metin korunur — kanıt bütünlüğü).
- code-reviewer ve qa-quality-gate bu bloğa referans verir.

### 1.3 Coverage dili hizalaması (D)
- qa-quality-gate SKILL.md: "kapsam hedefi ≥ %80" →
  "Başlangıç minimumu %60 (gate threshold); feature bazında hedef %80;
  auth/ödeme/para hesabı gibi kritik domainlerde %80 zorunlu."
- CLAUDE.md konvansiyon satırıyla bire bir aynı dil.

### 1.4 Memory mühür konvansiyonu (B/N3)
- memory-protocol + finish-session güncellemesi: milestone/sertifikasyon
  kapanışlarında closure commit'inden SONRA tek satırlık
  `chore(memory): seal <session> — closure hash <hash>` commit'i atılır;
  Current Status'teki PENDING gerçek hash ile değiştirilir. Mühür commit'i
  hiçbir kanıtta referanslanmaz (zincir sonlanır).
- UYGULA: Session 05'in PENDING'i bu sprintte mühürlenir.
- session-close-validator: milestone kapanışında PENDING bırakılmışsa
  bir sonraki kapanışta mühür zorunluluğunu hatırlatır (uyarı, blok değil).

### 1.5 Doküman tazeliği (F + N4)
- README: "8 verified phases" → "8 build phases + 8.1 remediation +
  8.2 sealing (recertified)". Faz haritası güncellenir.
- Recertification raporuna (şerhle) CI workflow run URL/ID'leri eklenir.
- YENİ KURAL (qa-quality-gate): her kanıt raporu, doğrulandığı CI run'ının
  URL'sini içerir; insan teyidi yalnız URL erişilemezse son çaredir.
  (Run URL'sini kullanıcı sağlar — Claude Code CI'a erişemez, bilinen sınır.)

## BLOK 2 — Hijyen kapanışları (R1-R4, R6/N9, N8)

### 2.1 R6/N9 — tsbuildinfo (kökten)
- .gitignore'a `*.tsbuildinfo` pattern'i (path değil, pattern).
- `git rm --cached` ile takipten çıkar. verify-structure'a mustBeAbsent
  benzeri kontrol: takip edilen dosyalar arasında *.tsbuildinfo olamaz.

### 2.2 R4 — page.tsx sürüm metni (drift'e kapalı çözüm)
- "Spring Boot 3.3" → sürümsüz "Spring Boot API" (pazarlama metninde sürüm
  numarası kalıcı drift kaynağıdır; sürüm bilgisi README/pom'un işidir).
- Aynı sayfadaki diğer sürümlü metinler de (varsa Next/React) sürümsüzleştirilir.

### 2.3 R1 — favicon seti
- apps/web/app/icon.svg (nötr placeholder — design-tokens paletinden,
  ham hex yasal değil; Next.js app router icon konvansiyonu) + apple-icon.
- Bootstrap script'in rename kapsamına icon alt metni dahil edilmez (görsel).

### 2.4 R2 — sitemap lastModified
- Mevcut getLastUpdated() sitemap.ts'e bağlanır; test güncellenir.

### 2.5 R3 — dil bütünlüğü
- Template kararı: public yüzey (web sayfası, admin placeholder) TAMAMEN
  İngilizce (kod-İngilizce politikasıyla tutarlı; gerçek projede dil,
  brief ile belirlenir ve bootstrap sonrası ilk UX görevi olur).
- lang="en" + tüm görünür metinler İngilizce'ye hizalanır; karar
  README'ye tek satır not.

### 2.6 N8 — bilinen 2 type-safety bulgusu
- ADR-0012'de kayıtlı 2 no-unsafe-assignment bulgusu ŞİMDİ düzeltilir
  (type-aware lint'in kendisi ADR gereği ertelenmiş kalır — bulgu bilinip
  bırakılmaz, kural pahalıysa ertelenir ilkesi).
- ADR-0012'ye şerh: "bilinen bulgular 8.2'de kapatıldı; kural benimseme
  kararı ilk projede."

## BLOK 3 — Yapısal iyileştirmeler

### 3.1 N6 — gate-audit INCONCLUSIVE görünürlüğü
- run-gates özet tablosuna üçüncü sonuç tipi: PASS / FAIL / INCONCLUSIVE.
- Herhangi bir gate INCONCLUSIVE ise genel çıktı "All gates PASS" DEĞİL,
  "PASS_WITH_WARNINGS — audit inconclusive locally" (exit 0 lokalde korunur,
  CI=true davranışı değişmez). Fixture/test güncellenir.

### 3.2 N7 + R5 — BFF: ucuz düzeltmeler + aktivasyon kapısı
- server.mjs üç düzeltme: 204 response'ta body gönderilmez; JSON parse
  hatası genel 500 yerine 400 (client) / 502 UPSTREAM_MALFORMED (upstream)
  ayrımıyla; body limiti karakter değil BYTE sayarak (Buffer.byteLength).
- AKTİVASYON KAPISI (yapısal): templates/admin-bff/ACTIVATION.md şablonu —
  12 maddelik hardening checklist işaretlenebilir formatta. verify-structure
  yeni kural: repo'da apps/**/admin-bff (veya package.json name'i admin-bff
  olan workspace) TESPİT EDİLİRSE, ACTIVATION.md'nin kopyalanmış ve TÜM
  maddelerinin işaretlenmiş olması zorunlu; değilse structure gate FAIL.
  Negatif test: sahte apps/admin-bff ile FAIL üretimi kanıtlanır.
- R5 böylece "sonraki projenin disiplinine" değil mekanizmaya bağlanır.

## BLOK 4 — İnsan karar noktası (A/N5): Branch protection

İki seçenek (Claude uygulamaz, kullanıcı karar verir; brief'e karar işlenir):
- SEÇENEK A (önerilen): Repo PUBLIC yapılır → ruleset enforcement ücretsiz
  aktifleşir, "Use this template" butonu görünür olur. Ön koşul (bu sprintte
  Claude doğrular): gitleaks tam-geçmiş temiz (mevcut CI kanıtı), memory ve
  session loglarında kişisel/hassas veri taraması (isim dışında) temiz.
  Sonrası kullanıcı adımı: Settings → General → Change visibility → Public;
  ruleset'in Active olduğunun teyidi; ci.md kısıt notu "kapatıldı" şerhi.
- SEÇENEK B: Private kalır → risk defterine R8 olarak sahipli kayıt
  ("enforcement plan kısıtıyla pasif; public/plan değişiminde kapanır").

## FİNAL
1. pnpm gate 7/7 + mvn verify + hook harness (assertion sayısı düşmez;
   1.1 ve 3.2 negatif testleriyle ARTAR) + verify-structure.
2. Kanıt raporu: docs/test-reports/<tarih>-faz8.2-sealing.md — commit hash
   + CI run URL (kullanıcıdan) ile.
3. Recertification raporuna 8.2 eki: A-F + N1-N9 + R1-R6 → kapanış tablosu.
4. Session kapanışı + MÜHÜR commit'i (1.4'ün ikinci uygulaması — PENDING
   kalmadan biter).
5. Risk defterinin yeni durumu: ideal sonuç boş defter + (Seçenek B ise) R8.
