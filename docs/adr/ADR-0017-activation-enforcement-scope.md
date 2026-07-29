# ADR-0017: Optional Module Activation Enforcement Scope

- Status: ACCEPTED
- Date: 2026-07-29
- Authors: system-architect (analiz), orkestratör (kayıt); AC-29 / F4-MEDIUM-01 remediation
- Kabul tetikleyicisi: Dördüncü bağımsız mini-denetim (RC2) — AC-29 FAIL
  (`docs/audits/2026-07-28-fourth-mini-audit-rc2.md` §19; kök kayıt
  `docs/audits/2026-07-28-fourth-mini-audit-rc1.md` §F4-MEDIUM-01, §F4-LOW-05)

## Context

`templates/` altında **beş** birinci-seviye opsiyonel modül vardır
(`admin-bff`, `db`, `e2e`, `operations`, `payments`), fakat:

- `structure-manifest.json` → `activationGates` yalnız **tek** kayıt taşır
  (`admin-bff`),
- `ACTIVATION.md` yalnız `templates/admin-bff/` altında bulunur,
- `README.md` otomatik gate garantisini kopyalanan **her** şablona genelleştirir,
- README tablosu **3**, `CLAUDE.md` listesi **4** modül sayar.

Yani beyan yüzeyi hem enforcement'tan geniş hem de kendi içinde tutarsızdır.
Bulgu bir enforcement açığı değil, **beyan ile enforcement arasındaki farktır**.

Kapsam genişletmenin teknik sınırları ölçüldü: kopya hedefleri yapısal olarak
farklıdır — `db` kopyası yayınlanmış bir Flyway migration'ına dönüşür
(`CLAUDE.md`: yayınlanmış migration düzenlenemez), `operations` kopyası `docs/`
altına iner (tarama `apps/` köküne sabittir), `e2e` bir test modülüdür ve
production sertleştirme yüzeyi yoktur. "Gate'i beşe genelle" tek tip bir
genişletme değildir.

Ayrıca marker sinyali bugün marker **dosyasının bulunduğu dizini** activation
root sayar; `apps/x/src/server.mjs` için `ACTIVATION.md` `apps/x/src/` altında
aranır. Yön güvenlidir (false-FAIL) ama düzeltme yanlış yere yapılır (F4-LOW-05).

## Decision

1. **Registry.** `structure-manifest.json` içine `activationModules` eklenir;
   beş modülün her biri `id`, `templatePath`, `enforcementMode`,
   `activationTarget`, `activationDocument` taşır. Yalnız otomatik gate'li kayıt
   ayrıca `activationGateId` taşır.
2. **İki değerli enforcement taksonomisi.**
   - `automatic-gate` — **yalnız `admin-bff`**. Aktive kopya `verify-structure`
     tarafından yapısal olarak denetlenir.
   - `manual-hardening` — `payments`, `db`, `e2e`, `operations`. Bu modüllerde
     **no automatic activation gate** vardır; proje-özel sertleştirme
     tamamlanana kadar modül **outside the core production-ready claim until
     project-specific hardening** durumundadır.
3. **`documented-only` terimi kullanılmaz.** Doküman bulunması sertleştirme
   yerine geçmez; terim bu izlenimi doğurduğu için yasaklanmıştır.
4. **Beyan makine tarafından bağlanır.** README ve `CLAUDE.md` içindeki
   `activation-modules` bounded section'ları registry ile birebir eşleşmek
   zorundadır (modül kümesi + enforcement modu). Uyuşmazlık `verify-structure`
   FAIL'idir.
5. **Mevcut gate zayıflatılmaz.** `activationGates` döngüsü registry'ye
   bağlanmaz; tarama kökü `apps/` olarak kalır (`packages/` scan root **değildir**);
   checklist kuralı `unchecked === 0 && ticked === checklistItems` **katı
   eşitliğiyle** korunur — fazladan işaretli sahte madde, eksik zorunlu maddeyi
   maskeleyemez. Otomatik gate'li modül kümesi, checklist sayısı **ve tespit
   sinyalleri** (`nameFragment`, `marker`) kodda sabitlenir; sinyalleri manifest
   verisinde boşaltarak kapıyı sessizce etkisizleştirmek FAIL üretir.
