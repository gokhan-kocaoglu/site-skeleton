import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Linting runs through Turborepo (`pnpm lint`), not inside `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
