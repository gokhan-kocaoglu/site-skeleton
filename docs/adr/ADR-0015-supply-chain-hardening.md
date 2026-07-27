# ADR-0015: Supply-Chain Sertleştirmesi ve Actions SHA Pinleme

- Status: ACCEPTED
- Date: 2026-07-26 (Faz 8.3 PR-B; brief P1.5 + supply-chain gate)

## Context

Üçüncü bağımsız denetim iki boşluk saptadı. (1) `.github/workflows/ci.yml`
içindeki dokuz harici action referansı hareketli tag'lerdeydi (`@v4`, `@v2`):
tag sahibi tarafından yeniden işaretlenebildiği için bu referanslar
değiştirilebilir kod çalıştırır — CI runner'ı repo secret'larına ve iş ağacına
erişen bir yürütme yüzeyidir. (2) Zafiyet taraması yalnız `pnpm audit --prod`
ile npm production ağacını kapsıyordu; `apps/api` Maven ağacı, npm dev
bağımlılıkları ve üretilen Spring Boot JAR'ı hiç taranmıyordu.

Ayrıca Next 16.2.12 yükseltmesi (PR #24) somut bir regresyon üretti: kök
`pnpm.overrides` selector'ları parent sürüme exact bağlı olduğundan
(`next@16.2.11>postcss`) Next patch'i ilerleyince override sessizce eşleşmeyi
bıraktı ve güvenli PostCSS/Sharp sürümleri düştü. Hata CI audit'inde
yakalandı ama kural düzeyinde bir koruma yoktu.

## Decision

### Actions referansları

- `.github/workflows/**` içindeki TÜM harici `uses:` referansları tam 40
  karakter commit SHA'sına pinlenir; step-level ve job-level (reusable
  workflow) referansların ikisi de kapsam içindedir.
- Her referans aynı satırda **exact release tag** yorumu taşır
  (`# v6.1.0`); `# v6` gibi hareketli major alias kabul edilmez.
- Yerel `./...` action'lar bu zorunluluktan muaftır (repo içeriğiyle birlikte
  zaten commit'e bağlıdır).
- `docker://` tabanlı hareketli referanslar bu fazda kabul edilmez.
- Kısa SHA, branch adı ve SHA'sız tag yasaktır.
- Kural `scripts/verify-structure.mjs` `githubActionsPins` bölümüyle
  enforce edilir; üç negatif senaryo (tag ref, kısa SHA, yorumsuz SHA) kuralın
  gerçekten ısırdığını kanıtlar.

### Action runtime hattı

Node 20 tabanlı action major hatları Node 24 hatlarına çıkarılır:
`actions/checkout` v6, `actions/setup-node` v6, `actions/setup-java` v5,
`pnpm/action-setup` v6. Bu, **action runtime'ıdır**; uygulama test matrisi
Node.js 22 ve Java 21 olarak DEĞİŞMEDEN kalır. Dependency kurulumu yapmayan
`setup-node` adımlarında istenmeyen otomatik paket yöneticisi cache'i
`package-manager-cache: false` ile kapatılır.

### Trivy

- Repository filesystem/package manifest taraması yapılır (`pnpm-lock.yaml`
  ve `apps/api/pom.xml` birlikte tarama hedefidir).
- Üretilen executable Spring Boot JAR ayrıca taranır; gömülü bağımlılıklar
  ancak bu adımda görünür.
- `HIGH` ve `CRITICAL` bulgular CI'ı kırar (`exit-code: 1`).
- `ignore-unfixed` KULLANILMAZ: düzeltmesi yayımlanmamış HIGH/CRITICAL bulgu
  da fail'dir — "yaması yok" bir muafiyet gerekçesi değildir.
- Tarama koşulamıyorsa sonuç temiz sayılmaz; adım fail eder.
- Trivy job'ı `pnpm gate` zincirine EKLENMEZ; ayrı job olarak çalışır (ağ
  bağımlılığı ve süre lokal gate'i kirletmemelidir).

### SBOM

- CycloneDX JSON SBOM üretilir; bu adım **envanterdir**.
- Vulnerability verdict'i SBOM adımından GELMEZ (`exit-code: 0`); verdict
  yalnız iki vuln taramasından gelir.
- SBOM hem `pkg:npm/` hem `pkg:maven/` bileşeni içermek zorundadır;
  `scripts/quality/assert-sbom.mjs` bunu ve güvenli sürüm beklentilerini
  (PostCSS 8.5.18, Sharp 0.35.0 var; 8.4.31 / 0.34.5 yok) doğrular.
- SBOM sınırlı süre (14 gün) artifact olarak saklanır; repository'ye
  commit EDİLMEZ.

### Dependency Review

- Yalnız `pull_request` olayında çalışır.
- Yeni eklenen/güncellenen bağımlılıklarda `HIGH` veya `CRITICAL` zafiyet
  merge'i engeller (`fail-on-severity: high`).
- İlk kapsamda license allow/deny listesi UYGULANMAZ.
- PR yorumu yazılmaz; job'a `pull-requests: write` VERİLMEZ.

