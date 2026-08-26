# Current Status — Site Skeleton

> Şablon: `00_System/Current-Status-template.md`. 7 başlık zorunludur;
> `session-close-validator` hook'u eksik başlıkta veya bayat durum ifadesinde
> kapanışı reddeder.

## Aşama

RC2 NO-GO remediation acceptance-criterion zinciri **teknik olarak tamamlandı**.
**AC-29**, **AC-32**, **AC-33** ve **AC-26** implementation'ları merge edildi
ve post-merge main CI ile doğrulandı. Açık formal acceptance criterion:
**YOKTUR**. 

Genel karar aynen korunur: **FAIL / CORE_SKELETON_NOT_PRODUCTION_READY /
NO_GO_REMEDIATION_REQUIRED**. Son canonical audited immutable candidate `v1.0.0-rc.2` olmaya devam eder. Yeni immutable candidate henüz oluşturulmamıştır.
Bu teknik sonuç canonical RC2 audit'ini geriye dönük değiştirmez.

ADR-0018, kayıtlı durumun audited upstream release provenance'ı olduğunu
tanımlar — bu, üretilen projenin kendi release durumu değildir.

Açık adjacent debt/risk (formal AC değildir): **F4-MEDIUM-04** OPEN_ADJACENT_DEBT,
**PostCSS 8.5.18 / CVE-2026-69153 / MODERATE** OPEN_ADJACENT_RISK.

## Son Tamamlanan Görev

**AC-26 / F4-LOW-02 — Release Version Source-of-Truth Remediation:**
`PR #48` (`fix(structure): bind release tag to manifest version authority`)
merge edildi. 

Commit zinciri (C1–C6):
- C1: `659ccf92055888872aae652f3542587c857ef495` — docs(adr): record release version source-of-truth policy
- C2: `1f39fa9e684850edd269ba41736971379c8bc966` — feat(quality): add release version contract oracle
- C3: `9be728f742a0d01ec7f38013e37cfc317abbb73d` — feat(structure): bind release version policy to manifest and release procedure
- C4: `e36c75a529ba109239a7712d3292c67504b4526f` — docs(test): record AC-26 remediation evidence
- C5: `96a5337095ed0c3e4ec3f5029f5b63cc3b4ac92e` — fix(quality): enforce exact non-authoritative version sources
- C6: `b389e5d2c502d47f6ad3108b55380f4907fa7b05` — docs(test): correct AC-26 final evidence measurements

Binding PR CI `32948242747` — pull_request — success 7/7 · merge
`663fe6890fecb9f7de365b2bf45083fd57e5c091` · merged `2026-08-26T09:01:03Z` ·
merge parent1 `b58273ecdce97f1d8bcce5c214c89422e57c642d` · merge parent2
`b389e5d2c502d47f6ad3108b55380f4907fa7b05` · post-merge main CI `32950758123`
— success (altı aktif job success, `dependency-review` skipped).

Kanıt işaretçisi: `docs/test-reports/2026-08-25-ac-26-release-version-source-of-truth.md` +
`docs/adr/ADR-0020-release-version-source-of-truth.md`.

Sayısal özet: verify-structure 1316 → 1340 (+24 check) · negatif suite 130 tanımlı / 127 koşan · release-version negative 60 senaryo · scripts/verify-structure.mjs
1390 → 1401 satır (+11) · release-attestation.md 164 satır / +0 delta ·
docs/releases/README.md 69 → 97 satır · hook harness 302/94 · bootstrap transaction 7/7 ·
full pnpm gate 9/9 PASS (gerçek Testcontainers).

Policy: `upstreamReleaseVersionPolicy` exact 6-key şema · canonicalVersion 1.0.0 ·
tagPrefix v · prereleaseChannels ["rc"] · generatedProjectScope upstream-only.

Teknik sonuç: **AC-26 `MERGED_AND_POST_MERGE_CI_VERIFIED`** · **F4-LOW-02
`MERGED_AND_POST_MERGE_CI_VERIFIED`**. Bu teknik sonuç canonical RC2 audit'ini
geriye dönük değiştirmez.

Bağımsız review (R1 + R2): exact non-authoritative source set fail-closed hale
getirildi (C5); evidence final structure count 1340'a düzeltildi — C3 interim
değeri 1337 korundu (C4 manifest tescili +3 check ekledi).

## Aktif Görev

Formal acceptance-criterion remediation zinciri **tamamlanmıştır** (AC-26 merged).
Aktif teknik safha: **bilinen adjacent debt/risk disposition** —
F4-MEDIUM-04 (`verify-structure` Markdown bullet collector) ve PostCSS CVE-2026-69153
/ MODERATE riski için salt-okuma teşhis + kontrollü remediation zinciri.
Durum: **`READ_ONLY_DIAGNOSIS_PENDING`**. Implementation, PostCSS remediation,
yeni candidate/audit henüz başlamadı.

## Blocker

Formal acceptance criterion blocker: **YOKTUR**. AC-29, AC-32, AC-33 ve AC-26
tümü karşılanmıştır. 

Ancak production-ready gate'i **kapalıdır** şu nedenlerle:

- Yeni immutable candidate **henüz oluşturulmamıştır**
- Yeni bağımsız audit **henüz yürütülmemiştir**
- Son canonical audited immutable candidate `v1.0.0-rc.2` olmaya devam eder;
  yeni immutable candidate henüz oluşturulmamıştır

Açık adjacent debt/risk:

- **F4-MEDIUM-04** OPEN_ADJACENT_DEBT (verify-structure bullet toplayıcı design)
- **PostCSS 8.5.18 / CVE-2026-69153 / MODERATE** OPEN_ADJACENT_RISK

Bu ikisi formal acceptance criterion değildir; toplam `FAIL` verdict'ini
değiştirmez ama release ve deployment sertifikasyonu öncesi ele alınması
gereklidir.

## Sonraki 3 Adım

1. **F4-MEDIUM-04** için salt-okuma teşhis/tasarım yap; gerçek etki alanını,
   root cause'u, mevcut negatif test kapsamını ve minimal remediation package'ını
   belirle.
2. F4-MEDIUM-04 için gerekli disposition/remediation zincirini kontrollü
   biçimde tamamla; ardından **PostCSS CVE-2026-69153 / MODERATE** riskini
   bağımsız salt-okuma değerlendirmeye al.
3. F4-MEDIUM-04 ve PostCSS risk disposition/remediation tamamlandıktan sonra
   **clean-clone/full-gate sertifikasyonu** yap ve ancak bundan sonra yeni
   immutable candidate hazırlığına geç. Yeni candidate bu adımlar
   tamamlanmadan oluşturulmayacaktır.

## Son Uygulama Commiti

`PR #48` · `Merge SHA: 663fe6890fecb9f7de365b2bf45083fd57e5c091` ·
`Post-merge main CI: 32950758123` · `Sonuç: completed / success` ·
`dependency-review: skipped — main push için beklenen`.

## Memory Closure Commiti

chore(memory): close session 2026-08-26 · 71e1af634cfd3372da19db6671753bdc5b1c8303
