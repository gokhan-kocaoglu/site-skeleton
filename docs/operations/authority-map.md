# Authority Map — Ajan × Yazma Yetkisi

Kaynak: `docs/source-briefs/skeleton-brief.md` §2. Bu matris bağlayıcıdır:
`memory-writer-guard` hook'u ve ajan tanımlarındaki yazma-yetkisi blokları buna uyar.

| Ajan | Model | tools kısıtı | Yazma yetkisi |
|---|---|---|---|
| project-manager | opus | Read, Grep, Glob | **Hiçbir dosya yazmaz** — scope, task DAG, bağımsız diff denetimi, final sentez |
| system-architect | opus | Read, Grep, Glob, WebSearch | `docs/adr/`, `docs/architecture/`, `docs/api-contracts/` |
| ux-ui-designer | sonnet | Read, Grep, Glob | `docs/ux/` |
| frontend-developer | sonnet | Read, Edit, Write, Bash, Grep, Glob | `apps/web/`, `apps/admin/`, `packages/design-tokens/`, `packages/ui-primitives/`* |
| backend-developer | sonnet | Read, Edit, Write, Bash, Grep, Glob | `apps/api/` (Flyway migration'ları dahil) |
| seo-specialist | sonnet | Read, Grep, Glob, Bash, WebSearch | `docs/audits/seo/` |
| qa-test-specialist | sonnet | Read, Edit, Write, Bash, Grep, Glob | test dosyaları + `docs/test-reports/` (Final Gate Mode'da salt-okunur) |
| code-reviewer | opus | Read, Grep, Glob, Bash | `docs/audits/` (kod tarafında read-only; test çalıştırabilir) |
| memory-steward | haiku | Read, Edit, Write, Grep, Glob | `project-memory/**` — **TEK writer**; yalnız QA + Security + Final PASS sonrası |

\* `packages/ui-primitives` opsiyonel aktivasyon noktasıdır; iskelette yoktur (README'ye bakın).

## Kurallar

- Bir dosya yoluna birden fazla ajan yazamaz; kesişim gerekirse iş PM üzerinden bölünür.
- `project-memory/**` yazımı hook ile korunur (`memory-writer-guard`): yazar
  memory-steward olduğu kanıtlanamazsa **ask**'e düşer.
- Ana oturum (orkestratör) governance dosyalarını (`.claude/**`, `scripts/**`, kök
  konfigler) yönetir; ajanlar bu yollara yazamaz.
- Gate zinciri sırası `feature-workflow` skill'indedir; yetki matrisi sırayı değiştirmez.
- İnsan onayı üç noktada zorunludur: brief, plan, push.
