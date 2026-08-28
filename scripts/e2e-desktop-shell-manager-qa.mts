/**
 * Windows Electron Manager — shell / billing / titlebar QA (Development localhost).
 *
 *   npx tsx scripts/e2e-desktop-shell-manager-qa.mts
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";

const ROOT = process.cwd();
const DESKTOP = join(ROOT, "desktop");
const OUT = join(ROOT, "test-results", "desktop-shell-manager-qa");
const PORT = Number(process.env.PORT || 3000);
const BASE = process.env.MATCHON_DESKTOP_BASE_URL?.trim() || `http://localhost:${PORT}`;
const CDP_PORT = Number(process.env.MATCHON_ELECTRON_CDP_PORT || 9333);
const PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";
const ORG_LOGIN = process.env.MATCHON_DESKTOP_QA_ORG_LOGIN ?? "organizer";

mkdirSync(OUT, { recursive: true });

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };
const steps: Step[] = [];
const report: Record<string, unknown> = { base: BASE, steps };

function pass(name: string, detail?: string) {
  steps.push({ name, status: "PASS", detail });
  console.log(`PASS ${name}${detail ? `: ${detail}` : ""}`);
}

function fail(name: string, detail?: string): never {
  steps.push({ name, status: "FAIL", detail });
  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify({ ...report, steps, result: "FAIL" }, null, 2),
  );
  console.error(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
  process.exit(1);
}

function skip(name: string, detail?: string) {
  steps.push({ name, status: "SKIP", detail });
  console.log(`SKIP ${name}${detail ? `: ${detail}` : ""}`);
}

async function canListen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.once("listening", () => s.close(() => resolve(true)));
    s.listen(port, "127.0.0.1");
  });
}

async function waitForUrl(url: string, ms: number) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status > 0) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`timeout: ${url}`);
}

let nextProc: ChildProcess | null = null;
let electronProc: ChildProcess | null = null;

function shutdown() {
  if (electronProc && !electronProc.killed) electronProc.kill();
  if (nextProc && !nextProc.killed) nextProc.kill();
}

process.on("SIGINT", shutdown);
process.on("exit", shutdown);

async function startNextIfNeeded() {
  try {
    await waitForUrl(`${BASE}/desktop`, 5_000);
    pass("next reuse", BASE);
    return;
  } catch {
    /* start below */
  }
  if (!(await canListen(PORT))) {
    fail("next unavailable", `cannot reach ${BASE} and port ${PORT} busy`);
  }
  nextProc = spawn("npm run dev -- -p " + String(PORT), {
    cwd: ROOT,
    stdio: "pipe",
    env: process.env,
    shell: true,
  });
  await waitForUrl(`${BASE}/desktop`, 120_000);
  pass("next started", `:${PORT}`);
}

async function launchElectron(): Promise<Browser> {
  const require = createRequire(join(DESKTOP, "package.json"));
  const electronBin = require("electron") as string;
  electronProc = spawn(electronBin, [".", `--remote-debugging-port=${CDP_PORT}`], {
    cwd: DESKTOP,
    stdio: "pipe",
    env: { ...process.env, MATCHON_DESKTOP_BASE_URL: BASE },
  });

  electronProc.stderr?.on("data", (buf: Buffer) => {
    const line = buf.toString();
    if (/error|Error|IPC/i.test(line)) {
      report.electronStderr = String(report.electronStderr ?? "") + line;
    }
  });

  const t0 = Date.now();
  while (Date.now() - t0 < 60_000) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) break;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP_PORT}`);
  pass("electron launch", `CDP :${CDP_PORT}`);
  return browser;
}

async function loginOrganizer(page: Page) {
  await page.goto(`${BASE}/desktop/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.fill('input[name="identifier"]', ORG_LOGIN);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/organizer(\/|$)/, { timeout: 60_000 });
  pass("organizer login", ORG_LOGIN);
}

