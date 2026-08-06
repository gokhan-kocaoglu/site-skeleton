# AC-33 / F4-MEDIUM-03 Remediation — Pre-Merge Kanıt Raporu

> Kanıt raporu (Katman 1, pre-merge). Mod: **Preparation Mode** (QA/Test
> Specialist, `docs/test-reports/**` fiziksel yazarı). Bu turun testlerini
> (`apps/web/test/security-headers.test.ts`,
> `apps/web/test/next-config-headers.test.ts`) bizzat yazan instance, aynı
> zamanda bu raporun fiziksel yazarıdır. Kod/test/manifest/ADR/doküman bu
> rapor tarafından değiştirilmemiştir — yalnız ölçülmüş ve okunmuştur. Bu tur
> implementasyonu **yazmadı**; aşağıdaki ölçümler ayrı QA turlarında bizzat
> koşturulan komutların birebir çıktısıdır ve bu turda yeniden koşturulmamıştır
> (verilen değerler kullanıldı). ADR ve `deployment.md`/`scripts/quality/*.mjs`
> içerikleri bu turda salt-okuma ile doğrudan okundu — bu ölçüm değil, alıntı
> doğruluğudur.

## 1. Kapsam ve Kimlik

| Alan | Değer |
|---|---|
| Repository | `gokhan-kocaoglu/site-skeleton` |
| Dal | `fix/f4-core-web-security-headers` |
| Base SHA (main) | `7f52a58d5dc061eaad184ac40fee3fe1d78f97fb` |
| Implementation/test SHA (C4) | `5b85318a1a8a615ece80904f11fe38bf026b1b92` |
| Tarih | 2026-08-06 — Europe/Istanbul |
| Hedef kriter | AC-33 / F4-MEDIUM-03 (core web güvenlik header politikası eksikti) |
| Kaynak audit | `docs/audits/2026-07-28-fourth-mini-audit-rc2.md` |
| Karar kaydı | `docs/adr/ADR-0019-web-security-headers.md` |
| Önceki tur | AC-32 tamamlandı (`docs/test-reports/2026-07-29-ac-32-release-state-remediation.md`); kalan açık: AC-33 (bu rapor), AC-26 |

