# F4 — pnpm Toolchain Remediation Brief

> Bağlayıcı kapsam kaynağı: `docs/audits/2026-07-28-fourth-mini-audit-rc1.md`
> (SHA-256 `A9897FEA2D5E30A01E7DEB8121794108194221F9A8E12D09368166C85226DC9B`).
> Bu brief o raporun **R-1, R-2, R-3** maddelerini tam olarak, **R-4**'ü ise
> **kısmen** uygular; rapor metni değiştirilmez.
>
> **Kapsam gerçeği (bağlayıcı):** R-4 iki yüzey ister —
> `packageManager` **ve** Node sürüm/EOL kontrolü. Bu PR yalnız
> **packageManager/pnpm** regresyon korumasını uygular.
> **Node sürüm/EOL kontrolü UYGULANMADI** ve non-blocking **açık borç**
> olarak kaydedilir. "R-1…R-4 eksiksiz uygulandı" iddiası **geçersizdir**.

## Kaynak Denetim

| Alan | Değer |
|---|---|
| Denetlenen release | `v1.0.0-rc.1` (immutable, prerelease) |
| Denetlenen commit | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` |
| Formal Verdict | **FAIL** |
| Production Readiness | **CORE_SKELETON_NOT_PRODUCTION_READY** |
| Recommendation | **NO_GO_REMEDIATION_REQUIRED** |
| Tek blocker | **F4-HIGH-01** |
| Repo içi kanıt | `docs/audits/2026-07-28-fourth-mini-audit-rc1.md` |

## Problem

`package.json` `packageManager` alanı **`pnpm@9.15.4`** pinliyordu. Bu sürüm
birden çok HIGH şiddetli GitHub Advisory'nin etkilenen aralığındadır ve
**9.x hattında hiçbir yama yayımlanmamıştır** — hat 2025-03-10'dan (9.15.9)
beri sürüm almamaktadır. Yamalı sürümler yalnız 10.34.x ve üzerindedir.

Açık, deponun **kendi kapılarının kör noktasındaydı**:

- `pnpm audit --prod` proje **bağımlılıklarını** tarar, paket yöneticisinin
  kendisini taramaz — denetimde "No known vulnerabilities found" (exit 0) döndü;
- `supply-chain-trivy` repo ve API jar'ını tarar, `packageManager` alanını
  değerlendirmez;
- `.github/dependabot.yml` npm ekosisteminde `version-update:semver-major`
  güncellemelerini yok sayar, yamalı sürüm ise 9 → 10 **major** geçiş ister.

Yani ne kapı ne bot bu pini kendiliğinden düzeltirdi. Bu, ADR-0009 kural 3
("baseline yalnız OSS desteği süren hatlarda tutulur") ve ADR-0015'in tedarik
zinciri sertleştirme amacıyla da çelişiyordu.

## Etkilenen Sürüm

```text
Önceki:  pnpm@9.15.4   (yayım 2025-01-13; hattın son sürümü 9.15.9, 2025-03-10)
Yeni:    pnpm@10.34.4  (exact pin)
```

Bağlayıcı minimum: **`pnpm >= 10.34.4`**. Bu remediation'ın exact pin'i
**`pnpm@10.34.4`**'tür.

## Resmî Advisory Kanıtları

Kaynak: GitHub Advisory Database (`gh api advisories/...`, `?cve_id=`,
`?ecosystem=npm&affects=pnpm@<sürüm>`). Tümü **unwithdrawn** (`withdrawn_at`
boş) ve **HIGH**.

| Tanımlayıcı | GHSA | Etkilenen aralık (pnpm) | İlk yamalı sürüm |
|---|---|---|---|
| CVE-2026-50015 | GHSA-rxhj-4m44-96r4 | `< 10.34.0` · `>= 11.0.0, < 11.4.0` | 10.34.0 · 11.4.0 |
| CVE-2026-55487 | GHSA-5wx6-mg75-v57r | `< 10.34.2` · `>= 11.0.0, < 11.5.3` | 10.34.2 · 11.5.3 |
| CVE-2026-55698 | GHSA-w466-c33r-3gjp | `< 10.34.2` · `>= 11.0.0, < 11.5.3` | 10.34.2 · 11.5.3 |
| *(CVE atanmamış)* | **GHSA-qrv3-253h-g69c** | `< 10.34.4` · `>= 11.0.0, < 11.8.0` | **10.34.4** · 11.8.0 |
| *(CVE atanmamış)* | **GHSA-fr4h-3cph-29xv** | `< 10.34.4` · `>= 11.0.0, < 11.7.0` | **10.34.4** · 11.7.0 |

> **Tanımlayıcı şerhi (uydurma yasağı).** Görev tanımında son iki madde
> `CVE-2026-59195` ve `CVE-2026-59196` olarak verilmişti. GitHub Advisory
> Database bu iki GHSA için **CVE id taşımıyor**: `cve_id` alanı `null` ve
> `identifiers` yalnız `GHSA:<id>` içeriyor; `advisories?cve_id=CVE-2026-59195`
> ve `...-59196` sorguları **boş** dönüyor. Doğrulanamayan tanımlayıcı
> repository'ye olgu olarak yazılmaz; bu iki madde **GHSA kimliğiyle**
> anılır. Aralık ve yamalı sürüm bilgisi (`< 10.34.4` → `10.34.4`) doğrulanmıştır
> ve bağlayıcı minimumu belirleyen madde budur.

**Kapanış kanıtı (10.34.4 üzerinde):**

```text
gh api "advisories?ecosystem=npm&affects=pnpm@10.34.4&per_page=100"
  → total matches: 0
  → unwithdrawn CRITICAL/HIGH: 0

