import type { MetadataRoute } from "next";
import { describe, expect, it } from "vitest";
import { metadata } from "../app/layout";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getLastUpdated } from "../lib/last-updated";

describe("root metadata export", () => {
  it("declares a default title and a template", () => {
    expect(metadata.title).toMatchObject({
      default: expect.stringContaining("Site Skeleton"),
      template: expect.stringContaining("%s"),
    });
  });

  it("declares a non-empty description", () => {
    expect(typeof metadata.description).toBe("string");
    expect((metadata.description as string).length).toBeGreaterThan(20);
  });

  it("declares a canonical alternate and a metadataBase", () => {
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.metadataBase).toBeInstanceOf(URL);
  });

  it("declares Open Graph basics", () => {
    expect(metadata.openGraph?.siteName).toBe("Site Skeleton");
  });
});

describe("robots route", () => {
  it("allows crawling and points at the sitemap", () => {
    const result: MetadataRoute.Robots = robots();
    expect(result.rules).toMatchObject({ userAgent: "*", allow: "/" });
    expect(String(result.sitemap)).toMatch(/\/sitemap\.xml$/);
  });
});

describe("sitemap route", () => {
  it("lists the home page with an absolute URL", () => {
    const entries: MetadataRoute.Sitemap = sitemap();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].url).toMatch(/^https?:\/\//);
  });

  it("pins lastModified to the last-updated value instead of the build clock", () => {
    const entries: MetadataRoute.Sitemap = sitemap();
    expect(entries[0].lastModified).toBe(getLastUpdated().iso);
  });
});
