/**
 * Production smoke after fallback cleanup — NO DB writes.
 *   npx tsx scripts/e2e-bracket-match-weight-ssot-prod-smoke.mts
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
  "bracket-match-weight-ssot-prod",
);
mkdirSync(OUT, { recursive: true });
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "shgym";
const EXPECT_SHA = "8180f22";

const report: Record<string, string | number | boolean> = {
  expectServingSha: EXPECT_SHA,
  dbWrite: false,
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
  let sampleWeight: number | null = null;
  let sampleMemo = "";

  try {
    const rows = await prisma.bracketMatch.findMany({
      select: { matchWeightKg: true, organizerMemo: true },
    });
    const total = rows.length;
    const weightNull = rows.filter((r) => r.matchWeightKg == null).length;
    let fallbackRequired = 0;
    for (const r of rows) {
      if (r.matchWeightKg != null) continue;
      if (/(\d+(?:\.\d+)?)\s*kg\b/i.test(r.organizerMemo ?? "")) {
        fallbackRequired += 1;
      }
    }
    report.total = total;
    report.weightNull = weightNull;
    report.fallbackRequired = fallbackRequired;
    if (fallbackRequired !== 0) fail("fallback-required != 0");

    // read-only mismatch sample: memo contains different kg text than field
    const mismatched = rows.find((r) => {
      if (r.matchWeightKg == null || !r.organizerMemo) return false;
      const m = r.organizerMemo.match(/(\d+(?:\.\d+)?)\s*kg\b/i);
      if (!m?.[1]) return false;
      return Number(m[1]) !== r.matchWeightKg;
    });
    report.hasFieldMemoMismatchSample = Boolean(mismatched);
    if (mismatched) {
      report.mismatchField = mismatched.matchWeightKg ?? "null";
      report.mismatchMemoKg = mismatched.organizerMemo?.match(
        /(\d+(?:\.\d+)?)\s*kg\b/i,
      )?.[1] ?? "";
    }

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
      select: { id: true },
    });
    if (!event) fail("no event");
    eventId = event.id;
    report.eventId = eventId;

    const sample = await prisma.bracketMatch.findFirst({
      where: {
        bracket: { eventId },
        matchWeightKg: { not: null },
      },
      orderBy: { matchNumber: "asc" },
      select: { matchWeightKg: true, organizerMemo: true, matchNumber: true },
    });
    if (!sample?.matchWeightKg) fail("no weighted sample");
    sampleWeight = sample.matchWeightKg;
    sampleMemo = sample.organizerMemo ?? "";
    report.sampleWeight = sampleWeight;
    report.sampleMatchNumber = sample.matchNumber ?? -1;
    report.sampleMemoLen = sampleMemo.length;
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
    if (weightCount === 0) fail("weight input missing");

    const expected = String(
      Number.isInteger(sampleWeight!) ? sampleWeight : sampleWeight,
    ).replace(/(\.\d*?[1-9])0+$/, "$1").replace(/\.0+$/, "");
    // normalize float display like formatter
    const cleaned =
      sampleWeight != null && Number.isFinite(sampleWeight)
        ? Number.isInteger(sampleWeight)
          ? String(sampleWeight)
          : String(sampleWeight)
              .replace(/(\.\d*?[1-9])0+$/, "$1")
              .replace(/\.0+$/, "")
        : "";
    const values = await page
      .locator('input[aria-label="경기 체중"]')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    report.hasSampleWeight = values.includes(cleaned);
    report.weightSample = values.filter(Boolean).slice(0, 8).join(",");
    if (!values.includes(cleaned)) {
      fail(`expected weight input ${cleaned}`);
    }

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

    const kgLabel = `${cleaned}kg`;
    const hasKg =
      (await page.locator(".ops-print-match-kg", { hasText: kgLabel }).count()) >
      0;
    const memoRows = await page.locator(".ops-print-memo-row").count();
    const kgCells = await page.locator(".ops-print-match-kg").count();
    const pageSheets = await page.locator(".ops-print-page-sheet").count();
    report.pdfHasSampleKg = hasKg;
    report.pdfMemoRows = memoRows;
    report.pdfKgCells = kgCells;
    report.pdfPageSheets = pageSheets;
    if (!hasKg) fail(`PDF missing ${kgLabel}`);
    if (memoRows < 1) fail("PDF memo rows missing");
    // 8/page: with 30 matches expect ceil(30/8)=4 pages if all on print
    report.pdfPagesExpectedMin = Math.ceil(30 / 8);

    report.consoleErrors = consoleErrors.length;
    report.pageErrors = pageErrors.length;
    if (consoleErrors.length || pageErrors.length) {
      fail(`browser errors c=${consoleErrors.length} p=${pageErrors.length}`);
    }
    report.pass = true;
  } finally {
    await browser.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS", JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
