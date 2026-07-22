import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next@15.x predates flat config's subpath-exports convention —
// it's still authored as a legacy `extends`-style shareable config (no
// `./typescript` or `./core-web-vitals` export exists on this version), so it
// has to be bridged into flat config via FlatCompat rather than imported
// directly.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Convention: an unused function/arg named with a leading underscore is
      // intentional (e.g. a placeholder param kept for a stable call signature).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
