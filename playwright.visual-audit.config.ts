import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts",
  testMatch: "figma-visual-audit.spec.ts",
  timeout: 120_000,
  use: {
    headless: true,
    locale: "ko-KR",
    baseURL: process.env.PHASE8_BASE_URL ?? "http://localhost:3002",
  },
  reporter: [["list"]],
  workers: 1,
});
