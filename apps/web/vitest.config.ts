import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "lib/**/*.ts"],
      // opengraph/twitter-image build-time asset'tir; next build üretir,
      // jsdom'da ImageResponse render edilemez — kapsam dışı.
      exclude: ["app/opengraph-image.tsx", "app/twitter-image.tsx"],
      // Başlangıç eşiği %60; iskelet büyüdükçe hedef %80
      // (.claude/rules/common/testing.md).
      thresholds: { statements: 60 },
    },
  },
});
