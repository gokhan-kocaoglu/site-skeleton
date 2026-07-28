# F4 Remediation — pnpm Toolchain Hardening Evidence

> Kanıt raporu (Katman 1, pre-merge). Bağlayıcı kapsam:
> `docs/source-briefs/f4-pnpm-toolchain-remediation-brief.md`.
> Denetim kaynağı: `docs/audits/2026-07-28-fourth-mini-audit-rc1.md`.

## Kaynak Audit

| Alan | Değer |
|---|---|
| Denetlenen release | `v1.0.0-rc.1` (immutable · prerelease · `draft=false`) |
| Denetlenen commit | `f891910d9e6877b4ce40d5833cb42579c6d3d9f1` |
| Audit verdict | **FAIL** / **CORE_SKELETON_NOT_PRODUCTION_READY** / **NO_GO_REMEDIATION_REQUIRED** |
| Audit raporu SHA-256 | `A9897FEA2D5E30A01E7DEB8121794108194221F9A8E12D09368166C85226DC9B` |
| Audit evidence commit | `2cdb78f79746b4e2e47a562716393146af28e34f` |
| Toolchain implementation commit | `9ee531d9d801c4db358bba92854044065508e74c` |
| Remediation dalı | `fix/f4-pnpm-toolchain-hardening` (base `f891910d…`) |

Rapor repository'ye **byte-for-byte** alınmıştır: commit'lenen blob'un SHA-256'sı
kaynak dosyayla aynıdır (`git show HEAD:docs/audits/2026-07-28-fourth-mini-audit-rc1.md
| sha256sum` → `a9897fea…dc9b`). Metin özetlenmemiş, düzeltilmemiş, başlığı
değiştirilmemiştir.

## F4-HIGH-01

```text
packageManager pnpm@9.15.4 — düzeltilemeyen HIGH tedarik zinciri açıkları
Severity: HIGH · Domain: security / supply-chain · Release blocker: EVET
```

Kapatma yöntemi: yamalı hatta **exact pin** + kapı seviyesinde regresyon koruması.

## Advisory Matrix

Kaynak: GitHub Advisory Database (resmî global API). Şema önce incelendi
(`advisories/<ghsa>` top-level anahtarları: `cve_id, ghsa_id, severity,
withdrawn_at, identifiers, vulnerabilities, …`; `vulnerabilities[]` alanları:
`package, vulnerable_version_range, first_patched_version, vulnerable_functions`)
— alan adları tahmin edilmedi.

| Tanımlayıcı | GHSA | Severity | Withdrawn | Etkilenen (pnpm) | İlk yamalı |
|---|---|---|---|---|---|
| CVE-2026-50015 | GHSA-rxhj-4m44-96r4 | high | hayır | `< 10.34.0` · `>= 11.0.0, < 11.4.0` | 10.34.0 · 11.4.0 |
| CVE-2026-55487 | GHSA-5wx6-mg75-v57r | high | hayır | `< 10.34.2` · `>= 11.0.0, < 11.5.3` | 10.34.2 · 11.5.3 |
| CVE-2026-55698 | GHSA-w466-c33r-3gjp | high | hayır | `< 10.34.2` · `>= 11.0.0, < 11.5.3` | 10.34.2 · 11.5.3 |
| *(CVE yok)* | GHSA-qrv3-253h-g69c | high | hayır | `< 10.34.4` · `>= 11.0.0, < 11.8.0` | **10.34.4** · 11.8.0 |
| *(CVE yok)* | GHSA-fr4h-3cph-29xv | high | hayır | `< 10.34.4` · `>= 11.0.0, < 11.7.0` | **10.34.4** · 11.7.0 |

**Tanımlayıcı düzeltmesi.** Görev tanımında son iki madde `CVE-2026-59195` ve
`CVE-2026-59196` olarak verilmişti. Advisory DB bu iki GHSA için `cve_id: null`
döndürür ve `identifiers` yalnız `GHSA:<id>` içerir; `advisories?cve_id=CVE-2026-59195`
ile `…-59196` sorguları **boş** sonuç verir. Doğrulanamayan tanımlayıcı
repository'ye olgu olarak yazılmamış, bu iki madde **GHSA kimliğiyle**
kaydedilmiştir. Bağlayıcı minimumu belirleyen bilgi (`< 10.34.4` → `10.34.4`)
doğrulanmıştır ve değişmemiştir.

**Kapanış doğrulaması:**

```text
gh api "advisories?ecosystem=npm&affects=pnpm@10.34.4&per_page=100"
  total matches                : 0
  unwithdrawn CRITICAL/HIGH    : 0

karşılaştırma (eski pin):  affects=pnpm@9.15.4
  unwithdrawn CRITICAL/HIGH    : 10
```

