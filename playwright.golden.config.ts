import "dotenv/config";
import { defineConfig } from "@playwright/test";

const baseURL = process.env.QA_BASE_URL ?? "http://127.0.0.1:3000";
const isCiGolden = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  testDir: "./tests/e2e/golden",
  timeout: 180_000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  webServer: isCiGolden
    ? {
        command: "npm run start -- -p 3000",
        url: "http://127.0.0.1:3000/login",
        reuseExistingServer: false,
        timeout: 180_000,
      }
    : {
        command: "npm run dev -- --port 3000",
        url: "http://127.0.0.1:3000/login",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
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
