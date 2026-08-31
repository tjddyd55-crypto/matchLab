/**
 * Desktop dashboard density smoke — login per role, visit inventory routes,
 * measure content inset / overflow at 1366 / 1440 / 1920 + mobile regression.
 *
 *   npx tsx scripts/verify-desktop-density-smoke-qa.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const ROOT = process.cwd();
const OUT = join(ROOT, "test-results", "desktop-density-smoke");
const BASE = process.env.MATCHON_BASE_URL?.trim() || "http://127.0.0.1:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";

mkdirSync(OUT, { recursive: true });

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };
const steps: Step[] = [];
const report: Record<string, unknown> = { base: BASE, steps, metrics: [] as unknown[] };

function pass(name: string, detail?: string) {
  steps.push({ name, status: "PASS", detail });
  console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`);
}
function fail(name: string, detail?: string) {
  steps.push({ name, status: "FAIL", detail });
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
}
function skip(name: string, detail?: string) {
  steps.push({ name, status: "SKIP", detail });
  console.log(`SKIP ${name}${detail ? `: ${detail}` : ""}`);
}

async function login(page: Page, loginId: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.locator('input[name="loginId"], input[name="email"], input[type="text"]').first().fill(loginId);
  await page.locator('input[name="password"], input[type="password"]').first().fill(PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45_000 }).catch(() => null),
    page.locator('button[type="submit"]').first().click(),
  ]);
  await page.waitForTimeout(800);
  if (page.url().includes("/login")) {
    throw new Error(`login failed for ${loginId}`);
  }
}

type DensityMetric = {
  role: string;
  path: string;
  width: number;
  contentLeft: number | null;
  contentRight: number | null;
  contentWidth: number | null;
  scrollWidthOverflow: number;
  pagePaddingX: string | null;
  consoleErrors: string[];
};

async function measureDensity(
  page: Page,
  role: string,
  path: string,
  width: number,
): Promise<DensityMetric> {
  const consoleErrors: string[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  };
  page.on("console", onConsole);

  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(600);

  const metric = await page.evaluate(() => {
    const main =
      document.querySelector("main") ||
      document.querySelector("[data-slot='dashboard-main']") ||
      document.body;
    const padded =
      document.querySelector("[class*='dashboard-content-padding']") ||
      Array.from(document.querySelectorAll("div")).find((el) => {
        const s = getComputedStyle(el);
        const px = s.paddingLeft;
        return (
          el.className.includes("max-w-[min(100%,96rem)]") ||
          (px === "20px" && el.getBoundingClientRect().width > 600)
        );
      }) ||
      main;

    const rect = padded.getBoundingClientRect();
    const cs = getComputedStyle(padded);
    return {
      contentLeft: Math.round(rect.left),
      contentRight: Math.round(window.innerWidth - rect.right),
      contentWidth: Math.round(rect.width),
      scrollWidthOverflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      pagePaddingX: cs.paddingLeft,
    };
  });

  page.off("console", onConsole);

  return {
    role,
    path,
    width,
    ...metric,
    consoleErrors: consoleErrors.filter(
      (e) => !/favicon|Download the React DevTools|hydration/i.test(e) || /Hydration/i.test(e),
    ),
  };
}

/** Role → representative dashboard routes (menu groups covered) */
const ROLE_ROUTES: Record<string, { loginId: string; routes: string[] }> = {
  admin: {
    loginId: "admin",
    routes: [
      "/admin",
      "/admin/organizers",
      "/admin/gyms",
      "/admin/fighters",
      "/admin/events",
      "/admin/applications",
      "/admin/billing/plans",
      "/admin/billing/subscriptions",
      "/admin/support-inquiries",
      "/admin/messaging/history",
      "/admin/audit-logs",
      "/admin/public-partners",
    ],
  },
  organizer: {
    loginId: "organizer",
    routes: [
      "/organizer",
      "/organizer/events",
      "/organizer/credits",
      "/organizer/billing/account",
      "/organizer/application-form-templates",
      "/organizer/division-templates",
      "/organizer/public-fighters",
    ],
  },
  association: {
    // Development fixture: organizer2 = 데모 주최자 2 (association)
    loginId: process.env.MATCHON_ASSOC_LOGIN ?? "organizer2",
    routes: [
      "/organizer",
      "/organizer/member-gyms",
      "/organizer/member-gyms/overview",
      "/organizer/member-gyms/applications",
      "/organizer/notices",
      "/organizer/events",
      "/organizer/billing/account",
    ],
  },
  gym_owner: {
    loginId: process.env.MATCHON_GYM_LOGIN ?? "gym",
    routes: [
      "/gym",
      "/gym/members",
      "/gym/fighters",
      "/gym/events",
      "/gym/applications",
      "/gym/attendance",
      "/gym/schedules",
      "/gym/sales",
      "/gym/billing/account",
      "/gym/staff",
      "/gym/associations",
    ],
  },
  gym_staff: {
    // Local yamanote may have no gym_staff users — skip on login failure.
    loginId: process.env.MATCHON_STAFF_LOGIN ?? "staff",
    routes: [
      "/gym",
      "/gym/members",
      "/gym/fighters",
      "/gym/schedules/my",
      "/gym/attendance",
    ],
  },
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const metrics: DensityMetric[] = [];

  try {
    await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(15_000) });
    pass("server up", BASE);
  } catch (e) {
    fail("server up", String(e));
    writeFileSync(join(OUT, "report.json"), JSON.stringify({ ...report, result: "FAIL" }, null, 2));
    process.exit(1);
  }

  for (const [role, cfg] of Object.entries(ROLE_ROUTES)) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await login(page, cfg.loginId);
      pass(`${role} login`, cfg.loginId);
    } catch (e) {
      if (role === "gym_staff") {
        skip(`${role} login`, String(e));
      } else {
        fail(`${role} login`, String(e));
      }
      await context.close();
      continue;
    }

    // Event deep links for organizer (resolve first event)
    let eventRoutes: string[] = [];
    if (role === "organizer" || role === "association") {
      await page.goto(`${BASE}/organizer/events`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(500);
      const eventHref = await page
        .locator('a[href*="/organizer/events/"]')
        .first()
        .getAttribute("href")
        .catch(() => null);
      const m = eventHref?.match(/\/organizer\/events\/([^/?#]+)/);
      if (m?.[1] && m[1] !== "new") {
        const id = m[1];
        eventRoutes = [
          `/organizer/events/${id}`,
          `/organizer/events/${id}/applications`,
          `/organizer/events/${id}/brackets`,
          `/organizer/events/${id}/check-in`,
          `/organizer/events/${id}/field-status`,
          `/organizer/events/${id}/results`,
          `/organizer/events/${id}/operation`,
        ];
        pass(`${role} event target`, id);
      } else {
        skip(`${role} event target`, "no event link");
      }
    }

    const routes = [...cfg.routes, ...eventRoutes];
    // Full inventory at 1440; width matrix on first 2 routes only.
    for (const path of routes) {
      try {
        const m = await measureDensity(page, role, path, 1440);
        metrics.push(m);
        if (m.scrollWidthOverflow > 2) {
          fail(`${role} 1440 overflow`, `${path} overflow=${m.scrollWidthOverflow}`);
        } else {
          pass(
            `${role} 1440 ${path}`,
            `L=${m.contentLeft} R=${m.contentRight} W=${m.contentWidth} pad=${m.pagePaddingX}`,
          );
        }
        const hydra = m.consoleErrors.filter((e) => /Hydration|hydration/i.test(e));
        if (hydra.length) fail(`${role} hydration`, hydra[0]);
      } catch (e) {
        fail(`${role} 1440 ${path}`, String(e));
      }
    }

    for (const path of routes.slice(0, 2)) {
      for (const width of [1366, 1920] as const) {
        try {
          const m = await measureDensity(page, role, path, width);
          metrics.push(m);
          if (m.scrollWidthOverflow > 2) {
            fail(`${role} ${width} overflow`, `${path} overflow=${m.scrollWidthOverflow}`);
          } else {
            pass(
              `${role} ${width} ${path}`,
              `L=${m.contentLeft} R=${m.contentRight} W=${m.contentWidth} pad=${m.pagePaddingX}`,
            );
          }
        } catch (e) {
          fail(`${role} ${width} ${path}`, String(e));
        }
      }
    }

    // Mobile regression: 390 should keep larger touch padding on container
    await page.setViewportSize({ width: 390, height: 844 });
    const mobilePath = cfg.routes[0];
    await page.goto(`${BASE}${mobilePath}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    const mobilePad = await page.evaluate(() => {
      const el =
        Array.from(document.querySelectorAll("div")).find((n) =>
          n.className.includes("max-w-[min(100%,96rem)]"),
        ) || document.querySelector("main");
      return el ? getComputedStyle(el).paddingLeft : null;
    });
    // base token is 1rem (16px) on small screens
    if (mobilePad === "16px" || mobilePad === "20px") {
      pass(`${role} mobile pad`, `${mobilePad}`);
    } else {
      fail(`${role} mobile pad`, String(mobilePad));
    }

    await context.close();
  }

  report.metrics = metrics;
  const failed = steps.filter((s) => s.status === "FAIL").length;
  report.result = failed ? "FAIL" : "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(`\nRESULT ${report.result} fail=${failed} steps=${steps.length}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