karşılaştırma — aynı sorgu pnpm@9.15.4 için:
  → unwithdrawn CRITICAL/HIGH: 10
```

## R-1 — Toolchain yükseltmesi

`packageManager` → **`pnpm@10.34.4`** (exact pin).

**Lockfile:** yeniden üretilmedi ve **üretilmemelidir**. `lockfileVersion: '9.0'`
pnpm 10 tarafından kabul edilir; `pnpm install --frozen-lockfile` 10.34.4 ile
**exit 0** verir ve `git diff -- pnpm-lock.yaml` **boştur**. Sürüm değişti diye
lockfile'ı yeniden yazmak kapsam dışı bir diff üretirdi.

**pnpm 10 davranış değişikliği (kayda geçer):** lifecycle script'leri varsayılan
olarak çalışmaz. `pnpm ignored-builds` çıktısı tek kalem verir: **`msw`**.
Tam gate zinciri (build · typecheck · lint · test) bu blokla **yeşildir**, yani
`pnpm.onlyBuiltDependencies` **gerekmez ve eklenmez** — gereksiz yere bir
yaşam döngüsü betiğine izin vermek, kapatılan tedarik zinciri yüzeyini yeniden
açardı. Kabul kuralı (ileriye dönük bağlayıcı): bir paket bu listeye ancak
(a) `pnpm ignored-builds` çıktısında görünüyorsa **ve** (b) yokluğunda gate
fiilen kırılıyorsa, PR'da tek satır gerekçeyle eklenir.

**Root `pnpm.overrides` korunur** — `pnpm-lock.yaml:8-9`:
`next@16.2.12>sharp: 0.35.0`, `next@16.2.12>postcss: 8.5.18`.

## R-2 — Aktif doküman ve Corepack komutlarının eşitlenmesi

| Dosya | Değişiklik |
|---|---|
| `package.json` | `packageManager` → `pnpm@10.34.4` |
| `CLAUDE.md` | Kimlik satırı → "pnpm 10" |
| `README.md` | Stack tablosu → "pnpm 10 + Turborepo" |
| `docs/setup/local-setup-windows.md` | Başlık "pnpm 10"; `corepack prepare pnpm@10.34.4 --activate`; `expect 10.34.4`; güvenlik tabanı şerhi |
| `.claude/skills/stack-patterns/SKILL.md` | Toolchain sabiti → pnpm 10 (exact pin, güvenlik tabanı) |
| `docs/source-briefs/skeleton-brief.md` | **Yalnız** çalıştırılabilir `corepack prepare` satırı |

**Tarihsel içerik dokunulmaz.** `docs/source-briefs/skeleton-brief.md:241`
özgün Faz-0 yığınını kaydeder (Next.js 15 · Vite 5 · Spring Boot 3.3) ve
bunların tamamı sonradan yükseltilmiştir; bu satır **tarihsel kayıttır ve
değiştirilmemiştir**. Yalnız kopyala-yapıştır ile çalıştırılabilir olan
`corepack prepare` komutu güvenlik gerekçesiyle eşitlenmiştir — bu, bir
geçmiş iddiasını yeniden yazmak değil, zararlı bir talimatı düzeltmektir.
`project-memory/**` içindeki "pnpm 9" kayıtları **tarihsel** olup bu PR'ın
kapsamı dışındadır (tek yazar: memory-steward).

## R-3 — Tam gate doğrulaması

ADR-0009 kural 5 gereği yükseltme yeşil kanıtsız commit'lenemez. Koşulan
komutlar ve sonuçları: `docs/test-reports/2026-07-28-f4-pnpm-toolchain-remediation.md`.

## R-4 — Toolchain regression koruması (**KISMEN** uygulandı)

Denetim raporundaki R-4 birebir şudur:

```text
Toolchain sürüm/EOL kontrolünü kapılara ekle (packageManager + Node);
mevcut `pnpm audit`/Trivy bu yüzeyi taramıyor
```

Yani **iki** yüzey ister. Bu PR'ın durumu:

| R-4 alt kalemi | Durum |
|---|---|
| `packageManager` / pnpm sürüm regresyon koruması | **UYGULANDI** (aşağıdaki guard) |
| **Node sürüm / EOL kontrolü** | **UYGULANMADI — açık borç (non-blocking)** |

Node kısmı bilinçli olarak kapsam dışı bırakıldı: bu görev yalnız F4-HIGH-01
blocker'ını kapatır ve Node hattı **şu an blocker değildir** (Node 22
Maintenance LTS, EOL 2027-04-30 — denetim raporunun "Gözlemler" bölümü, bulgu
değil gözlem olarak kaydeder). EOL kontrolü ayrıca bir tarih/veri kaynağı
kararı gerektirir (sabit tablo mu, ağ sorgusu mu) ve bu guard'ın bilinçli
"ağsız ve deterministik" tasarımıyla birlikte ayrıca değerlendirilmelidir.

**Kayıt (bağlayıcı):** R-4 kapanmamıştır. Kapanan kısım
packageManager/pnpm'dir. Node sürüm/EOL kapısı, ADR-0009'un zaten kayıtlı
"otomatik EOL kontrolü ileriye dönük borçtur" maddesiyle birlikte ele alınacak
**açık, non-blocking** kalemdir.

Denetimin tespiti: `packageManager` yüzeyini **hiçbir kapı taramıyordu**.
Eklenen koruma:

| Dosya | Sorumluluk |
|---|---|
| `scripts/quality/assert-toolchain-policy.mjs` | Saf politika fonksiyonu (`checkToolchainPolicy`) + CLI. I/O'suz, **ağsız**, stdlib-only |
| `scripts/quality/gate-toolchain.mjs` | Gate sarmalayıcı: canlı pin'i doğrular **ve** negatif süiti yeniden koşar |
| `scripts/tests/toolchain-policy-negative.mjs` | 12 senaryo — kuralın gerçekten reddettiğinin kanıtı |

`run-gates.mjs` sırasında **ilk** gate'tir: pin yanlışsa aşağıdaki her sonuç
incelenmemiş bir toolchain tarafından üretilmiş olur.

**Zorunlu davranış (hepsi negatif testle kanıtlı):**

```text
packageManager yok            → FAIL (MISSING)
metin değil                   → FAIL (NOT_A_STRING)
exact pin değil (^ ~ x *)     → FAIL (NOT_EXACT_PIN)
pnpm dışı yönetici            → FAIL (WRONG_MANAGER)
sürüm < 10.34.4               → FAIL (BELOW_SECURITY_FLOOR)
major ≠ 10 (9.x ve 11.x)      → FAIL (MAJOR_NOT_REVIEWED)
pnpm@10.34.4 / 10.35.0        → PASS
Corepack integrity ekli pin   → PASS
```

**`pnpm@11.x` için açık policy kararı: FAIL.** Sessizce geçmez. Gerekçe:
ADR-0009 kural 1/4 major geçişleri açık karara bağlar; ayrıca pnpm 11 gerçek
kırıcı değişiklikler taşır (`onlyBuiltDependencies` kaldırılmış,
`minimumReleaseAge` varsayılanı gelmiş, `.npmrc` kapsamı daralmış). 11.x'e
geçmek bir güvenlik yaması değil, ayrı bir migration kararıdır — bu blocker'ı
kapatmak için gereken minimum tam olarak **10.34.4**'tür. Tavan
`ALLOWED_MAJOR` sabitidir: yeni bir ADR ile birlikte tek satırda yükseltilir.

**Toolchain major yükseltme kuralı (bu brief ile kayda geçer).** Paket
yöneticisi ve Node hattı, ADR-0009 kural 1 ve 3'ün kapsamındadır. Yamanın
yalnız bir üst major'da bulunduğu **güvenlik-tetiklemeli** yükseltme bot'a
bırakılmaz; ADR-0009 kural 4 akışıyla — açık karar + tam gate kanıtı —
**manuel** yapılır. Güvenlik gerekçesi kanıt zorunluluğunu hafifletmez.

**Bilinçli kapsam kararları:**

- **Ağ sorgusu yok.** Guard offline ve deterministiktir; lokal geliştirmeyi
  bozmaz ve "advisory API'ye ulaşılamadı" diye INCONCLUSIVE üretmez. Denetim
  raporu canlı advisory sorgusu **istememektedir**; minimum-safe-version guard
  yeterlidir. Taban (`MIN_PNPM`) incelenmiş bir sabittir, arama sonucu değil.
- **Yeni CI job'u / required check yok.** Kural `pnpm gate` içinde koşar, o da
  zaten `quality-gate-ubuntu` required job'unun bir adımıdır. `bootstrap-e2e`
  job'u üretilen projede `pnpm gate` koştuğu için kural **üretilen projelere de
  devrolur**. Ruleset değiştirilmemiştir.
- **Bilinen boşluk:** `hooks-and-structure-windows` job'u bağımlılık kurmaz ve
  `pnpm gate` koşmaz, dolayısıyla toolchain gate'i orada çalışmaz. Politika
  saf JSON ayrıştırma olduğu ve platforma bağlı davranışı bulunmadığı için
  Windows paritesi bu kural açısından bilgi taşımaz. Alternatif tasarım
  (kuralı `verify-structure` içine manifest-güdümlü kural olarak koymak) bu
  boşluğu da kapatırdı; `.github/workflows/**` ve daha geniş refactor bu PR'ın
  kapsamı dışında tutulduğu için tercih edilmedi ve **açık borç** olarak
  kaydedilir.
- **`.github/dependabot.yml` değiştirilmedi.** Dependabot'un `packageManager`
  alanını güncellediği **doğrulanmamıştır**; ayrıca 9 → 10 major'dır ve ignore
  kuralını gevşetmek tüm major'ları açarak ADR-0009 kural 4 ile çelişirdi.
  Denetim raporu da bunu istememektedir (R-4 bot değil **kapı** ister).

## Acceptance Criteria

| # | Kriter | Kanıt |
|---|---|---|
| AC-31 | `packageManager` desteklenen ve yamalı hatta, exact pin | `pnpm@10.34.4`; `gate-toolchain` PASS |
| AC-R1 | pnpm 10.34.4 fiilen çalışıyor | `pnpm --version` → `10.34.4` |
| AC-R2 | `--frozen-lockfile` yeşil, lockfile değişmedi | exit 0; `git diff -- pnpm-lock.yaml` boş |
| AC-R3 | Root override'lar korundu | `pnpm-lock.yaml:8-9` |
| AC-R4 | Aktif doküman/Corepack komutları eşitlendi | R-2 tablosu |
| AC-R5 | Guard mevcut required job içinde koşuyor | `pnpm gate` → `toolchain PASS` |
| AC-R6 | Guard eski pini gerçekten reddediyor | `pnpm@9.15.4` → FAIL (`MAJOR_NOT_REVIEWED`) |
| AC-R7 | 10.34.4'te unwithdrawn CRITICAL/HIGH advisory yok | `affects=pnpm@10.34.4` → 0 |
| AC-R8 | Tam gate zinciri yeşil | evidence raporu |

## Kapsam

```text
package.json (packageManager)
scripts/quality/assert-toolchain-policy.mjs
scripts/quality/gate-toolchain.mjs
scripts/quality/run-gates.mjs
scripts/tests/toolchain-policy-negative.mjs
scripts/structure-manifest.json (requiredFiles · maxLines · noBom)
CLAUDE.md · README.md
docs/setup/local-setup-windows.md
.claude/skills/stack-patterns/SKILL.md
docs/source-briefs/skeleton-brief.md (yalnız corepack komutu)
docs/audits/2026-07-28-fourth-mini-audit-rc1.md (denetim kanıtı)
docs/source-briefs/f4-pnpm-toolchain-remediation-brief.md (bu dosya)
docs/test-reports/2026-07-28-f4-pnpm-toolchain-remediation.md
```

## Kapsam Dışı

```text
pnpm-lock.yaml           — frozen install yeşil, yeniden üretim gerekmiyor
pnpm 11.x geçişi         — ayrı migration kararı
apps/** · templates/**   — uygulama kodu değişmiyor
project-memory/**        — tarihsel; tek yazar memory-steward
.github/workflows/**     — yeni job/step gerekmedi
.github/dependabot.yml   — gerekçe yok (yukarıda)
ruleset · release · tag  — dokunulmaz
F4-MEDIUM-01/-02/-03 ve F4-LOW-01…-06 — bu PR yalnız blocker'ı kapatır
ADR-0016 (toolchain baseline ADR'si)  — önerilmiştir; ayrı karar
v1.0.0-rc.2 / v1.0.0     — bu PR'da oluşturulmaz
```

## Release Sırası

```text
remediation merge
→ post-merge CI
→ terminal memory closure
→ immutable v1.0.0-rc.2
→ rc.2 attestation verify
→ fourth mini-audit rerun on rc.2
→ possible v1.0.0
```

**`v1.0.0-rc.1` silinmez, değiştirilmez veya yeniden oluşturulmaz.** Tarihsel
NO-GO candidate olarak korunur; immutable release ve attestation'ı geçerliliğini
sürdürür. Bu PR onun içeriğini geçmişe dönük düzeltmez — düzeltmeyi **bir
sonraki** candidate taşır.

Dördüncü mini-denetim **rc.2 exact tag'i üzerinde yeniden koşulmadan**
`v1.0.0` oluşturulmaz. Bu brief production-ready hükmü **vermez**.
