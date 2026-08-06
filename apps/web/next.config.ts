import type { NextConfig } from "next";
import { HEADER_SOURCE, IMAGE_OPTIMIZER_CSP, buildSecurityHeaders } from "./lib/security-headers";

const headerMode = process.env.NODE_ENV === "development" ? "development" : "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { contentSecurityPolicy: IMAGE_OPTIMIZER_CSP },
  async headers() {
    return [
      {
        source: HEADER_SOURCE,
        headers: buildSecurityHeaders(headerMode),
      },
    ];
  },
};

export default nextConfig;