async function main() {
  await startNextIfNeeded();

  await new Promise<void>((resolve, reject) => {
    const build = spawn("npm run build", {
      cwd: DESKTOP,
      stdio: "inherit",
      shell: true,
    });
    build.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`desktop build ${code}`)),
    );
  });
  pass("desktop build");

  const browser = await launchElectron();
  const ctx = browser.contexts()[0] ?? (await browser.newContext());
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  page.on("pageerror", (err) => {
    report.pageerrors = [...((report.pageerrors as string[]) ?? []), err.message];
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors = [...((report.consoleErrors as string[]) ?? []), msg.text()];
    }
  });

  await page.goto(`${BASE}/desktop`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const titleBar = page.locator("[data-desktop-manager-titlebar]");
  await titleBar.waitFor({ state: "visible", timeout: 30_000 });
  const titleText = await titleBar.innerText();
  if (!titleText.includes("뒤로") || !titleText.includes("MATCHON Manager")) {
    fail("title bar visible", titleText);
  }
  pass("title bar visible", titleText.replace(/\s+/g, " ").trim());

  const bridge = await page.evaluate(async () => {
    const b = window.matchonDesktop;
    if (!b) return null;
    const [mode, version] = await Promise.all([
      b.getTitleBarMode?.(),
      b.getAppVersion?.(),
    ]);
    return { mode, version, isDesktop: b.isDesktopApp?.() };
  });
  if (!bridge?.isDesktop) fail("matchonDesktop bridge");
  if (bridge.mode !== "overlay") fail("titlebar mode", String(bridge.mode));
  if (!bridge.version) fail("version SSOT");
  pass("titlebar overlay + version", `v${bridge.version}`);

  await loginOrganizer(page);

  const homeBottom = await page.evaluate(() => {
    const viewport = document.querySelector(
      "[data-desktop-app-viewport]",
    ) as HTMLElement | null;
    const shell = document.querySelector(
      ".desktop-app-shell-root",
    ) as HTMLElement | null;
    if (!viewport || !shell) return { ok: false, reason: "missing nodes" };
    const v = viewport.getBoundingClientRect();
    const s = shell.getBoundingClientRect();
    return { ok: s.height >= v.height - 80, shellHeight: s.height, viewportHeight: v.height };
  });
  if (!homeBottom.ok) fail("organizer home shell fill", JSON.stringify(homeBottom));
  pass("organizer home bottom fill", `shell=${homeBottom.shellHeight}px`);

  await page.goto(`${BASE}/organizer/events`, { waitUntil: "domcontentloaded" });
  const eventLink = page.locator('a[href*="/organizer/events/"]').first();
  if (await eventLink.count()) {
    const detailHref = await eventLink.getAttribute("href");
    await eventLink.click();
    await page.waitForTimeout(1200);
    await page.click('[data-desktop-manager-titlebar] button[aria-label="뒤로"]');
    await page.waitForTimeout(800);
    if (detailHref && page.url().includes(detailHref)) fail("back history");
    pass("back history");
  } else {
    skip("back history", "no events");
  }

  await page.goto(`${BASE}/organizer/billing/account`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("heading", { name: "이용권 / 결제관리" }).waitFor({ timeout: 30_000 });
  if (!(await page.locator("aside").first().isVisible())) fail("billing sidebar");
  pass("billing organizer shell");

  const legacy = await fetch(`${BASE}/billing/account`, { redirect: "manual" });
  const loc = legacy.headers.get("location") ?? "";
  if (legacy.status === 307 || legacy.status === 308) {
    if (loc.includes("/login")) {
      skip("legacy billing redirect", "unauthenticated fetch → login (session in Electron only)");
    } else if (!loc.includes("/organizer/billing/account")) {
      fail("legacy redirect", loc);
    } else {
      pass("legacy billing redirect", loc);
    }
  } else {
    skip("legacy billing redirect", `status=${legacy.status}`);
  }

  const previewHtml = await fetch(
    "https://app-preview-member-gym-b.up.railway.app/login",
  ).then((r) => r.text());
  if (previewHtml.includes("data-desktop-manager-titlebar")) {
    fail("browser title bar on preview");
  }
  pass("browser title bar not on preview");

  await page.setViewportSize({ width: 1100, height: 700 });
  await page.waitForTimeout(400);
  const narrow = await page.evaluate(() => {
    const canvas = document.querySelector(
      "[data-desktop-app-canvas]",
    ) as HTMLElement | null;
    return canvas?.scrollWidth ?? 0;
  });
  if (narrow < 1440) fail("fixed canvas 1100", String(narrow));
  pass("fixed canvas 1100", `canvas=${narrow}`);

  await page.setViewportSize({ width: 900, height: 600 });
  await page.waitForTimeout(400);
  const narrow900 = await page.evaluate(() => {
    const canvas = document.querySelector(
      "[data-desktop-app-canvas]",
    ) as HTMLElement | null;
    return canvas?.scrollWidth ?? 0;
  });
  if (narrow900 < 1440) fail("fixed canvas 900", String(narrow900));
  pass("fixed canvas 900", `canvas=${narrow900}`);

  const backNone = await page.evaluate(async () => {
    return window.matchonDesktop?.navigateBack?.();
  });
  if (backNone?.action === "back") {
    skip("no-history fallback", "had history");
  } else {
    await page.click('[data-desktop-manager-titlebar] button[aria-label="뒤로"]');
    await page.waitForTimeout(800);
    if (!page.url().includes("/organizer")) fail("no-history fallback", page.url());
    pass("no-history fallback", "/organizer");
  }

  if (report.pageerrors && (report.pageerrors as string[]).length) {
    fail("pageerror", (report.pageerrors as string[]).join("; "));
  }

  await page.screenshot({ path: join(OUT, "final-900.png"), fullPage: true });
  writeFileSync(
    join(OUT, "report.json"),
    JSON.stringify(
      { ...report, steps, result: "DESKTOP_SHELL_MANAGER_QA_PASS" },
      null,
      2,
    ),
  );
  console.log("\nDESKTOP_SHELL_MANAGER_QA_PASS");
  await browser.close();
  shutdown();
}

main().catch((err) => {
  console.error(err);
  shutdown();
  process.exit(1);
});
