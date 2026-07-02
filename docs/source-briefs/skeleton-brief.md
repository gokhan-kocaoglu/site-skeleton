# Genel Site İskeleti — Claude Code Kurulum Rehberi

> Amaç: Belirli bir site değil, **her yeni projede kopyalanıp "şöyle bir site olacak" demenin
> yeteceği** proje-bağımsız bir ana iskelet (template repo) kurmak.
> Ortam: Windows 11 · VS Code · Claude Code (terminal) · PostgreSQL 16 · Obsidian

---

## 0. Mimari Model (tek cümle)

```
PRODUCT MONOREPO + PROJE-ÖZEL AJAN TAKIMI + CANONICAL DOKÜMANTASYON
+ TOKEN-MINIMAL MEMORY + KANIT TABANLI QUALITY GATE ZİNCİRİ
```

### Kaynak repolardan ne alınıyor, ne alınmıyor

| Kaynak | Alınan | Alınmayan (neden) |
|---|---|---|
| **affaan-m/ECC** | `rules/common`, `rules/typescript`, Spring Boot / JPA / Postgres / frontend / api-design / database-migrations / e2e-testing / security-review / verification-loop skill'leri; `planner`, `architect`, `java-reviewer`, `typescript-reviewer`, `database-reviewer`, `security-reviewer` ajan desenleri | Full installer / plugin kurulumu (context şişirir; ECC dokümanı bile <10 MCP, <80 tool der). Kural: **kur değil, seçmeli kopyala.** |
| **ruvnet/ruflo** | `refs/ruflo` olarak klonlanır, SADECE incelenir: task routing, quality-gate zinciri, memory namespace, hook lifecycle desenleri; katkı varsa ADR önerisi olarak raporlanır | Kurulum/bağımlılık olarak eklenmez: swarm/MCP sunucusu, 100+ ajan, daemon (context maliyeti yüksek) |
| **premium-3d-cicekci** (kendi projen) | 8 ajan rol modeli, memory-steward tek-writer kuralı, frontend-design-gate & style-audit skill'leri, HANDOFF formatı, governance zinciri | Çiçekçiye özel isimler, domain modeli |
| **safishamsi/graphify** | Skill olarak (knowledge graph üretimi + token-minimal sorgu) | — |
| **nextlevelbuilder/ui-ux-pro-max-skill** | **User-level** skill olarak (proje reposuna girmez) | — |
| **21st.dev Magic MCP** | **User-scope** MCP olarak (API key repoya asla girmez) | — |

---

## 1. Klasör Ağacı (proje-bağımsız hali)

```
site-skeleton/
├── apps/
│   ├── web/                     # Public site (Next.js 15, App Router, SEO-first)
│   ├── admin/                   # Yönetim paneli SPA (Vite + React 19)
│   └── api/                     # Backend (Spring Boot 3.3, Java 21)
│
├── templates/                   # Şarta bağlı, kopyala-etkinleştir parçalar
│   ├── admin-bff/               # HttpOnly refresh-cookie köprüsü (ayrı SPA subdomain gerekirse)
│   └── payments/                # PaymentProvider port + iyzico/stripe adaptör iskeleti
│
├── packages/
│   ├── design-tokens/           # Renk, font, spacing, shadow (Tailwind v4 @theme)
│   ├── api-types/               # OpenAPI → TypeScript üretimi
│   └── ui-primitives/           # (opsiyonel) ortak component katmanı
│
├── .claude/
│   ├── agents/                  # 9 subagent (aşağıda)
│   ├── skills/                  # 10 skill (aşağıda)
│   ├── commands/                # /new-project /start-feature /create-adr /quality-gate
│   │                            # /seo-audit /update-memory /finish-session
│   ├── rules/                   # ECC'den uyarlanan governance kuralları
│   ├── hooks/                   # lifecycle doğrulayıcı scriptler (Node.js)
│   ├── mcp/                     # SADECE .example.json placeholder config'ler
│   └── settings.json
│
├── docs/
│   ├── adr/                     # ADR-0000-template.md ile başlar
│   ├── architecture/
│   ├── api-contracts/           # openapi.yaml + üretim scripti
│   ├── ux/
│   ├── test-reports/
│   ├── audits/
│   ├── operations/              # authority-map.md, ci.md, deployment.md
│   ├── setup/                   # local-setup-windows.md
│   └── source-briefs/           # yeni projede "şöyle bir site olacak" buraya yazılır
│
├── project-memory/
│   └── ClaudeTeamMemory/        # Obsidian vault (yapı §5)
│
├── scripts/
│   └── quality/                 # gate-typecheck, gate-test, gate-lint, gate-audit
│
├── prompts/                     # tekrar çalıştırılabilir görev promptları
├── refs/                        # (gitignore'lu) incelenen referans repolar buraya klonlanır
├── CLAUDE.md                    # kök yönerge (token-minimal, §6'daki şablon)
├── package.json  pnpm-workspace.yaml  turbo.json  .gitignore  README.md
```

