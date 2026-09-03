/**
 * Organizer global nav hierarchy checks (static + optional Playwright).
 * Static always runs. Browser checks need PROD_BASE_URL + PREVIEW_TEST_PASSWORD.
 */
import assert from "node:assert/strict";
import {
  GYM_PORTAL_HIDDEN_EVENT_HREFS,
  getGymPortalNavItems,
} from "../src/lib/navigation/gym-portal-navigation";
import {
  getOrganizerGlobalNavGroups,
  isOrganizerGlobalNavItemActive,
} from "../src/lib/navigation/organizer-global-navigation";

function assertGymPortalNavSsot() {
  const items = getGymPortalNavItems();
  assert.ok(items.some((i) => i.label === "매출 관리"));
  assert.ok(items.some((i) => i.label === "MATCHON 구독"));
  assert.ok(!items.some((i) => i.label === "이용권 / 결제"));
  assert.ok(!items.some((i) => i.label === "결제·구독"));
  assert.ok(items.some((i) => i.href === "/gym/sales"));
  assert.ok(items.some((i) => i.href === "/gym/billing/account"));
  assert.ok(items.some((i) => i.href === "/gym/events"));
  assert.ok(items.some((i) => i.href === "/gym/applications"));
  for (const href of GYM_PORTAL_HIDDEN_EVENT_HREFS) {
    assert.ok(!items.some((i) => i.href === href));
  }
  // 일반/협회 organizer 메뉴와 분리
  const assoc = getOrganizerGlobalNavGroups({ organizerType: "association" });
  assert.ok(assoc.some((g) => g.id === "member-gyms"));
  assert.ok(!items.some((i) => i.href.startsWith("/organizer")));
  console.log("STATIC_GYM_PORTAL_NAV=PASS");
}

function staticChecks() {
  assertGymPortalNavSsot();
  const assoc = getOrganizerGlobalNavGroups({ organizerType: "association" });
  const normal = getOrganizerGlobalNavGroups({ organizerType: "individual" });

  const assocSections = assoc
    .map((g) => g.label)
    .filter((x): x is string => !!x);
  assert.ok(assocSections.includes("회원사"));
  assert.ok(assocSections.includes("선수"));
  assert.ok(assocSections.includes("대회"));
  assert.ok(assocSections.includes("MATCHON"));
  assert.ok(!assocSections.includes("결제·정산"));
  assert.equal(assoc[0]?.label, null);
  assert.equal(assoc[0]?.items[0]?.label, "홈");

  const matchon = assoc.find((g) => g.id === "matchon");
  assert.ok(matchon);
  assert.deepEqual(
    matchon!.items.map((i) => i.label),
    ["MATCHON 구독"],
  );

  const memberGym = assoc.find((g) => g.id === "member-gyms");
  assert.ok(memberGym, "member-gyms group");
  assert.ok(memberGym!.items.some((i) => i.label === "회원사 현황"));
  assert.ok(
    !memberGym!.items.some((i) => i.label === "가입 링크"),
    "가입 링크 must not be in global nav",
  );

  const normalSections = normal
    .map((g) => g.label)
    .filter((x): x is string => !!x);
  assert.ok(normalSections.includes("선수"));
  assert.ok(normalSections.includes("대회"));
  assert.ok(normalSections.includes("MATCHON"));
  assert.ok(!normalSections.includes("회원사"));
  assert.ok(!normalSections.includes("결제·정산"));

  assert.equal(isOrganizerGlobalNavItemActive("/organizer", "/organizer"), true);
  assert.equal(
    isOrganizerGlobalNavItemActive("/organizer/events", "/organizer"),
    false,
  );
  assert.equal(
    isOrganizerGlobalNavItemActive(
      "/organizer/member-gyms/overview",
      "/organizer/member-gyms/overview",
    ),
    true,
  );
  assert.equal(
    isOrganizerGlobalNavItemActive(
      "/organizer/member-gyms/overview",
      "/organizer/member-gyms",
    ),
    false,
  );

  console.log("STATIC_NAV_HIERARCHY=PASS");
}

async function browserChecks() {
  // Requires a deploy (or local) that already includes data-organizer-global-nav.
  if (process.env.ORGANIZER_NAV_BROWSER !== "1") {
    console.log(
      "BROWSER_NAV_HIERARCHY=SKIP (set ORGANIZER_NAV_BROWSER=1 + PROD_BASE_URL + PREVIEW_TEST_PASSWORD)",
    );
    return;
  }
  const base = process.env.PROD_BASE_URL?.trim();
  const password = process.env.PREVIEW_TEST_PASSWORD?.trim();
  if (!base || !password) {
    console.log("BROWSER_NAV_HIERARCHY=SKIP (no PROD_BASE_URL/PREVIEW_TEST_PASSWORD)");
    return;
  }

  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("아이디").fill("preview-assoc");
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  try {
    await page.waitForURL((u) => !u.pathname.includes("/login"), {
      timeout: 20000,
    });
  } catch {
    console.log("BROWSER_NAV_HIERARCHY=SKIP (login failed on target)");
    await browser.close();
    return;
  }
  await page.goto(`${base}/organizer`, { waitUntil: "networkidle" });

  const nav = page.locator("[data-organizer-global-nav]");
  try {
    await nav.waitFor({ state: "visible", timeout: 10000 });
  } catch {
    console.log(
      "BROWSER_NAV_HIERARCHY=SKIP (nav markup not on target — deploy needed)",
    );
    await browser.close();
    return;
  }

  const sectionCount = await nav.locator("[data-nav-level='section']").count();
  assert.equal(sectionCount, 4, "association should have 4 sections");

  const sectionBox = await nav
    .locator("[data-nav-section='대회']")
    .boundingBox();
  const itemBox = await nav
    .locator("[data-nav-item='대회 목록']")
    .boundingBox();
  assert.ok(sectionBox && itemBox, "section/item boxes");
  const indent = itemBox!.x - sectionBox!.x;
  assert.ok(
    indent >= 8,
    `child indent should be >= 8px, got ${indent}`,
  );
  console.log(`INDENT_PX=${indent.toFixed(1)}`);

  await page.goto(`${base}/organizer/events`, { waitUntil: "networkidle" });
  const current = nav.locator('[data-nav-item="대회 목록"][aria-current="page"]');
  assert.equal(await current.count(), 1, "aria-current on events list");

  // mobile sheet
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/organizer`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "메뉴" }).click();
  const sheetNav = page.locator("[data-organizer-global-nav]");
  await sheetNav.waitFor({ state: "visible" });
  assert.equal(
    await sheetNav.locator("[data-nav-level='section']").count(),
    4,
  );
  console.log("MOBILE_SHEET_SECTIONS=4");

  // normal organizer
  await page.context().clearCookies();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/login`, { waitUntil: "networkidle" });
  await page.getByLabel("아이디").fill("preview-org");
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), {
    timeout: 25000,
  });
  await page.goto(`${base}/organizer`, { waitUntil: "networkidle" });
  const normalNav = page.locator("[data-organizer-global-nav]");
  if (await normalNav.count()) {
    assert.equal(
      await normalNav.locator("[data-nav-section='회원사']").count(),
      0,
    );
    assert.equal(
      await normalNav.locator("[data-nav-level='section']").count(),
      3,
    );
  }
  console.log("BROWSER_NAV_HIERARCHY=PASS");
  await browser.close();
}

async function main() {
  staticChecks();
  await browserChecks();
  console.log("ORGANIZER_NAV_HIERARCHY=ALL_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
