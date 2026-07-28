# Admin BFF — Activation Hardening Checklist

> Copy this file together with the template (e.g. into `apps/admin-bff/`).
> Every item below MUST be completed and ticked (`- [x]`) before any deploy.
> The structural gate (`verify-structure` **activationGates**) FAILs the build
> while an activated copy under `apps/` still has unticked boxes; the pristine
> template under `templates/` is never checked.
>
> Detection is recursive over `apps/**` and fires on any ONE of three signals:
> directory name contains `bff` · `package.json` name contains `bff` · a file
> carries the `ADMIN_BFF_TEMPLATE_MARKER` signature from `server.mjs`.
> **Renaming the directory, the package, or both does not disable this gate** —
> keep this file next to the copied `server.mjs`.

## Checklist (12 items — tick each one as you complete it)

- [ ] Origin / CSRF defense: validate `Origin` / `Sec-Fetch-Site` on every POST
      (SameSite=Strict helps but is not sufficient alone)
- [ ] `content-type: application/json` validation on requests (reject others)
- [ ] Explicit CORS policy (deny by default; allow only the admin origin)
- [ ] Response shape validation of upstream API payloads (never trust blindly;
      the skeleton code assumes `{ accessToken, refreshToken }`)
- [ ] Cookie `Max-Age` aligned with the API's refresh-token TTL
- [ ] Structured logging (JSON, correlation ID) — tokens/credentials NEVER logged
- [ ] Rate limiting on `/auth/*` (brute-force defense)
- [ ] `MAX_BODY_BYTES` re-verified against the project's real auth payloads
      (skeleton counts bytes and rejects with 413; keep it that way)
- [ ] `UPSTREAM_TIMEOUT_MS` re-verified against the API's real latency budget
      (skeleton returns 504 via `AbortSignal.timeout`)
- [ ] `Secure` cookie attribute verified in the target environment
      (HTTPS everywhere; `NODE_ENV=production` turns it on)
- [ ] Error semantics re-checked after project modifications: malformed client
      JSON → 400 · payload too large → 413 · malformed upstream JSON → 502 ·
      upstream timeout → 504 · `204 No Content` carries no body
- [ ] Tests: unit for cookie/body/timeout paths + integration against the API
