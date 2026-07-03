import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactRefresh from "eslint-plugin-react-refresh";

// Lint enforcement depth (audit #18): React Hooks, JSX a11y and React Refresh
// rules are enforced here so the objective parts of the a11y gate do not rely
// on agent judgement alone. Type-aware linting and heavier import boundary
// tooling: see docs/adr/ADR-0012-lint-enforcement-depth.md.
export default tseslint.config(
  { ignores: ["dist/**", "coverage/**"] },
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  reactRefresh.configs.vite,
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
              group: ["*../web/*", "*../api/*", "**/apps/web/**", "**/apps/api/**"],
              message: "Cross-app import is forbidden; use @skeleton/* workspace packages.",
            },
          ],
        },
      ],
    },
  },
);
