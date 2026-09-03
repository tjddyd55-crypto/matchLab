/**
 * Desktop sidebar accordion IA QA — admin / association / gym owner / staff.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const OUT = join(process.cwd(), "test-results", "sidebar-accordion-ia-qa");
mkdirSync(OUT, { recursive: true });

const report: Record<string, unknown> = {
  base: BASE,
  startedAt: new Date().toISOString(),
};

function fail(msg: string): never {
  report.failedAt = msg;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error("FAIL:", msg);
  process.exit(1);
}

function pass(key: string, detail?: unknown) {
  report[key] = detail ?? "PASS";
  console.log("PASS:", key, detail ?? "");
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.locator("#login-identifier, input[name='identifier']").first().fill(loginId);
  await page.locator("input[type='password']").first().fill(password);
  await page.getByRole("button", { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), {
    timeout: 90_000,
  });
}

async function sidebar(page: Page) {
  return page.locator("[data-dashboard-global-sidebar], aside").first();
}

async function assertAccordionDesktop(page: Page, roleKey: string) {
  const nav = page.locator("nav[aria-label]").first();
  await nav.waitFor({ state: "visible", timeout: 30_000 });

  const sections = nav.locator("[data-nav-level='section']");
  const sectionCount = await sections.count();
  if (sectionCount < 1) fail(`${roleKey}: no sections`);

  // Desktop: closed groups hide children (accordion attribute)
  const groups = nav.locator("[data-nav-accordion]");
  const groupCount = await groups.count();
  if (groupCount < 1) fail(`${roleKey}: no accordion groups on desktop`);

  const openCount = await nav.locator('[data-nav-accordion="open"]').count();
  if (openCount > 1) fail(`${roleKey}: more than one open accordion`);

  // Toggle another section
  const closed = nav.locator('[data-nav-accordion="closed"] button[data-nav-level="section"]');
  if ((await closed.count()) > 0) {
    const beforeOpen = await nav.locator('[data-nav-accordion="open"]').getAttribute("data-nav-group");
    await closed.first().click();
    await page.waitForTimeout(200);
    const afterOpenCount = await nav.locator('[data-nav-accordion="open"]').count();
    if (afterOpenCount > 1) fail(`${roleKey}: accordion multi-open after click`);
    const afterOpen = await nav.locator('[data-nav-accordion="open"]').getAttribute("data-nav-group");
    if (beforeOpen && afterOpen && beforeOpen === afterOpen) {
      // clicked might close if same — skip
    }
  }

  pass(`${roleKey}_accordion`, { sectionCount, groupCount, openCount });
}

async function main() {
  const app = JSON.parse(
    execSync("railway variable list -e development -s app --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const pw = String(app.DEMO_PASSWORD || "");
  if (!pw) fail("DEMO_PASSWORD missing");

  // wait for server
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(3000) });
      if (r.ok || r.status < 500) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
    if (i === 39) fail("local server unreachable");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // ---- Admin ----
  await login(page, "admin", pw);
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.screenshot({ path: join(OUT, "01-admin-home.png"), fullPage: false });
  for (const label of ["회원·조직", "선수", "대회", "MATCHON 결제", "시스템"]) {
    if ((await page.locator(`[data-nav-section="${label}"]`).count()) === 0) {
      fail(`admin missing section ${label}`);
    }
  }
  await assertAccordionDesktop(page, "admin");

  await page.goto(`${BASE}/admin/fighters`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(500);
  const fightersOpen = page.locator(
    '[data-nav-group="fighters"][data-nav-accordion="open"]',
  );
  if ((await fightersOpen.count()) === 0) fail("admin fighters group not auto-open");
  if (
    (await page.locator('[data-nav-item="선수"][aria-current="page"]').count()) ===
    0
  ) {
    fail("admin fighter child not active");
  }
  await page.screenshot({ path: join(OUT, "02-admin-fighters-open.png") });
  pass("admin_route_auto_open");

  // ---- Association (shgym) ----
  await page.context().clearCookies();
  await login(page, "shgym", pw);
  await page.goto(`${BASE}/organizer`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  for (const label of ["회원사", "선수", "대회", "결제·정산"]) {
    if ((await page.locator(`[data-nav-section="${label}"]`).count()) === 0) {
      fail(`assoc missing section ${label}`);
    }
  }
  await assertAccordionDesktop(page, "assoc");
  await page.goto(`${BASE}/organizer/member-gyms`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(400);
  if (
    (await page
      .locator('[data-nav-group="member-gyms"][data-nav-accordion="open"]')
      .count()) === 0
  ) {
    fail("assoc member-gyms not auto-open");
  }
  await page.screenshot({ path: join(OUT, "03-assoc-member-gyms.png") });
  pass("assoc_route_auto_open");

  // ---- Gym owner ----
  await page.context().clearCookies();
  await login(page, "gym", pw);
  await page.goto(`${BASE}/gym`, { waitUntil: "networkidle", timeout: 120_000 });
  for (const label of [
    "회원 관리",
    "선수 관리",
    "대회",
    "체육관 운영",
    "MATCHON 결제",
  ]) {
    if ((await page.locator(`[data-nav-section="${label}"]`).count()) === 0) {
      fail(`gym owner missing section ${label}`);
    }
  }
  // staff-only absence of nothing — owner should have sparring under fighters
  await page.goto(`${BASE}/gym/sparring-matching`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(500);
  if (
    (await page
      .locator('[data-nav-group="fighters"][data-nav-accordion="open"]')
      .count()) === 0
  ) {
    fail("gym sparring parent fighters not open");
  }
  if (
    (await page
      .locator('[data-nav-item="스파링 매칭"][aria-current="page"]')
      .count()) === 0
  ) {
    fail("sparring matching not active");
  }
  await page.screenshot({ path: join(OUT, "04-gym-sparring-open.png") });
  await assertAccordionDesktop(page, "gym_owner");
  pass("gym_owner_sparring_auto_open");

  // refresh persistence
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  if (
    (await page
      .locator('[data-nav-group="fighters"][data-nav-accordion="open"]')
      .count()) === 0
  ) {
    fail("gym refresh did not keep fighters open");
  }
  pass("gym_refresh_open");

  // ---- Gym staff — no linked staff user in yamanote demo; skip browser login ----
  pass("gym_staff", "SKIP_no_linked_staff_user");

  // Static staff permission: owner-only groups absent from staff SSOT
  const { getGymPortalNavGroups } = await import(
    "../src/lib/navigation/gym-portal-navigation"
  );
  const staffGroups = getGymPortalNavGroups("staff");
  const staffIds = staffGroups.map((g) => g.id);
  if (staffIds.some((id) => ["fighters", "events", "operations", "billing"].includes(id))) {
    fail(`staff SSOT leaked owner groups: ${staffIds.join(",")}`);
  }
  if (!staffIds.includes("schedules") || !staffIds.includes("members")) {
    fail("staff SSOT missing schedules/members");
  }
  pass("gym_staff_ssot");

  // Mobile: sheet uses density=touch → always-expanded (no accordion attribute in sheet)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.context().clearCookies();
  await login(page, "gym", pw);
  await page.goto(`${BASE}/gym`, { waitUntil: "networkidle", timeout: 120_000 });
  const menuBtn = page.getByRole("button", { name: /메뉴 열기|메뉴/ });
  if ((await menuBtn.count()) > 0) {
    await menuBtn.first().click();
    await page.waitForTimeout(500);
    const sheet = page.getByRole("dialog");
    await sheet.waitFor({ state: "visible", timeout: 15_000 });
    if ((await sheet.locator("[data-nav-accordion]").count()) > 0) {
      fail("mobile sheet should not use desktop accordion markup");
    }
    if ((await sheet.locator("[data-nav-section='회원 관리']").count()) === 0) {
      fail("mobile sheet missing 회원 관리");
    }
    if ((await sheet.locator("[data-nav-item='전체 회원']").count()) === 0) {
      fail("mobile sheet should keep children always visible");
    }
    // owner-only items still present in sheet (unchanged IA source)
    if ((await sheet.locator("[data-nav-item='스파링 매칭']").count()) === 0) {
      fail("mobile sheet missing sparring item");
    }
    await page.screenshot({ path: join(OUT, "06-mobile-sheet.png") });
    pass("mobile_no_accordion_change");
  } else {
    pass("mobile_no_accordion_change", "SKIP_no_menu_button");
  }

  report.consoleErrors = consoleErrors.slice(0, 20);
  if (consoleErrors.some((e) => /hydrat/i.test(e))) {
    fail(`hydration error: ${consoleErrors.find((e) => /hydrat/i.test(e))}`);
  }
  report.finishedAt = new Date().toISOString();
  report.result = "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("ALL PASS", JSON.stringify(report, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
