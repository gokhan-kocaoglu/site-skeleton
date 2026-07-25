import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

// Lint enforcement depth (audit #18): Core Web Vitals, React Hooks and JSX
// a11y rules are enforced here so the objective parts of the SEO/a11y gates
// do not rely on agent judgement alone. Type-aware linting and heavier import
// boundary tooling: see docs/adr/ADR-0012-lint-enforcement-depth.md.
export default tseslint.config(
  { ignores: [".next/**", "coverage/**", "next-env.d.ts"] },
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // @next/eslint-plugin-next 16: flatConfig export'u kaldırıldı; flat
  // config'ler artık configs altında (legacy varyantlar eslintrc içindir).
  nextPlugin.configs["core-web-vitals"],
  jsxA11y.flatConfigs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    rules: {
      // Monorepo boundary: apps never reach into each other via relative
      // escapes; shared code flows through @skeleton/* workspace packages.
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["*../admin/*", "*../api/*", "**/apps/admin/**", "**/apps/api/**"],
              message: "Cross-app import is forbidden; use @skeleton/* workspace packages.",
            },
          ],
        },
      ],
    },
  },
);
