// Admin BFF skeleton — HttpOnly refresh-cookie bridge (Node 22 stdlib only).
// The refresh token never reaches browser JS: it lives in an HttpOnly cookie
// scoped to /auth; the SPA keeps the access token in memory only.
import http from 'node:http';

const PORT = Number(process.env.PORT ?? 4000);
const API_URL = process.env.API_URL ?? 'http://localhost:8080';
const COOKIE = 'refresh_token';
// Secure requires HTTPS; keep it on everywhere except plain-HTTP local dev.
const COOKIE_ATTRS = 'HttpOnly; Secure; SameSite=Strict; Path=/auth';

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
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
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
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
    console.error('bff error:', err.message);
    return send(res, 500, { error: 'internal error' });
  }
});

server.listen(PORT, () => {
  console.log(`admin-bff listening on :${PORT} → ${API_URL}`);
});
