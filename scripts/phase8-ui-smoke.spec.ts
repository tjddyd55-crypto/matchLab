/**
 * Phase 8 — 전 화면 HTTP/UI 스모크 (로컬 또는 JUDGE_UI_E2E_BASE_URL).
 * 실행: npx playwright test scripts/phase8-ui-smoke.spec.ts -c playwright.phase8.config.ts
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL =
  process.env.PHASE8_BASE_URL ??
  process.env.JUDGE_UI_E2E_BASE_URL ??
  "http://localhost:3000";
const EVENT_ID =
  process.env.PHASE8_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const SLUG = process.env.PHASE8_EVENT_SLUG ?? "sample-open-2026";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";

const VIEWPORTS = [
  { name: "pc", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

type RouteCheck = {
  path: string;
  label: string;
  expectStatus?: number;
  forbiddenText?: string[];
};

const PUBLIC_ROUTES: RouteCheck[] = [
  { path: "/", label: "home" },
  { path: "/events", label: "events-list" },
  { path: `/events/${SLUG}`, label: "event-detail" },
  { path: `/events/${SLUG}/brackets`, label: "event-brackets" },
  { path: `/events/${SLUG}/results`, label: "event-results" },
  { path: `/events/${SLUG}/live`, label: "event-live" },
  { path: "/login", label: "login" },
  { path: "/register", label: "register" },
  { path: "/guardian-consent/invalid-test-token", label: "guardian-invalid" },
  { path: "/fighter-registration/invalid-test-token", label: "fighter-reg-invalid" },
  { path: "/application-sign/invalid-test-token", label: "app-sign-invalid" },
];

const ORGANIZER_ROUTES: RouteCheck[] = [
  { path: "/organizer", label: "organizer-home" },
  { path: "/organizer/events", label: "organizer-events" },
  { path: `/organizer/events/${EVENT_ID}/operation`, label: "operation" },
  { path: `/organizer/events/${EVENT_ID}/field-status`, label: "field-status" },
  { path: `/organizer/events/${EVENT_ID}/judges`, label: "judges" },
  { path: `/organizer/events/${EVENT_ID}/qr`, label: "qr" },
  { path: `/organizer/events/${EVENT_ID}/check-in`, label: "check-in" },
  { path: `/organizer/events/${EVENT_ID}/applications`, label: "applications" },
  { path: `/organizer/events/${EVENT_ID}/brackets`, label: "brackets" },
];

const GYM_ROUTES: RouteCheck[] = [
  { path: "/gym/events", label: "gym-events" },
  { path: `/gym/events/${EVENT_ID}/apply`, label: "gym-apply" },
  { path: `/gym/events/${EVENT_ID}/status`, label: "gym-status" },
  { path: `/gym/events/${EVENT_ID}/field-status`, label: "gym-field-status" },
  { path: "/gym/applications", label: "gym-applications" },
];

const FIGHTER_ROUTES: RouteCheck[] = [
  { path: "/fighter", label: "fighter-home" },
  { path: "/fighter/events", label: "fighter-events" },
  { path: "/fighter/profile", label: "fighter-profile" },
  { path: "/fighter/records", label: "fighter-records" },
  { path: "/fighter/pending", label: "fighter-pending" },
  { path: "/fighter/rejected", label: "fighter-rejected" },
  { path: "/fighter/unlinked", label: "fighter-unlinked" },
  { path: "/fighter/change-password", label: "fighter-change-password" },
];

const ADMIN_ROUTES: RouteCheck[] = [
  { path: "/admin", label: "admin-home" },
  { path: "/admin/events", label: "admin-events" },
  { path: "/admin/organizers", label: "admin-organizers" },
  { path: "/admin/credits", label: "admin-credits" },
  { path: "/admin/gyms", label: "admin-gyms" },
  { path: "/admin/fighters", label: "admin-fighters" },
  { path: "/admin/applications", label: "admin-applications" },
  { path: "/admin/application-form-templates", label: "admin-templates" },
  { path: "/admin/application-form-templates/new", label: "admin-templates-new" },
  { path: "/admin/results", label: "admin-results" },
  { path: "/admin/audit-logs", label: "admin-audit" },
];

async function dashboardLogin(page: Page, loginId: string) {
  await page.goto("/login");
  await page.getByLabel("아이디").fill(loginId);
  await page.getByLabel("비밀번호").fill(PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL(
    (url) => !url.pathname.startsWith("/login"),
    { timeout: 45_000 },
  );
}

async function visitRoute(
  page: Page,
  route: RouteCheck,
  consoleErrors: string[],
) {
  const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
  const status = response?.status() ?? 0;
  expect(
    status,
    `${route.label} ${route.path} status`,
  ).toBeLessThan(500);

  if (route.expectStatus) {
    expect(status, route.label).toBe(route.expectStatus);
  }

  const body = await page.locator("body").innerText();
  expect(body).not.toMatch(/Application error: a server-side exception/i);
  expect(body).not.toMatch(/Internal Server Error/i);

  if (route.forbiddenText) {
    for (const text of route.forbiddenText) {
      expect(body).not.toContain(text);
    }
  }

  expect(
    consoleErrors,
    `${route.label} console errors on ${route.path}`,
  ).toEqual([]);
}

function isIgnorableConsoleMessage(text: string): boolean {
  return (
    text.includes("favicon") ||
    text.includes("Download the React DevTools") ||
    text.includes("NEXT_PUBLIC_SUPABASE") ||
    text.includes("설정되지 않았습니다") ||
    (text.includes("hydration") && text.includes("data-cursor"))
  );
}

function attachConsoleCollector(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (isIgnorableConsoleMessage(text)) return;
      errors.push(text);
    }
  });
  page.on("pageerror", (err) => {
    if (isIgnorableConsoleMessage(err.message)) return;
    errors.push(err.message);
  });
  return errors;
}

test.describe.configure({ mode: "serial" });

test.use({ baseURL: BASE_URL });

for (const viewport of VIEWPORTS) {
  test.describe(`Phase 8 smoke @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("public routes", async ({ page }) => {
      const consoleErrors = attachConsoleCollector(page);
      for (const route of PUBLIC_ROUTES) {
        await visitRoute(page, route, consoleErrors);
      }
    });

    test("admin routes", async ({ page }) => {
      const consoleErrors = attachConsoleCollector(page);
      await dashboardLogin(page, "admin");
      for (const route of ADMIN_ROUTES) {
        await visitRoute(page, route, consoleErrors);
      }
    });

    test("organizer routes", async ({ page }) => {
      const consoleErrors = attachConsoleCollector(page);
      await dashboardLogin(page, "organizer");
      for (const route of ORGANIZER_ROUTES) {
        await visitRoute(page, route, consoleErrors);
      }
    });

    test("gym routes", async ({ page }) => {
      const consoleErrors = attachConsoleCollector(page);
      await dashboardLogin(page, "gym");
      for (const route of GYM_ROUTES) {
        await visitRoute(page, route, consoleErrors);
      }
    });

    test("fighter routes", async ({ page }) => {
      const consoleErrors = attachConsoleCollector(page);
      await dashboardLogin(page, "fighter");
      for (const route of FIGHTER_ROUTES) {
        await visitRoute(page, route, consoleErrors);
      }
    });
  });
}
