import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "ui-e2e-judge.spec.ts",
  timeout: 180_000,
  use: {
    headless: true,
    locale: "ko-KR",
  },
  reporter: [["list"]],
  workers: 1,
});
