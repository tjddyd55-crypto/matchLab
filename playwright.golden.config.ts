import "dotenv/config";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./tests/e2e/golden",
  timeout: 180_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    headless: true,
    locale: "ko-KR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: "test-results/golden-flow/playwright-report",
      },
    ],
  ],
  outputDir: "test-results/golden-flow/artifacts",
});