6. **Marker-root düzeltmesi (F4-LOW-05).** Marker eşleşmesinde activation root,
   marker dizininden `apps/` yönüne yukarı yürünerek bulunan **en yakın**
   `package.json` sahibi ancestor'dır. `apps` dizininin kendisi ve üstü asla
   değerlendirilmez; ancestor yoksa marker dizinine güvenli fallback yapılır.
   Dizin-adı ve package-adı sinyalleriyle bulunan kökler değişmez.
   **Hiçbir kök düşürülmez.** Ara bir revizyon, "gruplama dizini" varsayımıyla
   altında başka aday bulunan marker köklerini eliyordu; güvenlik kapısı bunun
   gerçek bir kopyayı gizlediğini kanıtladı (sertleştirilmemiş `apps/gw/`,
   altındaki tam işaretli decoy dizin yüzünden sessizleşiyordu). Fazladan bir
   talep fail-closed gürültüdür; düşürülen talep false-PASS'tır. Gruplama
   dizini senaryosunda iki ayrı talep üretilir ve mesaj marker dosyasını
   adlandırır.

## Enforcement model

| Katman | Ne doğrular | Nerede |
|---|---|---|
| Registry bütünlüğü | id/templatePath benzersizliği, gerçek `templates/*` kümesiyle eşitlik, `activationDocument` varlığı, mod–gate tutarlılığı, orphan gate yasağı, yalnız `admin-bff` automatic-gate, `checklistItems === 12` | `verify-structure.mjs` 7j |
| Doküman senkronu | README ve `CLAUDE.md` bounded section'ları ↔ registry (modül + enforcement modu), canonical `manual-hardening` ifadeleri | `verify-structure.mjs` 7j |
| Aktivasyon kapısı | Aktive `admin-bff` kopyasının ACTIVATION.md'si (12/12, işaretsiz madde yok) | `verify-structure.mjs` 7f (değişmedi) |
| Regresyon | Yukarıdakilerin her birinin gevşetildiğinde FAIL ürettiği | `scripts/tests/verify-structure-negative.mjs` |

`automatic-gate` modül kümesi, `admin-bff` checklist sayısı ve gate'in tespit
sinyalleri **manifest'te değil kodda sabittir**; ayrıca sabitlenen checklist
sayısı gerçek `templates/admin-bff/ACTIVATION.md` madde sayısıyla ve marker
imzasının şablonda gerçekten bulunduğu çapraz doğrulanır. Gate'i zayıflatmak
için manifest düzenlemek yetmez, `scripts/**` düzenlemesi gerekir
(authority-map: orkestratör + insan onayı).

## Generated-project effect

Kurallar mode-bağımsızdır ve `mode=project` altında da koşar; kuralı project
modunda kapatmak yasaktır. Karşılaştırılan üç yüzeyin (manifest registry, README
bölümü, CLAUDE bölümü) taşıdığı token'lar — `templates/<id>/`, `automatic-gate`,
`manual-hardening`, beş modül id'si — bootstrap metin ikame anahtarlarının
hiçbirini içermez; dolayısıyla üretilen projede de üç küme eşit kalır.
`activationTarget` alanı bootstrap ikamesine tabi metin içerebildiği için
**doküman karşılaştırmasına dahil edilmez**; bu kısıt bağlayıcıdır.

Bir proje meşru olarak bir şablonu kaldırırsa doğru prosedür kuralı kapatmak
değil **registry-önce** düzenlemedir: `activationModules` kaydı,
`requiredDirs`/`requiredFiles` satırları ve iki doküman bölümü birlikte kalkar.

## Security limitations

- Registry'de `manual-hardening` görünmek, modülün **güvenli veya
  production-ready olduğu anlamına gelmez**. Bu kayıt yalnız repository claim
  kapsamını gerçek enforcement kapsamıyla eşitler.
