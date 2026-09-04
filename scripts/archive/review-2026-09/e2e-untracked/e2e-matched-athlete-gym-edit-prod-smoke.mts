/**
 * Production smoke: matched athlete gym name save (post 352bf7b deploy).
 *   npx tsx scripts/e2e-matched-athlete-gym-edit-prod-smoke.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium } from "@playwright/test";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const OUT = join(process.cwd(), "test-results", "matched-athlete-gym-edit-prod");
mkdirSync(OUT, { recursive: true });

const report: Record<string, string | number | boolean | null> = {};

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
    fail("expected yamabiko production DB");
  }
  report.dbFingerprint = "yamabiko";

  const versionRes = await fetch(`${BASE}/api/desktop/version`);
  const versionJson = (await versionRes.json()) as { gitSha?: string };
  report.servingSha = versionJson.gitSha ?? null;

  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  let applicationId = "";
  let eventId = "";
  let fighterId = "";
  let matchId = "";
  let beforeGym = "";
  let afterGym = "";
  let matchBefore: Record<string, unknown> | null = null;

  try {
    const orgUser = await prisma.user.findFirst({
      where: { loginId: "shgym", role: "organizer" },
      include: { organizer: true },
    });
    if (!orgUser?.organizer) fail("shgym organizer missing");

    const appRow = await prisma.eventApplication.findFirst({
      where: {
        status: "approved",
        event: { organizerId: orgUser.organizer.id },
        gymNameSnapshot: { not: null },
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
        fighter: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!appRow?.gymNameSnapshot) fail("no matched application with gym snapshot");

    applicationId = appRow.id;
    eventId = appRow.eventId;
    fighterId = appRow.fighterId;
    beforeGym = appRow.gymNameSnapshot;
    // Reversible QA suffix — strip if already present from prior run.
    const baseGym = beforeGym.replace(/\(QA\d*\)$/, "").trim();
    afterGym = `${baseGym}(QA)`;

    report.applicationId = applicationId;
    report.eventId = eventId;
    report.fighterId = fighterId;
    report.fighterName = appRow.fighter.name;
    report.gymNameBefore = beforeGym;
    report.gymNameAfterTarget = afterGym;

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
    matchBefore = { ...match };
    report.matchId = matchId;
    report.matchNumberBefore = match.matchNumber;

    // Seed deterministic before gym for UI.
    await prisma.eventApplication.update({
      where: { id: applicationId },
      data: {
        gymId: null,
        gymNameSnapshot: baseGym,
        gymSnapshot: { gymId: null, name: baseGym },
      },
    });
    beforeGym = baseGym;
    report.gymNameBefore = beforeGym;

    const browser = await chromium.launch({ headless: true });
    const errors5xx: string[] = [];
    try {
      const page = await browser.newPage();
      page.on("pageerror", (err) => {
        report.pageerror = String(err);
      });
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          report.consoleError =
            String(report.consoleError || "") + msg.text() + "\n";
        }
      });
      page.on("response", (res) => {
        if (res.status() >= 500) {
          errors5xx.push(`${res.status()} ${res.url()}`);
        }
      });

      await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      await page.fill(
        'input[name="loginId"], input[name="email"], input[type="text"]',
        "shgym",
      );
      await page.fill('input[name="password"], input[type="password"]', pw);
      await page.click('button[type="submit"]');
      await page.waitForURL(/organizer/, { timeout: 30000 }).catch(() => null);

      // Applications page — single table row by fighter name (workspace div filter is too broad).
      await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
        waitUntil: "networkidle",
      });
      await page.screenshot({
        path: join(OUT, "01-applications-before.png"),
        fullPage: true,
      });

      const appRowLocator = page
        .getByRole("row")
        .filter({ hasText: appRow.fighter.name })
        .first();
      if (!(await appRowLocator.count())) {
        fail(`applications row not found for ${appRow.fighter.name}`);
      }
      await appRowLocator.getByRole("button", { name: "수정", exact: true }).click();

      await page.waitForSelector("#edit-gymName, #edit-fighterName", {
        timeout: 20000,
      });

      const manualBtn = page.getByRole("button", { name: "소속명 직접 입력" });
      if (await manualBtn.count()) await manualBtn.click();

      await page.waitForSelector("#edit-gymName", { timeout: 10000 });
      await page.fill("#edit-gymName", afterGym);
      await page.screenshot({ path: join(OUT, "02-edit-dialog.png") });

      const dialogSave = page.getByRole("dialog").getByRole("button", {
        name: "저장",
        exact: true,
      });
      await dialogSave.click();
      report.saveClicked = true;

      await page.waitForTimeout(800);
      const errVisible = await page
        .getByRole("dialog")
        .getByText(
          /저장하지 못했습니다|성별 정보가 전달되지 않았습니다|대진에 배정된/,
        )
        .isVisible()
        .catch(() => false);
      if (errVisible) {
        const errText = await page.getByRole("dialog").innerText();
        report.saveErrorText = errText.slice(0, 500);
        await page.screenshot({ path: join(OUT, "03-save-error.png") });
        fail(`save showed error in dialog: ${report.saveErrorText}`);
      }

      await page
        .getByRole("dialog")
        .waitFor({ state: "hidden", timeout: 15000 })
        .catch(() => null);
      report.dialogClosed = !(await page.getByRole("dialog").count());

      await page.waitForTimeout(1000);
      const workspaceUrl = `${BASE}/organizer/events/${eventId}/brackets?tab=view&view=workspace`;
      await page.goto(workspaceUrl, { waitUntil: "networkidle" });
      await page.screenshot({
        path: join(OUT, "03-workspace-after.png"),
        fullPage: true,
      });

      const appAfter = await prisma.eventApplication.findUnique({
        where: { id: applicationId },
        select: { gymNameSnapshot: true, gymId: true },
      });
      report.gymNameSnapshotAfter = appAfter?.gymNameSnapshot ?? null;
      if (appAfter?.gymNameSnapshot !== afterGym) {
        fail(
          `DB gymNameSnapshot expected ${afterGym}, got ${appAfter?.gymNameSnapshot}`,
        );
      }

      const bodyText = await page.locator("body").innerText();
      report.workspaceShowsAfterGym = bodyText.includes(afterGym);
      if (!bodyText.includes(afterGym)) {
        fail(`workspace missing after gym name: ${afterGym}`);
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

      report.matchNumberAfter = matchAfter.matchNumber;
      const snapGym =
        matchAfter.fighterRedId === fighterId
          ? ((matchAfter.fighterRedSnapshot as { gymName?: string } | null)
              ?.gymName ?? null)
          : ((matchAfter.fighterBlueSnapshot as { gymName?: string } | null)
              ?.gymName ?? null);
      report.snapGymAfter = snapGym;

      if (matchAfter.id !== matchBefore.id) fail("Match.id changed");
      if (matchAfter.bracketId !== matchBefore.bracketId)
        fail("bracketId changed");
      if (matchAfter.matchNumber !== matchBefore.matchNumber)
        fail("matchNumber changed");
      if (matchAfter.courtId !== matchBefore.courtId) fail("courtId changed");
      if (matchAfter.courtOrder !== matchBefore.courtOrder)
        fail("courtOrder changed");
      if (matchAfter.fighterRedId !== matchBefore.fighterRedId)
        fail("RED changed");
      if (matchAfter.fighterBlueId !== matchBefore.fighterBlueId)
        fail("BLUE changed");
      if (matchAfter.matchWeightKg !== matchBefore.matchWeightKg)
        fail("weight changed");
      if (matchAfter.organizerMemo !== matchBefore.organizerMemo)
        fail("memo changed");
      if (snapGym !== afterGym) {
        fail(`Match snapshot gym expected ${afterGym}, got ${snapGym}`);
      }

      // PDF smoke: open bracket print page
      const printUrl = `${BASE}/organizer/events/${eventId}/brackets?tab=print`;
      await page.goto(printUrl, { waitUntil: "networkidle" });
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: join(OUT, "04-print-page.png"),
        fullPage: true,
      });
      const printText = await page.locator("body").innerText();
      report.pdfPageShowsAfterGym = printText.includes(afterGym);
      if (!printText.includes(afterGym)) {
        fail(`print page missing after gym name: ${afterGym}`);
      }

      report.errors5xxCount = errors5xx.length;
      if (errors5xx.length > 0) {
        report.errors5xx = errors5xx.join("\n");
        fail(`unexpected 5xx: ${errors5xx.join(", ")}`);
      }

      report.pass = true;
      writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
      console.log("PASS", JSON.stringify(report, null, 2));
    } finally {
      await browser.close();
    }

    // Restore original gym name (QA fixture cleanup).
    await prisma.eventApplication.update({
      where: { id: applicationId },
      data: {
        gymId: null,
        gymNameSnapshot: beforeGym,
        gymSnapshot: { gymId: null, name: beforeGym },
      },
    });
    report.restoredGymName = beforeGym;

    // Resync snapshots after restore via direct patch
    const { resyncFighterMatchSnapshotsForEvent } = await import(
      "../src/lib/brackets/resync-fighter-match-snapshots"
    );
    await resyncFighterMatchSnapshotsForEvent(prisma, eventId, fighterId);
    report.restored = true;
  } finally {
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