`pnpm audit --prod` **bu kanıtın yerine geçmez** — o sonuç proje bağımlılık
yüzeyine aittir, paket yöneticisine değil.

## Önceki / Yeni Toolchain

| | Önceki | Yeni |
|---|---|---|
| `packageManager` | `pnpm@9.15.4` | **`pnpm@10.34.4`** |
| Çalışan pnpm | 9.15.4 | **10.34.4** (`pnpm --version`) |
| Hat durumu | 9.x — son sürüm 2025-03-10, yama yok | 10.x — aktif |
| Advisory (unwithdrawn CRITICAL/HIGH) | **10** | **0** |
| Node | `>=22.12.0` (değişmedi) | `>=22.12.0` |

Corepack ile etkinleştirme: `corepack prepare pnpm@10.34.4 --activate`
(shim dizini kullanıcı alanında; `corepack enable --install-directory`).

## Değişen Dosyalar

**Implementation (`9ee531d9`):**

```text
package.json                                  packageManager pini
scripts/quality/assert-toolchain-policy.mjs   saf politika + CLI (yeni)
scripts/quality/gate-toolchain.mjs            gate sarmalayıcı (yeni)
scripts/quality/run-gates.mjs                 GATES sırasına 'toolchain' (ilk)
scripts/tests/toolchain-policy-negative.mjs   12 negatif/pozitif senaryo (yeni)
scripts/structure-manifest.json               requiredFiles · maxLines · noBom
```

**Docs/evidence:**

```text
docs/audits/2026-07-28-fourth-mini-audit-rc1.md            denetim kanıtı (2cdb78f7)
docs/source-briefs/f4-pnpm-toolchain-remediation-brief.md  bağlayıcı brief
docs/test-reports/2026-07-28-f4-pnpm-toolchain-remediation.md  bu rapor
CLAUDE.md · README.md                                      kimlik satırı → pnpm 10
docs/setup/local-setup-windows.md                          corepack komutu + güvenlik şerhi
.claude/skills/stack-patterns/SKILL.md                     toolchain sabiti
docs/source-briefs/skeleton-brief.md                       yalnız corepack komutu
scripts/quality/assert-toolchain-policy.mjs                yalnız yorum/mesaj: GHSA düzeltmesi
```

`apps/**`, `templates/**`, `project-memory/**`, `.github/workflows/**`,
`.github/dependabot.yml`, ruleset, release ve tag **değişmedi**.

## Lockfile Sonucu

```text
lockfileVersion: '9.0'   (değişmedi — pnpm 10 bu formatı kabul eder)
pnpm install --frozen-lockfile   → exit 0
git diff --stat -- pnpm-lock.yaml → (boş)
```

Lockfile **yeniden üretilmedi**: frozen install pnpm 10.34.4 altında sorunsuz
geçtiği için sürüm değişikliği tek başına yeniden yazma gerekçesi değildir
(`--force` / `--no-frozen-lockfile` kullanılmadı, lockfile silinmedi).

**Root override'lar korundu** — `pnpm-lock.yaml:8-9`:

```yaml
  next@16.2.12>sharp: 0.35.0
  next@16.2.12>postcss: 8.5.18
```

**pnpm 10 davranış değişikliği:** lifecycle script'leri varsayılan kapalı.
`pnpm ignored-builds` → tek kalem: **`msw`**. Tam gate (build · typecheck ·
lint · test) bu blokla yeşil olduğu için `pnpm.onlyBuiltDependencies`
**eklenmemiştir** — gereksiz bir yaşam döngüsü betiğine izin vermek, kapatılan
tedarik zinciri yüzeyini yeniden açardı.

## Toolchain Guard

`scripts/quality/assert-toolchain-policy.mjs` — saf, **offline**, stdlib-only.
`MIN_PNPM = '10.34.4'`, `ALLOWED_MAJOR = 10`. `gate-toolchain` `pnpm gate`
sırasının **ilk** adımıdır ve iki şey yapar: canlı pini doğrular **ve** negatif
süiti yeniden koşar — böylece kural sessizce gevşerse gate kırılır.

