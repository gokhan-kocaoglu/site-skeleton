# Admin BFF Template (HttpOnly refresh-cookie bridge)

The admin SPA (`apps/admin`) must NEVER store tokens in `localStorage` (binding
rule). This template is a minimal Backend-for-Frontend that keeps the refresh
token in an `HttpOnly` cookie, so the browser JS never sees it; the SPA holds
the short-lived access token in memory only.

## Flow

1. `POST /auth/login` — forwards credentials to the API; on success sets the
   refresh token as an `HttpOnly; Secure; SameSite=Strict` cookie and returns
   only the access token in the body.
2. `POST /auth/refresh` — reads the cookie, asks the API for a rotated pair,
   re-sets the cookie, returns the new access token. (The API hashes refresh
   tokens in the DB and revokes on reuse — see `.claude/rules/common/security.md`.)
3. `POST /auth/logout` — revokes at the API and clears the cookie.

## Activation

1. Copy this directory out of `templates/` (e.g. to `apps/admin-bff/`) and add
   it to `pnpm-workspace.yaml` if it should join the workspace.
2. Set `API_URL` (and `PORT`) via environment; there is no config file on purpose.
3. Wire the admin SPA's fetch layer to `/auth/*` on this bridge instead of the API.
4. Serve over HTTPS in any non-local environment — `Secure` cookies require it.

`server.mjs` uses only the Node 22 standard library (no dependencies).
