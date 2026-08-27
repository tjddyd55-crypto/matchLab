/**
 * Preview E2E: matched athlete gym name edit must persist without Match mutation.
 *   npx tsx scripts/e2e-matched-athlete-gym-edit-preview-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium } from "@playwright/test";

const OUT = join(process.cwd(), "test-results", "matched-athlete-gym-edit-preview");
mkdirSync(OUT, { recursive: true });

const report: Record<string, string | number | boolean | null> = {};

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
    fail("expected yamanote preview DB");
  }
  report.dbFingerprint = "yamanote";

  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const beforeGym = "팀라페짐";
  const afterGym = "팀라펠MMA짐";

  let eventId = "";
  let applicationId = "";
  let matchId = "";
  let fighterId = "";

  try {
    // Prefer existing QA row; otherwise pick any matched application with gym snapshot.
    let appRow = await prisma.eventApplication.findFirst({
      where: {
        status: "approved",
        OR: [
          { gymNameSnapshot: beforeGym },
          { gymNameSnapshot: afterGym },
          {
            gymSnapshot: {
              path: ["name"],
              equals: beforeGym,
            },
          },
        ],
        fighter: {
          OR: [
            { matchesAsRed: { some: { status: { not: "cancelled" } } } },
            { matchesAsBlue: { some: { status: { not: "cancelled" } } } },
          ],
        },
      },
      select: {
        id: true,
        eventId: true,
        fighterId: true,
        gymNameSnapshot: true,
        gymSnapshot: true,
        gymId: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (!appRow) {
      appRow = await prisma.eventApplication.findFirst({
        where: {
          status: "approved",
          fighter: {
            OR: [
              {
                matchesAsRed: {
                  some: { status: { not: "cancelled" } },
                },
              },
              {
                matchesAsBlue: {
                  some: { status: { not: "cancelled" } },
                },
              },
            ],
          },
        },
        select: {
          id: true,
          eventId: true,
          fighterId: true,
          gymNameSnapshot: true,
          gymSnapshot: true,
          gymId: true,
        },
        orderBy: { updatedAt: "desc" },
      });
    }
    if (!appRow) fail("no matched approved application found");

    applicationId = appRow.id;
    eventId = appRow.eventId;
    fighterId = appRow.fighterId;
    report.applicationId = applicationId;
    report.eventId = eventId;

    const match = await prisma.bracketMatch.findFirst({
      where: {
        status: { not: "cancelled" },
        OR: [{ fighterRedId: fighterId }, { fighterBlueId: fighterId }],
        bracket: { eventId },
      },
      select: {
        id: true,
        bracketId: true,
        matchNumber: true,
        courtId: true,
        courtOrder: true,
        fighterRedId: true,
        fighterBlueId: true,
        matchWeightKg: true,
        organizerMemo: true,
        fighterRedSnapshot: true,
        fighterBlueSnapshot: true,
      },
    });
    if (!match) fail("matched BracketMatch missing");
    matchId = match.id;
    report.matchId = matchId;
    report.matchNumberBefore = match.matchNumber;
    report.courtIdBefore = match.courtId;
    report.courtOrderBefore = match.courtOrder;
    report.bracketIdBefore = match.bracketId;
    report.redBefore = match.fighterRedId;
    report.blueBefore = match.fighterBlueId;
    report.weightBefore = match.matchWeightKg;
    report.memoBefore = match.organizerMemo;

    // Seed known before gym name for deterministic UI assertion.
    await prisma.eventApplication.update({
      where: { id: applicationId },
      data: {
        gymId: null,
        gymNameSnapshot: beforeGym,
        gymSnapshot: { gymId: null, name: beforeGym },
      },
    });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on("pageerror", (err) => {
      report.pageerror = String(err);
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        report.consoleError = (report.consoleError || "") + msg.text() + "\n";
      }
    });

    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="loginId"], input[name="email"], input[type="text"]', "organizer");
    await page.fill('input[name="password"], input[type="password"]', pw);
    await page.click('button[type="submit"]');
    await page.waitForURL(/organizer/, { timeout: 30000 }).catch(() => null);

    const workspaceUrl = `${BASE}/organizer/events/${eventId}/brackets?tab=view&view=workspace`;
    await page.goto(workspaceUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "01-workspace-before.png"), fullPage: true });

    // Open edit via 선수정보 수정 near the seeded gym name if visible.
    const editBtn = page.getByRole("button", { name: "선수정보 수정" }).first();
    if (!(await editBtn.count())) {
      // Fallback: applications page edit for same application.
      await page.goto(
        `${BASE}/organizer/events/${eventId}/applications`,
        { waitUntil: "networkidle" },
      );
    } else {
      await editBtn.click();
    }

    // If still no dialog, open applications and find row edit.
    const dialog = page.getByRole("dialog");
    if (!(await dialog.count())) {
      await page.goto(
        `${BASE}/organizer/events/${eventId}/applications`,
        { waitUntil: "networkidle" },
      );
      // Prefer any "수정" that opens the edit panel — click first available.
      const appEdit = page.getByRole("button", { name: /수정/ }).first();
      if (await appEdit.count()) await appEdit.click();
    }

    await page.waitForSelector("#edit-gymName, #edit-fighterName", {
      timeout: 20000,
    });

    // Ensure manual gym name mode.
    const manualBtn = page.getByRole("button", { name: "소속명 직접 입력" });
    if (await manualBtn.count()) await manualBtn.click();

    await page.waitForSelector("#edit-gymName", { timeout: 10000 });
    await page.fill("#edit-gymName", afterGym);
    await page.screenshot({ path: join(OUT, "02-edit-dialog.png") });

    await page.getByRole("button", { name: "저장" }).click();

    // Expect dialog close or visible error (must not stay silent).
    const errVisible = await page
      .getByText(/저장하지 못했습니다|성별 정보가 전달되지 않았습니다/)
      .isVisible()
      .catch(() => false);
    if (errVisible) {
      await page.screenshot({ path: join(OUT, "03-save-error.png") });
      fail("save showed error in dialog");
    }

    await page.waitForTimeout(1500);
    await page.reload({ waitUntil: "networkidle" });
    await page.goto(workspaceUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "03-workspace-after.png"), fullPage: true });

    const bodyText = await page.locator("body").innerText();
    report.workspaceShowsAfterGym = bodyText.includes(afterGym);
    if (!bodyText.includes(afterGym)) {
      fail(`workspace missing after gym name: ${afterGym}`);
    }

    await browser.close();

    const appAfter = await prisma.eventApplication.findUnique({
      where: { id: applicationId },
      select: {
        gymNameSnapshot: true,
        gymSnapshot: true,
        gymId: true,
      },
    });
    report.gymNameSnapshotAfter = appAfter?.gymNameSnapshot ?? null;
    report.gymIdAfter = appAfter?.gymId ?? null;
    if (appAfter?.gymNameSnapshot !== afterGym) {
      fail(`DB gymNameSnapshot expected ${afterGym}, got ${appAfter?.gymNameSnapshot}`);
    }

    const matchAfter = await prisma.bracketMatch.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        bracketId: true,
        matchNumber: true,
        courtId: true,
        courtOrder: true,
        fighterRedId: true,
        fighterBlueId: true,
        matchWeightKg: true,
        organizerMemo: true,
        fighterRedSnapshot: true,
        fighterBlueSnapshot: true,
      },
    });
    if (!matchAfter) fail("match missing after edit");
    report.matchIdAfter = matchAfter.id;
    report.matchNumberAfter = matchAfter.matchNumber;
    report.snapGym =
      matchAfter.fighterRedId === fighterId
        ? ((matchAfter.fighterRedSnapshot as { gymName?: string } | null)
            ?.gymName ?? null)
        : ((matchAfter.fighterBlueSnapshot as { gymName?: string } | null)
            ?.gymName ?? null);

    if (matchAfter.id !== match.id) fail("Match.id changed");
    if (matchAfter.bracketId !== match.bracketId) fail("bracketId changed");
    if (matchAfter.matchNumber !== match.matchNumber) fail("matchNumber changed");
    if (matchAfter.courtId !== match.courtId) fail("courtId changed");
    if (matchAfter.courtOrder !== match.courtOrder) fail("courtOrder changed");
    if (matchAfter.fighterRedId !== match.fighterRedId) fail("RED changed");
    if (matchAfter.fighterBlueId !== match.fighterBlueId) fail("BLUE changed");
    if (matchAfter.matchWeightKg !== match.matchWeightKg) fail("weight changed");
    if (matchAfter.organizerMemo !== match.organizerMemo) fail("memo changed");
    if (report.snapGym !== afterGym) {
      fail(`Match snapshot gym expected ${afterGym}, got ${report.snapGym}`);
    }

    report.pass = true;
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("PASS", JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
