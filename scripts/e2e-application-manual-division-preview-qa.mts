/**
 * Preview E2E: manual division gender compatibility + stale reset.
 *   npx tsx scripts/e2e-application-manual-division-preview-qa.mts
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
  "application-manual-division-preview-qa",
);
mkdirSync(OUT, { recursive: true });

const report: Record<string, unknown> = { checks: [] };

function pass(name: string, detail?: unknown) {
  (report.checks as unknown[]).push({ name, ok: true, detail });
}

function fail(msg: string): never {
  report.error = msg;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error("FAIL:", msg);
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

  const pgVars = JSON.parse(
    execSync("railway variable list -e development -s Postgres --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const databaseUrl = String(
    pgVars.DATABASE_PUBLIC_URL || pgVars.DATABASE_URL || "",
  );
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    fail("expected yamanote preview DB");
  }
  report.dbFingerprint = "yamanote";

  const pw = String(app.DEMO_PASSWORD || "");
  if (!pw) fail("DEMO_PASSWORD missing");

  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const appRow = await prisma.eventApplication.findFirst({
      where: {
        status: "approved",
        divisionId: { not: null },
        fighter: { gender: "female" },
      },
      include: {
        fighter: true,
        division: true,
        event: { include: { divisions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!appRow?.division) fail("no female application fixture");

    const maleDiv = appRow.event.divisions.find(
      (d) =>
        d.gender === "male" &&
        d.ageGroup === appRow.division!.ageGroup &&
        d.sportType === appRow.division!.sportType,
    );
    if (!maleDiv) fail("no male division fixture for direct submit test");

    report.applicationId = appRow.id;
    report.eventId = appRow.eventId;
    report.fighterName = appRow.fighter.name;
    report.beforeDivisionId = appRow.divisionId;

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="loginId"]', "demo-organizer");
    await page.fill('input[name="password"]', pw);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/organizer/, { timeout: 30000 });

    await page.goto(
      `${BASE}/organizer/events/${appRow.eventId}/applications`,
      { waitUntil: "networkidle" },
    );

    const editBtn = page
      .locator("tr", { hasText: appRow.fighter.name })
      .getByRole("button", { name: "수정" })
      .first();
    await editBtn.click();
    await page.getByRole("dialog", { name: "신청 수정" }).waitFor();

    await page.getByLabel("체급 수동 변경").check();
    const manualSelect = page.locator(
      'dialog select:has(option:text("체급 선택"))',
    );
    await manualSelect.waitFor();
    const options = await manualSelect.locator("option").allTextContents();
    const hasMale = options.some((o) => /남|male/i.test(o));
    const hasFemale = options.some((o) => /여|female/i.test(o));
    if (hasMale) fail(`male option visible for female: ${options.join(" | ")}`);
    pass("female_manual_dropdown", { options, hasFemale });

    await page.getByLabel("체급 수동 변경").uncheck();
    await page.selectOption('select[name="gender"]', "male");
    await page.waitForTimeout(300);
    const checkedAfterGender = await page
      .getByLabel("체급 수동 변경")
      .isChecked();
    if (checkedAfterGender) fail("manual override still checked after gender change");
    pass("gender_change_reset");

    await page.selectOption('select[name="gender"]', "female");
    await page.getByLabel("체급 수동 변경").check();
    await manualSelect.waitFor();
    pass("female_manual_reopen");

    await browser.close();
    if (errors.length) fail(`page errors: ${errors.join("; ")}`);

    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  fail(e instanceof Error ? e.message : String(e));
});
