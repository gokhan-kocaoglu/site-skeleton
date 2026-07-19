# site-skeleton

General-purpose web project skeleton (template repository). Copy this repo to start a new
project, write a short source brief in `docs/source-briefs/`, and let the agent team drive
the work through the quality-gate chain.

- Binding spec: `docs/source-briefs/skeleton-brief.md`
- Working constitution: `CLAUDE.md` (token-minimal; read it first)
- Governance language is Turkish; code, comments and developer docs are English.
- The template's public-facing surface (`apps/web` pages/metadata) is English; the real
  project's language is a per-project brief decision.

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm 9 + Turborepo, Node 22 |
| `apps/web` | Next.js 15, React 19, TypeScript strict, Tailwind v4 (CSS-first) |
| `apps/admin` | Vite 5, React 19 (React Router v7 + Zustand by convention, not preinstalled) |
| `apps/api` | Java 21, Spring Boot 3.5, JPA + Hibernate (validate only), PostgreSQL 16, Flyway |
| Tests | Vitest / Testing Library / MSW · JUnit 5 / Testcontainers (`postgres:16`) |

`apps/api` is Maven-only and deliberately **not** part of the pnpm workspace.

## Quickstart

Full Windows guide with install commands: `docs/setup/local-setup-windows.md`.

```powershell
pnpm install
pnpm build                 # turbo run build across all JS workspaces
pnpm gate                  # full quality-gate chain (see below)

# Backend only (Docker Desktop running):
Set-Location apps/api; mvn verify
# No Docker? Use a local PostgreSQL 16 with a `skeleton_it` database:
Set-Location apps/api; mvn verify "-Pit-local"
```

> Docker Engine 29+ requires Testcontainers >= 1.21.4 (managed at 1.21.4 by the
> Spring Boot 3.5.16 BOM; re-pin in `apps/api/pom.xml` only if a future BOM drops below it).

## Commands

| Command | What it does |
|---|---|
| `pnpm build` / `test` / `lint` / `type-check` | Turborepo task across JS workspaces |
| `pnpm gate` | Runs all quality gates, prints PASS/FAIL table (`scripts/quality/`) |
| `SKIP_API=1` env before `pnpm gate` | Skip the Maven part of the test gate |
| `IT_LOCAL=1` env before `pnpm gate` | Backend ITs against local PostgreSQL instead of Docker |
| `node scripts/verify-structure.mjs` | Structural self-check against `scripts/structure-manifest.json` |
| `node .claude/hooks/tests/run-tests.js` | Hook self-test harness (fail-safe invariants) |

Claude Code slash commands (`.claude/commands/`): `/new-project`, `/start-feature`,
`/create-adr`, `/quality-gate`, `/seo-audit`, `/update-memory`, `/finish-session`.

## Using this repo as a template

1. GitHub → **Use this template** → create the new project repo and clone it.
2. Run the setup guide (`docs/setup/local-setup-windows.md`) once per machine.
3. Open Claude Code and run `/new-project` — it runs the bootstrap rename (below),
   asks for a source brief, seeds the memory vault (`project-memory/`) from
   `01_Projects/_TEMPLATE/`, and has the PM agent produce the first task DAG.
4. Every feature starts with `/start-feature`; the gate chain (PM → Arch → UX → Dev →
   QA → Security → SEO → Final → memory → commit) is defined in
   `.claude/skills/feature-workflow/`.

### Bootstrap rename — exact scope

`node scripts/bootstrap-project.mjs <project-name>` previews (dry-run); add
`--apply` to execute. Deterministic text/dir renames only — **no LLM, no magic**:

- root package name & README title `site-skeleton` → `<slug>`; npm scope `@skeleton/*` → `@<slug>/*`
- Java package `com.skeleton` → `com.<slug-without-dashes>` (directories moved too)
- Maven `skeleton-api` / `Skeleton API` → `<slug>-api` / `<Display> API`
- DB names `skeleton` / `skeleton_it` → `<slug_with_underscores>` (+`_it`)
- OpenAPI title and web metadata `Site Skeleton` → `<Display Name>`
- `scripts/structure-manifest.json` `mode: skeleton-dev` → `project` (turns off
  skeleton-only forbidden-pattern scans)

It does **not** touch historical evidence (`docs/test-reports`, `docs/audits`,
`docs/source-briefs`, `project-memory/`), does not rewrite git history, and is
idempotent (re-running with the same name exits cleanly). After `--apply`:
`pnpm install`, then `pnpm gate` and `mvn verify` to re-verify.

### Optional modules (copy to activate — never part of the build)

| Template | Purpose |
|---|---|
| `templates/db/` | Hierarchical categories + single-use coupon SQL (copy as next Flyway `V<n>__`) |
| `templates/payments/` | Provider-agnostic payment port + empty Iyzico/Stripe adapters (see ADR-0007) |
| `templates/admin-bff/` | HttpOnly refresh-cookie bridge for the admin SPA (Node stdlib) |

`packages/ui-primitives` is a reserved activation point (not present in the skeleton):
create it under `packages/` when the project needs a shared component library.

## Governance layout

| Path | Contents |
|---|---|
| `.claude/agents/` | 9 file-based subagents (PM, architect, UX, FE/BE devs, SEO, QA, reviewer, memory steward) |
| `.claude/skills/` | 10 skills (workflow, quality gate, stack patterns, graphify, ...) |
| `.claude/rules/` | Common + TypeScript rule sets |
| `.claude/hooks/` | 8 fail-safe Node hooks + self-test harness |
| `docs/adr/` | Architecture decision records (`ADR-0000-template.md`) |
| `docs/operations/authority-map.md` | Agent × write-path authority matrix |
| `project-memory/` | Obsidian-compatible team memory vault (single writer: memory-steward) |

## Build phases

The skeleton was built in 8 verified phases: 1 repo hygiene → 2 rules/skills distillation →
3 agents/commands/vault → 4 hooks + harness → 5 frontend workspaces → 6 backend API +
domain templates → 7 quality gates + docs + ADR drafts → 8 validation tour. Each phase
extends `scripts/structure-manifest.json`; run `node scripts/verify-structure.mjs` to verify.
