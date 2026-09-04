/**
 * Production smoke after Figma PDF promote.
 *   npx tsx scripts/e2e-bracket-pdf-border-prod-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
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

const BASE =
  process.env.QA_BASE_URL || "https://app-production-79ad.up.railway.app";
const OUT = join(process.cwd(), "test-results", "bracket-pdf-border-prod");
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "shgym";
mkdirSync(OUT, { recursive: true });

function fail(msg: string): never {
  console.error("FAIL:", msg);
  process.exit(1);
}

const app = JSON.parse(
  execSync("railway variable list -e production -s app --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const pw = String(app.DEMO_PASSWORD || "");
if (!pw) fail("DEMO_PASSWORD missing");

const pg = JSON.parse(
  execSync("railway variable list -e production -s Postgres --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
if (!/yamabiko/i.test(dbUrl)) fail("expected Production yamabiko DB");
process.env.DATABASE_URL = dbUrl;

const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");
const { PrismaClient } = await import("../src/generated/prisma");
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const orgUser = await prisma.user.findFirst({
  where: { loginId: ORG_LOGIN },
  include: { organizer: true },
});
if (!orgUser?.organizer) fail(`organizer ${ORG_LOGIN} missing`);

const event = await prisma.event.findFirst({
  where: {
    organizerId: orgUser.organizer.id,
    brackets: { some: { matches: { some: {} } } },
  },
  orderBy: { updatedAt: "desc" },
  select: { id: true, title: true },
});
if (!event) fail("no event with matches");

const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
const page = await browser.newPage({ viewport: { width: 900, height: 1280 } });
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${BASE}/login`, {
  waitUntil: "domcontentloaded",
  timeout: 90_000,
});
await page
  .locator('input[name="identifier"], #login-identifier, input[name="loginId"]')
  .first()
  .fill(ORG_LOGIN);
await page.locator('input[name="password"], input[type="password"]').first().fill(pw);
await page.getByRole("button", { name: /로그인/i }).click();
await page.waitForTimeout(3500);
if (page.url().includes("/login")) fail("login failed");

await page.goto(
  `${BASE}/organizer/events/${event.id}/brackets/print?mode=all-matches`,
  { waitUntil: "networkidle", timeout: 180_000 },
);
await page.evaluate(async () => {
  await document.fonts.ready;
});

const metrics = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll(".ops-print-row"));
  const first = rows[0] as HTMLElement | undefined;
  if (!first) return { ok: false as const };
  const kids = Array.from(first.children);
  const heights = rows
    .slice(0, 9)
    .map((r) => Math.round(r.getBoundingClientRect().height));
  return {
    ok: true as const,
    childCount: kids.length,
    nested: !!first.querySelector(".ops-print-fighters"),
    uniqueH: [...new Set(heights)],
    rowH: Math.round(first.getBoundingClientRect().height),
    borderBottom: getComputedStyle(first).borderBottom,
    red: getComputedStyle(first.querySelector(".ops-print-corner-red")!)
      .backgroundColor,
    blue: getComputedStyle(first.querySelector(".ops-print-corner-blue")!)
      .backgroundColor,
    font: getComputedStyle(
      first.querySelector(".ops-print-name, .ops-print-match-no")!,
    ).fontFamily,
  };
});

await page.screenshot({ path: join(OUT, "01-print-page1.png"), fullPage: false });

const pdfRes = await page.request.get(
  `${BASE}/api/organizer/events/${event.id}/brackets/print-pdf?mode=all-matches`,
);
const pdfOk = pdfRes.ok();
const pdfBuf = pdfOk ? Buffer.from(await pdfRes.body()) : null;
if (pdfBuf) writeFileSync(join(OUT, "bracket-print.pdf"), pdfBuf);

await browser.close();
await prisma.$disconnect();
await pool.end();

const pass =
  metrics.ok &&
  metrics.childCount === 4 &&
  !metrics.nested &&
  metrics.uniqueH.length === 1 &&
  Math.abs(metrics.rowH - 78) <= 2 &&
  pdfOk &&
  (pdfBuf?.length ?? 0) > 50_000 &&
  errors.length === 0;

const report = {
  base: BASE,
  servingExpected: "9d9e666",
  eventId: event.id,
  eventTitle: event.title,
  metrics,
  pdf: { ok: pdfOk, bytes: pdfBuf?.length ?? 0 },
  errors,
  pass,
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!pass) fail("Production PDF Figma structure smoke failed");
console.log("PASS Production PDF Figma structure smoke");
