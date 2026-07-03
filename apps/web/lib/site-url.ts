/**
 * Single source of truth for the public site origin (Faz 8.1, audit #13).
 *
 * canonical / sitemap / robots / Open Graph URLs are frozen into the static
 * build output, so a missing NEXT_PUBLIC_SITE_URL in a production build would
 * silently publish localhost URLs (index loss). This helper fails the build
 * fast instead. Dev and test fall back to localhost.
 *
 * SITE_SKELETON_ALLOW_LOCALHOST_URL=1 is an explicit, documented escape hatch
 * used ONLY by the skeleton's own quality gate (scripts/quality/gate-build.mjs)
 * so `pnpm gate` can validate the build without a deploy target. Real deploy
 * pipelines must never set it.
 */
const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!raw) {
    const allowFallback =
      process.env.NODE_ENV !== "production" ||
      process.env.SITE_SKELETON_ALLOW_LOCALHOST_URL === "1";
    if (!allowFallback) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL is required for production builds: canonical, " +
          "sitemap, robots and Open Graph URLs are frozen at build time and " +
          "would point at localhost. Set it (see apps/web/.env.example) or — " +
          "only for skeleton self-validation — set SITE_SKELETON_ALLOW_LOCALHOST_URL=1."
      );
    }
    return FALLBACK_SITE_URL;
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be an absolute URL, got: "${raw}"`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`NEXT_PUBLIC_SITE_URL must use http(s), got protocol: "${url.protocol}"`);
  }
  return url.origin;
}
