# Authority Map — Ajan × Yazma Yetkisi

> Taslak — Faz 7'de finalize edilir. Kaynak: `docs/source-briefs/skeleton-brief.md` §2.

| Ajan | Model | Yazma yetkisi |
|---|---|---|
| project-manager | opus | Kod yazmaz — scope, task DAG, bağımsız diff denetimi, final sentez |
| system-architect | opus | docs/adr, docs/architecture, docs/api-contracts |
| ux-ui-designer | sonnet | docs/ux |
| frontend-developer | sonnet | apps/web, apps/admin, packages/design-tokens, packages/ui-primitives* |
| backend-developer | sonnet | apps/api (Flyway migration'ları dahil) |
| seo-specialist | sonnet | docs/audits/seo |
| qa-test-specialist | sonnet | docs/test-reports |
| code-reviewer | opus | docs/audits (kod tarafında read-only + test çalıştırma) |
| memory-steward | haiku/sonnet | project-memory/** (TEK writer; yalnız tüm gate'ler PASS sonrası) |

\* `ui-primitives` opsiyoneldir; iskelette yoktur (README'de aktivasyon noktası olarak belirtilir).

Kural: bir dosya yoluna birden fazla ajan yazamaz; kesişim gerekirse iş PM üzerinden bölünür.
