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

| Alan | Kaynak |
|---|---|
| Tag | `v<sürüm>` (kullanıcı oluşturur) |
| Release target merge SHA | Feature PR'ının gerçek merge commit'i |
| Post-merge main CI run URL | Merge sonrası `main` push run'ı |
| Kanıt raporu linkleri | `docs/test-reports/` · `docs/audits/` (tag'e sabitlenmiş) |
| Resertifikasyon linki | `docs/audits/<tarih>-recertification.md` |

**Zincir burada kapanır.** Katman 1 "bu kod doğrulandı", Katman 2 "doğrulanan
kod tam olarak bu SHA ile main'e girdi ve orada da yeşil koştu" der.

## Sıra (bağlayıcı)

```text
1. Feature branch'te iş biter + repo-içi kanıt raporu yazılır (pre-merge SHA)
2. PR açılır → yedi required check yeşil → merge
3. Lokal main güncellenir; merge SHA + PR no + post-merge main CI run kaydedilir
4. chore/memory-close-<tarih>-<slug> dalı → memory closure → seal → closure PR → merge
5. GitHub Release/tag: dış attestation mühürlenir (Katman 2 tablosu doldurulur)
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

## Mevcut durum (2026-07-27)

| Öğe | Değer |
|---|---|
| Son merge edilmiş PR | #27 (Faz 8.3 PR-C) |
| Merge SHA | `dda8342489ade958c38293014ed41d681e28e937` |
| Post-merge main CI run | [30262787137](https://github.com/gokhan-kocaoglu/site-skeleton/actions/runs/30262787137) (CI #57, success) |
| Ruleset | `main-branch-protection` (id 18469047), enforcement **active** |
| Required checks | 7 — quality-gate-ubuntu · api-verify-testcontainers · hooks-and-structure-windows · gitleaks-full-history · supply-chain-trivy · dependency-review · bootstrap-e2e |
| Release | **Henüz oluşturulmadı.** Taslak: `docs/releases/v1.0.0-rc.1.md` |

`v1.0.0` etiketi bu turda gündemde değildir: brief gereği yalnız **dördüncü
mini-denetim** "production-ready" hükmü verdikten sonra atılır.
