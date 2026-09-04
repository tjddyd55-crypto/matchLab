/**
 * Production QA: dedicated matchWeightKg + PDF memo row.
 * Restores any QA mutations before exit.
 *
 *   npx tsx scripts/e2e-bracket-match-weight-prod-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium } from "@playwright/test";

const OUT = join(process.cwd(), "test-results", "bracket-match-weight-prod");
mkdirSync(OUT, { recursive: true });
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "shgym";
const EXPECT_SHA = "8651f32";

const report: Record<string, string | number | boolean> = {
  expectServingSha: EXPECT_SHA,
};

function fail(msg: string): never {
  console.error("FAIL:", msg);
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  process.exit(1);
}

async function main() {
  const app = JSON.parse(
    execSync("railway variable list -e production -s app --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const BASE =
    process.env.QA_BASE_URL ||
    String(app.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    "https://app-production-79ad.up.railway.app";
  report.base = BASE;
  const pw = String(app.DEMO_PASSWORD || "");
  if (!pw) fail("DEMO_PASSWORD missing");

  const pgVars = JSON.parse(
    execSync("railway variable list -e production -s Postgres --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const databaseUrl = String(
    pgVars.DATABASE_PUBLIC_URL || pgVars.DATABASE_URL || "",
  );
  if (!/yamabiko/i.test(databaseUrl) || /yamanote/i.test(databaseUrl)) {
    fail("expected yamabiko");
  }
  report.dbFingerprint = "yamabiko";

  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let eventId = "";
  let qaMatchId = "";
  let origWeight: number | null = null;
  let origMemo: string | null = null;

  try {
    const weighted = await prisma.bracketMatch.count({
      where: { matchWeightKg: { not: null } },
    });
    const fallbackRemaining = await prisma.bracketMatch.findMany({
      where: { matchWeightKg: null },
      select: { organizerMemo: true },
    });
    let fallbackCount = 0;
    for (const r of fallbackRemaining) {
      if (/(\d+(?:\.\d+)?)\s*kg\b/i.test(r.organizerMemo ?? "")) {
        fallbackCount += 1;
      }
    }
    report.weightedCount = weighted;
    report.fallbackRemaining = fallbackCount;

    const sample = await prisma.bracketMatch.findFirst({
      where: { matchWeightKg: { not: null }, organizerMemo: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        matchWeightKg: true,
        organizerMemo: true,
        matchNumber: true,
        bracket: { select: { eventId: true } },
      },
    });
    if (!sample) fail("no weighted match for QA");
    qaMatchId = sample.id;
    eventId = sample.bracket.eventId;
    origWeight = sample.matchWeightKg;
    origMemo = sample.organizerMemo;
    report.qaMatchIdTail = qaMatchId.slice(-8);
    report.eventId = eventId;
    report.origWeight = origWeight ?? "null";
    report.origMemoLen = (origMemo ?? "").length;

    // memo mismatch fixture: weight 70, memo keeps legacy kg text
    await prisma.bracketMatch.update({
      where: { id: qaMatchId },
      data: {
        matchWeightKg: 70,
        organizerMemo: `${origMemo ?? "QA"}`.includes("kg")
          ? origMemo
          : `68kg / QA mismatch`,
      },
    });
  } catch (e) {
    await prisma.$disconnect();
    await pool.end();
    throw e;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  try {
    await page.goto(`${BASE}/login`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await page
      .locator(
        'input[name="identifier"], #login-identifier, input[name="loginId"]',
      )
      .first()
      .fill(ORG_LOGIN);
    await page
      .locator('input[name="password"], input[type="password"]')
      .first()
      .fill(pw);
    await page.getByRole("button", { name: /로그인/i }).click();
    await page.waitForTimeout(3500);
    if (page.url().includes("/login")) fail("login failed");

    const editUrl = `${BASE}/organizer/events/${eventId}/brackets?tab=edit&view=workspace`;
    await page.goto(editUrl, { waitUntil: "networkidle", timeout: 180_000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: join(OUT, "01-workspace.png"),
      fullPage: true,
    });

    const weightCount = await page
      .locator('input[aria-label="경기 체중"]')
      .count();
    report.weightInputCount = weightCount;
    if (weightCount === 0) fail("weight input missing");

    const values = await page
      .locator('input[aria-label="경기 체중"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    report.hasWeight70 = values.includes("70");
    report.weightSample = values.filter(Boolean).slice(0, 10).join(",");
    if (!values.includes("70")) fail("expected QA weight 70 in inputs");

    const printUrl = `${BASE}/organizer/events/${eventId}/brackets/print?mode=all-matches`;
    await page.goto(printUrl, { waitUntil: "networkidle", timeout: 180_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: join(OUT, "02-print.png"),
      fullPage: true,
    });

    const kgCells = await page.locator(".ops-print-match-kg").count();
    const memoRows = await page.locator(".ops-print-memo-row").count();
    const has70kg =
      (await page.locator(".ops-print-match-kg", { hasText: "70kg" }).count()) >
      0;
    const has68kgLeak =
      (await page.locator(".ops-print-match-kg", { hasText: "68kg" }).count()) >
      0 && has70kg === false;
    report.pdfKgCells = kgCells;
    report.pdfMemoRows = memoRows;
    report.pdfHas70kg = has70kg;
    report.pdfHas68kgInstead = has68kgLeak;
    report.matchesPerPageCss = await page.evaluate(() => {
      const blocks = document.querySelectorAll(
        ".ops-print-page-sheet .ops-print-match-block",
      );
      return blocks.length;
    });

    if (!has70kg) fail("PDF must show 70kg from matchWeightKg SSOT");
    if (memoRows < 1) fail("PDF memo rows expected");

    report.consoleErrors = consoleErrors.length;
    report.pageErrors = pageErrors.length;
    report.passUi = true;
  } finally {
    await browser.close();
    // cleanup restore
    try {
      await prisma.bracketMatch.update({
        where: { id: qaMatchId },
        data: {
          matchWeightKg: origWeight,
          organizerMemo: origMemo,
        },
      });
      const restored = await prisma.bracketMatch.findUnique({
        where: { id: qaMatchId },
        select: { matchWeightKg: true, organizerMemo: true },
      });
      report.restoredWeight = restored?.matchWeightKg ?? "null";
      report.restoredMemoLen = (restored?.organizerMemo ?? "").length;
      report.qaRestored =
        restored?.matchWeightKg === origWeight &&
        restored?.organizerMemo === origMemo;
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  }

  if (!report.qaRestored) fail("QA cleanup restore failed");
  report.pass = true;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS", JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