Cicekci'den farklar ve gerekçeleri:
- `storefront` → `web` (genel isim).
- `admin-bff` → `templates/` altına indi: her sitede gerekmez, gerektiğinde `apps/`e kopyalanır.
- `templates/payments/` eklendi: ödeme kararı ertelenmiş ama **port/adapter iskeleti** hazır durur.
- `refs/` eklendi: referans repoları klonlayıp inceletmek için, `.gitignore`'da.

---

## 2. Ajan Takımı (9 subagent)

Her ajan `.claude/agents/<isim>.md` — YAML frontmatter + sistem talimatı.
**İletişim modeli:** Subagent'lar birbirini göremez. Orkestratör = ana Claude Code oturumu
(PM şapkasıyla). Ajanlar çıktılarını **dosyaya** yazar (docs/ + project-memory/), orkestratör
sonraki ajanı bu dosyaları referans göstererek çağırır.

| Ajan | Model | tools kısıtı | Görev + yazma yetkisi |
|---|---|---|---|
| `project-manager` | opus | Read, Grep, Glob | Scope, risk, task DAG, plan onayı, bağımsız diff denetimi, final sentez. **Kod yazmaz.** |
| `system-architect` | opus | Read, Grep, Glob, WebSearch | Mimari, contract, auth, DB tasarımı → yalnız `docs/adr`, `docs/architecture`, `docs/api-contracts` yazar |
| `ux-ui-designer` | sonnet | Read, Grep, Glob | User flow, screen map, a11y → yalnız `docs/ux` yazar |
| `frontend-developer` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `apps/web`, `apps/admin`, `packages/design-tokens|ui-primitives` yazar |
| `backend-developer` | sonnet | Read, Edit, Write, Bash, Grep, Glob | `apps/api`, migration'lar yazar |
| `seo-specialist` | sonnet | Read, Grep, Glob, WebSearch, Bash | **YENİ.** Metadata API, structured data (JSON-LD), sitemap/robots, canonical, OG, Core Web Vitals bütçesi, Lighthouse denetimi → `docs/audits/seo/` yazar. Her `web` feature'ında zorunlu gate. |
| `qa-test-specialist` | sonnet | Read, Edit, Write, Bash, Grep, Glob | Test planı + PASS / PASS WITH RISKS / FAIL raporu → `docs/test-reports` yazar |
| `code-reviewer` | opus | Read, Grep, Glob, Bash | Security Gate + Final Review. **Read-only + test çalıştırma.** → `docs/audits` yazar |
| `memory-steward` | haiku/sonnet | Read, Edit, Write, Grep, Glob | `project-memory/` **tek writer'ı**. Yalnız QA PASS + Security PASS + Final Review PASS sonrası çalışır. |

Frontmatter örneği (`.claude/agents/seo-specialist.md`):

