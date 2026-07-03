// Admin BFF skeleton — HttpOnly refresh-cookie bridge (Node 22 stdlib only).
// NOT PRODUCTION-READY: work through the README hardening checklist first.
// The refresh token never reaches browser JS: it lives in an HttpOnly cookie
// scoped to /auth; the SPA keeps the access token in memory only.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 4000);
const API_URL = process.env.API_URL ?? 'http://localhost:8080';
const COOKIE = 'refresh_token';
const MAX_BODY_BYTES = 16 * 1024; // auth payloads are tiny; reject anything bigger
const UPSTREAM_TIMEOUT_MS = 10_000; // never hang the browser on a stuck API
// Secure needs HTTPS (absent in plain-HTTP local dev) — hence tied to NODE_ENV.
const SECURE = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
const COOKIE_ATTRS = `HttpOnly;${SECURE} SameSite=Strict; Path=/auth`;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('payload too large'), { status: 413 }));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
  });
}

function cookieValue(req) {
  const header = req.headers.cookie ?? '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function send(res, status, body, extraHeaders = {}) {
  res.writeHead(status, { 'content-type': 'application/json', ...extraHeaders });
  res.end(JSON.stringify(body));
}

function setRefreshCookie(refreshToken) {
  return { 'set-cookie': `${COOKIE}=${encodeURIComponent(refreshToken)}; ${COOKIE_ATTRS}` };
}

function clearRefreshCookie() {
  return { 'set-cookie': `${COOKIE}=; Max-Age=0; ${COOKIE_ATTRS}` };
}

async function callApi(path, payload) {
  const response = await fetch(`${API_URL}${path}`, {
    // AbortSignal.timeout = stdlib AbortController + timer (upstream timeout).
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  // Expected API contract: { accessToken, refreshToken } — adjust per project.
  return response.json();
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' });

    if (req.url === '/auth/login') {
      const credentials = await readBody(req); // forwarded as-is; never logged
      const tokens = await callApi('/api/auth/login', JSON.parse(credentials || '{}'));
      if (!tokens) return send(res, 401, { error: 'invalid credentials' });
      return send(res, 200, { accessToken: tokens.accessToken }, setRefreshCookie(tokens.refreshToken));
    }

    if (req.url === '/auth/refresh') {
      const current = cookieValue(req);
      if (!current) return send(res, 401, { error: 'no refresh token' });
      // API rotates the token and revokes on reuse (hashes stored server-side).
      const tokens = await callApi('/api/auth/refresh', { refreshToken: current });
      if (!tokens) return send(res, 401, { error: 'refresh rejected' }, clearRefreshCookie());
      return send(res, 200, { accessToken: tokens.accessToken }, setRefreshCookie(tokens.refreshToken));
    }

    if (req.url === '/auth/logout') {
      const current = cookieValue(req);
      if (current) await callApi('/api/auth/logout', { refreshToken: current });
      return send(res, 204, {}, clearRefreshCookie());
    }

    return send(res, 404, { error: 'not found' });
  } catch (err) {
    if (err.status === 413) return send(res, 413, { error: 'payload too large' });
    if (err.name === 'TimeoutError') return send(res, 504, { error: 'upstream timeout' });
    console.error('bff error:', err.message);
    return send(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`admin-bff listening on :${PORT} → ${API_URL}`);
});
