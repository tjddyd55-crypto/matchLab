/**
 * Stage PC-2 — production /desktop 역할 로그인 스모크 (웹 계약).
 * Electron 셸 자체 로그인이 아니라, Manager가 쓰는 동일 /desktop 플로우를 검증한다.
 *
 *   DEMO_PASSWORD=... npx playwright test scripts/desktop-manager-role-smoke.spec.ts --config=playwright.desktop-smoke.config.ts
 */
import { test, expect } from "@playwright/test";

const BASE =
  process.env.DESKTOP_SMOKE_BASE_URL ??
  "https://app-production-79ad.up.railway.app";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";

async function loginAs(page: import("@playwright/test").Page, loginId: string) {
  await page.goto(`${BASE}/desktop/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="identifier"], #login-identifier').first().fill(loginId);
  await page.locator('input[name="password"], input[type="password"]').first().fill(PASSWORD);
  await page.getByRole("button", { name: /로그인|login/i }).first().click();
}

test.describe("MATCHON Manager desktop role smoke", () => {
  test("login page shows Manager branding", async ({ page }) => {
    await page.goto(`${BASE}/desktop/login`);
    await expect(page.getByText("MATCHON Manager").first()).toBeVisible();
    await expect(page.getByText("관리자 로그인").first()).toBeVisible();
  });

  test("organizer → /organizer", async ({ page }) => {
    await loginAs(page, "organizer");
    await page.waitForURL(/\/organizer(\/|$|\?)/, { timeout: 45000 });
    expect(page.url()).toMatch(/\/organizer/);
  });

  test("gym → /gym", async ({ page }) => {
    await loginAs(page, "gym");
    await page.waitForURL(/\/gym(\/|$|\?)/, { timeout: 45000 });
    expect(page.url()).toMatch(/\/gym/);
  });

  test("fighter blocked on Manager login", async ({ page }) => {
    await loginAs(page, "fighter");
    // Desktop action revoke + FORBIDDEN (stay on login) — unavailable redirect is alternate path
    await expect(
      page.getByText(/MATCHON Manager를 사용할 수 없습니다|사용할 수 없습니다/),
    ).toBeVisible({ timeout: 45000 });
    expect(page.url()).toMatch(/\/desktop\/login/);
  });
});
