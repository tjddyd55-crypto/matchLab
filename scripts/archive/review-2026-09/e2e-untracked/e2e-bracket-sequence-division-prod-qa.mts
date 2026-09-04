/**
 * Production smoke: matchNumber continuity + division select + print routes.
 *   npx tsx scripts/e2e-bracket-sequence-division-prod-qa.mts
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
const OUT = join(process.cwd(), "test-results", "bracket-sequence-division-prod");
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
if (!dbUrl) fail("DATABASE_PUBLIC_URL missing");
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
  where: { loginId: ORG_LOGIN, role: "organizer" },
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

const matches = await prisma.bracketMatch.findMany({
  where: { bracket: { eventId: event.id } },
  select: {
    id: true,
    matchNumber: true,
    courtOrder: true,
    courtId: true,
  },
  orderBy: { matchNumber: "asc" },
});

const beforeNums = matches.map((m) => m.matchNumber);
const nullCount = beforeNums.filter((n) => n == null).length;
const present = beforeNums.filter((n): n is number => n != null).sort((a, b) => a - b);
const dupBefore = present.length !== new Set(present).size;
let gapBefore = false;
if (present.length > 0 && nullCount === 0) {
  for (let i = 0; i < present.length; i++) {
    if (present[i] !== i + 1) {
      gapBefore = true;
      break;
    }
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors: string[] = [];
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

// Workspace load triggers idempotent resequence if needed
const bracketsUrl = `${BASE}/organizer/events/${event.id}/brackets`;
await page.goto(bracketsUrl, { waitUntil: "networkidle", timeout: 180_000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: join(OUT, "01-brackets.png"), fullPage: true });

const bodyText = await page.locator("body").innerText();
const webNums = [...bodyText.matchAll(/(\d+)\s*경기/g)].map((m) => Number(m[1]));
const webSorted = [...new Set(webNums)].sort((a, b) => a - b);
let webGaps: Array<[number, number]> = [];
for (let i = 1; i < webSorted.length; i++) {
  if (webSorted[i]! !== webSorted[i - 1]! + 1) {
    webGaps.push([webSorted[i - 1]!, webSorted[i]!]);
  }
}

const divisionSelectCount = await page.locator('select[aria-label="경기구분"]').count();
console.log(
  divisionSelectCount > 0
    ? `PASS division select count=${divisionSelectCount}`
    : "WARN division select not visible (may need all-matches pane)",
);

// Print routes (vector HTML)
await page.goto(
  `${BASE}/organizer/events/${event.id}/brackets/print?mode=all-matches`,
  { waitUntil: "networkidle", timeout: 180_000 },
);
await page.waitForTimeout(1500);
const printText = await page.evaluate(() => document.body?.innerText ?? "");
await page.screenshot({ path: join(OUT, "02-bracket-print.png"), fullPage: true });
const printNums = [...printText.matchAll(/(\d+)\s*경기/g)].map((m) => Number(m[1]));
const printSorted = [...new Set(printNums)].sort((a, b) => a - b);

await page.goto(
  `${BASE}/organizer/events/${event.id}/brackets/unmatched-print`,
  { waitUntil: "networkidle", timeout: 180_000 },
);
await page.waitForTimeout(1500);
const unmatchedText = await page.evaluate(() => document.body?.innerText ?? "");
await page.screenshot({ path: join(OUT, "03-unmatched-print.png"), fullPage: true });
const pageMarks = [...unmatchedText.matchAll(/(\d+)\s*\/\s*(\d+)/g)].map((m) => ({
  cur: Number(m[1]),
  total: Number(m[2]),
}));
const unmatchedRows = [...unmatchedText.matchAll(/^\s*\d+\s+/gm)].length;

// Re-read DB after workspace (resequence may have written)
const after = await prisma.bracketMatch.findMany({
  where: { bracket: { eventId: event.id } },
  select: { id: true, matchNumber: true },
  orderBy: { matchNumber: "asc" },
});
const afterNums = after
  .map((m) => m.matchNumber)
  .filter((n): n is number => n != null)
  .sort((a, b) => a - b);
const dupAfter = afterNums.length !== new Set(afterNums).size;
let gapAfter = false;
for (let i = 0; i < afterNums.length; i++) {
  if (afterNums[i] !== i + 1) {
    gapAfter = true;
    break;
  }
}

await browser.close();
await prisma.$disconnect();
await pool.end();

const report = {
  base: BASE,
  eventId: event.id,
  eventTitle: event.title,
  matchCount: matches.length,
  before: { nullCount, gapBefore, dupBefore, sample: present.slice(0, 12) },
  after: {
    gapAfter,
    dupAfter,
    first: afterNums[0] ?? null,
    last: afterNums[afterNums.length - 1] ?? null,
    n: afterNums.length,
  },
  web: { count: webSorted.length, gaps: webGaps, sample: webSorted.slice(0, 15) },
  print: {
    hasTitle: printText.includes(event.title),
    nums: printSorted.slice(0, 15),
    gaps: (() => {
      const g: Array<[number, number]> = [];
      for (let i = 1; i < printSorted.length; i++) {
        if (printSorted[i]! !== printSorted[i - 1]! + 1) {
          g.push([printSorted[i - 1]!, printSorted[i]!]);
        }
      }
      return g;
    })(),
    redBlue: /RED/.test(printText) && /BLUE/.test(printText),
  },
  unmatched: {
    hasTitle: /미매칭 선수 명단/.test(unmatchedText),
    hasColumns:
      unmatchedText.includes("체육관명") && unmatchedText.includes("신청 체중"),
    pageMarks,
    approxRows: unmatchedRows,
  },
  divisionSelectCount,
  pageerrors: errors.filter((e) => !e.includes("favicon")),
  pass:
    !gapAfter &&
    !dupAfter &&
    afterNums.length === matches.length &&
    printText.includes(event.title) &&
    /미매칭 선수 명단/.test(unmatchedText) &&
    webGaps.length === 0,
};

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.pass) fail("Production smoke assertions failed");
console.log("PASS Production sequence/print/division smoke");
