import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const app = JSON.parse(
  execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service d9575ee0-a2e2-46c2-9221-b16ea4b8df96 --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, ""),
) as Record<string, string>;
const pw = String(app.DEMO_PASSWORD || "");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/login", {
  waitUntil: "domcontentloaded",
  timeout: 60_000,
});
await page
  .locator('input[name="identifier"], input[name="loginId"]')
  .first()
  .fill("admin");
await page.locator('input[name="password"]').first().fill(pw);
await page.getByRole("button", { name: /로그인/ }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
  timeout: 45_000,
});
await page.goto(
  "http://localhost:3000/admin/member-sport-templates/cmskickboxingtpl001",
  { waitUntil: "networkidle", timeout: 60_000 },
);
await page.waitForTimeout(800);
const text = await page.locator("body").innerText();
const bad = text.includes("항목 키 형식");
console.log(bad ? "FAIL still has key error" : "PASS no key format error");
await page.screenshot({
  path: "test-results/member-grid-phase2-qa/admin-kickboxing-after-fix.png",
  fullPage: true,
});
await browser.close();
process.exit(bad ? 1 : 0);
