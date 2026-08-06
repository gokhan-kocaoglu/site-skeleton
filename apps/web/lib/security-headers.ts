/**
 * apps/web güvenlik header'larının canonical source-of-truth'u (AC-33,
 * F4-MEDIUM-03). Değerler üç ayrı katmanla doğrulanır: literal-locked testler
 * (test/security-headers.test.ts, test/next-config-headers.test.ts),
 * docs/operations/deployment.md içindeki bounded blok eşitliği, ve build
 * sonrası artefakt oracle'ı. Genişletme YALNIZ bu dosyada yapılır; aynı turda
 * docs/operations/deployment.md bounded bloğu da güncellenmelidir.
 *
 * Image CSP (IMAGE_OPTIMIZER_CSP) ayrı bir yanıt sınıfıdır: Next.js Image
 * Optimizer (`/_next/image`) bu politikayı döndürür ve global sayfa CSP'sini
 * ezer — next.config.ts içinde `images.contentSecurityPolicy` alanına bağlanır.
 *
 * Karar kaydı: docs/adr/ADR-0019-web-security-headers.md
 */

export type HeaderMode = "development" | "production";

export const HEADER_SOURCE = "/(.*)";

export const CSP_PRODUCTION =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'";

export const CSP_DEVELOPMENT =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self' ws://localhost:* ws://127.0.0.1:*";

export const IMAGE_OPTIMIZER_CSP = "default-src 'self'; script-src 'none'; sandbox;";

export const STATIC_HEADERS: ReadonlyArray<{ readonly key: string; readonly value: string }> = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

export function buildSecurityHeaders(mode: HeaderMode): Array<{ key: string; value: string }> {
  const csp = mode === "development" ? CSP_DEVELOPMENT : CSP_PRODUCTION;
  return [{ key: "Content-Security-Policy", value: csp }, ...STATIC_HEADERS.map((h) => ({ ...h }))];
}
