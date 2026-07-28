# Release Attestation — Kanıt Katmanları ve Mühürleme Sözleşmesi

> Faz 8.3 P0-4 / MEDIUM-10. Bağlayıcı: bu dosya, "hangi kanıt nerede mühürlenir"
> sorusunun tek cevabıdır. `qa-quality-gate` skill'i ve `docs/operations/ci.md`
> buraya işaret eder.

## Problem

Ruleset main'e doğrudan push'u reddeder: her şey PR'dan geçer. Bu, kanıt
zincirinde bir sıra problemi yaratır — **repo içine yazılan bir rapor, kendi
merge SHA'sını içeremez**, çünkü o SHA rapor commit'lendikten sonra oluşur.
Raporu merge SHA'sıyla "tamamlamaya" çalışmak ya uydurma değer yazmayı ya da
sonsuz bir amend döngüsünü davet eder.

Çözüm, kanıtı iki katmana ayırmaktır.

## Katman 1 — Repo-içi kanıt (pre-merge)

Feature branch'teki commit'e bağlıdır ve PR açılmadan önce tamamlanır.

| Alan | Kaynak |
|---|---|
| Feature commit SHA | `git log --oneline -1` (raporun üretildiği koşu) |
| PR numarası | PR açıldığında bilinir |
| PR CI run URL | PR üzerindeki checks sekmesi |
| Test/audit raporları | `docs/test-reports/` · `docs/audits/` |

**Kural:** repo-içi rapor, henüz var olmayan bir merge SHA'yı içermek zorunda
DEĞİLDİR; içermeye çalışması bir hatadır. Rapor pre-merge koşuyu gösterir ve
bu yeterlidir.

## Katman 2 — Dış immutable attestation (post-merge)

Feature PR'ı **ve** onu izleyen memory-only closure PR'ı merge edildikten
sonra, GitHub Release (tag) üzerinde mühürlenir. Release notu değişmez kanıt
taşıyıcısıdır.

### Üçlü SHA modeli (bağlayıcı — Faz 8.3'te netleşti)

Final zincir **iki ayrı merge commit** içerir, çünkü memory closure merge
sonrasına taşınmıştır (P0-4). Tek bir "merge SHA" alanı bu yüzden yetersizdir:

| Kavram | Ne kanıtlar |
|---|---|
| **Feature implementation merge SHA** | Implementation'ın main'e girdiği commit |
| **Terminal closure / final main SHA** | Implementation **+** post-merge memory closure zincirinin birlikte bulunduğu final main durumu |
| **Release tag target SHA** | Tag'in işaret ettiği commit — **terminal closure SHA'sı olmalıdır** |

**Tag target neden closure SHA'sıdır:** tag feature merge SHA'ya verilirse,
sonradan merge edilen terminal closure kayıtları (Current Status'un gerçek
merge/CI kanıtı + session log) tag'in dışında kalır — release, kendi kanıt
zincirinin kapanışını kapsamaz. Feature merge SHA silinmez; **ayrı bir kanıt
alanı** olarak korunur.

### Release notu alan tablosu

| Alan | Kaynak |
|---|---|
| Tag | `v<sürüm>` (kullanıcı oluşturur) |
| **Feature implementation merge SHA** | Feature PR'ının gerçek merge commit'i |
| **Feature post-merge main CI run URL** | Feature merge sonrası `main` push run'ı |
| **Terminal closure / final main SHA** | Memory-only closure PR'ının merge commit'i |
| **Final main CI run URL** | Closure merge sonrası `main` push run'ı |
| **Release target SHA** | = terminal closure / final main SHA |
| Kanıt raporu linkleri | `docs/test-reports/` · `docs/audits/` (tag'e sabitlenmiş) |
| Resertifikasyon linki | `docs/audits/<tarih>-recertification.md` |

**Zincir burada kapanır.** Katman 1 "bu kod doğrulandı", Katman 2 "doğrulanan
kod tam olarak bu SHA ile main'e girdi, orada da yeşil koştu ve kapanış kaydı
da aynı ağaçta" der.

## Sıra (bağlayıcı)

```text
1. Feature branch'te iş biter + repo-içi kanıt raporu yazılır (pre-merge SHA)
2. PR açılır → yedi required check yeşil → merge     [feature implementation merge SHA]
3. Lokal main güncellenir; merge SHA + PR no + post-merge main CI run kaydedilir
4. chore/memory-close-<tarih>-<slug> dalı → memory closure → seal → closure PR
   → merge                                            [terminal closure / final main SHA]
5. GitHub Release/tag: dış attestation mühürlenir (Katman 2 tablosu doldurulur);
   tag target = adım 4'ün SHA'sı
```

Adım 5 bir **kullanıcı adımıdır**; Claude yalnız taslağı hazırlar
(`docs/releases/`). Release oluşturma, tag atma ve ruleset değişikliği
repository dosyalarıyla yapılamaz.

## Uydurma yasağı

Bilinmeyen alan **açık placeholder** olarak bırakılır
(`FINAL_MERGE_SHA`, `FINAL_MAIN_CI_RUN_URL`, …). Tahmini SHA veya run numarası
yazmak kanıt değil, kanıt taklididir. Faz 8.2 session log'u bunun somut örneğidir:
kapanışta varsayılan "CI #29" numarası, sonradan GitHub kaydından doğrulanınca
**#30** çıkmıştır (düzeltme şerhi: vault `08_Session_Logs/2026-07-19-session-06.md`).

## Mevcut durum (2026-07-28)

| Öğe | Değer |
|---|---|
| Feature PR | **#28** (Faz 8.3 PR-D) |
| Feature implementation merge SHA | `cf5226f05848a9e27c8b14877b455c8bdfe5e7e5` |
| Feature post-merge main CI | [30348674300](https://github.com/gokhan-kocaoglu/site-skeleton/actions/runs/30348674300) — success |
| Terminal memory closure PR | **#29** |
| Final main / closure merge SHA | `90bbf1205509633c0b1004af57e7ebfcd51327f6` |
| Final main CI | [30350754770](https://github.com/gokhan-kocaoglu/site-skeleton/actions/runs/30350754770) — success |
| Release tag target SHA (planlanan) | `90bbf1205509633c0b1004af57e7ebfcd51327f6` |
| Ruleset | `main-branch-protection` (id 18469047) · **active** · 7 required check · strict **true** |
| Required checks | quality-gate-ubuntu · api-verify-testcontainers · hooks-and-structure-windows · gitleaks-full-history · supply-chain-trivy · dependency-review · bootstrap-e2e |
| Release | **oluşturulmadı** |
| Tag | **oluşturulmadı** |
| Kanıt paketi | **`PASS_WITH_RISKS`** — `READY_FOR_FOURTH_MINI_AUDIT` |
| Dördüncü mini-denetim | **henüz yürütülmedi** (paket hazır) |
| Kanıt raporu | `docs/test-reports/2026-07-28-faz8.3-release-hardening.md` |
| Resertifikasyon eki | `docs/audits/2026-07-03-recertification.md` (Faz 8.3 eki) |
| Release taslağı | `docs/releases/v1.0.0-rc.1.md` |

`v1.0.0` etiketi bu turda gündemde değildir: brief gereği yalnız **dördüncü
mini-denetim** "production-ready" hükmü verdikten sonra atılır.
