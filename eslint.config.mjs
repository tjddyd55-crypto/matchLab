import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "prisma/**",
    // Build artifacts / archives (not source)
    "desktop/dist/**",
    "desktop/out-*/**",
    "desktop/release/**",
    "desktop/release-*/**",
    "scripts/archive/**",
    "test-results/**",
    "tmp/**",
    "outputs/**",
  ]),
  {
    files: ["**/*.cjs", "desktop/scripts/**", "scripts/**/*.ts", "scripts/**/*.mts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/lib/brackets/max-weight-matching.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  {
    rules: {
      // MATCHON Modal SSOT: window.alert/confirm/prompt 금지
      "no-alert": "error",
    },
  },
]);

export default eslintConfig;
