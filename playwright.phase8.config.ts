import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "phase8-ui-smoke.spec.ts",
  timeout: 300_000,
  use: {
    headless: true,
    locale: "ko-KR",
  },
  reporter: [["list"]],
  workers: 1,
});
