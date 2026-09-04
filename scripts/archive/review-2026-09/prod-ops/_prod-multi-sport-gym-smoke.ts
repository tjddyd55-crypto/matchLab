/**
 * Retry gym READ smoke for theone only.
 */
import { execSync } from "node:child_process";
import { chromium } from "@playwright/test";

const PROD_PROJECT = "1a6aa80d-0580-4777-9dad-e3f7b1002d21";
const PROD_ENV = "0b2a6288-f6c4-445e-b898-0bbb22acaffa";
const PROD_APP = "d9575ee0-a2e2-46c2-9221-b16ea4b8df96";
const BASE = "https://app-production-79ad.up.railway.app";

function railwayAppVars() {
  const raw = execSync(
    `railway variables --project ${PROD_PROJECT} --environment ${PROD_ENV} --service ${PROD_APP} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function main() {
  const password = String(railwayAppVars().DEMO_PASSWORD || "");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.locator("#login-identifier, input[name=\"identifier\"]").first().fill("theone");
  await page.locator("input[name=\"password\"], #login-password").first().fill(password);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(4000);
  const afterLogin = {
    url: page.url(),
    bodySnippet: (await page.locator("body").innerText()).slice(0, 500),
  };

  const out: Record<string, unknown> = { afterLogin };

  if (!page.url().includes("/login")) {
    for (const path of [
      "/gym/member-custom-fields",
      "/gym/members",
    ]) {
      await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      const text = await page.locator("body").innerText();
      out[path] = {
        url: page.url(),
        ok: !text.includes("Application error"),
        hasUsage: text.includes("사용 종목"),
        hasKickboxing: text.includes("킥복싱"),
        hasMemberSport: text.includes("회원 종목"),
      };
    }
  } else {
    out.loginFailed = true;
    out.note =
      "theone login did not leave /login with DEMO_PASSWORD — gym UI smoke skipped (no mutation)";
  }

  out.console = {
    errorCount: consoleErrors.length,
    hydrationOr418: consoleErrors.filter((e) => /hydrat|#418/i.test(e)).length,
  };
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
