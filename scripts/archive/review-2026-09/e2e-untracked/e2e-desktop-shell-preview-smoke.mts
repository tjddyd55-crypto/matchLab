/**
 * Preview web smoke — desktop shell / billing (no Desktop title bar on browser).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.PREVIEW_BASE_URL ?? "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "desktop-shell-preview-smoke");
mkdirSync(OUT, { recursive: true });

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };
const steps: Step[] = [];

function pass(name: string, detail?: string) {
  steps.push({ name, status: "PASS", detail });
  console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name: string, detail?: string): never {
  steps.push({ name, status: "FAIL", detail });
  writeFileSync(join(OUT, "report.json"), JSON.stringify({ steps, result: "FAIL" }, null, 2));
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  process.exit(1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const routes = ["/login", "/organizer", "/gym", "/organizer/billing/account", "/gym/billing/account"];
  for (const r of routes) {
    const res = await page.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const status = res?.status() ?? 0;
    if (status >= 500) fail(`${r} status`, String(status));
    pass(`${r} status`, String(status));
  }

  const html = await page.content();
  if (html.includes("data-desktop-manager-titlebar")) fail("titlebar on preview web");
  pass("titlebar hidden on web");

  for (const width of [1440, 1100, 900]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    const canvasW = await page.evaluate(() => {
      const el = document.querySelector("[data-desktop-app-canvas]") as HTMLElement | null;
      return el?.scrollWidth ?? 0;
    });
    if (width >= 1440 && canvasW > 0 && canvasW < 1440) fail(`canvas width ${width}`, String(canvasW));
    pass(`viewport ${width}`, canvasW ? `canvas=${canvasW}` : "no desktop canvas (expected on web)");
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify({ base: BASE, steps, result: "PASS" }, null, 2));
  await browser.close();
  console.log("PREVIEW_WEB_SMOKE_PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
