// apps/web/lib/security-headers.ts sözleşmesini kilitler: buildSecurityHeaders(mode)
// beş header'ı sabit sırayla, exact literal değerlerle döndürmeli. Beklenen
// değerler kasıtlı olarak modülden ya da birbirinden TÜRETİLMEZ — hepsi bu
// dosyaya elle yazılmış bağımsız literaldir (örn. yanlışlıkla CSP'ye
// 'unsafe-eval' sızması ya da HSTS eklenmesi bu testleri kırmalı).
import { describe, expect, test } from "vitest";
import type { HeaderMode } from "../lib/security-headers";
import {
  HEADER_SOURCE,
  IMAGE_OPTIMIZER_CSP,
  STATIC_HEADERS,
  buildSecurityHeaders,
} from "../lib/security-headers";

const EXPECTED_HEADER_KEYS = [
  "Content-Security-Policy",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
];
const EXPECTED_CSP_PRODUCTION =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'";
const EXPECTED_CSP_DEVELOPMENT =
  "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self' ws://localhost:* ws://127.0.0.1:*";
const EXPECTED_IMAGE_OPTIMIZER_CSP = "default-src 'self'; script-src 'none'; sandbox;";
const EXPECTED_STATIC_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
const EXPECTED_DIRECTIVE_NAMES = [
  "default-src",
  "base-uri",
  "object-src",
  "frame-ancestors",
  "form-action",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
];
const ALL_MODES: readonly HeaderMode[] = ["production", "development"];