| Girdi | Sonuç | Kod |
|---|---|---|
| `pnpm@9.15.4` | FAIL | `MAJOR_NOT_REVIEWED` |
| `pnpm@10.34.3` | FAIL | `BELOW_SECURITY_FLOOR` |
| `pnpm@^10.34.4` | FAIL | `NOT_EXACT_PIN` |
| `pnpm@10.x` | FAIL | `NOT_EXACT_PIN` |
| alan yok | FAIL | `MISSING` |
| metin değil | FAIL | `NOT_A_STRING` |
| `npm@10.9.0` | FAIL | `WRONG_MANAGER` |
| `pnpm@11.0.0` | FAIL | `MAJOR_NOT_REVIEWED` |
| `pnpm@10.34.4` | PASS | `OK` |
| `pnpm@10.35.0` | PASS | `OK` |
| `pnpm@10.34.4+sha512.…` | PASS | `OK` |
| canlı `package.json` | PASS | `OK` |

**`pnpm@11.x` sessizce geçmez** — açık policy kararıdır. Gerekçe: major geçiş
ADR-0009 kural 1/4 uyarınca açık karar ister ve pnpm 11 gerçek kırıcı
değişiklikler taşır (`onlyBuiltDependencies` kaldırılmış, `minimumReleaseAge`
varsayılanı gelmiş, `.npmrc` kapsamı daralmış). Tavan `ALLOWED_MAJOR` sabitidir.

**Bağımsız RED kanıtı** (gerçek dosya mutasyona uğratılmadan, geçici kopyada):

```text
packageManager=pnpm@9.15.4  → [gate-toolchain] FAIL (MAJOR_NOT_REVIEWED)   exit 1
packageManager=pnpm@10.34.3 → [gate-toolchain] FAIL (BELOW_SECURITY_FLOOR) exit 1
```

**Yerleşim ve bilinen boşluk.** Guard `pnpm gate` içinde koşar; o da
`quality-gate-ubuntu` required job'unun adımıdır. `bootstrap-e2e` job'u
üretilen projede `pnpm gate` koştuğu için kural **üretilen projelere devrolur**.
`hooks-and-structure-windows` job'u bağımlılık kurmadığı ve `pnpm gate`
koşmadığı için guard orada çalışmaz; politika saf JSON ayrıştırma olduğundan
Windows paritesi bu kural için bilgi taşımaz. Alternatif (kuralı
`verify-structure` manifest kuralı yapmak) bu boşluğu da kapatırdı; kapsam
disiplini gereği tercih edilmedi ve **açık borç** olarak kaydedilir.
**Yeni CI job'u ve yeni required check yoktur; ruleset değişmemiştir.**

## Lokal Doğrulamalar

pnpm exact sürüm: **`10.34.4`**

| Komut | Exit | Sonuç |
|---|---|---|
| `pnpm install --frozen-lockfile` | **0** | lockfile değişmedi |
| `pnpm gate` | **0** | **8/8 PASS** (toolchain · build · typecheck · lint · test · audit · structure · contract-drift) |
| `node scripts/tests/critical-domain-coverage-negative.mjs` | **0** | 2/2 workspace PASS |
| `cd apps/api && mvn --batch-mode verify` | **0** | BUILD SUCCESS · Tests run 5 · 0 failure/error/skip |
| `node scripts/verify-structure.mjs` | **0** | **1089 checks OK** |
| `node scripts/tests/verify-structure-negative.mjs` | **0** | 19/19 senaryo PASS |
| `node .claude/hooks/tests/run-tests.js` | **0** | 302 assertion / 94 fixture PASS |
| `node scripts/tests/toolchain-policy-negative.mjs` | **0** | **12/12 senaryo PASS** |
| `node scripts/tests/bootstrap-transaction.mjs` | **0** | 7/7 senaryo PASS |
| `node scripts/tests/bootstrap-e2e.mjs` | **0** | tüm assertion PASS (üretilen proje kendi gate'ini geçti) |
| `pnpm audit --prod` | **0** | "No known vulnerabilities found" |
| `git diff --check` | **0** | whitespace hatası yok |

**Backend kanıtı gerçek Testcontainers'tır** (`-Pit-local` fallback'i
kullanılmadı):

```text
Testcontainers version: 2.0.5
Container postgres:16 started
Creating Schema History table "public"."flyway_schema_history" ...
Tests run: 2 -- com.skeleton.api.contract.JacksonContractIT
Tests run: 3 -- com.skeleton.api.health.HealthEndpointIT
BUILD SUCCESS
```

`bootstrap-e2e` **browser Playwright E2E'si değildir**; üretilen repository'nin
kendi gate'ini koşan bootstrap sertifikasyonudur (exit 0, 73 s, temp temizlendi).

