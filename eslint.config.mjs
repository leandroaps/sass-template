import { fixupPluginRules } from "@eslint/compat";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// eslint-config-next@16.x ships native flat config under the
// `/core-web-vitals` and `/typescript` subpath exports — no FlatCompat
// bridge needed anymore (bridging these already-flat configs through
// FlatCompat.extends(...), the 15.x-era workaround, crashes under 16.x).

// eslint-config-next@16.2.12 (latest as of ESLint 10's release, including its
// 16.3 preview) still bundles eslint-plugin-react/-jsx-a11y/-import versions
// that call the removed `context.getFilename()` API and crash under ESLint
// 10; `fixupPluginRules` shims it back in. Drop this once eslint-config-next
// ships versions of those plugins built for ESLint 10.
const LEGACY_PLUGINS = ["react", "jsx-a11y", "import"];
function shimLegacyPlugins(configs) {
  return configs.map((config) => {
    if (!config.plugins) return config;
    const plugins = { ...config.plugins };
    for (const name of LEGACY_PLUGINS) {
      if (plugins[name]) plugins[name] = fixupPluginRules(plugins[name]);
    }
    return { ...config, plugins };
  });
}

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  { ignores: [".next/**", "node_modules/**", "playwright-report/**", "test-results/**"] },
  ...shimLegacyPlugins(nextCoreWebVitals),
  ...shimLegacyPlugins(nextTypescript),
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
