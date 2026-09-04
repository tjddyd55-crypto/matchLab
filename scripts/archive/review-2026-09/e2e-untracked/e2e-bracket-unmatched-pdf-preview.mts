/**
 * Preview: bracket + unmatched print pages visual smoke (HTML print routes).
 *   npx tsx scripts/e2e-bracket-unmatched-pdf-preview.mts
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

const BASE = "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "bracket-unmatched-pdf");
mkdirSync(OUT, { recursive: true });

const app = JSON.parse(
  execSync("railway variable list -e development -s app --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const pw = String(app.DEMO_PASSWORD || "");
if (!pw) throw new Error("DEMO_PASSWORD missing");

const pg = JSON.parse(
  execSync("railway variable list -e development -s Postgres --json", {
    encoding: "utf8",
  }).replace(/^\uFEFF/, ""),
);
const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
if (!/yamanote/i.test(dbUrl)) throw new Error("expected yamanote");
process.env.DATABASE_URL = dbUrl;

const { PrismaPg } = await import("@prisma/adapter-pg");
const { Pool } = await import("pg");
const { PrismaClient } = await import("../src/generated/prisma");
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const org = await prisma.user.findFirst({
  where: { loginId: "organizer", role: "organizer" },
  include: { organizer: true },
});
if (!org?.organizer) throw new Error("organizer missing");

const event = await prisma.event.findFirst({
  where: { organizerId: org.organizer.id },
  orderBy: { updatedAt: "desc" },
  select: { id: true, title: true },
});
if (!event) throw new Error("event missing");

const matchCount = await prisma.bracketMatch.count({
  where: { bracket: { eventId: event.id } },
});

const errors: string[] = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
await page.locator('input[name="identifier"], #login-identifier').first().fill("organizer");
await page.locator('input[name="password"], input[type="password"]').first().fill(pw);
await page.getByRole("button", { name: /로그인/i }).click();
await page.waitForTimeout(3500);

await page.goto(
  `${BASE}/organizer/events/${event.id}/brackets/print?mode=all-matches`,
  { waitUntil: "networkidle", timeout: 120_000 },
);
await page.waitForTimeout(1500);
const bracketText = await page.evaluate(() => document.body?.innerText ?? "");
await page.screenshot({ path: join(OUT, "bracket-print-p1.png"), fullPage: true });

await page.goto(
  `${BASE}/organizer/events/${event.id}/brackets/unmatched-print`,
  { waitUntil: "networkidle", timeout: 120_000 },
);
await page.waitForTimeout(1500);
const unmatchedText = await page.evaluate(() => document.body?.innerText ?? "");
await page.screenshot({ path: join(OUT, "unmatched-print-p1.png"), fullPage: true });

await browser.close();
await prisma.$disconnect();
await pool.end();

const report = {
  eventId: event.id,
  eventTitle: event.title,
  matchCount,
  bracketHasTitle: bracketText.includes(event.title),
  bracketHasOpsLayout:
    /경기 대진표/.test(bracketText) && /RED/.test(bracketText),
  unmatchedHasTitle: /미매칭 선수 명단/.test(unmatchedText),
  unmatchedHasColumns:
    unmatchedText.includes("체육관명") &&
    unmatchedText.includes("신청 체중"),
  hasBrokenBoxes: /□□□/.test(bracketText + unmatchedText),
  pageerrors: errors,
  pass:
    errors.length === 0 &&
    bracketText.includes(event.title) &&
    /경기 대진표/.test(bracketText) &&
    /미매칭 선수 명단/.test(unmatchedText) &&
    !/□□□/.test(bracketText + unmatchedText),
};

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
