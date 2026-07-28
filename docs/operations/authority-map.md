# Authority Map — İçerik Sahibi × Fiziksel Yazar × Onaylayan

Kaynak: `docs/source-briefs/skeleton-brief.md` §2. Bu matris bağlayıcıdır:
`memory-writer-guard` / `pre-bash-memory-guard` hook'ları ve ajan tanımlarındaki
yetki blokları buna uyar.

## Üç ayrı kavram (tek kolonluk "yazma yetkisi" yanıltıcıydı)

- **İçerik sahibi** — kararın/metnin doğruluğundan sorumlu rol. Ajanın dosya
  yazma aracı olmasa da içerik ona aittir.
- **Fiziksel yazar** — dosyaya byte'ı gerçekten yazan taraf: ya ajanın kendisi
  (Write/Edit aracı varsa) ya da **orkestratör** (read-only ajanların
  raporunu ilgili yola kaydeder).
- **Onaylayan** — o değişikliğin geçmesine karar veren taraf (plan/scope onayı,
  gate verdict'i veya insan onayı).

Bir rolün içerik sahibi olması, aynı dosyanın fiziksel yazarı olduğu anlamına
GELMEZ; fiziksel yazar olması da onaylayan olduğu anlamına gelmez.

## Yetki Matrisi

| Yol / çıktı | İçerik sahibi | Fiziksel yazar | Onaylayan |
|---|---|---|---|
| Scope, task DAG, diff denetimi, final sentez | project-manager | — (dosya üretmez; rapor döner) | insan (plan onayı) |
| `docs/adr/`, `docs/architecture/`, `docs/api-contracts/` | system-architect | orkestratör (ajan read-only) | project-manager + insan (mimari etki) |
| `docs/ux/` | ux-ui-designer | orkestratör (ajan read-only) | project-manager |
| `apps/web/`, `apps/admin/`, `packages/design-tokens/`, `packages/ui-primitives/`* | frontend-developer | frontend-developer | QA + code-reviewer |
| `apps/api/` (Flyway migration'ları dahil) | backend-developer | backend-developer | QA + code-reviewer |
| `docs/audits/seo/` | seo-specialist | seo-specialist | project-manager |
| Test dosyaları + `docs/test-reports/` | qa-test-specialist | qa-test-specialist (Final Gate Mode'da salt-okunur) | project-manager |
| `docs/audits/` (güvenlik/final inceleme) | code-reviewer | orkestratör (ajan kod tarafında read-only) | insan (kapanış) |
| `project-memory/**` | ilgili specialist (HANDOFF içeriği) | **memory-steward — TEK fiziksel yazar** | QA + Security + Final Review PASS |
| `.claude/**`, `scripts/**`, kök konfigler (governance) | **orkestratör** | orkestratör | insan (plan onayı) |

\* `packages/ui-primitives` opsiyonel aktivasyon noktasıdır; iskelette yoktur (README'ye bakın).

## Model / araç referansı (yetki değil, yalnız bilgi)

| Ajan | Model | tools kısıtı |
|---|---|---|
| project-manager | opus | Read, Grep, Glob |
| system-architect | opus | Read, Grep, Glob, WebSearch |
| ux-ui-designer | sonnet | Read, Grep, Glob |
| frontend-developer | sonnet | Read, Edit, Write, Bash, Grep, Glob |
| backend-developer | sonnet | Read, Edit, Write, Bash, Grep, Glob |
| seo-specialist | sonnet | Read, Grep, Glob, Bash, WebSearch |
| qa-test-specialist | sonnet | Read, Edit, Write, Bash, Grep, Glob |
| code-reviewer | opus | Read, Grep, Glob, Bash |
| memory-steward | haiku | Read, Edit, Write, Grep, Glob |

## Kurallar

- Bir dosya yoluna birden fazla ajan **fiziksel yazar** olamaz; kesişim
  gerekirse iş PM üzerinden bölünür.
- `project-memory/**` yazımı iki hook'la korunur: `memory-writer-guard`
  (Write/Edit) ve `pre-bash-memory-guard` (kabuk komutları). Yazarın
  memory-steward olduğu kanıtlanamazsa karar **ask**'e düşer.
- Governance dosyalarının (`.claude/**`, `scripts/**`, kök konfigler) içerik
  sahibi orkestratördür; specialist yalnız öneri/HANDOFF üretir, bu yollara
  yazmaz.
- **Gate ajanı kendi yazdığı/önerdiği değişikliğin yazarı olamaz:** QA Final
  Gate ve code-reviewer, inceledikleri değişikliğin fiziksel yazarıysa o
  değişikliğe PASS veremez.
- Gate zinciri sırası `feature-workflow` skill'indedir; yetki matrisi sırayı
  değiştirmez.
- İnsan onayı üç noktada zorunludur: brief, plan, push.
