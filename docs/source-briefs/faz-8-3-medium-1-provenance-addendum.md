# Faz 8.3 MEDIUM-1 — Provenance Addendum

> **Provenance status: `RECOVERED_WITH_DOCUMENTED_INFERENCE`**
>
> Bu addendum, üçüncü bağımsız denetimin MEDIUM-1 maddesinin **konusunu**
> iki onaylı kaynağın kesişiminden geri kazanır. Orijinal denetim raporunun
> birebir cümlesi **bulunmamıştır** ve bulunduğu iddia edilmemektedir.

## Neden addendum gerekli

`docs/test-reports/2026-07-28-faz8.3-release-hardening.md` ilk sürümünde
MEDIUM-1 satırı `NOT_MAPPED` taşıyordu ve bu, kanıt paketini blocker'a
çekiyordu. Gerekçe doğruydu: madde konusu repository içindeki hiçbir dosyadan
doğrudan okunamıyordu ve tahmin yürütmek yasaktı.

Bu addendum tahmini değil, **iki onaylı kaynak arasındaki eşleşmeyi** kayda
geçirir; böylece finding'in kaynağı denetlenebilir hâle gelir ve `NOT_MAPPED`
durumu kalkar.

## Kaynak sayım mutabakatı

Bağlayıcı brief (`faz-8-3-release-hardening-brief.md`) başlığında şunu yazar:

```text
4 HIGH + 10 MEDIUM'un tamamı geçerli.
```

Aynı brief **dokuz** MEDIUM maddesini açıkça numaralandırır:

| Brief bloğu | Madde |
|---|---|
| P0-4 | MEDIUM-10 |
| P1.1 | MEDIUM-2 |
| P1.2 | MEDIUM-3 |
| P1.3 | MEDIUM-4 |
| P1.4 | MEDIUM-5 |
| P1.5 | MEDIUM-6 |
| P1.6 | MEDIUM-7 |
| P1.8 | MEDIUM-8 |
| P1.7 | MEDIUM-9 |

Numaralandırılmış dokuz maddeye karşılık toplam **on** madde beyan edilmiştir.
Eksik olan tek numara **MEDIUM-1**'dir.

Aynı brief, sonunda **numara vermeden** bağlayıcı bir kapsam kararı taşır
(`## Kapsam kararları (değişmedi, kayda geçer)`):

```text
BFF/payment/E2E/backend-ops aktivasyon modülleri olarak kalır; genel
anlatımda "tüm modülleriyle production-ready" İFADESİ KULLANILMAZ —
README diline "core production-ready; optional modules require activation
hardening" ayrımı eklenir.
```

Bu, brief'teki **tek numarasız audit-remediation talebidir**.

## Geri kazanılan eşleşme

21 Temmuz 2026 tarihli **kullanıcı-onaylı Faz 8.3 final implementation
planında**, PR-E kapsamı şu iki gereksinimi **birlikte** taşıyordu:

1. `docs/audits/2026-07-03-recertification.md` içinde
   **HIGH-1..4 + MEDIUM-1..10** kapanış tablosu;
2. README'de **"core production-ready; optional modules require activation
   hardening"** ayrımı ve *"tüm modülleriyle production-ready"* ifadesinin
   kullanılmaması.

MEDIUM-2…MEDIUM-10 zaten başka brief bloklarına atanmış olduğundan, PR-E
kapsamında kalan **tek audit-remediation** bu kapsam dili maddesidir. Dolayısıyla:

```text
MEDIUM-1 = Production-ready kapsam iddiası —
           core skeleton ile dormant optional modules sınırının ayrılması
```

**Provenance dili (bağlayıcı):**

```text
Recovered mapping from the binding brief's unnumbered scope decision and the
user-approved final implementation plan.
```

## Uygulama kanıtı

Konu kapatılmıştır; kanıt dört katmanda doğrulanabilir (hepsi salt-okuma ile
`main` üzerinde teyit edildi):

