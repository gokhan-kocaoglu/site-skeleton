import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", "next-env.d.ts"] },
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
