/**
 * Preview visual QA: continuous borders + Figma row structure after PDF fix.
 *   npx tsx scripts/e2e-bracket-pdf-border-preview-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const OUT = join(process.cwd(), "test-results", "bracket-pdf-border-fix");
mkdirSync(OUT, { recursive: true });

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

const app = JSON.parse(
  execSync("railway variable list -e development -s app --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const BASE =
  process.env.QA_BASE_URL ||
  String(app.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
const pw = String(app.DEMO_PASSWORD || "");
if (!BASE) fail("BASE URL missing");
if (!pw) fail("DEMO_PASSWORD missing");

const pg = JSON.parse(
  execSync("railway variable list -e development -s Postgres --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
if (!dbUrl || !/yamanote/i.test(dbUrl)) fail("expected Development yamanote DB");
process.env.DATABASE_URL = dbUrl;

const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");
const { PrismaClient } = await import("../src/generated/prisma");
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ORG_LOGIN = process.env.QA_ORG_LOGIN || "organizer";
const orgUser = await prisma.user.findFirst({
  where: { loginId: ORG_LOGIN },
  include: { organizer: true },
});
console.log("orgUser", orgUser?.id, orgUser?.role, orgUser?.organizer?.id);
if (!orgUser?.organizer) fail(`organizer ${ORG_LOGIN} missing`);

const eventIdOverride = process.env.QA_EVENT_ID;
const event = eventIdOverride
  ? await prisma.event.findUnique({
      where: { id: eventIdOverride },
      select: { id: true, title: true },
    })
  : await prisma.event.findFirst({
      where: {
        organizerId: orgUser.organizer.id,
        brackets: { some: { matches: { some: {} } } },
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true },
    });
console.log("event", event);
if (!event) fail("no event with matches");

const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
const page = await browser.newPage({ viewport: { width: 900, height: 1280 } });
page.on("pageerror", (e) => errors.push(`pageerror:${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console:${msg.text()}`);
});

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page
  .locator('input[name="identifier"], #login-identifier, input[name="loginId"]')
  .first()
  .fill(ORG_LOGIN);
await page.locator('input[name="password"], input[type="password"]').first().fill(pw);
await page.getByRole("button", { name: /로그인/i }).click();
await page.waitForTimeout(3500);
if (page.url().includes("/login")) fail("login failed");

const printUrl = `${BASE}/organizer/events/${event.id}/brackets/print?mode=all-matches`;
await page.goto(printUrl, { waitUntil: "networkidle", timeout: 180_000 });
await page.evaluate(async () => {
  await document.fonts.ready;
});
await page.waitForTimeout(500);

const metrics = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll(".ops-print-row"));
  const list = document.querySelector(".ops-print-list");
  const first = rows[0] as HTMLElement | undefined;
  if (!first || !list) {
    return { ok: false as const, reason: "missing row/list" };
  }

  const rowCs = getComputedStyle(first);
  const listCs = getComputedStyle(list);
  const kids = Array.from(first.children) as HTMLElement[];
  const heights = rows.slice(0, 9).map((r) => Math.round(r.getBoundingClientRect().height));
  const uniqueH = [...new Set(heights)];

  // Sample bottom border pixels across first row width (canvas from element)
  const rect = first.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(rect.width);
  canvas.height = Math.ceil(rect.height);
  // Use DOM geometry only — border continuity via CSS ownership
  const grid = rowCs.gridTemplateColumns;
  const hasFightersNest = !!first.querySelector(".ops-print-fighters");

  // Check each cell stretches full row height
  const cellHeights = kids.map((c) => Math.round(c.getBoundingClientRect().height));
  const rowH = Math.round(rect.height);

  // Applied font
  const sample = first.querySelector(".ops-print-name, .ops-print-match-no");
  const fontFamily = sample ? getComputedStyle(sample).fontFamily : "";

  return {
    ok: true as const,
    rowCount: rows.length,
    firstPageRows: Math.min(9, rows.length),
    uniqueHeights: uniqueH,
    rowHeight: rowH,
    cellHeights,
    cellsStretch: cellHeights.every((h) => Math.abs(h - rowH) <= 1),
    childCount: kids.length,
    hasFightersNest,
    grid,
    listBorder: listCs.border,
    rowBorderBottom: rowCs.borderBottom,
    rowBorderTop: rowCs.borderTopWidth,
    fontFamily,
    redBg: getComputedStyle(first.querySelector(".ops-print-corner-red")!).backgroundColor,
    blueBg: getComputedStyle(first.querySelector(".ops-print-corner-blue")!).backgroundColor,
    hasTransform: rowCs.transform !== "none",
    pageSheets: document.querySelectorAll(".ops-print-page-sheet").length,
  };
});

await page.screenshot({
  path: join(OUT, "01-print-page1.png"),
  fullPage: false,
});

// Page 2 if exists
const page2 = page.locator(".ops-print-page-sheet").nth(1);
if ((await page2.count()) > 0) {
  await page2.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, "02-print-page2.png"), fullPage: false });
}

// Download PDF and screenshot via print media PDF render locally from same HTML is enough;
// also fetch PDF bytes
const pdfRes = await page.request.get(
  `${BASE}/api/organizer/events/${event.id}/brackets/print-pdf?mode=all-matches`,
);
const pdfOk = pdfRes.ok();
const pdfBuf = pdfOk ? Buffer.from(await pdfRes.body()) : null;
if (pdfBuf) writeFileSync(join(OUT, "bracket-print.pdf"), pdfBuf);

// Font check after emulate print
await page.emulateMedia({ media: "print" });
await page.evaluate(async () => {
  await document.fonts.ready;
});
const printFont = await page.evaluate(() => {
  const el = document.querySelector(".ops-print-name, .ops-print-match-no");
  return el ? getComputedStyle(el).fontFamily : "";
});

await page.screenshot({
  path: join(OUT, "03-print-media-page1.png"),
  fullPage: false,
});

const figmaSrc = join(
  process.cwd(),
  "test-results",
  "figma-bracket-pdf-ref",
  "node-11-3.png",
);
if (existsSync(figmaSrc)) {
  copyFileSync(figmaSrc, join(OUT, "figma-11-3.png"));
}

await browser.close();
await prisma.$disconnect();
await pool.end();

const pageerrors = errors.filter(
  (e) => !e.includes("favicon") && !e.includes("Failed to load resource"),
);

const pass =
  metrics.ok &&
  metrics.childCount === 4 &&
  !metrics.hasFightersNest &&
  metrics.cellsStretch &&
  metrics.uniqueHeights.length === 1 &&
  Math.abs(metrics.rowHeight - 78) <= 2 &&
  /1px/.test(metrics.rowBorderBottom) &&
  !metrics.hasTransform &&
  pdfOk &&
  (pdfBuf?.length ?? 0) > 50_000 &&
  pageerrors.length === 0;

const report = {
  base: BASE,
  eventId: event.id,
  eventTitle: event.title,
  metrics,
  printFont,
  pdf: { ok: pdfOk, bytes: pdfBuf?.length ?? 0 },
  pageerrors,
  pass,
};

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!pass) fail("Preview PDF border visual QA failed");
console.log("PASS Preview PDF border / Figma row structure QA");