### 1. Binding brief

`docs/source-briefs/faz-8-3-release-hardening-brief.md` → `Kapsam kararları`:
core/optional ayrımı ve *"tüm modülleriyle production-ready"* yasağı.

### 2. README (mevcut `main` içeriği — bu dalda değiştirilmedi)

`README.md` → `### Optional modules (copy to activate — never part of the build)`:

```text
Core skeleton production-ready baseline. Optional modules require
activation hardening before production use. The templates below are not
built, not tested by the gate chain and not covered by any production-ready
claim.
```

Doğrulanan davranış:

- **Build kapsamı dışı:** `pnpm-workspace.yaml` yalnız `apps/*` ve `packages/*`
  içerir; `templates/` hiçbir workspace'e girmez, dolayısıyla `pnpm build` /
  `pnpm gate` zincirinde koşmaz.
- **Production-ready iddiası dışı:** README bunu açıkça yazar.
- Yasaklı ifade (*"tüm modülleriyle production-ready"* / *"fully
  production-ready"*) README'de **0 kez** geçer.

### 3. Yapısal enforcement

`scripts/verify-structure.mjs` `activationGates` +
`scripts/structure-manifest.json`:

```json
{ "id": "admin-bff", "nameFragment": "bff",
  "marker": "ADMIN_BFF_TEMPLATE_MARKER", "checklistItems": 12 }
```

- Tespit `apps/**` altında **recursive**;
- üç sinyalden herhangi biri yeterli: dizin adı · `package.json` name ·
  `ADMIN_BFF_TEMPLATE_MARKER` (rename'e dayanıklı);
- aktive kopyada `ACTIVATION.md` zorunlu ve **tamamlanmamış checklist FAIL**
  üretir;
- dormant kaynak şablon (`templates/admin-bff/ACTIVATION.md`, 12 işaretsiz /
  0 işaretli) hiçbir zaman aktif modül sayılmaz — bu ayrımın kendisi
  `verify-structure` negatif senaryolarıyla kanıtlıdır.

### 4. Release draft

`docs/releases/v1.0.0-rc.1.md` → `Optional module activation sınırı`: aynı
ayrım ve aynı yasak, release notu diline taşınmış hâlde.

## Kalan risk

Kapsam ve anlatım problemi kapanmıştır; **yükümlülük kapanmamıştır**:

| Risk | Severity | Sahip |
|---|---|---|
| Optional modüller aktivasyon anında hardening gerektirir (BFF-1/2/3) | **MEDIUM** | Aktivasyon-anı implementer |

Bu nedenle madde durumu `CLOSED` değil **`CLOSED_WITH_ACCEPTED_RISK`**'tir.
Teknik güvenlik ağı: `activationGates` — checklist tamamlanmadan gate FAIL.

## Sınır

Bu addendum'un dürüstçe **iddia etmediği** şeyler:

- Orijinal üçüncü denetim raporunun **metni bulunmamıştır**. Rapor
  repository'de yoktur ve git geçmişinde de hiç bulunmamıştır
  (`git log --all --diff-filter=A` ile doğrulandı); `docs/audits/` yalnız
  Faz 8.1 baseline security review ve resertifikasyon raporunu içerir.
- MEDIUM-1'in **birebir orijinal cümlesi** alıntılanmamıştır; geri kazanılan
  şey maddenin **konusudur**.
- `docs/test-reports/2026-07-26-faz8.3-pr-b-quality-gate.md` içindeki `M1`
  etiketi **farklı bir numaralandırmadır** (o raporun kendi risk defterindeki
  jackson-databind CVE kaydı) ve MEDIUM-1 ile **eşitlenmemiştir**.
- TypeScript sürüm notu MEDIUM-1 sayılmamıştır.

Orijinal denetim raporu ileride `docs/audits/` altına alınırsa, bu addendum
onunla karşılaştırılmalı ve gerekirse düzeltme şerhiyle güncellenmelidir.