### Next override politikası

- `apps/web/package.json` içindeki `next` sürümü exact `x.y.z` olmalıdır.
- Kök `pnpm.overrides`, o exact sürüm için `sharp 0.35.0` ve
  `postcss 8.5.18` selector'larını taşımak ZORUNDADIR.
- Eski Next patch sürümlerine ait stale selector TUTULMAZ.
- Sürümsüz (`next>postcss`) veya aralıklı selector kullanılmaz.
- Next patch'i ilerleyip selector güncellenmezse structure gate FAIL eder —
  PR #24'teki sessiz düşüş bir daha CI audit'ine kalmaz.

### Required checks

PR-B sonrasında required check listesi altı job'dır:
`quality-gate-ubuntu`, `api-verify-testcontainers`,
`hooks-and-structure-windows`, `gitleaks-full-history`,
`supply-chain-trivy`, `dependency-review`. Ruleset bir repository dosyası
değildir; listenin GitHub UI'da genişletilmesi ayrı bir insan adımıdır.

## Alternatives Considered

- **OWASP Dependency-Check:** NVD-merkezli; 2024'ten beri API key ve rate
  limit gerektirir, DB yenileme CI'ın en yavaş adımı olur, kurulum Java + DB
  yükü taşır. Reddedildi.
- **Syft + Grype:** İki ayrı araç, iki ayrı sürüm yüzeyi. Trivy tek binary'de
  hem vuln hem CycloneDX SBOM veriyor (KISS). Reddedildi.
- **Yalnız `pnpm audit` genişletmesi:** Maven ağacını ve JAR içeriğini hiçbir
  koşulda göremez. Reddedildi.
- **Dependabot alert'lerine güvenmek:** Alert'ler bilgilendirir, merge'ü
  teknik olarak engellemez. Reddedildi.
- **Actions'ı tag'de bırakıp yalnız repository policy'sine güvenmek:** UI
  policy hesap/plan bağımlıdır ve repo dosyalarında iz bırakmaz. Reddedildi;
  40-hex structure kuralı bağlayıcı teknik enforcement'tır.

## Security Model

Tehdit: (a) hareketli tag'in yeniden işaretlenmesiyle CI'da keyfi kod
çalıştırılması, (b) bilinen zafiyetli bağımlılığın fark edilmeden main'e
girmesi, (c) parent-scoped override'ın sessizce devre dışı kalması.
Karşılık: (a) değiştirilemez SHA pini + structure gate, (b) iki vuln taraması
+ dependency review, (c) manifest tabanlı override hizalama kuralı.
Top-level `permissions: contents: read` korunur; hiçbir job'a yazma izni,
PAT veya repository secret'ı verilmez. `pull_request_target` kullanılmaz;
kullanıcı kontrollü expression doğrudan shell'e aktarılmaz.

## Failure Semantics

| Durum | Sonuç |
|---|---|
| Root veya JAR taramasında HIGH/CRITICAL | job FAIL |
| Tarama koşulamadı / araç kurulamadı | job FAIL (temiz sayılmaz) |
| SBOM üretildi, zafiyet bulundu | verdict ÜRETMEZ (envanter adımı) |
| SBOM'da npm veya Maven bileşeni yok | assertion FAIL |
| Executable JAR tam olarak bir tane değil | job FAIL |
| Dependency review'da yeni HIGH/CRITICAL | merge engellenir |
| Workflow'da SHA'sız / yorumsuz `uses:` | structure gate FAIL |
| Next selector stale veya eksik | structure gate FAIL |

## Dependabot Interaction

`github-actions` ekosistemi haftalık minor/patch güncellemelerini sürdürür;
Dependabot SHA pinini ve aynı satırdaki sürüm yorumunu birlikte günceller.
Major action geçişleri ADR-0009 kural 4 gereği bot'a kapalıdır ve ADR
kontrolüyle yapılır. SHA pinli action'larda Dependabot alert kapsamının
sınırlı kalması, haftalık version-update PR'ları ve bu ADR'nin bağımsız
supply-chain kontrolleriyle telafi edilir.

## Rollback

Geri alma sırası: (1) `supply-chain-trivy` ve `dependency-review` job'ları
workflow'dan çıkarılır ve required check listesinden düşürülür; (2)
`githubActionsPins` / `nextSecurityOverrides` manifest blokları kaldırılır
(kural veri-güdümlüdür, script'te ölü kod kalmaz); (3) pinler tag'e
döndürülür. Eşik: yeşile çekilemeyen supply-chain job'ı. Kısmi geri alma
tercih edilir — SHA pinleri, tarama job'ları kaldırılsa bile korunur.

## Follow-up Work

- Ruleset'te required check listesini altıya çıkarma (insan adımı; PR açılıp
  yeni check'ler göründükten sonra).
- Repository Settings → Actions full-SHA pin policy'sinin açılması; hesap
  planında görünmüyorsa ruleset gevşetilmez, durum `docs/operations/ci.md`
  içinde belgelenir.
- Maven ağacı için ayrı bir EOL/desteklenirlik kontrolü (ADR-0009 borcu).
