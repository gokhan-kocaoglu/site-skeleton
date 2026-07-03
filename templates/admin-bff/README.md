# Admin BFF Template (HttpOnly refresh-cookie bridge)

> **PRODUCTION-READY DEĞİLDİR.** Bu şablon mimari deseni (HttpOnly refresh
> köprüsü) gösterir; canlıya çıkmadan önce aşağıdaki **hardening checklist**
> maddelerinin TAMAMI tamamlanmalıdır.

The admin SPA (`apps/admin`) must NEVER store tokens in `localStorage` (binding
rule). This template is a minimal Backend-for-Frontend that keeps the refresh
token in an `HttpOnly` cookie, so the browser JS never sees it; the SPA holds
the short-lived access token in memory only.

## Hardening checklist (zorunlu — production öncesi)

Already in the skeleton (baseline, still review per project):

- [x] Request body size limit (`MAX_BODY_BYTES`, 413 on overflow)
- [x] Upstream timeout via `AbortSignal.timeout` (504 on a stuck API)
- [x] `Secure` cookie attribute tied to `NODE_ENV=production`

Must be added per project before any deploy:

- [ ] Origin / CSRF defense: validate `Origin`/`Sec-Fetch-Site` on every POST
      (SameSite=Strict helps but is not sufficient alone)
- [ ] `content-type: application/json` validation on requests (reject others)
- [ ] Explicit CORS policy (deny by default; allow only the admin origin)
- [ ] Response shape validation of upstream API payloads (never trust blindly;
      current code assumes `{ accessToken, refreshToken }`)
- [ ] Cookie `Max-Age` aligned with the API's refresh-token TTL
- [ ] Structured logging (JSON, correlation ID) — tokens/credentials NEVER logged
- [ ] Rate limiting on `/auth/*` (brute-force defense)
- [ ] Body-limit robustness: count **bytes** (not string length) and attach a
      `req.on('error', ...)` handler so a socket error cannot leave the
      request hanging
- [ ] Correct error semantics: malformed JSON → 400 (not 500); `204 No Content`
      responses carry no body
- [ ] Tests: unit for cookie/body/timeout paths + integration against the API

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
4. Serve over HTTPS in any non-local environment — `Secure` cookies require it
   (`NODE_ENV=production` turns the attribute on).
5. Work through the hardening checklist above; only then is deploy allowed.

`server.mjs` uses only the Node 22 standard library (no dependencies).
