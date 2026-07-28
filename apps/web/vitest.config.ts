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
      //
      // Kritik domainlerde (auth / payment / billing) %80 ZORUNLUDUR. Glob
      // eşikleri yalnız eşleşen dosya varken uygulanır: iskelette bu yollar
      // henüz yok, yani kural dormant ama telli — ilk auth/ödeme dosyası
      // eklendiği anda bağlayıcı hâle gelir. Negatif kanıt:
      // scripts/tests/critical-domain-coverage-negative.mjs
      thresholds: {
        statements: 60,
        "**/app/**/{auth,payment,billing}/**": {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
        "**/lib/**/{auth,payment,billing}/**": {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  },
});
