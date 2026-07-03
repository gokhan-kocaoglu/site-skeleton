# Current Status — Site Skeleton

> Şablon: `00_System/Current-Status-template.md`. 7 başlık zorunludur;
> `session-close-validator` hook'u eksik başlıkta kapanışı reddeder.

## Aşama

Faz 8.1 remediation TAMAMLANDI — resertifikasyon 27/27, genel verdict PASS_WITH_RISKS (CRITICAL 0, HIGH 0). Tüm commit'ler push'landı, CI 4/4 yeşil (insan teyidi, 2026-07-03). İskelet v1 + Faz 8.1 sertifikalı; sırada R1–R6 takip görevlerinin backlog planlaması ve ilk gerçek proje (/new-project).

## Son Tamamlanan Görev

Denetim #18 kapatma (kaynak metin kullanıcıdan alındı): web ESLint'e @next/eslint-plugin-next coreWebVitals + react-hooks + jsx-a11y; admin'e react-hooks + jsx-a11y + react-refresh (vite); iki app'e cross-app no-restricted-imports sınırı; coverage/ lint dışı. Type-aware lint ADR-0012 ACCEPTED ile ertelendi (ölçüm: web 2.1→4.1s, admin 1.6→2.8s ~2×; tsc gate ile mükerrer; benimseme yolu belgeli). Mevcut kod yeni kurallarla 0 ihlal; pnpm gate 7/7 (862 check). Resertifikasyon raporu 27/27'ye güncellendi (R7 kapalı; lessons #4: insan/orkestratör eşleme hataları tablo mutabakatıyla yakalanır). Commit'ler: 4d917ae (lint) + 4397816 (rapor); push + CI 4/4 yeşil.

## Aktif Görev

Yok (Faz 8.1 kapandı; kapanış sonrası duruldu).

## Blocker

Yok.

## Sonraki 3 Adım

1. R1–R6 takip görevlerini backlog'a planla (favicon, sitemap lastModified→getLastUpdated, dil kararı, page.tsx Boot 3.3 metni, BFF aktivasyon checklist takibi, tsbuildinfo .gitignore).
2. Type-aware lint benimseme kararını ilk gerçek proje başlangıcında yeniden değerlendir (ADR-0012 karar noktası).
3. İlk gerçek proje: /new-project ile bootstrap (iskelet artık sertifikalı).

## Son Uygulama Commiti

`4d917ae fix(lint): denetim #18 — web cwv+hooks+a11y, admin hooks+a11y+refresh, import siniri` (rapor commit'i: `4397816 docs: resertifikasyon 27/27 — denetim #18 kapanisi islendi`)

## Memory Closure Commiti

`PENDING — bu kapanışın commiti bu yazımdan sonra atılacak; önceki kapanış: 3144fa3 chore(memory): close session 2026-07-03 (session 04)`
