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

### Beş aşamalı zamansal model (bağlayıcı)

Memory closure merge sonrasına taşındığı (P0-4) **ve** kanıt paketinin kendisi
de ayrı bir PR ile geldiği için, zincir beş aşamalıdır. Her aşamanın SHA'sı bir
öncekinin merge'inden **sonra** doğar; bu yüzden release notu, henüz var olmayan
alanları placeholder olarak taşır:

```text
feature implementation
→ feature merge / main CI
→ feature memory closure
→ final evidence PR
→ final evidence merge / main CI
→ final evidence terminal memory closure
→ kullanıcı v1.0.0-rc.1 release/tag'i oluşturur
```

**Bağlayıcı kural:**

```text
RC1 release target SHA = final evidence terminal memory closure merge SHA
```

**Neden:** tag daha erken bir SHA'ya verilirse, o SHA kendi kanıt paketini
(final rapor, resertifikasyon eki, release taslağı) veya paketin kapanış
kaydını (Current Status + session log) **kapsamaz** — release, kendi kanıt
zincirinin kapanışını dışarıda bırakır. Daha erken SHA'lar silinmez; her biri
**ayrı kanıt alanı** olarak korunur.

### Release notu alan tablosu

| Alan | Kaynak |
|---|---|
| Tag | `v<sürüm>` (kullanıcı oluşturur) |
| PR-D feature implementation merge SHA | Feature PR'ının gerçek merge commit'i |
| PR-D feature post-merge main CI | Feature merge sonrası `main` push run'ı |
| **Evidence package base SHA** | Feature memory closure PR'ının merge commit'i — kanıt paketinin üzerine inşa edildiği base |
| Final evidence PR numarası / head / PR CI | Kanıt paketi PR'ı |
| Final evidence PR merge SHA | Kanıt paketi merge edildiğinde doğar |
| Final evidence post-merge main CI | O merge sonrası `main` push run'ı |
| Final evidence closure PR | Kanıt paketinin terminal memory closure PR'ı |
| **Final evidence closure merge SHA** | Closure merge edildiğinde doğar |
| Final evidence closure post-merge main CI | Closure merge sonrası `main` push run'ı |
| **RC1 release target SHA** | = final evidence closure merge SHA |
| Kanıt raporu linkleri | `docs/test-reports/` · `docs/audits/` (tag'e sabitlenmiş) |
| Resertifikasyon linki | `docs/audits/<tarih>-recertification.md` |

**Zincir burada kapanır.** Katman 1 "bu kod doğrulandı", Katman 2 "doğrulanan
kod tam olarak bu SHA ile main'e girdi, orada da yeşil koştu, ve hem kanıt
paketi hem kapanış kaydı aynı ağaçta" der.

### Dördüncü mini-denetimin yeri

Dördüncü mini-denetim **`v1.0.0-rc.1` yayınlandıktan SONRA** yürütülür ve
release candidate'ı denetler. `v1.0.0-rc.1`'in ön koşulu **değildir**;
production-ready hükmü yalnız **`v1.0.0`** kararını etkiler (brief FİNAL §5).

## Sıra (bağlayıcı)

```text
1. Feature branch'te iş biter + repo-içi kanıt raporu yazılır (pre-merge SHA)
2. PR açılır → yedi required check yeşil → merge     [feature implementation merge SHA]
3. Lokal main güncellenir; merge SHA + PR no + post-merge main CI run kaydedilir
4. chore/memory-close-<tarih>-<slug> dalı → memory closure → seal → closure PR
   → merge                                            [evidence package base SHA]
5. Final evidence PR (kanıt raporu + resertifikasyon eki + release taslağı)
   → yedi check → merge                               [final evidence merge SHA]
6. Final evidence için terminal memory closure PR → merge
                                                      [final evidence closure merge SHA]
7. GitHub Release/tag v1.0.0-rc.1: dış attestation mühürlenir;
   tag target = adım 6'nın SHA'sı
8. Dördüncü mini-denetim release candidate'ı denetler → yalnız production-ready
   hükmü çıkarsa v1.0.0 gündeme gelir
```

Adım 7 bir **kullanıcı adımıdır**; Claude yalnız taslağı hazırlar
(`docs/releases/`). Release oluşturma, tag atma ve ruleset değişikliği
repository dosyalarıyla yapılamaz.

**Adım 7'nin placeholder'ları yeni bir repository PR'ı ile doldurulmaz** —
değerler dış immutable GitHub Release üzerinde mühürlenir. Aksi hâlde her
release yeni bir kanıt PR'ı, o da yeni bir closure gerektirir ve zincir
kapanmaz.

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
| Feature terminal memory closure PR | **#29** |
| **Evidence package base SHA** | `90bbf1205509633c0b1004af57e7ebfcd51327f6` |
| Feature closure post-merge main CI | [30350754770](https://github.com/gokhan-kocaoglu/site-skeleton/actions/runs/30350754770) — success |
| Final evidence PR | **#30** · head `a312cf148e988c50750eb077b1e5afd1e609ed08` |
| Final evidence PR CI | [30354440371](https://github.com/gokhan-kocaoglu/site-skeleton/actions/runs/30354440371) — success (7/7) |
| Final evidence PR merge SHA | `FINAL_EVIDENCE_MERGE_SHA` *(henüz yok)* |
| Final evidence post-merge main CI | `FINAL_EVIDENCE_POST_MERGE_CI_RUN_URL` *(henüz yok)* |
| Final evidence closure PR | `FINAL_EVIDENCE_CLOSURE_PR` *(henüz yok)* |
| Final evidence closure merge SHA | `FINAL_EVIDENCE_CLOSURE_MERGE_SHA` *(henüz yok)* |
| Final evidence closure post-merge main CI | `FINAL_EVIDENCE_CLOSURE_POST_MERGE_CI_RUN_URL` *(henüz yok)* |
| **RC1 release target SHA** | `RC1_RELEASE_TARGET_SHA` = `FINAL_EVIDENCE_CLOSURE_MERGE_SHA` *(henüz yok)* |
| Ruleset | `main-branch-protection` (id 18469047) · **active** · 7 required check · strict **true** |
| Required checks | quality-gate-ubuntu · api-verify-testcontainers · hooks-and-structure-windows · gitleaks-full-history · supply-chain-trivy · dependency-review · bootstrap-e2e |
| Release | **oluşturulmadı** |
| Tag | **oluşturulmadı** |
| Kanıt paketi | **`PASS_WITH_RISKS`** — `READY_FOR_FINAL_EVIDENCE_PR_MERGE` |
| RC1 dış attestation (MEDIUM-10) | **`PENDING_USER_ACTION`** |
| Dördüncü mini-denetim | **başlatılmadı** — `v1.0.0` gate'i, rc.1'in ön koşulu değil |
| Kanıt raporu | `docs/test-reports/2026-07-28-faz8.3-release-hardening.md` |
| Resertifikasyon eki | `docs/audits/2026-07-03-recertification.md` (Faz 8.3 eki) |
| Release taslağı | `docs/releases/v1.0.0-rc.1.md` |

`v1.0.0` etiketi bu turda gündemde değildir: brief gereği yalnız **dördüncü
mini-denetim** "production-ready" hükmü verdikten sonra atılır.
