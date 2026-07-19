# ADR-0012: Lint Zorlama Derinliği (CWV/Hooks/a11y şimdi; type-aware ertelendi)

- Status: ACCEPTED
- Date: 2026-07-03
- Authors: orkestratör (ölçüm + kayıt); onay: kullanıcı (denetim #18 kapatma görevi)

> **Şerh (2026-07-03, Faz 8.2):** Bilinen 2 bulgu (`metadata.test.ts`
> no-unsafe-assignment) Faz 8.2/C10'da açık tiplemeyle kapatıldı; type-aware
> kural benimseme kararı ilk gerçek projede verilir (statü değişmedi).

## Context

Denetim #18 (P1): web/admin ESLint yalnız `@eslint/js` + `typescript-eslint`
recommended koşuyordu; Next CWV, React Hooks, JSX a11y, React Refresh,
type-aware lint ve import boundary kuralları yoktu. "SEO ve a11y gate'lerinin
objektif bölümleri ajan yorumuna bırakılmamalı, lint seviyesinde enforce
edilmelidir."

## Decision

**Şimdi zorlanan** (2026-07-03, commit'li):
- web: `@next/eslint-plugin-next` flatConfig.coreWebVitals + `react-hooks`
  recommended + `jsx-a11y` flat recommended.
- admin: `react-hooks` + `jsx-a11y` + `react-refresh` (configs.vite).
- Her iki app: `no-restricted-imports` ile cross-app import yasağı
  (monorepo sınırı; paylaşım yalnız `@skeleton/*` workspace paketleriyle).

**Ertelenen — type-aware lint** (`recommendedTypeChecked` + `projectService`):
Ölçüm (bu iskelet, soğuk koşu): web 2.1s → 4.1s, admin 1.6s → 2.8s (~2×).
Gate zinciri zaten `pnpm type-check` (tsc --noEmit) koşuyor; type-aware lint
tip bilgisini ikinci kez üretir ve maliyeti kod tabanıyla ölçeklenir.
Bulunanlar da kayıtlı: 2 gerçek bulgu (`metadata.test.ts` no-unsafe-assignment)
+ altyapı gereksinimi (config *.mjs için allowDefaultProject). Benimseme yolu:
`projectService: true` + `allowDefaultProject: ["*.mjs"]` + iki test bulgusunun
düzeltilmesi. Karar noktası: gerçek proje başlangıcında (bootstrap sonrası)
veya lint süresi bütçesi gözden geçirilirken yeniden değerlendirilir.

**Ertelenen — import boundary plugin'i** (eslint-plugin-import-x/boundaries):
2 app + 2 paketlik iskelette core `no-restricted-imports` sınırı yeterli
(YAGNI); paket sayısı/iç katman kuralları büyüyünce plugin'e geçilir.

## Consequences

- (+) CWV/hooks/a11y ihlalleri artık gate'te objektif FAIL üretir; mevcut kod
  0 ihlalle geçti (kanıt: resertifikasyon raporu güncellemesi).
- (+) coverage/ çıktıları lint kapsamı dışına alındı (type-aware denemesinin
  yan bulgusu).
- (−) Type-aware kuralların yakalayacağı sınıf (unsafe any, floating promise)
  şimdilik yalnız tsc + code review'a emanet; iki bilinen test bulgusu
  benimseme anına dek açık kalır (kayıtlı, düşük risk).

## Alternatives Considered

- **Type-aware'i şimdi açmak:** ~2× lint süresi + tsc ile mükerrer iş;
  iskeletin minimal-gate ilkesine aykırı. Reddedildi (erteleme, iptal değil).
- **eslint-config-next paketi:** react/import/a11y plugin'lerini toplu getirir
  ama sürüm ve kural kontrolü dolaylılaşır; açık plugin listesi tercih edildi.
