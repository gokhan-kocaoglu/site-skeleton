import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone config on purpose: vite.config.ts pulls in the Tailwind plugin,
// which tests do not need.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      // main.tsx is the DOM bootstrap entry; it never runs under jsdom tests.
      exclude: ["src/main.tsx", "src/test/**", "src/**/*.test.*"],
      // Başlangıç eşiği %60; iskelet büyüdükçe hedef %80
      // (.claude/rules/common/testing.md).
      thresholds: { statements: 60 },
    },
  },
});
