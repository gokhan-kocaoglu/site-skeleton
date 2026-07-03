# Local Setup — Windows 11 (PowerShell)

One-time machine setup for working on projects created from this skeleton.
Run the commands in PowerShell; installs use `winget` where possible.

## 1. Node 22 + pnpm 9

```powershell
winget install OpenJS.NodeJS.LTS        # Node 22.x
node -v                                  # expect v22.x
corepack enable
corepack prepare pnpm@9.15.4 --activate  # exact version pinned in package.json
pnpm -v                                  # expect 9.15.4
```

## 2. Java 21 (Temurin) + Maven

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
winget install Apache.Maven
java -version                            # expect 21.x
mvn -v
```

## 3. Git for Windows

Required — Claude Code's Bash tool depends on Git Bash.

```powershell
winget install Git.Git
git --version
```

## 4. PostgreSQL 16 (for the Docker-less test path)

Only needed if you will run backend integration tests without Docker
(`mvn verify "-Pit-local"`). Skip if you always use Docker Desktop.

```powershell
winget install PostgreSQL.PostgreSQL.16
# Create the empty integration-test database (adjust user if not postgres):
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -c "CREATE DATABASE skeleton_it;"
```

Credentials default to `postgres`/`postgres`; override with the `IT_DB_USER` /
`IT_DB_PASSWORD` environment variables (see `apps/api/pom.xml`).

> **it-local pitfalls (learned the hard way):**
>
> 1. **Env names must match the yml exactly**: the profile reads
>    `IT_DB_USER` / `IT_DB_PASSWORD` (see
>    `apps/api/src/test/resources/application-it-local.yml`) — not
>    `DB_USER`/`DB_PASSWORD`, not `PGPASSWORD`. A near-miss name silently
>    falls back to `postgres`/`postgres` and fails auth.
> 2. **Persistent env vars only reach NEW processes**: `setx` or the System
>    Properties dialog does not update already-running shells — open a fresh
>    terminal (or set per-session: `$env:IT_DB_PASSWORD = '...'`) before
>    `mvn verify "-Pit-local"`.
> 3. **VS Code's integrated terminal inherits env from VS Code itself**: a
>    persistent variable set after VS Code started stays invisible in its
>    terminals until VS Code is fully restarted (not just a new terminal tab).

## 5. Docker Desktop (optional, preferred test path)

```powershell
winget install Docker.DockerDesktop
docker version                           # engine must be running
```

> **Docker Engine 29+ note.** Engine 29 raised the minimum Docker API version to 1.44,
> which breaks Testcontainers releases before **1.21.4** ("Could not find a valid Docker
> environment", npipe HTTP 400). Spring Boot 3.5.16's BOM manages exactly 1.21.4, so
> `apps/api/pom.xml` carries no explicit pin (dropped in Faz 8.1 Sprint 3); if a future
> BOM ever manages a version below 1.21.4, re-pin it there (note kept in the pom).

## 6. Claude Code + user-level integrations

Real MCP configs live in **user scope** — never in the repo (the repo only carries
`.claude/mcp/*.example.json` with placeholders).

```powershell
claude --version

# 21st.dev Magic MCP (user scope; put your real key here, it never touches the repo)
claude mcp add magic --scope user --env API_KEY="YOUR_REAL_KEY" -- npx -y @21st-dev/magic@latest

# UI UX Pro Max skill (user-level; follow its README: copy into ~/.claude/skills/)
git clone https://github.com/nextlevelbuilder/ui-ux-pro-max-skill "$env:TEMP\uipm"

claude mcp list                          # verify
```

## 7. Verify the checkout

From the repo root:

```powershell
pnpm install
pnpm build                               # all JS workspaces build
pnpm gate                                # full quality-gate chain -> "All gates PASS"

# Backend only:
Set-Location apps/api
mvn verify                               # Docker path (Docker Desktop running)
mvn verify "-Pit-local"                  # local PostgreSQL path (step 4 done)
Set-Location ..\..

node scripts/verify-structure.mjs        # structural self-check
node .claude/hooks/tests/run-tests.js    # hook harness
```

Gate environment switches: `$env:SKIP_API = '1'` skips Maven inside `pnpm gate`;
`$env:IT_LOCAL = '1'` makes the test gate use the local PostgreSQL profile.
Remove them with `Remove-Item Env:SKIP_API` when done.

## 8. Running the API locally (fail-fast config)

The default profile has **no DB credential fallback** — `DB_USER` / `DB_PASSWORD`
must come from the environment or startup fails fast (by design, Faz 8.1 §4.5).
For local development activate the `local` profile, which defaults to
`postgres`/`postgres`:

```powershell
Set-Location apps/api
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```
