/**
 * Production READ smoke after default sport template seed.
 * No gym assignment / member mutations.
 */
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_APP = "d9575ee0-a2e2-46c2-9221-b16ea4b8df96";
const BASE = "https://app-production-79ad.up.railway.app";

function appVars() {
  const raw = execSync(
    `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${PROD_APP} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  const password = String(appVars().DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  const out: Record<string, unknown> = {};

  // Signup
  await page.goto(`${BASE}/join/gym`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const signup = await page.locator("body").innerText();
  const forbiddenInternal = [
    "킥복싱 기본 회원정보",
    "복싱 기본 회원정보",
    "태권도 기본 회원정보",
    "MMA 기본 회원정보",
    "KICKBOXING",
    "BOXING",
    "TAEKWONDO",
  ].filter((s) => signup.includes(s));
  out.signup = {
    url: page.url(),
    ok: !signup.includes("Application error"),
    hasKickboxing: signup.includes("킥복싱"),
    hasBoxing: signup.includes("복싱"),
    hasTaekwondo: signup.includes("태권도"),
    hasMma: /\bMMA\b/.test(signup) || signup.includes("MMA"),
    forbiddenInternal,
  };

  // Admin
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .locator('#login-identifier, input[name="identifier"]')
    .first()
    .fill("admin");
  await page
    .locator('input[name="password"], #login-password')
    .first()
    .fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), {
    timeout: 90000,
  });

  await page.goto(`${BASE}/admin/member-sport-templates`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const adminText = await page.locator("body").innerText();
  out.admin = {
    url: page.url(),
    ok:
      !adminText.includes("Application error") &&
      page.url().includes("/admin/member-sport-templates"),
    hasKickboxingDisplay: adminText.includes("킥복싱"),
    hasBoxingDisplay: adminText.includes("복싱"),
    hasTaekwondoDisplay: adminText.includes("태권도"),
    hasMmaDisplay: adminText.includes("MMA"),
    hasKickboxingTemplateName: adminText.includes("킥복싱 기본 회원정보"),
    hasBoxingTemplateName: adminText.includes("복싱 기본 회원정보"),
  };

  // Textarea height in builder
  await page.goto(
    `${BASE}/admin/member-sport-templates/cmskickboxingtpl001`,
    { waitUntil: "domcontentloaded", timeout: 60000 },
  );
  const textarea = page.locator("textarea").first();
  let textareaMetrics: Record<string, unknown> = { found: false };
  if (await textarea.count()) {
    const box = await textarea.boundingBox();
    const rows = await textarea.getAttribute("rows");
    textareaMetrics = {
      found: true,
      rows,
      height: box?.height ?? null,
      heightOk: (box?.height ?? 0) >= 72,
    };
  }
  out.textarea = textareaMetrics;

  // Gym login attempt (read-only); may fail if password differs
  await page.context().clearCookies();
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page
    .locator('#login-identifier, input[name="identifier"]')
    .first()
    .fill("theone");
  await page
    .locator('input[name="password"], #login-password')
    .first()
    .fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3500);
  if (!page.url().includes("/login")) {
    await page.goto(`${BASE}/gym/member-custom-fields`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const gymText = await page.locator("body").innerText();
    out.gymSettings = {
      ok: !gymText.includes("Application error"),
      hasKickboxing: gymText.includes("킥복싱"),
      hasBoxing: gymText.includes("복싱"),
      hasTaekwondo: gymText.includes("태권도"),
      hasMma: gymText.includes("MMA"),
      hasInternalTemplateName: gymText.includes("기본 회원정보"),
    };
  } else {
    out.gymSettings = {
      skipped: true,
      reason: "theone login failed with DEMO_PASSWORD",
    };
  }

  out.console = {
    errorCount: consoleErrors.length,
    hydrationOr418: consoleErrors.filter((e) => /hydrat|#418/i.test(e))
      .length,
    sample: consoleErrors.slice(0, 5),
  };

  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