**Üç kavram ayrımı** (AC-32'de kurulan disiplinin tekrarı): implementation/test
tree (`5b85318a…`, C4 — tüm ölçümlerin bağlamı) · evidence commit (bu rapor —
tree'den **sonra** eklenir, kendi SHA'sını taşımaz) · final dal ucu (otoritesi
GitHub PR metadata'sı, burada tahmin edilmez). Rapor PR numarası, PR CI run
ID/URL, merge SHA, post-merge CI bilgisi **taşımaz**; final zincir dış
immutable attestation'da mühürlenir.

## 2. Canonical Mimari (Model B)

ADR-0019, F4-MEDIUM-01'in kök nedenini (beyan/enforcement ayrışması,
ADR-0017) header yüzeyinde tekrarlamamak için **Model B — ikili sahiplik**
kararını kaydeder: `apps/web` header sözleşmesini Next.js runtime'ında bizzat
**emit eder**; `apps/admin` sözleşmesi provider-nötr tanımlanır, statik
host/edge tarafından uygulanır. Model A (yalnız doküman) reddedildi — ADR-0017
tam bu drift sınıfını yasaklamıştı. Model C (nonce) ertelendi (bölüm 18).

Karar üç ölçülmüş Next.js 16.2.12 kısıtına dayanır: (1) `headers()`
eklendikten sonra dokuz route'un tamamı `○ (Static)` kalır; (2) Next nonce
**üretmez**, gelen istek header'ından **okur** — statik prerender'da inline
bootstrap script nonce taşımaz, hash varyantı da mümkün değildir çünkü
`headers()` prerender'dan önce değerlendirilir; (3) `apps/admin/dist`
ölçümünde inline script/`on*`/`<style>`, `data:` URI, `eval`/`new Function`
gibi 13 yüzeyin tamamı **0** — web ve admin için gerçeklenebilir en katı
politika aynı değildir, tek ortak CSP ya birini kırar ya ötekini gevşetir.

## 3. Exact Web Runtime Politikası

Canonical source-of-truth: `apps/web/lib/security-headers.ts`. Üç bağımsız
katmanla doğrulanır (bölüm 11–12): literal-locked test, doküman blok
eşitliği, build artefaktı.

| Direktif | Değer | Gerekçe |
|---|---|---|
| `default-src` | `'self'` | Adlandırılmamış fetch tipleri için kapalı taban |
| `base-uri` | `'self'` | `<base>` enjeksiyonu hijack'ini kapatır |
| `object-src` | `'none'` | Legacy plugin/embed yürütme yüzeyini siler |
| `frame-ancestors` | `'none'` | Clickjacking; XFO'nun modern karşılığı |
| `form-action` | `'self'` | Formla dış origin'e veri sızmasını kapatır |
| `script-src` | `'self' 'unsafe-inline'` | Dış origin kapalı; inline bugün zorunlu |
| `style-src` | `'self' 'unsafe-inline'` | Tailwind v4 + Next kritik CSS inline |
| `img-src` / `font-src` | `'self'` | Uzak kaynak yok |
| `connect-src` | `'self'` | Ayrı origin API'de ilk genişletilecek direktif |

Tam literal (production):

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'
```

Development varyantı iki delta taşır: `script-src`'e ek `'unsafe-eval'`
(React Refresh), `connect-src`'e `ws://localhost:* ws://127.0.0.1:*` (HMR).
Delta yalnız `NODE_ENV === "development"` iken uygulanır; bilinmeyen/test
değerleri production dalına düşer (bölüm 8'deki GREEN'in `NODE_ENV=test`
altında production CSP'si beklemesinin gerekçesi budur).

Statik dört header: `X-Frame-Options: DENY` ·
`X-Content-Type-Options: nosniff` ·
`Referrer-Policy: strict-origin-when-cross-origin` ·
`Permissions-Policy: camera=(), microphone=(), geolocation=()`.
`HEADER_SOURCE = "/(.*)"`; `poweredByHeader: false`.

**Kritik invariant:** `'unsafe-inline'` script enjeksiyonuna karşı koruma
sağlamaz — kapattıkları dış script origin'i, `object-src`, base-uri hijack'i,
form sızıntısı, clickjacking, MIME sniffing, referrer sızıntısıdır.
`'unsafe-inline'` ile aynı direktifte `nonce-`/`sha256-`/`sha384-`/`sha512-`
**asla** bulunmaz — CSP2+ tarayıcıları bu durumda `'unsafe-inline'`ı sessizce
yok sayar (bölüm 13, "nonce girerse reddedilir").

## 4. Image Optimizer Politikası

`/_next/image` ayrı bir yanıt sınıfıdır: Image Optimizer kendi CSP'sini
`res.setHeader` ile yazar ve global kuralı **ezer**. Sessiz kalmasın diye
`next.config.ts` → `images.contentSecurityPolicy` açıkça pinlenir:

```text
default-src 'self'; script-src 'none'; sandbox;
```

Uygulama CSP'lerinden **daha katıdır** (script kapalı + `sandbox`). Bu
yanıtta `frame-ancestors` kaybolur; `X-Frame-Options: DENY` hâlâ emit
edildiği için clickjacking koruması sürer (bölüm 17'de wire-level doğrulandı).

## 5. Admin Deployment Sözleşmesi

`apps/admin` statik `dist/` üretir, kendi HTTP header'ını yazamaz — sözleşme
`docs/operations/deployment.md`'de provider-nötr bir **hedef** olarak
tanımlanır, "repository tarafından uygulanmıştır" iddiası **taşımaz**.
`vite.config.ts`'e dev/preview header'ı eklemek reddedildi: `dist/`'e etki
etmez, sahte sertleştirme izlenimi üretir (F4-MEDIUM-01 ile aynı kök neden).

Admin CSP'si web'den farklıdır (ölçülmüş `dist/` sayesinde `'unsafe-inline'`
**içermez**):

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'
```

Ek olarak `X-Robots-Tag: noindex, nofollow` ve `Strict-Transport-Security:
max-age=31536000` (admin genel ağa açık bir yönetim yüzeyi olduğu için HSTS
hedefi web'den farklı olarak burada var). `apps/admin/README.md`, üç zorunlu
ifadeyi (`repository runtime`, `statik host`, `docs/operations/deployment.md`)
taşımaya zorlanır ve CSP direktiflerini yinelemez.

## 6. HSTS Sahipliği

`apps/web` HSTS **emit etmez** — bilinçli karar (RFC 6797 §7.2): kullanıcı
ajanı güvensiz taşımadan gelen STS başlığını yok sayar; Next reverse proxy
arkasında düz HTTP konuşur, uygulamadan emit edilen HSTS bazı topolojilerde
hiçbir şey zorlamadığı hâlde "garanti" izlenimi üretir. Edge hedefi
`max-age=31536000`; `includeSubDomains`/`preload` varsayılan **değildir**.

Yokluk üç yerde zorlanır: `security-headers.ts` ve `next.config.ts` üzerinde
regex (`!/strict-transport-security/i`), `gate-web-headers.mjs`'te build
artefaktı üzerinden `HSTS_EMITTED` negatif senaryosu (bölüm 13). `apps/admin`
sözleşmesinde HSTS **vardır** — iki sözleşme kasıtlı olarak asimetriktir.

## 7. Commit Zinciri ve Yeşil-Commit Disiplini

| # | SHA | Mesaj | Rolü |
|---|---|---|---|
| C1 | `7eb7b3c66bb5ddf124a230e6d965e2fefcd71cbb` | `docs(adr): record web security header policy and ownership` | ADR-0019 |
| C2 | `6a1e3ea87d584ef9b7cb8ffdb8a4cb66d3526184` | `feat(web): enforce and test core security headers` | Canonical modül + `next.config.ts` + literal-locked test + `deployment.md` blokları |
| C3 | `b81a86adf31cf65a6b59f5d5062ca341fcb5caa2` | `feat(quality): verify emitted web security headers` | Build-artefaktı oracle'ı + negatif suite + `run-gates.mjs`'e `web-headers` |
| C4 | `5b85318a1a8a615ece80904f11fe38bf026b1b92` | `feat(structure): bind web header deployment contract` | Üç-katmanlı drift kuralı + `verify-structure.mjs` bağlama + regresyon |

Her commit öncesi `node scripts/verify-structure.mjs` ve `pnpm gate` koşuldu;
kırmızı ağaç commit **edilmedi**. Docker erişilemez olduğu için her commit
öncesi tam `pnpm gate` `test` aşamasında (Testcontainers kökenli) FAIL verdi;
`SKIP_API=1 pnpm gate` ile **All gates PASS** doğrulandı (bölüm 16). Commit
öncesi `verify-structure` check sayısı: C1 → **1251**, C2 → **1264**,
C3 → **1274**, C4 → **1316**.

### Before/After

| Ölçüm | Önce (AC-32 sonrası) | Sonra (C4) |
|---|---|---|
| `verify-structure` check sayısı | 1247 | **1316** |
| `verify-structure-negative` tanımlı | 96 | **119** |
| `verify-structure-negative` koşan (skeleton-dev) | 93 | **116** |
| `verify-structure-negative` yalnız project-only | 3 | 3 (değişmedi) |
| `web-headers-gate-negative` | yok | **25** (24 negatif + 1 pozitif kontrol) |
| `apps/web` test dosyası / test sayısı | 5 / 20 | **7 / 48** |
| Hook harness (`run-tests.js`) | 302 / 94 | değişmedi |
| `bootstrap-transaction` | 7/7 | değişmedi |
| `scripts/verify-structure.mjs` satır | 1383 | **1390** |

## 8. TDD RED→GREEN Kanıtı

RED, C2 **öncesi**, commit edilmemiş ağaçta (yalnız iki yeni test dosyası
diskteydi, `lib/security-headers.ts` henüz yoktu) ölçüldü:

```text
pnpm --filter web test → exit 1
FAIL  test/security-headers.test.ts [ test/security-headers.test.ts ]
Error: Failed to resolve import "../lib/security-headers" from "test/security-headers.test.ts". Does the file exist?
FAIL  test/next-config-headers.test.ts > next.config security headers > disables the X-Powered-By header
AssertionError: expected undefined to be false // Object.is equality
Test Files  2 failed | 5 passed (7)
     Tests  8 failed | 20 passed (28)
```

İki farklı RED şekli, iki farklı eksik implementasyon katmanını doğru
yansıtıyor: import çözülemediği için tüm dosya düşüyor (modül yok); diğer
dosya modül `undefined` export ettiği için assertion bazında düşüyor
(`next.config.ts` henüz `headers()`/`poweredByHeader` taşımıyordu).

GREEN, C4 ağacında ölçüldü: `Test Files 7 passed (7)` ·
`Tests 48 passed (48)` — RED'deki 28 test (20 yeni + 8 önceden başarısız)
dahil tüm 48 test yeşil.

## 9. Test ve Coverage

| Komut | Exit | Çıktı |
|---|---|---|
| `pnpm install --frozen-lockfile` | 0 | `Done` |
| `pnpm --filter web test` | 0 | Test Files 7 passed (7) · Tests 48 passed (48) |
| coverage | — | 88.23% Stmts / 100% Branch / 77.77% Funcs / 87.87% Lines (eşik 60) |
| `pnpm type-check` | 0 | 3 cached, 3 total |
| `pnpm lint` | 0 | 2 cached, 2 total |

`security-headers.ts` dosya-bazlı kapsam: statements **8/8 = %100** —
`coverage-summary.json` ile ayrıca doğrulandı (text reporter %100 dizinleri
listelemiyor). Kritik-domain %80 eşiği (`{auth,payment,billing}`) bu dosyaya
uygulanmaz; genel %60 eşiği zaten aşılmış (%88.23).

20 yeni test `security-headers.test.ts`'te (header sırası, exact CSP
değerleri, HSTS yokluğu, nonce/`'unsafe-inline'` invariantı, çağrılar arası
paylaşılan state olmadığı), 8 yeni test `next-config-headers.test.ts`'te
(`next.config.ts` default export'unun `headers()` sözleşmesi, anahtar
allowlist'i) — toplam **28** yeni test, hiçbiri modülden veya birbirinden
literal türetmiyor (bağımsız literal disiplini, bölüm 12'deki tasarımın
üçüncü tekrarı).

## 10. Build ve Route Snapshot

`SITE_SKELETON_ALLOW_LOCALHOST_URL=1 pnpm --filter web build` → exit **0** →
**9/9** statik sayfa. Route-manifest satırlarının tamamı `○ (Static)`: `/`,
`/_not-found`, `/apple-icon`, `/icon.svg`, `/opengraph-image`, `/robots.txt`,
`/sitemap.xml`, `/twitter-image` — `headers()` eklenmesi statik prerender'ı
dinamik render'a **düşürmedi** (bölüm 2'deki kısıtın ampirik doğrulaması).

## 11. Artefakt Oracle

`gate-web-headers.mjs` kaynak modülü değil **Next'in ürettiği** iki build
artefaktını okur — testleri mutlu tutan ama gerçek yanıta hiç ulaşmayan bir
değişiklik burada yine de düşer.

`.next/routes-manifest.json`: kural sayısı **1** · anahtarlar
`["headers","regex","source"]` (**allowlist**, denylist değil — Next'in
`has`/`missing`/`locale`/`basePath` kabul etmesi, `has: [{type:'header',
key:'x-never-sent'}]` gibi bir eklemenin production'da sıfır header
üretebilmesi anlamına gelir, oysa birim testler yeşil kalır) · `source`
`/(.*)` · derlenmiş `regex` `^(?:/(.*))(?:/)?$` · beş header exact sırayla.

`.next/required-server-files.json`: `config.poweredByHeader = false` ·
`config.images.contentSecurityPolicy` bölüm 4'teki literalle birebir. Üç ayrı
image kontrolü (exact eşitlik + `script-src 'none'` + `sandbox`) kasıtlı
olarak bağımsızdır; tek bir exact-equality her drift için aynı jenerik kodu
üretirdi.

## 12. Structure Helper ve Doküman Blok Eşitliği

`scripts/quality/assert-web-security-contract.mjs`, `verify-structure.mjs`'e
`assertWebSecurityContract(root)` çağrısıyla bağlanır (satır 1379, import
satır 12 — kod okumasıyla teyit edildi). Üç ayrı yazılmış kopyanın
uyuşmasını zorlar: (1) `apps/web/lib/security-headers.ts` — metin olarak
okunur, **hiç çalıştırılmaz** (gate Windows'ta, TS loader'sız koşuyor; bu
yüzden değerler tek-satırlık string literal olmak zorunda); (2)
`docs/operations/deployment.md` — bloklar parse **edilmez**, bu dosyanın
kendi literallerinden yeniden inşa edilip tek bir **tam string** olarak
karşılaştırılır, yani parse yapılmadığı için parse deliği de olamaz; (3) bu
dosyanın kendi literalleri — üçüncü bağımsız görüş.

Ayrıca: admin ownership disclaimer'ı bounded blokların **dışında** kaldığı
ayrı kontrol edilir (aksi hâlde kendi kopyasıyla "doğrulanmış" olurdu);
`apps/admin/README.md` üç zorunlu ifadeyi taşır, CSP'yi yinelemez; hem modül
hem doküman hem admin README skeleton kimlik token'ı ve yasaklı release-verdict
ifade sınıfı sızdırmıyor mu diye taranır.

**Kayıtlı tasarım sınırı (F-1, bölüm 17'de tekrar):** `literal()` yardımcı
fonksiyonu ilgili sabiti regex ile **ilk eşleşmede** alır; bir yorum
satırındaki canonical-görünümlü değer, gerçek bildirimi teorik olarak
gölgeleyebilir. Bu turda düzeltilmedi.

## 13. Negatif Senaryo ve Mutasyon Ledger'ı

Bağımsız QA final-gate turu working tree'de gerçek dosya mutasyonu yaptı,
kırılan testleri ölçtü, bit-exact geri aldı:

| # | Mutasyon | Kırılan test(ler) | Hata mesajının ilk satırı |
|---|---|---|---|
| M1 | `security-headers.ts`: `X-Frame-Options` `DENY` → `SAMEORIGIN` | 3 test (header set, static headers, clickjacking) | `AssertionError: expected 'SAMEORIGIN' to be 'DENY'` |
| M2 | `next.config.ts`: `poweredByHeader: false,` silindi | `disables the X-Powered-By header` | `AssertionError: expected undefined to be false` |

Her ikisinden sonra dosya geri alındı, `git status --short` **boş**
doğrulandı.

`web-headers-gate-negative.mjs`, saf `checkWebHeaderArtifacts()`'i **25**
senaryoyla koşuyor (1 pozitif kontrol + 24 mutasyon), her biri kendi teşhis
kodunu doğruluyor: `has`/`missing`/`locale`/`basePath` eklenmesi ve `regex`
silinmesi (`RULE_KEYS` — **"sessiz-öldürme" sınıfı**: production'da sıfır
header üretirken testler yeşil kalır), scope drift (`RULE_SOURCE`,
`RULE_REGEX`, `RULE_COUNT`), header set drift (`HEADER_SET`,
`HEADER_DUPLICATE`, `HSTS_EMITTED`, `CSP_UNSAFE_INLINE_NEUTRALISED`),
resolved-config drift (`POWERED_BY_HEADER`, `IMAGE_CSP*`), ve iki artefaktın
okunamaması (**fail-closed**: "artefakt yok" hiçbir zaman "sorun yok" olarak
okunmaz).

`verify-structure-negative.mjs`, `assertWebSecurityContract` için **23** yeni
senaryo (22 negatif + 1 pozitif kontrol) taşır; her biri gerçek dosya
mutasyonu + gerçek `spawnSync` alt-süreci + git worktree snapshot
restorasyonuyla koşar (bölüm 7 Before/After'daki 96→119'un 23'ü buradan).

**Operasyonel not:** `verify-structure-negative.mjs` worktree'yi geçici
patch'lediği için başka gate'lerle **paralel** koşturulmamalı — bu turda kısa
süreli yanlış bir FAIL üretti; temiz ağaçta tekrar koşumda PASS alındı.

## 14. Generated-Project Kanıtı

`node scripts/tests/bootstrap-e2e.mjs` → exit 0 → tüm assertion'lar PASS
(75 satır, 11 bölüm). Ayrı bir bootstrap koşusu (`acme-shop --apply`)
doğrudan incelendi:

- `apps/web/lib/security-headers.ts` byte-identical; `IMAGE_OPTIMIZER_CSP` korundu.
- `docs/operations/deployment.md`, `apps/admin/README.md`,
  `docs/adr/ADR-0019-web-security-headers.md` byte-identical.
- Skeleton kimliği sızmadı; CSP'de mutlak origin/domain literali yok.
- Manifest `mode = project`; `verify-structure.mjs` → **PASS — 991 checks OK**.
- `SKIP_API=1 pnpm gate` → **All gates PASS**; tabloda `web-headers PASS`.

**Dürüst not (takip kalemi):** `bootstrap-e2e.mjs`, gate tablosunu bütün
olarak doğruluyor ama gate adlarını tek tek sayan iç listesinde `web-headers`
**yok** — bu turun allowlist'i dışında olduğu için genişletilmedi (F-3/F-7
ile aynı sınıf).

## 15. Kapsam ve Denylist Doğrulaması

Denylist'in **hiçbirine** dokunulmadı: `.github/**`, `templates/**`,
`apps/api/**`, `apps/admin/vite.config.ts`, `apps/admin/index.html`,
`packages/**`, `.claude/**`, `project-memory/**`, `docs/releases/**`,
`docs/audits/**`, `docs/source-briefs/**`, `CLAUDE.md`, `README.md`,
`scripts/bootstrap-project.mjs`, `apps/web/vitest.config.ts`, `package.json`,
`pnpm-lock.yaml`, `pnpm-workspace.yaml`.

`git diff --name-status <base>...<C4>` **tam 14 dosya** verir (bu rapor
15.'sidir); bu komut bu turda bizzat koşturulmadı. Aşağıdaki küme C4 ağacının
kendisi salt-okuma ile taranarak — dosyaların birbirine çapraz referans
verdiği doğrulanarak (`assert-web-security-contract.mjs`'teki
`MODULE_REL`/`DOC_REL`/`CONFIG_REL`/`ADMIN_README_REL`, `run-gates.mjs`
`GATES` dizisindeki `web-headers`, `verify-structure.mjs` satır 12/1379,
`structure-manifest.json` `requiredFiles`/`maxLines`/`noBom` kayıtları) —
yeniden kurulmuştur ve verilen **14** sayısıyla birebir örtüşür:

```text
docs/adr/ADR-0019-web-security-headers.md
apps/web/lib/security-headers.ts
apps/web/next.config.ts
apps/web/test/security-headers.test.ts
apps/web/test/next-config-headers.test.ts
docs/operations/deployment.md
scripts/quality/gate-web-headers.mjs
scripts/tests/web-headers-gate-negative.mjs
scripts/quality/run-gates.mjs
scripts/quality/assert-web-security-contract.mjs
scripts/verify-structure.mjs
scripts/tests/verify-structure-negative.mjs
scripts/structure-manifest.json
apps/admin/README.md
```

Manifest'e yeni top-level anahtar eklenmedi — yalnız `requiredFiles`/
`maxLines`/`noBom` kayıtları (ör. `ADR-0019` maxLines 170,
`gate-web-headers.mjs` 180, `assert-web-security-contract.mjs` 230,
`web-headers-gate-negative.mjs` 290 — manifest içeriğinden bizzat okundu).
Sürpriz dosya yok.

## 16. Docker Durumu ve Gate Sonuçları

`docker info` → exit 1; bu ortamda daemon erişilemez. `pnpm gate` bu yüzden
`test` aşamasında düşer, log kök nedeni birebir taşır:

```text
ERROR org.testcontainers.dockerclient.DockerClientProviderStrategy -- Could not find a valid Docker environment.
Caused by: java.lang.IllegalStateException: Could not find a valid Docker environment.
[INFO] BUILD FAILURE
```

Bu bir regresyon **değildir**: değişen 14 dosyanın diff'inde tek bir
Java/Maven dosyası yok. Bu rapor hiçbir yerde "API testleri geçti" **demez**;
bağlayıcı kanıt PR CI'ındaki **`api-verify-testcontainers`** job'ıdır ve bu
turda henüz koşmadı.

| Komut | Exit | Çıktı |
|---|---|---|
| `pnpm gate` | **1** | `test` FAIL — kök neden Docker (yukarıdaki log) |
| `SKIP_API=1 pnpm gate` | **0** | **All gates PASS** — 9 gate: `toolchain · build · web-headers · typecheck · lint · test · audit · structure · contract-drift` |
| `node scripts/verify-structure.mjs` | 0 | PASS — 1316 checks OK |
| `node scripts/tests/verify-structure-negative.mjs` | 0 | 116/116 PASS (mode=skeleton-dev, 3 senaryo kapalı; toplam 119) |
| `node .claude/hooks/tests/run-tests.js` | 0 | PASS — 302 assertions OK (94 fixtures) |
| `node scripts/tests/bootstrap-transaction.mjs` | 0 | 7/7 senaryo PASS |
| `node scripts/tests/bootstrap-e2e.mjs` | 0 | tüm assertion'lar PASS (75 satır, 11 bölüm) |

`web-headers` gate'i `run-gates.mjs`'te **build'den hemen sonra**,
`typecheck`'ten önce koşar: oracle'ı `.next/` artefaktı olduğu için build'den
önce koşarsa bayat/yok artefakt üzerinde PASS verip "sorun yok" izlenimi
üretirdi.

## 17. Security/QA Gate Bulguları ve Açık Riskler

Bağımsız code-reviewer (salt-okuma), disposition **Approve**, CRITICAL 0 /
HIGH 0, zorunlu düzeltme yok:

| ID | Sev | Bulgu | Durum |
|---|---|---|---|
| F-1 | LOW | `literal()` ilk-eşleşme semantiği: yorum satırındaki değer gerçek bildirimi gölgeleyebilir | AÇIK — iki bağımsız katman (test + build-artefaktı) aynı sürüklenmeyi zaten yakalıyor |
| F-2 | LOW | `output: 'export'` tespiti yalnız literal regex; dolaylı biçimler kaçabilir | AÇIK — önerilen düzeltme `required-server-files.json` üzerinden `config.output` |
| F-3 | LOW | Üç oracle konfigürasyonu kanıtlıyor, kabloyu değil; ileride bir `middleware.ts` header'ı silebilir, oracle kırılmaz | AÇIK — yeni borç kalemi |
| F-4 | MEDIUM | Production CSP dizesi 7 dosyada birebir tekrarlanıyor | KABUL EDİLDİ — tautoloji-karşıtı tasarımın bilinçli bedeli, ADR-0019 Consequences'ta sahipli; kod-düzeyinde birleştirme yapılmamalı |
| F-5 | INFO | `style-src` nonce/hash invariantının ayrı teşhis kodu yok (tam-string eşitliği yine yakalar) | Bilgi |
| F-6 | INFO | ADR-0019'un audit referansı üretilen projede kırık kalır (mevcut konvansiyon) | Bilgi |
| F-7 | LOW | Manifest kalem yerleşimi kozmetik | AÇIK |

Security gate ayrıca **kablo üstü tek seferlik doğrulama** yaptı (`next
start` + `curl -D -`): `/` yanıtında beş header, `Strict-Transport-Security`
**yok**; `/_next/image` yanıtında da aynı beş header + `X-Frame-Options:
DENY` — image optimizer yalnız CSP'yi ezer, `frame-ancestors` kaybı XFO ile
telafi edilir. Bu **tek seferlik ikincil kanıttır**, standing invariant
**değildir** — F-3'ün belirttiği gibi gelecekte bir `middleware.ts` bunu
sessizce değiştirebilir.

**QA final-gate verdict'i: PASS_WITH_RISKS. Security gate rapor verdict'i:
PASS_WITH_RISKS.** (Disposition Approve olsa da açık MEDIUM/LOW risk varken
rapor verdict'i otomatik PASS_WITH_RISKS'tir — verdict-policy kural 5.)

## 18. Bitişik Borç ve Merge Öncesi Statü

**Structure borcu çerçevesi:** `scripts/verify-structure.mjs` **1383 → 1390**
satır; AC-33 entegrasyonu net **+7 satır** (tavan 15, beklenen 5). Mevcut
file-size borcu sınırlı entegrasyon satırları kadar arttı; AC-33 domain
mantığı ayrı helper'da (`scripts/quality/assert-web-security-contract.mjs`)
tutuldu.

**Bitişik kusur (bu turda düzeltilmedi):** F4-MEDIUM-04 —
`scripts/verify-structure.mjs:606` (`ANY_BULLET_RE`) ve `:626`
(`ANY_NOTE_BULLET_RE`) yalnız `-` bullet'ını görüyor; markdown `*`, `+`,
`1.` de liste üretir. Durum `OPEN_ADJACENT_DEBT`. AC-33 kapsamına
**alınmadı**. AC-32'nin teknik merge statüsü geriye dönük değişmez. AC-33'ün
doküman katmanı (bölüm 12) bu delikten **etkilenmez** — blok eşitliği hiçbir
satırı ayrıştırmadığı için parse deliği de olamaz.

**Diğer açık kalemler:** F-1, F-2, F-3, F-7 (bölüm 17); bölüm 14'teki
`bootstrap-e2e.mjs` gate-adı listesi eksikliği.

### Merge Öncesi Statü

```text
AC-33:          IMPLEMENTED_PENDING_REVIEW_AND_PR_CI
F4-MEDIUM-03:   REMEDIATED_PENDING_REVIEW_AND_PR_CI
```

Genel proje verdict'i bu remediation ile **değişmez**:

```text
FAIL
CORE_SKELETON_NOT_PRODUCTION_READY
NO_GO_REMEDIATION_REQUIRED
```

Açık kriterler: **AC-33** (bu rapor, PR CI bekliyor) ve **AC-26** (tag ↔
manifest sürüm source-of-truth politikası, F4-LOW-02).

## Sonraki Adım

Required check'ler (`quality-gate-ubuntu`, `api-verify-testcontainers` dahil)
PR CI'da koşar → code-reviewer + Security gate Final Gate Mode'da bu raporu ve
implementasyon diff'ini (üç-katmanlı drift kuralı, build-artefaktı oracle'ı,
`web-headers` gate sırası, HSTS asimetrisi) birlikte inceler → tüm gate'ler
yeşilse merge → memory closure protokolü (`fix/f4-core-web-security-headers`
dalında **değil**, ayrı `chore/memory-close-*` dalında).
