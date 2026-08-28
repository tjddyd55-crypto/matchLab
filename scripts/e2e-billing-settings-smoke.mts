/**
 * Browser smoke: /admin/billing/settings (local dev).
 *   npx tsx scripts/e2e-billing-settings-smoke.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = (process.env.QA_BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const OUT = join(process.cwd(), "test-results", "billing-settings-smoke");

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("아이디").fill("admin");
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
  });
}

async function smokeViewport(
  width: number,
  height: number,
  label: string,
  browser: import("@playwright/test").Browser,
) {
  const page = await browser.newPage({ viewport: { width, height } });
  await login(page);
  await page.goto(`${BASE}/admin/billing/settings`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "결제 설정" }).waitFor({
    timeout: 20_000,
  });
  await page.getByText("결제 연동 상태").waitFor();
  await page.getByText("TEST MODE").first().waitFor();
  await page.getByText("현재 진단").waitFor();

  const scrollW = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const clientW = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  if (scrollW > clientW + 2) {
    throw new Error(`${label}: horizontal scroll ${scrollW} > ${clientW}`);
  }

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: join(OUT, `${label}.png`),
    fullPage: true,
  });
  await page.close();
  return { label, scrollW, clientW };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const results = await Promise.all([
      smokeViewport(1440, 900, "desktop-1440", browser),
      smokeViewport(390, 844, "mobile-390", browser),
    ]);
    const report = {
      base: BASE,
      pass: true,
      viewports: results,
      timestamp: new Date().toISOString(),
    };
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("billing-settings-smoke OK", report);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("billing-settings-smoke FAIL", e);
  process.exit(1);
});