> **Kesinlik şerhi.** `scripts/tests/bootstrap-e2e.mjs` gate adlarını tek tek
> doğrularken hâlâ **özgün yedi** gate'i sayar; `toolchain` o listeye
> eklenmemiştir (bu PR test dosyasını değiştirmedi). Yeni gate'in üretilen
> projede koştuğunun kanıtı dolaylıdır ama bağlayıcıdır: `run-gates.mjs`
> "All gates PASS" satırını **yalnız** `GATES` dizisindeki her gate PASS
> verdiğinde basar ve dizi `toolchain` ile başlar; E2E hem bu satırı hem
> `exit 0`'ı assert eder. Yedi adın listesine `toolchain` eklemek küçük ve
> yararlı bir izleme işidir — kapsam disiplini gereği bu PR'a alınmadı.

Taban çizgileri korundu (azalma yok): hook 302/94 · structure negative 19/19 ·
bootstrap transaction 7/7 · coverage negative 2/2. `verify-structure` 1074 →
**1089** (yeni guard dosyalarının manifest kaydı); gate sayısı 7 → **8**.

## Acceptance Matrix

| # | Kriter | Sonuç |
|---|---|---|
| AC-31 | Toolchain desteklenen + yamalı hatta, exact pin | **PASS** |
| AC-R1 | pnpm 10.34.4 fiilen çalışıyor | **PASS** |
| AC-R2 | Frozen install yeşil, lockfile değişmedi | **PASS** |
| AC-R3 | Root override'lar korundu | **PASS** |
| AC-R4 | Aktif doküman/Corepack komutları eşitlendi | **PASS** |
| AC-R5 | Guard mevcut required job içinde koşuyor | **PASS** |
| AC-R6 | Guard eski pini gerçekten reddediyor | **PASS** |
| AC-R7 | 10.34.4'te unwithdrawn CRITICAL/HIGH yok | **PASS** |
| AC-R8 | Tam gate zinciri yeşil | **PASS** |

**Kapatılmayan denetim maddeleri (bilinçli, kapsam dışı):** AC-26 (F4-LOW-02
sürümleme politikası), AC-29 (F4-MEDIUM-01 aktivasyon kapısı kapsamı),
AC-32 (F4-MEDIUM-02 README RC şerhi), AC-33 (F4-MEDIUM-03 web güvenlik
başlıkları) ve F4-LOW-01/-03/-04/-05/-06. Bu PR yalnız **blocker'ı** kapatır.

## Kalan Riskler

Üç tarihsel kabul edilmiş risk **korunur, durumları değişmemiştir**:

| Risk | Severity | Sahip | Release-blocking |
|---|---|---|---|
| Optional module hardening (BFF-1/2/3) | MEDIUM | Aktivasyon-anı implementer | HAYIR |
| Hook tam shell parser değildir | LOW | Orkestratör | HAYIR |
| Type-aware lint derinliği (ADR-0012) | LOW | Orkestratör | HAYIR |

Bu PR'ın eklediği kayıtlı riskler/borçlar:

| Öğe | Severity | Not |
|---|---|---|
| Guard `hooks-and-structure-windows` job'unda koşmuyor | LOW | Politika platformdan bağımsız; alternatif tasarım kayıtlı |
| `MIN_PNPM` elle güncellenir (bot güncellemez) | LOW | Yeni advisory geldiğinde tek satır + kanıt |
| pnpm 10 lifecycle-script bloğu (`msw`) | LOW | Gate yeşil; `onlyBuiltDependencies` bilinçli olarak eklenmedi |
| ADR-0016 (toolchain baseline ADR'si) yazılmadı | LOW | Kural bu brief'te kayıtlı; ayrı karar olarak önerildi |

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

`v1.0.0-rc.1` **immutable ve değiştirilmeden korunur**; tarihsel NO-GO
candidate'tır. Bu PR onun içeriğini geçmişe dönük düzeltmez.

Bu rapor **final PR head SHA'sını veya henüz doğmamış PR CI run'ını
dondurmaz** — merge öncesi güncel otorite GitHub PR metadata'sı ve required
check'lerdir (`docs/operations/release-attestation.md`, self-reference yasağı).

## Verdict

```text
F4-HIGH-01:
REMEDIATED_PENDING_REMOTE_CI_AND_MERGE

Formal local gate:
PASS_WITH_RISKS
```

`PASS` değildir: üç kabul edilmiş risk ve yukarıdaki kayıtlı borçlar açıktır
(verdict-policy kural 3/6). **Production-ready hükmü ve `GO_FOR_V1_0_0`
VERİLMEMİŞTİR** — bunlar yalnız dördüncü mini-denetimin `v1.0.0-rc.2` exact
tag'i üzerinde yeniden koşulmasıyla gündeme gelebilir.
