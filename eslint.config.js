import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist", "node_modules", ".wrangler", "*.config.js", "*.config.ts", "functions"],
  },
  {
    files: ["**/*.d.ts"],
    rules: { "no-var": "off", "@typescript-eslint/no-explicit-any": "off" },
  },
);