```markdown
---
name: seo-specialist
description: >
  apps/web'e dokunan her feature'da SEO uygunluk denetimi yapar. Metadata,
  JSON-LD, sitemap, canonical, OG, render stratejisi (SSR/ISR) ve CWV bütçesini
  kontrol eder. PASS/FAIL raporunu docs/audits/seo/ altına yazar. PROAKTIF:
  web'de UI/route değişimi olan her quality-gate'te çağrılmalıdır.
tools: Read, Grep, Glob, Bash, WebSearch
model: sonnet
---
Sen kıdemli bir teknik SEO uzmanısın... (kontrol listesi: title/description
uzunlukları, tek h1, semantic HTML, next/image kullanımı, hreflang gerekliliği,
robots kuralları, structured data şema doğruluğu, ISR/SSR seçiminin
indexlenebilirliğe etkisi, 404/redirect hijyeni)
```

### Handoff formatı (dosya tabanlı — mevcut protokolün korunuyor)

Her ajan görev sonunda şunu üretir ve orkestratör bir sonraki ajana bu dosyanın yolunu verir:

```
HANDOFF → <sonraki-rol>
- target-file / target-section / operation
- content-summary
- source-evidence: (dosya yolu + test/CI çıktısı)
- status-tag: PASS | PASS_WITH_RISKS | FAIL | BLOCKED
- open-risk / next-step
```

### Onay zinciri (gate sırası)

```
İnsan: brief onayı
→ PM: scope + risk sınıfı + task DAG        [İNSAN ONAYI: plan]
→ Architect: contract/ADR (gerekirse)
→ (web işiyse) UX + frontend-design-gate
→ Developer(lar): implementation
→ PM: bağımsız diff denetimi
→ QA gate                                   [FAIL → developer'a döner]
→ Security gate (auth/ödeme/veri işiyse zorunlu)
→ (web işiyse) SEO gate + frontend-style-audit
→ Final review
→ memory-steward: memory closure
→ PM: memory diff denetimi → commit/push    [İNSAN ONAYI: push]
→ Final evidence report
```

