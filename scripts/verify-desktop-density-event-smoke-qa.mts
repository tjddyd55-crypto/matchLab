/**
 * Organizer event-shell density supplemental smoke.
 * npx tsx scripts/verify-desktop-density-event-smoke-qa.mts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.MATCHON_BASE_URL?.trim() || "http://127.0.0.1:3000";
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const EVENT_ID = process.env.MATCHON_EVENT_ID ?? "cmpba6v1l000eqcux4kfmg49y";
const OUT = join(process.cwd(), "test-results", "desktop-density-event-smoke");
mkdirSync(OUT, { recursive: true });

const paths = [
  `/organizer/events/${EVENT_ID}`,
  `/organizer/events/${EVENT_ID}/applications`,
  `/organizer/events/${EVENT_ID}/brackets`,
  `/organizer/events/${EVENT_ID}/check-in`,
  `/organizer/events/${EVENT_ID}/field-status`,
  `/organizer/events/${EVENT_ID}/results`,
  `/organizer/events/${EVENT_ID}/operation`,
  `/organizer/events/${EVENT_ID}/schedule`,
  `/organizer/events/${EVENT_ID}/matches`,
];

const steps: { name: string; status: string; detail?: string }[] = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="loginId"], input[type="text"]').first().fill("organizer");
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 45_000 });

  for (const path of paths) {
    await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const el =
        Array.from(document.querySelectorAll("div")).find((n) =>
          String(n.className).includes("px-[var(--dashboard-content-padding-x)]"),
        ) || document.querySelector("main");
      const rect = el!.getBoundingClientRect();
      return {
        left: Math.round(rect.left),
        right: Math.round(window.innerWidth - rect.right),
        width: Math.round(rect.width),
        pad: getComputedStyle(el!).paddingLeft,
        overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
        title: document.title,
      };
    });
    const ok = m.overflow <= 2 && m.pad === "20px";
    steps.push({
      name: path,
      status: ok ? "PASS" : "FAIL",
      detail: `L=${m.left} R=${m.right} W=${m.width} pad=${m.pad} overflow=${m.overflow}`,
    });
    console.log(`${ok ? "PASS" : "FAIL"} ${path}: ${steps.at(-1)!.detail}`);
  }

  // mobile regression on check-in
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/check-in`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(400);
  const mobilePad = await page.evaluate(() => {
    const el =
      Array.from(document.querySelectorAll("div")).find((n) =>
        String(n.className).includes("px-[var(--dashboard-content-padding-x)]"),
      ) || document.querySelector("main");
    return el ? getComputedStyle(el).paddingLeft : null;
  });
  steps.push({
    name: "mobile check-in pad",
    status: mobilePad === "16px" || mobilePad === "20px" ? "PASS" : "FAIL",
    detail: String(mobilePad),
  });
  console.log(`${steps.at(-1)!.status} mobile pad: ${mobilePad}`);

  const failed = steps.filter((s) => s.status === "FAIL").length;
  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify({ result: failed ? "FAIL" : "PASS", steps }, null, 2),
  );
  await browser.close();
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
