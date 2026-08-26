/**
 * Event vertical sidebar navigation — layout, active state, no horizontal nav.
 * Run: npx playwright test scripts/event-sidebar-navigation.spec.ts -c playwright.event-nav.config.ts
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
  "event-figma-sidebar-audit",
);

type RouteCase = {
  path: string;
  activeLabel: string;
  screenshot?: boolean;
};

const ROUTES: RouteCase[] = [
  { path: BASE, activeLabel: "관리 홈", screenshot: true },
  {
    path: `${BASE}/applications`,
    activeLabel: "신청자",
    screenshot: true,
  },
  {
    path: `${BASE}/check-in`,
    activeLabel: "현장·계체",
    screenshot: true,
  },
  {
    path: `${BASE}/brackets`,
    activeLabel: "대진표",
    screenshot: true,
  },
  {
    path: `${BASE}/operation`,
    activeLabel: "경기 운영",
    screenshot: true,
  },
  { path: `${BASE}/field-status`, activeLabel: "경기장 현황" },
  { path: `${BASE}/judges`, activeLabel: "심판 관리" },
  { path: `${BASE}/qr`, activeLabel: "QR 출력" },
  { path: `${BASE}/results`, activeLabel: "결과" },
  { path: `${BASE}/live`, activeLabel: "라이브 URL" },
  {
    path: `${BASE}/application-batches`,
    activeLabel: "공식 신청서",
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

async function assertSidebarFlush(page: Page) {
  const globalSidebar = page.locator("aside.bg-matchon-sidebar");
  await expect(globalSidebar).toBeVisible();

  const eventNav = page.getByRole("navigation", { name: "대회 관리 메뉴" });
  const eventAside = eventNav.locator("xpath=ancestor::aside[1]");

  const globalBox = await globalSidebar.boundingBox();
  const eventBox = await eventAside.boundingBox();
  expect(globalBox, "global sidebar box").not.toBeNull();
  expect(eventBox, "event sidebar box").not.toBeNull();
  if (!globalBox || !eventBox) return;

  const globalRight = globalBox.x + globalBox.width;
  const gap = eventBox.x - globalRight;
  expect(Math.abs(gap), `sidebar gap ${gap.toFixed(2)}px`).toBeLessThanOrEqual(1);
  expect(globalBox.width, "global sidebar width").toBeCloseTo(224, 0);
  expect(eventBox.width, "event sidebar width").toBeCloseTo(232, 0);
}

async function assertVerticalSidebar(page: Page, route: RouteCase) {
  const sideNav = page.getByRole("navigation", { name: "대회 관리 메뉴" });
  await expect(sideNav).toBeVisible();

  await expect(
    page.getByRole("navigation", { name: "대회 관리 대분류" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "대회 관리 소분류" }),
  ).toHaveCount(0);

  await expect(
    sideNav.getByRole("link", { name: route.activeLabel, exact: true }),
  ).toHaveAttribute("aria-current", "page");

  await expect(page.getByText("내 대회 목록")).toBeVisible();

  await assertSidebarFlush(page);

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow, `horizontal overflow on ${route.path}`).toBe(false);
}

async function assertMobileSheet(page: Page, route: RouteCase) {
  await expect(
    page.getByRole("navigation", { name: "대회 관리 메뉴" }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "대회 메뉴" }).click();
  const sheetNav = page.getByRole("navigation", { name: "대회 관리 메뉴" });
  await expect(sheetNav).toBeVisible();
  await expect(
    sheetNav.getByRole("link", { name: route.activeLabel, exact: true }),
  ).toHaveAttribute("aria-current", "page");
}

for (const viewport of [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test.describe(`event sidebar @ ${viewport.name}`, () => {
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

        if (viewport.name === "pc") {
          await assertVerticalSidebar(page, route);
        } else {
          await assertMobileSheet(page, route);
        }

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
          const slug =
            route.path.replace(BASE, "").replace(/^\//, "") || "home";
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
    const bracketItem = items.find((i) => i.label === "대진표")!;
    const sequenceItem = items.find((i) => i.label === "전체순서")!;
    expect(bracketItem.href).toContain("view=workspace");
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        bracketItem,
        "?tab=view&view=workspace",
      ),
    ).toBe(true);
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        sequenceItem,
        "?tab=view&view=workspace",
      ),
    ).toBe(false);
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        sequenceItem,
        "?tab=view",
      ),
    ).toBe(true);
    expect(
      isEventManagementNavItemActive(
        `${base}/brackets`,
        "",
        EVENT_ID,
        bracketItem,
        "?tab=view",
      ),
    ).toBe(false);
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
