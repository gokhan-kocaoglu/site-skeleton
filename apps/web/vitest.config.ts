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
      include: ["app/**/*.{ts,tsx}"],
      // Başlangıç eşiği %60; iskelet büyüdükçe hedef %80
      // (.claude/rules/common/testing.md).
      thresholds: { statements: 60 },
    },
  },
});
