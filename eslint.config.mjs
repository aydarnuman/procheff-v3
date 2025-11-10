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
    // Worker compiled output:
    "ihale-worker/dist/**",
    "**/dist/**",
    // Test files:
    "ihale-worker/test-*.ts",
    "**/test-*.ts",
  ]),
  // Relax rules for ihale-worker (external scraper, not Next.js code)
  {
    files: ["ihale-worker/**/*.ts", "ihale-worker/**/*.js"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Relax rules for ihale scraping modules (data transformation code)
  {
    files: ["src/app/api/ihale/**/*.ts", "src/app/ihale/**/*.tsx", "src/lib/ihale/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn", // warn instead of error
    },
  },
]);

export default eslintConfig;
