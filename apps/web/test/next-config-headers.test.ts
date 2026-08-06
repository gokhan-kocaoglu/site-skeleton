// next.config.ts'in production güvenlik header'larını Next.js'e doğru
// bağladığını kilitler: allowlist'li tek kural, "/(.*)" kaynağı üzerinde,
// beş header'ı sırayla üretiyor. Beklenen CSP değeri bilinçli olarak
// security-headers.test.ts'ten veya lib/security-headers.ts modülünden
// import EDİLMEZ — bu dosya kendi bağımsız literalini taşır, aksi halde iki
// dosya aynı bug'ı paylaşıp birbirini doğrulamış gibi yanıltıcı bir yeşil
// üretebilir. NODE_ENV vitest altında "test"tir; yalnız "development" ayrı
// dala düşer, bilinmeyen/test değerleri production dalına düşer — bu yüzden
// bu dosyada beklenen CSP, production politikasıdır.
import { describe, expect, test } from "vitest";
import nextConfig from "../next.config";

type HeaderEntry = { key: string; value: string };
type HeaderRule = { readonly source: string; readonly headers: readonly HeaderEntry[] } & Record<
  string,
  unknown
>;

const EXPECTED_SOURCE = "/(.*)";
const EXPECTED_IMAGE_CSP = "default-src 'self'; script-src 'none'; sandbox;";
const EXPECTED_HEADERS: HeaderEntry[] = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

async function getHeaderRules(): Promise<HeaderRule[]> {
  const headers = await nextConfig.headers?.();
  if (!headers) {
    throw new Error("next.config.ts headers() must return a rule list");
  }
  return headers as unknown as HeaderRule[];
}

describe("next.config security headers", () => {
  test("disables the X-Powered-By header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  test("locks the image optimizer response down with a sandboxed CSP", () => {
    expect(nextConfig.images?.contentSecurityPolicy).toBe(EXPECTED_IMAGE_CSP);
  });

  test("declares exactly one header rule", async () => {
    const rules = await getHeaderRules();
    expect(rules).toHaveLength(1);
  });

  test("the single rule uses an allowlist of exactly source and headers keys", async () => {
    // has/missing/locale/basePath gibi ek anahtarlar production'da header'ları
    // sessizce devre dışı bırakabilir; bu yüzden DENYLIST değil, kapalı bir
    // ALLOWLIST kullanılıyor — beklenmeyen her anahtar testi kırar.
    const [rule] = await getHeaderRules();
    expect(Object.keys(rule).sort()).toEqual(["headers", "source"]);
  });

  test("the rule source matches the literal catch-all pattern", async () => {
    const [rule] = await getHeaderRules();
    expect(rule.source).toBe(EXPECTED_SOURCE);
  });

  test("the rule declares all five headers with exact literal values in order", async () => {
    const [rule] = await getHeaderRules();
    expect(rule.headers).toEqual(EXPECTED_HEADERS);
  });

  test("the rule object carries none of has, missing, locale, or basePath", async () => {
    const [rule] = await getHeaderRules();
    expect(rule).not.toHaveProperty("has");
    expect(rule).not.toHaveProperty("missing");
    expect(rule).not.toHaveProperty("locale");
    expect(rule).not.toHaveProperty("basePath");
  });

  test("no header key in the config is Strict-Transport-Security, case-insensitively", async () => {
    const [rule] = await getHeaderRules();
    const hasHsts = rule.headers.some(
      (header) => header.key.toLowerCase() === "strict-transport-security",
    );
    expect(hasHsts).toBe(false);
  });
});
