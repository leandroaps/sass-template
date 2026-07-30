import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next@16.x ships native flat config under the
// `/core-web-vitals` and `/typescript` subpath exports — no FlatCompat
// bridge needed anymore (bridging these already-flat configs through
// FlatCompat.extends(...), the 15.x-era workaround, crashes under 16.x).

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
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
