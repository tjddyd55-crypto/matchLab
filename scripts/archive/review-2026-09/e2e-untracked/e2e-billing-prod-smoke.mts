/**
 * Production billing smoke (read-only UI checks).
 *   npx tsx scripts/e2e-billing-prod-smoke.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const OUT = join(process.cwd(), "test-results", "billing-prod-smoke");

function prodVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0b2a6288-f6c4-445e-b898-0bbb22acaffa --service d9575ee0-a2e2-46c2-9221-b16ea4b8df96 --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function login(page: Page, base: string, password: string) {
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("아이디").fill("admin");
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), {
    timeout: 45_000,
  });
}

async function checkAdminBilling(page: Page, base: string, label: string) {
  const paths = [
    "/admin/billing/plans",
    "/admin/billing/coupons",
    "/admin/billing/subscriptions",
    "/admin/billing/payments",
    "/admin/billing/settings",
  ];
  for (const p of paths) {
    await page.goto(`${base}${p}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    if (page.url().includes("/login")) throw new Error(`${p} redirected to login`);
  }
  await page.goto(`${base}/admin/billing/settings`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByText("결제 연동 상태").waitFor({ timeout: 20_000 });
  await page.getByText("TEST Client").waitFor();
  // LIVE must remain inactive for production; TEST keys may be stored.
  await page.getByText("비활성").first().waitFor();
  const body = await page.locator("body").innerText();
  if (/LIVE\s*활성|environment\s*[:=]\s*LIVE/i.test(body) && /enabled\s*[:=]\s*true/i.test(body)) {
    throw new Error("LIVE runtime appears active — abort");
  }

  const scrollW = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  const clientW = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  if (scrollW > clientW + 2) {
    throw new Error(`${label}: horizontal scroll`);
  }

  mkdirSync(OUT, { recursive: true });
  await page.screenshot({
    path: join(OUT, `${label}-settings.png`),
    fullPage: true,
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const vars = prodVars();
  const base = String(vars.NEXT_PUBLIC_APP_URL || "https://app-production-79ad.up.railway.app").replace(/\/$/, "");
  const password = String(vars.DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing");

  const version = await fetch(`${base}/api/desktop/version`).then((r) =>
    r.json(),
  );
  const report: Record<string, unknown> = {
    base,
    serving: version,
    startedAt: new Date().toISOString(),
  };

  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const serverErrors: string[] = [];
  try {
    for (const viewport of [
      { w: 1440, h: 900, label: "desktop-1440" },
      { w: 390, h: 844, label: "mobile-390" },
    ]) {
      const page = await browser.newPage({
        viewport: { width: viewport.w, height: viewport.h },
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(String(err)));
      page.on("response", (resp) => {
        if (resp.status() >= 500) {
          serverErrors.push(`${resp.status()} ${resp.url()}`);
        }
      });

      await login(page, base, password);
      await checkAdminBilling(page, base, viewport.label);
      await page.close();
    }

    // public-config must not expose secret
    const cfg = await fetch(`${base}/api/billing/public-config`).then((r) =>
      r.json(),
    );
    report.publicConfig = cfg;
    const cfgText = JSON.stringify(cfg);
    if (/secret|billingKey|cipher/i.test(cfgText)) {
      throw new Error("public-config leaked sensitive field");
    }

    report.consoleErrors = consoleErrors;
    report.serverErrors = serverErrors;
    report.pass =
      consoleErrors.length === 0 &&
      !serverErrors.some((u) => /\/admin\/billing\//.test(u));
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    if (serverErrors.some((u) => /\/admin\/billing\//.test(u))) {
      throw new Error(`billing page 500: ${serverErrors.join("; ")}`);
    }
    console.log("billing-prod-smoke OK", report);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("billing-prod-smoke FAIL", e);
  process.exit(1);
});
