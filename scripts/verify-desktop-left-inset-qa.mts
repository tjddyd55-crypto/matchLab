/**
 * Measure sidebarRight → contentLeft gap for dashboard pages.
 * npx tsx scripts/verify-desktop-left-inset-qa.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE = process.env.MATCHON_BASE_URL?.trim() || "http://127.0.0.1:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const EVENT_ID = process.env.MATCHON_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const OUT = join(process.cwd(), "test-results", "desktop-left-inset");
mkdirSync(OUT, { recursive: true });

type Row = {
  role: string;
  path: string;
  width: number;
  sidebarRight: number | null;
  contentLeft: number | null;
  gap: number | null;
  overflow: number;
};

async function login(page: Page, loginId: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await page.locator('input[name="loginId"], input[type="text"]').first().fill(loginId);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 90_000 });
  await page.waitForTimeout(600);
}

async function measure(page: Page, role: string, path: string, width: number): Promise<Row> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(700);

  return page.evaluate(({ role, path, width }) => {
    const asides = Array.from(document.querySelectorAll("aside"));
    // Prefer event/local side nav (rightmost aside before main content)
    let sidebarRight: number | null = null;
    if (asides.length > 0) {
      sidebarRight = Math.max(
        ...asides.map((el) => Math.round(el.getBoundingClientRect().right)),
      );
    } else {
      const nav = document.querySelector("nav");
      sidebarRight = nav ? Math.round(nav.getBoundingClientRect().right) : null;
    }

    const main = document.querySelector("main");
    const title =
      main?.querySelector("h1") ||
      main?.querySelector("[class*='PageTitle']") ||
      main?.querySelector("h2");
    const contentLeft = title
      ? Math.round(title.getBoundingClientRect().left)
      : null;

    const gap =
      sidebarRight != null && contentLeft != null
        ? contentLeft - sidebarRight
        : null;

    return {
      role,
      path,
      width,
      sidebarRight,
      contentLeft,
      gap,
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  }, { role, path, width });
}

const targets: { role: string; loginId: string; paths: string[] }[] = [
  {
    role: "admin",
    loginId: "admin",
    paths: [
      "/admin/gym-applications",
      "/admin/fighters",
      "/admin/events",
      "/admin/billing/subscriptions",
      "/admin/audit-logs",
    ],
  },
  {
    role: "organizer",
    loginId: "organizer",
    paths: [
      "/organizer/events",
      `/organizer/events/${EVENT_ID}/applications`,
      `/organizer/events/${EVENT_ID}/brackets`,
      `/organizer/events/${EVENT_ID}/check-in`,
      `/organizer/events/${EVENT_ID}/results`,
    ],
  },
  {
    role: "association",
    loginId: "organizer2",
    paths: ["/organizer/member-gyms", "/organizer/notices"],
  },
  {
    role: "gym",
    loginId: "gym",
    paths: ["/gym/members", "/gym/fighters", "/gym/events", "/gym/billing/account"],
  },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const rows: Row[] = [];
  let fails = 0;

  for (const t of targets) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      await login(page, t.loginId);
      console.log(`PASS login ${t.role}`);
    } catch (e) {
      console.error(`FAIL login ${t.role}`, e);
      fails++;
      await ctx.close();
      continue;
    }

    for (const path of t.paths) {
      for (const width of [1366, 1440, 1920] as const) {
        const row = await measure(page, t.role, path, width);
        rows.push(row);
        const ok =
          row.gap != null &&
          row.gap >= 12 &&
          row.gap <= 28 &&
          row.overflow <= 2;
        if (!ok) fails++;
        console.log(
          `${ok ? "PASS" : "FAIL"} ${t.role} ${width} ${path} sidebarR=${row.sidebarRight} contentL=${row.contentLeft} gap=${row.gap} overflow=${row.overflow}`,
        );
      }
    }

    // mobile: page container padding should stay 16px; don't assert sidebar gap
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}${t.paths[0]}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const mobilePad = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("div")).find((n) => {
        const c = String(n.className);
        return c.includes("px-[var(--dashboard-content-padding-x)]") || c.includes("dashboard-content-padding");
      });
      // fallback: computed padding on first main child
      const child = document.querySelector("main > div");
      const target = el || child;
      return target ? getComputedStyle(target).paddingLeft : null;
    });
    const mop = mobilePad === "16px";
    if (!mop) fails++;
    console.log(`${mop ? "PASS" : "FAIL"} ${t.role} mobile pad=${mobilePad}`);

    await ctx.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify({ fails, rows }, null, 2));
  console.log(`\nRESULT ${fails ? "FAIL" : "PASS"} fails=${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