İnsan onayı yalnız 3 noktada: **brief, plan, push** (+ hooks'un yakaladığı riskli git/secret işlemleri).

---

## 3. Skill Seti (10 proje-local + 1 user-level)

| Skill | İşlev | Kaynak |
|---|---|---|
| `project-planning` | Brief → scope, non-goal, MVP, acceptance criteria | kendi projen |
| `memory-protocol` | §5'teki okuma sırası + session kapanışı | kendi projen |
| `feature-workflow` | §2'deki gate zincirini yürütür | kendi projen + ECC quality-gate |
| `adr-decision` | Kararları standart ADR formatına döker | kendi projen + ECC/ruflo adr |
| `qa-quality-gate` | PASS / PASS_WITH_RISKS / FAIL kapısı, kanıt zorunlu | kendi projen + ECC verification-loop |
| `token-optimization` | Context hijyeni, graph-önce-grep, model routing | kendi projen + ECC longform guide |
| `frontend-design-gate` | UI öncesi preflight: UI UX Pro Max → (gerekirse) 21st Magic → token mapping → Tailwind v4 planı → motion sınırı → a11y | kendi projen |
| `frontend-style-audit` | UI sonrası read-only denetim: inline style, ham hex, Tailwind v3 kalıbı, **framer-motion importu (yasak — `motion` kullanılır)**, reduced-motion eksikliği | kendi projen |
| `graphify` | Kod/dokümandan knowledge graph + token-minimal sorgu | safishamsi/graphify |
| `stack-patterns` | ECC'den damıtılmış: springboot-patterns/security/tdd, jpa-patterns, postgres-patterns, api-design, database-migrations, frontend-patterns, e2e-testing özetleri (tek skill altında referans dosyaları olarak) | affaan-m/ECC |

**User-level (repoya girmez):** `ui-ux-pro-max` → `~/.claude/skills/` altına kurulur.

### Command seti (`.claude/commands/`)

| Command | Ne yapar |
|---|---|
| `/new-project <isim>` | **İskeletin varlık sebebi.** source-brief ister, Obsidian'da `01_Projects/<isim>/` açar, Project Brief + Tech Stack + placeholder'ları doldurur, ilk task DAG'ını PM'e çıkarttırır. |
| `/start-feature` | feature-workflow skill'ini başlatır |
| `/create-adr` | adr-decision skill'ini başlatır |
| `/quality-gate` | QA + Security + (web ise) SEO + style-audit zinciri |
| `/seo-audit` | seo-specialist'i tek başına çağırır |
| `/update-memory` | memory-steward'a kontrollü handoff |
| `/finish-session` | Current Status güncelle + session log + kapanış özeti |

---

## 4. MCP Katmanı

Kural: **az MCP = sağlıklı context.** Bu iskelette tek zorunlu MCP var.

```powershell
# User scope — API key repoya girmez, tüm projelerde geçerli
claude mcp add magic --scope user --env API_KEY="YourAPIKey" -- npx -y @21st-dev/magic@latest
```

Repo tarafında yalnız örnek dosyalar:

```
.claude/mcp/
├── README.md                      # "gerçek config user scope'ta" açıklaması
├── 21st-dev-magic.example.json    # API_KEY: "PLACEHOLDER"
└── postgres.example.json          # ileride DB introspection istenirse
```

Opsiyonel (proje bazında, gerekirse): Playwright MCP (E2E görsel doğrulama),
Context7 (güncel kütüphane dokümanı). İkisini de ancak ihtiyaç doğunca ekle.

---

## 5. Memory Sistemi (iki katman — senin tasarımın, iki küçük düzeltmeyle)

Katman 1 (repo, canonical): `docs/` — karar ve kanıt. Katman 2 (Obsidian, operasyonel):
`project-memory/ClaudeTeamMemory/` — mevcut yapın aynen korunur (`00_System/` +
`01_Projects/<Proje>/` + 01_PM…08_Session_Logs).

Okuma sırası (token-minimal): `_CLAUDE.md` → `Project Brief` → `Current Status` →
görevin rol dosyaları → gerekirse son session log. **Asla tüm vault okunmaz.**
Graphify graph'ı varsa grep yerine graph sorgusu (hook hatırlatır).

Düzeltme 1 — *Current Status disiplini hook'la zorlanır:* `finish-session` hook'u
Current Status'ün 6 zorunlu bölümünü (aşama, son görev, aktif görev, blocker,
sonraki 3 adım, son commit kanıtı) doğrular; eksikse kapanışı reddeder.

Düzeltme 2 — *Yazılmayacaklar listesi hook'la zorlanır:* memory-steward'ın Write/Edit
çağrılarında PreToolUse hook'u secret pattern taraması yapar (sk-, ghp_, AKIA,
password=, BEGIN PRIVATE KEY...) — eşleşmede işlemi bloklar.

---

## 6. Kök CLAUDE.md Şablonu (token-minimal)

```markdown
# Site Skeleton — Çalışma Anayasası

## Kimlik
Monorepo: pnpm 9 + Turborepo + Node 22. apps/web (Next.js 15, React 19, TS strict,
Tailwind v4 CSS-first, TanStack Query, RHF+Zod, motion). apps/admin (Vite 5, React 19,
React Router v7, Zustand). apps/api (Java 21, Spring Boot 3.3, Spring Security 6,
JPA+Hibernate, PostgreSQL 16, Flyway, JJWT, Bucket4j, springdoc). Test: Vitest/TL/MSW
+ JUnit5/Testcontainers.

## Mutlak Kurallar
- Hibernate DDL: validate. Şema değişikliği YALNIZ Flyway V<n>__desc.sql.
- Para: NUMERIC(12,2). Tarih: TIMESTAMPTZ (UTC). Public ID: UUID, internal PK: BIGINT identity.
- Token'lar localStorage'a YAZILMAZ. Refresh token DB'de hash, rotation + reuse-revoke.
- framer-motion import YASAK → "motion" paketi kullanılır (motion/react).
- Ham hex renk YASAK → design-tokens. Inline style YASAK.
- Secret hiçbir dosyaya yazılmaz (.env.example hariç placeholder).
- Kategoriler hiyerarşiktir (parent_id, opsiyonel). Kupon: 8 hane benzersiz,
  %5–%50 (5'er adım), tek kullanımlık, ödeme onayında pasifleşir.

## Çalışma Düzeni
- Her iş /start-feature ile başlar; gate zinciri: PM→(Arch)→(UX)→Dev→PM diff→QA→
  Security→(SEO+style-audit)→Final→memory→commit.
- project-memory/ tek writer: memory-steward. Diğerleri HANDOFF gönderir.
- Memory okuma sırası: _CLAUDE.md → Brief → Current Status → rol dosyaları.
- Ajan tanımları .claude/agents/, iş akışları .claude/skills/ içindedir — oku, tekrar etme.

## Komutlar
pnpm build|test|type-check|lint (Turborepo). API: mvn verify (Testcontainers ile).
Quality gate: scripts/quality/*.
```

