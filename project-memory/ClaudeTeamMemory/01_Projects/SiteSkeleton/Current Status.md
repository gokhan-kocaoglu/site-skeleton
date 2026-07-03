# Current Status — Site Skeleton

> Şablon: `00_System/Current-Status-template.md`. 7 başlık zorunludur;
> `session-close-validator` hook'u eksik başlıkta kapanışı reddeder.

## Aşama

Faz 8.1 remediation — Sprint 4 tamamlandı ve commit'lendi (uygulama 4abd5a4 + kanıt raporu ade11ba); push + CI yeşil teyidi (4 job) bekleniyor. Sırada: final resertifikasyon (27 madde, manifest phase 8.1).

## Son Tamamlanan Görev

Faz 8.1 Sprint 4 — §4.1 categories.sql (depth 0..3, soft-delete partial unique NULLS NOT DISTINCT, parent_id index, cycle servis kuralı + ADR-0008 Cycle Önleme bölümü), §4.2 coupons.sql üç-durum + ADR-0011 ACCEPTED (kupon ACTIVE/PASSIVE/DISABLED, üç-durumlu CHECK, sipariş başına tek kupon), §4.3 BFF hardening (body limit 413, upstream timeout 504, Secure=NODE_ENV, README PRODUCTION-READY DEĞİLDİR + checklist), §4.4 payment portu (idempotencyKey + PaymentStatus, ADR-0007 şerhi), §4.5 backend baseline (health live/ready, DB credential fail-fast + local profil, openapi+api-types, production-checklist şablonu), §4.6 baseline security review PASS (HOOK-1/CPN-1/PAY-1 sprint içinde kapandı, reviewer yeniden doğruladı), §4.7 it-local kanıtı (BUILD SUCCESS 3/3; sapma: lokal PG17 parolası oturumda yok → geçici PG16:55432 + env override, raporda belgeli), §4.8 pilot (bootstrap dry-run 38 dosya/72 ikame + tam gate zincirli feature: PM→UX→FE→PM diff→QA→Security+style→SEO→Final; TZ remediation döngüsü işledi; genel PASS_WITH_RISKS). Kanıt: docs/test-reports/2026-07-03-faz8.1-sprint4-quality-gate.md (pnpm gate 7/7, 853 structure check, harness 159, mvn verify 3/3 — hepsi 4abd5a4 üzerinde).

## Aktif Görev

Yok (sprint sınırında duruldu).

## Blocker

Yok. (Not: push insan onayı bekliyor; CI teyidi push sonrası.)

## Sonraki 3 Adım

1. git push (insan onayı, 3 commit: 4abd5a4 + ade11ba + closure) → CI 4 job yeşil teyidi.
2. Final resertifikasyon: 27 denetim maddesi tablosu, yeni genel verdict, manifest phase: 8.1, docs/audits/recertification raporu.
3. Risk defteri takipleri (R1 favicon, R2 sitemap lastModified→getLastUpdated, R3 dil kararı, R4 sayfadaki Boot 3.3 metni, R6 tsbuildinfo .gitignore) — resertifikasyon sonrası planlanır.

## Son Uygulama Commiti

`4abd5a4 feat(phase-8.1): sprint 4 — domain sql, bff hardening, payment port, backend baseline, pilot` (kanıt commit'i: `ade11ba docs: faz 8.1 sprint 4 kanit raporu`)

## Memory Closure Commiti

`PENDING — bu kapanışın commiti bu yazımdan sonra atılacak; önceki kapanış: c9610f8 chore(memory): close session 2026-07-03`
