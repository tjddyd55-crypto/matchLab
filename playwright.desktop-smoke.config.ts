import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "desktop-manager-role-smoke.spec.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    headless: true,
    ignoreHTTPSErrors: true,
  },
});