describe("buildSecurityHeaders", () => {
  test("returns all five header keys in the exact order for production mode", () => {
    const result = buildSecurityHeaders("production");
    expect(result.map((header) => header.key)).toEqual(EXPECTED_HEADER_KEYS);
  });

  test("returns all five header keys in the exact order for development mode", () => {
    const result = buildSecurityHeaders("development");
    expect(result.map((header) => header.key)).toEqual(EXPECTED_HEADER_KEYS);
  });

  test("production CSP value matches the literal production policy exactly", () => {
    const result = buildSecurityHeaders("production");
    expect(result[0].value).toBe(EXPECTED_CSP_PRODUCTION);
  });

  test("development CSP value matches the literal development policy exactly", () => {
    const result = buildSecurityHeaders("development");
    expect(result[0].value).toBe(EXPECTED_CSP_DEVELOPMENT);
  });

  test("returns the four static headers with exact literal values", () => {
    const result = buildSecurityHeaders("production");
    expect(result.slice(1, 5)).toEqual(EXPECTED_STATIC_HEADERS);
  });

  test("header names are unique when case-folded to lowercase", () => {
    const result = buildSecurityHeaders("production");
    const lowerCaseKeys = new Set(result.map((header) => header.key.toLowerCase()));
    expect(lowerCaseKeys.size).toBe(5);
  });

  test("no header value is empty or whitespace-only in either mode", () => {
    for (const mode of ALL_MODES) {
      for (const header of buildSecurityHeaders(mode)) {
        expect(header.value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("no header name or value contains a carriage return or line feed", () => {
    for (const mode of ALL_MODES) {
      for (const header of buildSecurityHeaders(mode)) {
        expect(header.key).not.toMatch(/[\r\n]/);
        expect(header.value).not.toMatch(/[\r\n]/);
      }
    }
  });

  test("HEADER_SOURCE is the literal catch-all matcher", () => {
    expect(HEADER_SOURCE).toBe("/(.*)");
  });

  test("IMAGE_OPTIMIZER_CSP matches the literal sandboxed policy exactly", () => {
    expect(IMAGE_OPTIMIZER_CSP).toBe(EXPECTED_IMAGE_OPTIMIZER_CSP);
  });

  test("IMAGE_OPTIMIZER_CSP differs from both application CSPs and locks scripts down", () => {
    expect(IMAGE_OPTIMIZER_CSP).not.toBe(EXPECTED_CSP_PRODUCTION);
    expect(IMAGE_OPTIMIZER_CSP).not.toBe(EXPECTED_CSP_DEVELOPMENT);
    expect(IMAGE_OPTIMIZER_CSP).toContain("script-src 'none'");
    expect(IMAGE_OPTIMIZER_CSP).toContain("sandbox");
  });

  test("production CSP does not leak development-only directives", () => {
    const csp = buildSecurityHeaders("production")[0].value;
    const forbidden = ["unsafe-eval", "ws://", "ws:", "localhost", "127.0.0.1"];
    for (const substring of forbidden) {
      expect(csp).not.toContain(substring);
    }
  });

  test("production CSP does not use a bare wildcard or an https wildcard source", () => {
    // Not: ws://localhost:* yalnız development'ta meşrudur, burada kontrol edilmiyor.
    const directives = buildSecurityHeaders("production")[0].value.split("; ");
    for (const directive of directives) {
      for (const token of directive.split(" ")) {
        expect(token).not.toBe("*");
        expect(token).not.toBe("https://*");
      }
    }
  });

  test("development CSP explicitly allows unsafe-eval and localhost websockets", () => {
    const csp = buildSecurityHeaders("development")[0].value;
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("ws://localhost:*");
    expect(csp).toContain("ws://127.0.0.1:*");
  });

  test("both application CSPs declare directives in the same fixed order", () => {
    const extractDirectiveNames = (csp: string): string[] =>
      csp.split("; ").map((directive) => directive.split(" ")[0]);
    expect(extractDirectiveNames(buildSecurityHeaders("production")[0].value)).toEqual(
      EXPECTED_DIRECTIVE_NAMES,
    );
    expect(extractDirectiveNames(buildSecurityHeaders("development")[0].value)).toEqual(
      EXPECTED_DIRECTIVE_NAMES,
    );
  });

  test("no directive name repeats within either application CSP", () => {
    for (const mode of ALL_MODES) {
      const csp = buildSecurityHeaders(mode)[0].value;
      const directiveNames = csp.split("; ").map((directive) => directive.split(" ")[0]);
      expect(new Set(directiveNames).size).toBe(directiveNames.length);
    }
  });

  test("both modes enforce clickjacking protection via frame-ancestors and X-Frame-Options", () => {
    for (const mode of ALL_MODES) {
      const result = buildSecurityHeaders(mode);
      const frameOptions = result.find((header) => header.key === "X-Frame-Options");
      expect(result[0].value).toContain("frame-ancestors 'none'");
      expect(frameOptions?.value).toBe("DENY");
    }
  });

  test("script-src never mixes unsafe-inline with a nonce or hash source", () => {
    for (const mode of ALL_MODES) {
      const csp = buildSecurityHeaders(mode)[0].value;
      const scriptSrc = csp.split("; ").find((directive) => directive.startsWith("script-src"));
      expect(scriptSrc).toBeDefined();
      expect(scriptSrc).toContain("'unsafe-inline'");
      expect(scriptSrc).not.toMatch(/'nonce-/);
      expect(scriptSrc).not.toMatch(/'sha(256|384|512)-/);
    }
  });

  test("no Strict-Transport-Security header is present in either mode or in the static headers", () => {
    for (const mode of ALL_MODES) {
      const result = buildSecurityHeaders(mode);
      expect(result.some((header) => header.key.toLowerCase() === "strict-transport-security")).toBe(
        false,
      );
    }
    expect(
      STATIC_HEADERS.some((header) => header.key.toLowerCase() === "strict-transport-security"),
    ).toBe(false);
  });

  test("returns fresh arrays with no shared mutable state between calls", () => {
    const first = buildSecurityHeaders("production");
    const second = buildSecurityHeaders("production");
    expect(first).toEqual(second);
    expect(first).not.toBe(second);

    // İlk çağrının sonucunu mutasyona uğratmak ikinci bir çağrıyı etkilememeli.
    const mutableFirst = first as Array<{ key: string; value: string }>;
    mutableFirst[0] = { key: "Mutated", value: "mutated" };
    expect(buildSecurityHeaders("production")[0].key).toBe("Content-Security-Policy");
  });
});
