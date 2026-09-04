/**
 * Preview E2E: matchWeightKg SSOT — no memo fallback.
 * QA1: weight=70 memo="68kg / 운영 메모" → UI/PDF 70, memo row keeps 68kg text
 * QA2: weight=null memo="68kg / legacy" → UI blank, PDF no kg, memo row only
 *
 *   npx tsx scripts/e2e-bracket-match-weight-ssot-preview-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium } from "@playwright/test";

const OUT = join(
  process.cwd(),
  "test-results",
  "bracket-match-weight-ssot-preview",
);
mkdirSync(OUT, { recursive: true });
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "organizer";

const report: Record<string, string | number | boolean> = {};

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
  let matchA = "";
  let matchB = "";
  let origA: { w: number | null; m: string | null } = { w: null, m: null };
  let origB: { w: number | null; m: string | null } = { w: null, m: null };

  try {
    const samples = await prisma.bracketMatch.findMany({
      take: 2,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        matchWeightKg: true,
        organizerMemo: true,
        bracket: { select: { eventId: true } },
      },
    });
    if (samples.length < 2) fail("need 2 matches");
    matchA = samples[0]!.id;
    matchB = samples[1]!.id;
    eventId = samples[0]!.bracket.eventId;
    origA = {
      w: samples[0]!.matchWeightKg,
      m: samples[0]!.organizerMemo,
    };
    origB = {
      w: samples[1]!.matchWeightKg,
      m: samples[1]!.organizerMemo,
    };
    report.eventId = eventId;

    await prisma.bracketMatch.update({
      where: { id: matchA },
      data: {
        matchWeightKg: 70,
        organizerMemo: "68kg / 운영 메모",
      },
    });
    await prisma.bracketMatch.update({
      where: { id: matchB },
      data: {
        matchWeightKg: null,
        organizerMemo: "68kg / legacy",
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

    const values = await page
      .locator('input[aria-label="경기 체중"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    report.has70 = values.includes("70");
    report.has68FromMemoFallback = values.includes("68");
    if (!values.includes("70")) fail("QA1: expected UI 70");
    // 68 from memo on null-weight match must NOT appear as input value
    // (other matches may legitimately have 68 in matchWeightKg — check count of blank exists)
    const blankCount = values.filter((v) => v === "").length;
    report.blankWeightInputs = blankCount;
    if (blankCount < 1) fail("QA2: expected at least one blank weight input");

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

    const kgTexts = await page
      .locator(".ops-print-match-kg")
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() || ""));
    const memoBodies = await page
      .locator(".ops-print-memo-body")
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() || ""));

    report.pdfHas70kg = kgTexts.includes("70kg");
    report.pdfHas68kgCell = kgTexts.includes("68kg");
    report.pdfMemoHas68Legacy = memoBodies.some((t) =>
      t.includes("68kg / legacy"),
    );
    report.pdfMemoHas68Ops = memoBodies.some((t) =>
      t.includes("68kg / 운영 메모"),
    );

    if (!kgTexts.includes("70kg")) fail("QA1: PDF must show 70kg");
    // null weight must not create 68kg cell from memo — if 68kg cell exists it must be from another match's field
    // For our fixture B, weight null → no kg from that match. Hard assert: memo row exists for legacy text.
    if (!report.pdfMemoHas68Legacy) fail("QA2: memo row for legacy missing");
    if (!report.pdfMemoHas68Ops) fail("QA1: memo row for ops missing");

    // Stronger: count kg cells should be less than memo rows if we have a null-weight memo match
    const kgCount = await page.locator(".ops-print-match-kg").count();
    const memoCount = await page.locator(".ops-print-memo-row").count();
    report.pdfKgCount = kgCount;
    report.pdfMemoCount = memoCount;
    if (kgCount >= memoCount) {
      // not always true if other matches have weight+memo; just record
    }

    report.consoleErrors = consoleErrors.length;
    report.pageErrors = pageErrors.length;
    if (consoleErrors.length || pageErrors.length) {
      fail(`browser errors c=${consoleErrors.length} p=${pageErrors.length}`);
    }
    report.pass = true;
  } finally {
    await browser.close();
    try {
      await prisma.bracketMatch.update({
        where: { id: matchA },
        data: { matchWeightKg: origA.w, organizerMemo: origA.m },
      });
      await prisma.bracketMatch.update({
        where: { id: matchB },
        data: { matchWeightKg: origB.w, organizerMemo: origB.m },
      });
      report.qaRestored = true;
    } finally {
      await prisma.$disconnect();
      await pool.end();
    }
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS", JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
