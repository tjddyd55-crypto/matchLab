/**
 * Preview QA: match weight field + PDF memo row (yamanote / develop).
 *   npx tsx scripts/e2e-bracket-match-weight-preview-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium } from "@playwright/test";

const OUT = join(process.cwd(), "test-results", "bracket-match-weight-preview");
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "organizer";
mkdirSync(OUT, { recursive: true });

const report: Record<string, string | number | boolean> = {
  servingShaExpected: "844a8a4",
};

function fail(msg: string): never {
  console.error("FAIL:", msg);
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  process.exit(1);
}

async function main() {
  const app = JSON.parse(
    execSync("railway variable list -e development -s app --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const BASE =
    process.env.QA_BASE_URL ||
    String(app.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") ||
    "https://app-preview-member-gym-b.up.railway.app";
  report.base = BASE;
  const pw = String(app.DEMO_PASSWORD || "");
  if (!pw) fail("DEMO_PASSWORD missing");

  const pgVars = JSON.parse(
    execSync("railway variable list -e development -s Postgres --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const databaseUrl = String(
    pgVars.DATABASE_PUBLIC_URL || pgVars.DATABASE_URL || "",
  );
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    fail("expected yamanote");
  }
  report.dbFingerprint = "yamanote";

  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let eventId = "";
  const matchId = "cmt9pjz870008hsumimhcjm7i";
  try {
    const m = await prisma.bracketMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        matchWeightKg: true,
        organizerMemo: true,
        matchNumber: true,
        bracket: { select: { eventId: true } },
      },
    });
    if (!m) fail(`seed match missing: ${matchId}`);
    eventId = m.bracket.eventId;
    report.matchWeightKg = m.matchWeightKg ?? "null";
    report.organizerMemo = m.organizerMemo ?? "";
    report.matchNumber = m.matchNumber ?? -1;
    report.eventId = eventId;
    if (m.matchWeightKg !== 70) {
      fail(`expected weight 70 (no-overwrite QA), got ${m.matchWeightKg}`);
    }
    if (!m.organizerMemo?.includes("68kg")) {
      fail("memo should still contain legacy 68kg text");
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
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
    if (weightCount === 0) fail("weight input not found");

    const values = await page
      .locator('input[aria-label="경기 체중"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    report.weightValuesSample = values.slice(0, 20).join(",");
    const has70 = values.includes("70");
    const has425 = values.includes("42.5");
    report.hasWeight70 = has70;
    report.hasWeight425 = has425;
    if (!has70) fail("expected input value 70 from backfill/no-overwrite");

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

    const kgVisible = await page.locator(".ops-print-match-kg").count();
    const memoRows = await page.locator(".ops-print-memo-row").count();
    report.pdfKgCells = kgVisible;
    report.pdfMemoRows = memoRows;
    const has70kg =
      (await page.locator(".ops-print-match-kg", { hasText: "70kg" }).count()) >
      0;
    report.pdfHas70kg = has70kg;
    const memoText = await page
      .locator(".ops-print-memo-body")
      .first()
      .textContent();
    report.pdfMemoSample = (memoText ?? "").slice(0, 80);
    if (!has70kg) fail("PDF missing 70kg from matchWeightKg");
    if (memoRows < 1) fail("PDF memo row missing");

    report.consoleErrors = consoleErrors.length;
    report.pageErrors = pageErrors.length;
    report.pass = true;
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("PASS", JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
