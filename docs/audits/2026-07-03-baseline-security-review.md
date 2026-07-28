# Baseline Security Review — Faz 8.1 Sprint 4 (2026-07-03)

- Gate: Security (BASELINE kapsam — diff değil; brief §4.6, Denetim #23)
- Reviewer: code-reviewer ajanı (Opus) + yeniden doğrulama turu
- İnceleme koşusu: working tree (31175ac üstü, Sprint 4 değişiklikleriyle);
  bulgular ve remediation'lar **commit `4abd5a4`** ile mühürlendi. Kanıt
  komutları commit'li kodda yeniden koşuldu (aşağıda).
- Verdict sözlüğü: `.claude/rules/common/verdict-policy.md`

## Kapsam (5/5 zorunlu madde)

1. `templates/admin-bff/` (server.mjs + README) — HttpOnly refresh köprüsü
2. `templates/payments/` — PaymentProvider portu + Iyzico/Stripe adaptörleri
3. `templates/db/coupons.sql` + ADR-0011 — kupon transaction modeli
4. `.claude/hooks/` secret savunma hattı (pre-write-secret-scan,
   secret-patterns, pre-bash-redirect-guard)
5. `.claude/settings.json` permissions + `apps/api` application.yml fail-fast

## Bulgular ve sonuçları

| ID | Severity | Bulgu | Sonuç |
|----|----------|-------|-------|
| BFF-1 | MEDIUM | `/auth/*` rate limiting yok | Kayıtlı bilinçli eksik — README hardening checklist maddesi; aktivasyon öncesi zorunlu |
| BFF-2 | MEDIUM | Origin/Sec-Fetch-Site doğrulaması yok | Kayıtlı bilinçli eksik — checklist maddesi |
| BFF-3 | MEDIUM | CORS / content-type / upstream yanıt şeması doğrulaması yok | Kayıtlı bilinçli eksik — checklist maddesi |
| BFF-4/5 | LOW | Body sayımı UTF-16 kod birimi; `req` error handler yok; bozuk JSON→500; 204 gövdeli | **Checklist'e madde olarak eklendi** (4abd5a4) — belgeli eksik sınıfına indi |
| PAY-1 | LOW | Webhook imza karşılaştırması constant-time olmalı; idempotencyKey kalıcılığı | **KAPANDI** — payments README aktivasyon maddesi 6 (4abd5a4) |
| CPN-1 | LOW | `created_by` FK'si indekssiz | **KAPANDI** — `idx_coupons_created_by` (4abd5a4) |
| HOOK-1 | MEDIUM | settings.json Read-deny listesi SENSITIVE_TARGET write-guard'ıyla paritesiz | **KAPANDI** — deny listesine .key/.p12/.pfx/.npmrc/.pgpass/credentials*/id_rsa (4abd5a4) |
| HOOK-2/3 | LOW (info) | Secret-scan fail-open + redirect-guard literal-token sınırı | Kabul edilen, belgeli trade-off — yetkili tarama CI Gitleaks |

Yeniden doğrulama turu (aynı reviewer): HOOK-1/CPN-1/PAY-1 kapandı,
BFF-4/5 belgelendi, yeni bulgu 0, regresyon 0.

## Kanıt

```text
node .claude/hooks/tests/run-tests.js  (commit 4abd5a4)
PASS — 159 assertions OK (52 fixtures + settings bindings)
```

Kupon yarış analizi: tek-satır kupon + `SELECT ... FOR UPDATE` servis kuralı +
üç-durum CHECK + `uq_coupons_used_by_order` partial unique → çifte kullanım
DB düzeyinde imkânsız (ADR-0011).

## Verdict: **PASS (Approve)**

> **Düzeltme şerhi (2026-07-03, Faz 8.2):** Rapor kayıtlı/ertelenen MEDIUM
> riskler (BFF-1/2/3) içerdiğinden verdict-policy kural 6 gereği geçerli
> verdict **PASS_WITH_RISKS**'tir. Orijinal satır kanıt bütünlüğü için
> korunmuştur.

CRITICAL: 0 · HIGH: 0 · Kalan MEDIUM: BFF-1/2/3 (sahip: aktivasyon-anı
implementer; BFF şablonu kopyalanırken checklist tamamlanmadan deploy yasak).
verdict-policy kural 2 gereği genel Security gate sonucu PASS; kalan riskler
kayıtlı ve sahiplidir.

> **Düzeltme şerhi (2026-07-27, Faz 8.3 PR-D):** Yukarıdaki son cümlede
> kullanılan genel **`PASS`** ifadesi güncel verdict politikasıyla uyumsuzdur.
> Rapor açık MEDIUM riskler (BFF-1/2/3) taşıdığı için verdict-policy kural 5/6
> gereği doğru semantik **`PASS_WITH_RISKS`**'tir; reviewer disposition
> `Approve` olabilir, bu rapor verdict'ini PASS yapmaz. Tarihsel sonuç geriye
> dönük DEĞİŞTİRİLMEMİŞTİR — orijinal satırlar kanıt bütünlüğü için olduğu gibi
> korunmuştur; bu şerh yalnız doğru okumayı kayda geçirir.
