/**
 * Event horizontal navigation smoke — layout, active state, no vertical sidebar.
 * Run: npx playwright test scripts/event-horizontal-navigation.spec.ts -c playwright.event-nav.config.ts
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  getEventManagementNavItems,
  isEventManagementNavItemActive,
  resolveActiveEventManagementNavGroupId,
} from "../src/lib/ui/event-management-navigation";

const EVENT_ID =
  process.env.PHASE8_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const BASE = `/organizer/events/${EVENT_ID}`;
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const OUT_DIR = path.join(
  process.cwd(),
  "test-results",
  "event-horizontal-navigation",
);

type RouteCase = {
  path: string;
  primary: string;
  secondary: string;
  screenshot?: boolean;
};

const ROUTES: RouteCase[] = [
  { path: BASE, primary: "대회 설정", secondary: "관리 홈", screenshot: true },
  {
    path: `${BASE}/applications`,
    primary: "신청·현장",
    secondary: "신청자",
    screenshot: true,
  },
  {
    path: `${BASE}/check-in`,
    primary: "신청·현장",
    secondary: "현장·계체",
    screenshot: true,
  },
  {
    path: `${BASE}/brackets`,
    primary: "대진·운영",
    secondary: "대진표",
    screenshot: true,
  },
  {
    path: `${BASE}/operation`,
    primary: "대진·운영",
    secondary: "경기 운영",
    screenshot: true,
  },
  { path: `${BASE}/field-status`, primary: "대진·운영", secondary: "경기장 현황" },
  { path: `${BASE}/judges`, primary: "대진·운영", secondary: "심판 관리" },
  { path: `${BASE}/qr`, primary: "대진·운영", secondary: "QR 출력" },
  { path: `${BASE}/results`, primary: "대진·운영", secondary: "결과" },
  { path: `${BASE}/live`, primary: "공개·기타", secondary: "라이브 URL" },
  {
    path: `${BASE}/application-batches`,
    primary: "공개·기타",
    secondary: "공식 신청서",
  },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill("organizer");
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
}

function attachConsoleCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      text.includes("favicon") ||
      text.includes("Download the React DevTools") ||
      text.includes("manifest")
    ) {
      return;
    }
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function assertHorizontalNav(page: Page, route: RouteCase) {
  await expect(
    page.getByRole("navigation", { name: "대회 관리 대분류" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "대회 관리 소분류" }),
  ).toBeVisible();

  const legacySidebar = page.locator(
    'aside nav[aria-label="대회 관리 메뉴"]',
  );
  await expect(legacySidebar).toHaveCount(0);

  const primaryNav = page.getByRole("navigation", {
    name: "대회 관리 대분류",
  });
  await expect(
    primaryNav.getByRole("link", { name: route.primary, exact: true }),
  ).toHaveAttribute("aria-current", "true");

  const secondaryNav = page.getByRole("navigation", {
    name: "대회 관리 소분류",
  });
  await expect(
    secondaryNav.getByRole("link", { name: route.secondary, exact: true }),
  ).toHaveAttribute("aria-current", "page");

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow, `horizontal overflow on ${route.path}`).toBe(false);
}

for (const viewport of [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test.describe(`event nav @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    for (const route of ROUTES) {
      test(`${route.path}`, async ({ page }) => {
        const consoleErrors = attachConsoleCollector(page);
        const response = await page.goto(route.path, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
        expect(response?.status() ?? 0).toBeLessThan(500);

        await assertHorizontalNav(page, route);

        const hydration = consoleErrors.filter(
          (e) =>
            e.includes("hydration") ||
            e.includes("Hydration") ||
            e.includes("#418") ||
            e.includes("did not match"),
        );
        expect(hydration, `hydration on ${route.path}`).toEqual([]);
        expect(consoleErrors, `console on ${route.path}`).toEqual([]);

        if (route.screenshot) {
          const dir = path.join(OUT_DIR, viewport.name);
          fs.mkdirSync(dir, { recursive: true });
          const slug = route.path.replace(BASE, "").replace(/^\//, "") || "home";
          await page.screenshot({
            path: path.join(dir, `${slug || "home"}.png`),
            fullPage: true,
          });
        }
      });
    }
  });
}

test.describe("active matcher unit", () => {
  const items = getEventManagementNavItems(EVENT_ID, "sample-open-2026");

  test("brackets tab=view distinguishes 전체순서", () => {
    const base = BASE;
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        items.find((i) => i.label === "대진표")!,
        "",
      ),
    ).toBe(true);
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        items.find((i) => i.label === "전체순서")!,
        "",
      ),
    ).toBe(false);
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        items.find((i) => i.label === "전체순서")!,
        "?tab=view",
      ),
    ).toBe(true);
  });

  test("application-batches is not applications", () => {
    const path = `${BASE}/application-batches`;
    expect(
      resolveActiveEventManagementNavGroupId(path, "", EVENT_ID, items, ""),
    ).toBe("public");
    expect(
      isEventManagementNavItemActive(
        path,
        "",
        EVENT_ID,
        items.find((i) => i.label === "신청자")!,
        "",
      ),
    ).toBe(false);
  });
});
