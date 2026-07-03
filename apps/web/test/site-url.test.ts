import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "../lib/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSiteUrl", () => {
  it("falls back to localhost outside production when env is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("throws in production when env is missing (fail-fast guard)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL is required/);
  });

  it("allows the localhost fallback in production only with the explicit skeleton flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("SITE_SKELETON_ALLOW_LOCALHOST_URL", "1");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("returns the origin of a valid absolute URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://shop.example.com/");
    expect(getSiteUrl()).toBe("https://shop.example.com");
  });

  it("rejects a value that is not an absolute URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "shop.example.com");
    expect(() => getSiteUrl()).toThrow(/absolute URL/);
  });

  it("rejects non-http(s) protocols", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "ftp://shop.example.com");
    expect(() => getSiteUrl()).toThrow(/http\(s\)/);
  });
});