(Uzun açıklamalar CLAUDE.md'ye DEĞİL `docs/` ve skill'lere gider — CLAUDE.md her
oturumda okunur, kısa kalmalı.)

---

## 7. Domain Modeli Güncellemeleri (senin iki yeni şartın)

### Hiyerarşik kategori (opsiyonel, zorunlu değil)

```sql
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE RESTRICT,  -- NULL = kök
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  depth SMALLINT NOT NULL DEFAULT 0 CHECK (depth <= 3),           -- ADR ile sınır
  deleted_at TIMESTAMPTZ,                                          -- soft delete
  UNIQUE (parent_id, slug)
);
```

- Adjacency list + `depth` kolonu: basit, JPA ile doğal (`@ManyToOne parent`).
- `ON DELETE RESTRICT`: alt kategorisi/ürünü olan kategori yanlışlıkla silinemez.
- Admin ve web'de kategori ağacı recursive CTE ile tek sorguda çekilir.
- Derinlik sınırı (önerim 3) bir ADR konusudur; iskelette CHECK ile korunur.

### Kupon sistemi (ödemeli sitelerde etkinleşen modül)

```sql
CREATE TABLE coupons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code CHAR(8) NOT NULL UNIQUE,                 -- sistem üretir, karışan harfler yok (0/O,1/I)
  discount_percent SMALLINT NOT NULL
    CHECK (discount_percent BETWEEN 5 AND 50 AND discount_percent % 5 = 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PASSIVE')),
  created_by BIGINT NOT NULL REFERENCES users(id),
  used_at TIMESTAMPTZ,
  used_by_order_id BIGINT REFERENCES orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Kurallar (backend service katmanında):
- Kod üretimi: 8 hane, `SecureRandom`, benzersizlik DB unique + retry ile garanti.
  Aktif/pasif fark etmeksizin kod bir daha üretilmez (UNIQUE global).
- Admin UI: yüzde seçici 5→50 (step 5), "Oluştur" → kod + yüzde DB'ye, listede ACTIVE.
- Admin tüm kuponları (aktif+pasif) filtreli listeler.
- Kupon uygulama + ödeme onayı + `status='PASSIVE'` **tek transaction** —
  aynı kuponun iki siparişte yarışması `SELECT ... FOR UPDATE` ile engellenir.

### Ödeme (karar ertelenmiş — port hazır)

`templates/payments/` içinde: `PaymentProvider` interface (authorize/capture/refund/
webhook-verify), `IyzicoProvider` ve `StripeProvider` boş adaptörler, `docs/adr/`
içinde `ADR-XXXX-payment-provider.md` taslağı. Sağlayıcı seçimi o adıma gelince
ADR ile yapılır; iskelet sağlayıcı-bağımsız kalır.

---

## 8. Hooks (`.claude/settings.json` + `hooks/*.js`, Node ile — Windows uyumlu)

| Hook | Tetik | Doğrulama |
|---|---|---|
| `pre-write-secret-scan` | PreToolUse (Write/Edit) | Secret pattern → BLOK |
| `pre-bash-git-guard` | PreToolUse (Bash) | `push --force`, `reset --hard`, `checkout .` → kullanıcı onayı iste |
| `post-edit-style-guard` | PostToolUse (Edit, *.tsx/css) | ham hex, inline style, framer-motion importu → uyarı |
| `memory-writer-guard` | PreToolUse (Write, project-memory/**) | Aktif ajan memory-steward değilse → BLOK |
| `task-card-validator` | TaskCreated | Contract impact / race / auth boundary / rollback... alanları dolu mu ("N/A — gerekçe" kabul) |
| `session-close-validator` | Stop / finish-session | Current Status 6 bölüm + kanıt var mı |
| `graph-first-reminder` | PreToolUse (Grep, geniş arama) | GRAPH_REPORT.md varsa graph sorgusu öner |

---

## 9. ADIM ADIM KURULUM (terminalde sırayla)

### Faz 0 — Önkoşullar (bir kez, ~15 dk)

```powershell
node -v        # 22.x olmalı (değilse nodejs.org LTS)
corepack enable && corepack prepare pnpm@9.15.4 --activate
java -version  # 21 olmalı (yoksa Temurin 21)
mvn -v         # yoksa Maven kur
git --version  # Git for Windows şart (Claude Code Bash tool'u için)
claude --version
```

### Faz 1 — User-level kurulumlar (bir kez)

```powershell
# 1) 21st Magic MCP (user scope)
claude mcp add magic --scope user --env API_KEY="GERÇEK_KEYİN" -- npx -y @21st-dev/magic@latest

# 2) UI UX Pro Max skill (user-level)
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill "$env:TEMP\uipm"
# README'sindeki kurulum adımını uygula (tipik: skill klasörünü ~/.claude/skills/ altına kopyala)

# 3) Doğrula
claude mcp list
```

### Faz 2 — İskelet reposu + referansların hazırlanması (~10 dk)

```powershell
cd D:\Kodlar\Claude\site-skeleton
git init
mkdir refs
git clone --depth 1 https://github.com/affaan-m/ECC refs/ecc
git clone --depth 1 https://github.com/safishamsi/graphify refs/graphify
git clone --depth 1 https://github.com/gokhan-kocaoglu/premium-3d-cicekci refs/cicekci
git clone --depth 1 https://github.com/ruvnet/ruflo refs/ruflo
"refs/" | Out-File -Encoding utf8 .gitignore
code .        # VS Code aç → entegre terminal → claude
```

### Faz 3 — Claude Code ile iskeletin inşası (Plan Mode ile!)

Claude Code açıldığında **Shift+Tab ile Plan Mode'a geç**, sonra aşağıdaki
bootstrap promptunu yapıştır (bu rehberin tamamını da `docs/source-briefs/skeleton-brief.md`
olarak repoya koyup "bu dosyayı oku" demek daha da iyidir):

```
Bu repo, her yeni web projesinde kopyalanacak genel bir ANA İSKELET olacak.
docs/source-briefs/skeleton-brief.md dosyasını oku (yoksa: bu mesajdaki spesifikasyon
geçerli). refs/ altındaki üç repoyu incele:
- refs/ecc → rules/common, rules/typescript, skills/springboot-*, jpa-patterns,
  postgres-patterns, api-design, database-migrations, frontend-patterns,
  e2e-testing, security-review, verification-loop ve agents/planner, architect,
  java-reviewer, typescript-reviewer, database-reviewer, security-reviewer
  dosyalarını oku; bunları BİZE UYARLA (kopyala-yapıştır değil, damıt).
- refs/graphify → skill olarak .claude/skills/graphify altına uyarla.
- refs/cicekci → .claude/agents, .claude/skills, .claude/commands, hooks ve
  project-memory yapısını incele; proje-özel isimlerden arındırarak taşı.
- refs/ruflo → SADECE dokümantasyon ve ajan/workflow tanım dosyalarını incele
  (kod tabanını değil): orkestrasyon, gate zinciri ve memory desenlerinden bizim
  tasarıma katkı olacak bir şey varsa ADR önerisi olarak raporla. Ruflo'yu
  bağımlılık olarak KURMA, hiçbir bileşenini kopyalama.

Sonra ŞU PLANI çıkar (henüz kod yazma):
1) §1'deki klasör ağacı, 2) §2'deki 9 ajan (seo-specialist DAHİL), 3) §3 skill+command
seti, 4) §5 memory yapısı + Obsidian vault iskeleti, 5) §6 CLAUDE.md, 6) §7 domain
şablonları (hiyerarşik kategori + kupon migration şablonu + payments portu
templates/ altında), 7) §8 hooks (Node.js, Windows uyumlu), 8) pnpm workspace +
turbo + üç uygulamanın minimum ayağa kalkar iskeleti (web: tek sayfa + metadata,
admin: login placeholder, api: health endpoint + Flyway V1 + Testcontainers'lı
1 integration test), 9) scripts/quality gate'leri, 10) README + docs/setup/
local-setup-windows.md.
Planı fazlara böl, her fazın kabul kriterini yaz. Onayımı bekle.
```

Plan gelince oku, düzelt, onayla → Claude Code fazları uygular. Faz aralarında:

```
/init                         # (ilk faz sonrası) CLAUDE.md'yi kod tabanına göre rafine et
pnpm install && pnpm build    # her fazın kabul kriteri gerçekten koşularak doğrulanır
cd apps/api && mvn verify     # Testcontainers testi geçmeli (Docker Desktop açık olmalı*)
```

*Not: Testcontainers Windows'ta Docker Desktop ister. Docker istemiyorsan iskelette
integration testin lokal PostgreSQL profiline de düşebilmesi için `it-local` Maven
profili ekletmeyi plana dahil et.

### Faz 4 — Doğrulama turu (iskeletin "senior" kanıtı)

```
/quality-gate                 # zincir uçtan uca çalışıyor mu
/create-adr                   # örnek ADR: "kategori derinlik sınırı = 3"
/seo-audit                    # web'in tek sayfası üstünde SEO gate provası
/finish-session               # Current Status + session log validatoru test
git add -A && git commit -m "feat: site skeleton v1"
```

Ardından repoyu GitHub'da **Template repository** olarak işaretle
(Settings → Template repository ✓).

### Faz 5 — Yeni proje açılışı (iskeletin kullanımı — hedefin buydu)

```powershell
# GitHub'da "Use this template" → yeni repo → klonla → claude
```

```
/new-project cicek-magazasi
> Brief: "3D ürün sunumlu, ödemeli bir çiçek e-ticaret sitesi. Kategoriler
> hiyerarşik olacak, kupon modülü aktif, ödeme sağlayıcısı henüz seçilmedi."
```

`/new-project` komutu brief'i `docs/source-briefs/`e yazar, Obsidian'da proje
klasörünü açar, ödemeli site olduğu için `templates/payments/`i etkinleştirmeyi
önerir, PM'e ilk task DAG'ını çıkarttırır. Artık gerçekten "şöyle bir site
olacak" demek yetiyor.

---

## 10. Günlük Kullanım Kuralları (senior disiplini)

1. **Her feature Plan Mode'da başlar** — plan onayı olmadan kod yok.
2. **Kanıtsız PASS yok** — QA/Security/SEO raporları komut çıktısı içermek zorunda.
3. **Context hijyeni** — uzun oturumlarda `/compact`, konu değişiminde `/clear`;
   graph varsa grep yerine graph sorgusu.
4. **Model routing** — planlama/review'da opus, implementasyonda sonnet,
   memory-steward'da haiku yeter (token-optimization skill'i hatırlatır).
5. **Checkpoint ≠ Git** — Claude Code checkpoint'leri bash komutlarını kapsamaz;
   asıl güvenlik ağı sık ve küçük commit'lerdir.
6. **MCP diyeti** — yeni MCP eklemeden önce sor: "bu bir skill/CLI ile çözülür mü?"
```