- `payments` en güvenlik-hassas opsiyonel modüldür ve bu turda otomatik gate
  almamıştır; aktivasyon anındaki sertleştirme (webhook imza doğrulaması,
  idempotency, tutar bütünlüğü, log redaction) proje sorumluluğundadır.
- Marker-root düzeltmesinin kabul edilen artık riski: sertleştirme birimi artık
  **paket sınırıdır**. 12/12 işaretli bir paketin içine, kendi `package.json`'ı
  olmadan vendor'lanmış ikinci bir kopya ayrı FAIL üretmez; o paketin checklist
  sahibinin sorumluluğundadır. Kendi `package.json`'ı olan iç kopya ise ayrı bir
  kök olarak denetlenmeye devam eder.
- Beyanın makine kontrolü satır **yapısına** bağlıdır (README tablosunda
  `Enforcement` kolonu `Template`'ten hemen sonra gelmelidir); bölüm içindeki
  serbest metin denetlenmez.
- Bounded section dışına eski genelleştirilmiş garantinin yeniden yazılması
  makine tarafından yakalanmaz; bu artık risk insan incelemesiyle kapanır.

## Rollback

Değişiklik geri alınabilir: `activationModules` kaydı, 7j bloğu, iki doküman
bölümü ve negatif senaryolar tek revert ile kalkar; `activationGates` ve 7f
bloğu bu değişiklikten etkilenmediği için mevcut `admin-bff` koruması revert
sonrası da aynen çalışmaya devam eder. Geri alınamaz bir yüzey (yayınlanmış
migration, immutable release, donmuş kanıt) bu kararın kapsamında değildir.

## Alternatives Considered

1. **Beş modülü de gated yapmak** — reddedildi: `db` kopyası ölümsüz bir
   migration dizinine kalıcı artefakt bırakır ve "aktivasyon anı" hiç kapanmaz;
   `operations` hedefi `apps/` dışıdır ve checklist kademeli işaretlenir, sıfır
   işaretsiz kuralı dosyanın kendi tasarımını ihlal eder; `e2e` için gate
   orantısızdır. Ayrıca dizin-adı sinyali `payments` gibi genel bir sözcükle
   kullanılırsa gerçek proje route'ları (`apps/web/app/payments/`) false-FAIL
   üretir.
2. **Yalnız README dilini daraltmak** — reddedildi: hiçbir otomatik doğrulama
   üretmez; aynı drift RC1'de bulunup RC2'de aynen tekrarlandı.
3. **`ticked >= checklistItems` gevşetmesi** — reddedildi: fazladan sahte madde
   eksik zorunlu maddeyi maskeleyebilirdi.
4. **`packages/` scan root eklemek** — bu turda reddedildi: kapsam dışıdır ve
   yeni yanlış-pozitif yüzeyi açar.
5. **Marker-root için en UZAK ancestor'ı seçmek** — reddedildi: iç içe
   sertleştirilmemiş kopyayı maskeler (false PASS).

## Consequences

Pozitif: beyan ve enforcement bir daha sessizce ayrışamaz; yeni bir
`templates/*` dizini registry ve iki doküman güncellenmeden FAIL üretir;
`admin-bff` gate'i aynen korunur; F4-LOW-05 hata mesajı gerçek modül kökünü
gösterir.

Negatif / üstlenilen borç: `verify-structure` check sayısı ve dosya boyutu büyür
(800 satır tavanına yaklaşıldı, bölme borcu kaydedildi); yeni otomatik gate
`scripts/**` düzenlemesi ister; `manual-hardening` modülleri yapısal olarak
korumasız kalır — **kayıtlı, sahipli** risk.

## Deferred work

- `payments`/`db`/`e2e`/`operations` için ACTIVATION.md içeriği ve — anlamlı
  olduğu yerde — otomatik gate: aktivasyon-anı hardening turu.
- `packages/` tarama kökü genişlemesi.
- `docs/releases/v1.0.0-rc.1.md` içindeki genelleştirilmiş garanti tarihsel
  kanıttır; düzeltme yeni release notunda yapılır.
- ADR-0016 numarası toolchain baseline politikası için **rezervedir**; bu turda
  oluşturulmamıştır (numara boşluğu bilinçlidir).
