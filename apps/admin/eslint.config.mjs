import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  { languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } } },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
