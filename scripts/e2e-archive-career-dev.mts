/**
 * Development E2E: Event Archive + Fighter Career full flow (yamanote only)
 *   npx tsx scripts/e2e-archive-career-dev.mts
 *   npx tsx scripts/e2e-archive-career-dev.mts --skip-browser
 */
import "dotenv/config";

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import ExcelJS from "exceljs";

const PREFIX = "E2E_ARCHIVE_CAREER_";
const STAMP = process.env.E2E_STAMP ?? "20260828";
const EVENT_TITLE = `${PREFIX}${STAMP}`;
const OUT = join(process.cwd(), "test-results", "archive-career-e2e-dev");
const skipBrowser = process.argv.includes("--skip-browser");

mkdirSync(OUT, { recursive: true });

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

type E2ECtx = {
  eventId: string;
  archiveId: string;
  fighterA: string;
  fighterB: string;
  fighterC: string;
  fighterAName: string;
  fighterBName: string;
  fighterCName: string;
  match1Id: string;
  match2Id: string;
  originalBName: string;
  originalBGymId: string | null;
  organizerLoginId: string;
};

type Report = {
  verdict: "ARCHIVE_CAREER_E2E_PASS" | "ARCHIVE_CAREER_E2E_BLOCKED";
  blockedReason?: string;
  eventId?: string;
  fighterIds?: Record<string, string>;
  checks: Record<string, unknown>;
  errors: string[];
  archiveBytes?: Record<string, number>;
};

const report: Report = {
  verdict: "ARCHIVE_CAREER_E2E_PASS",
  checks: {},
  errors: [],
};

function pass(name: string, detail?: unknown) {
  report.checks[name] = detail ?? "PASS";
  console.log(`PASS ${name}`, detail ?? "");
}

function fail(msg: string): never {
  report.errors.push(msg);
  report.verdict = "ARCHIVE_CAREER_E2E_BLOCKED";
  report.blockedReason = msg;
  throw new Error(msg);
}

function assertYamanote(url: string) {
  if (!/yamanote/i.test(url) || /yamabiko/i.test(url)) {
    fail(`REFUSING: DATABASE_URL is not yamanote (${url.slice(0, 40)}...)`);
  }
}

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/P2028|expired transaction|timeout/i.test(msg) || i === attempts - 1) throw e;
      console.warn(`RETRY ${label} (${i + 1}/${attempts - 1}):`, msg.slice(0, 120));
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw last;
}

function setupYamanoteEnv() {
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  assert.ok(dbUrl, "Railway Postgres URL missing");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  for (const key of [
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "MATCHON_PII_ENCRYPTION_KEY",
    "NEXT_PUBLIC_APP_URL",
  ]) {
    if (app[key]) process.env[key] = app[key];
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  }
}

const BASE = (
  process.env.QA_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";

async function login(page: import("playwright-core").Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel("아이디").fill(loginId);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 90000 });
}

async function runServiceE2E(): Promise<E2ECtx> {
  setupYamanoteEnv();

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
  pass("migrate_deploy");

  const { prisma } = await import("../src/lib/prisma");

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('EventArchive', 'FighterCareerMatchRecord', 'FighterCareerStats')
  `;
  const names = new Set(tables.map((t) => t.tablename));
  for (const t of ["EventArchive", "FighterCareerMatchRecord", "FighterCareerStats"]) {
    assert.ok(names.has(t), `missing table ${t}`);
  }
  pass("migrations_applied", [...names]);

  const organizerUser = await prisma.user.findFirst({
    where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
    include: { organizer: true },
  });
  assert.ok(organizerUser?.organizer, "demo organizer missing");
  const actor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "organizer@demo.local",
    loginId: organizerUser.loginId ?? "organizer",
    organizerId: organizerUser.organizer.id,
  };

  async function findDemoGym(loginId: string) {
    const user = await prisma.user.findFirst({
      where: { loginId },
      include: { ownedGym: true },
    });
    assert.ok(user?.ownedGym, `demo gym ${loginId} missing`);
    return user.ownedGym;
  }
  const gymAlpha = await findDemoGym("gym1");
  const gymBeta = await findDemoGym("gym2");

  let event = await prisma.event.findFirst({
    where: { title: EVENT_TITLE },
    include: {
      divisions: true,
      courts: true,
      archives: { where: { status: "active" }, orderBy: { version: "desc" }, take: 1 },
    },
  });

  let ctx: E2ECtx;
  let reused = false;

  if (event?.archives[0] && event.status === "finished") {
    const careerCount = await prisma.fighterCareerMatchRecord.count({
      where: { eventArchiveId: event.archives[0].id, status: "active" },
    });
    if (careerCount >= 4) reused = true;
  }

  if (!reused) {
    if (event) {
      await prisma.fighterCareerMatchRecord.deleteMany({ where: { eventId: event.id } });
      await prisma.eventArchive.deleteMany({ where: { eventId: event.id } });
      await prisma.matchResult.deleteMany({ where: { eventId: event.id } });
      await prisma.bracketMatch.deleteMany({ where: { bracket: { eventId: event.id } } });
      await prisma.bracket.deleteMany({ where: { eventId: event.id } });
      await prisma.eventApplication.deleteMany({ where: { eventId: event.id } });
      await prisma.eventDivision.deleteMany({ where: { eventId: event.id } });
      await prisma.eventCourt.deleteMany({ where: { eventId: event.id } });
      await prisma.eventPaymentSetting.deleteMany({ where: { eventId: event.id } });
      await prisma.event.delete({ where: { id: event.id } });
    }

    async function ensureFighter(name: string, gymId: string, phone: string, birth: string) {
      const code = `${PREFIX}${name.replace(/\s/g, "_")}_${STAMP}`;
      const existing = await prisma.fighter.findFirst({ where: { fighterCode: code } });
      if (existing) return existing;
      return prisma.fighter.create({
        data: {
          fighterCode: code,
          name,
          gender: "male",
          birthDate: new Date(birth),
          phone,
          currentGymId: gymId,
        },
      });
    }

    const fighterA = await ensureFighter(`${PREFIX}A 선수`, gymAlpha.id, "01090001001", "2010-03-15T00:00:00.000Z");
    const fighterB = await ensureFighter(`${PREFIX}B 선수`, gymAlpha.id, "01090001002", "2010-06-20T00:00:00.000Z");
    const fighterC = await ensureFighter(`${PREFIX}C 선수`, gymBeta.id, "01090001003", "2010-09-10T00:00:00.000Z");

    event = await prisma.event.create({
      data: {
        organizerId: organizerUser.organizer.id,
        title: EVENT_TITLE,
        location: "E2E 테스트 아레나",
        locationName: "E2E 테스트 아레나",
        roadAddress: "서울특별시 강남구 E2E로 100",
        eventDate: new Date("2026-09-15T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-09-01T00:00:00.000Z"),
        status: "draft",
        publicSlug: `e2e-archive-career-${STAMP}`,
        paymentSetting: {
          create: {
            feeAmount: 50000,
            bankName: "E2E은행",
            accountNumber: "123-456-789",
            accountHolder: "MATCHON E2E",
          },
        },
        courts: { create: [{ name: "E2E 1코트", sortOrder: 0 }] },
        divisions: {
          create: [{
            sportType: "kickboxing",
            gender: "male",
            ageGroup: "중등부",
            weightClass: "-60kg",
            weightClassName: "웰터급",
            weightLimitText: "-60kg",
          }],
        },
      },
      include: { divisions: true, courts: true, archives: true },
    });

    const division = event.divisions[0]!;
    const court = event.courts[0]!;

    for (const [fighter, gym] of [[fighterA, gymAlpha], [fighterB, gymAlpha], [fighterC, gymBeta]] as const) {
      await prisma.eventApplication.create({
        data: {
          eventId: event.id,
          divisionId: division.id,
          divisionSelectionType: "REGISTERED",
          gymId: gym.id,
          fighterId: fighter.id,
          status: "approved",
          paymentStatus: "paid",
          fighterSnapshot: { name: fighter.name },
          gymSnapshot: { gymId: gym.id, name: gym.name },
          gymNameSnapshot: gym.name,
        },
      });
    }
    pass("applications_created", { count: 3, gymAlpha: gymAlpha.name, gymBeta: gymBeta.name });

    const { eventService } = await import("../src/lib/services/event.service");
    for (const status of ["open", "closed", "bracket_ready", "ongoing"] as const) {
      await eventService.changeEventStatus(actor, { eventId: event.id, status });
    }
    pass("event_status_ongoing");

    const { bracketService } = await import("../src/lib/services/bracket.service");
    const { resultService } = await import("../src/lib/services/result.service");
    const { BracketMatchOutcomeStyle } = await import("../src/generated/prisma");

    const { bracketId } = await withRetry("ensureBracketShell", () =>
      bracketService.ensureBracketShellForDivision(actor, {
        eventId: event.id,
        divisionId: division.id,
      }),
    );

    const m1 = await withRetry("createMatch1", () =>
      bracketService.createManualMatchWithPair(actor, {
        bracketId,
        redFighterId: fighterA.id,
        blueFighterId: fighterB.id,
        defaultCourtId: court.id,
      }),
    );
    const m2 = await withRetry("createMatch2", () =>
      bracketService.createManualMatchWithPair(actor, {
        bracketId,
        redFighterId: fighterC.id,
        blueFighterId: fighterB.id,
        defaultCourtId: court.id,
        allowDuplicateAssignment: true,
      }),
    );
    pass("bracket_two_matches", { m1: m1.matchId, m2: m2.matchId, bDuplicate: true });

    await resultService.confirmMatchResults(
      { kind: "organizer", actor },
      { matchId: m1.matchId, outcomeMode: "win_loss", winnerId: fighterA.id, resultType: BracketMatchOutcomeStyle.decision },
    );
    await resultService.confirmMatchResults(
      { kind: "organizer", actor },
      { matchId: m2.matchId, outcomeMode: "win_loss", winnerId: fighterB.id, resultType: BracketMatchOutcomeStyle.decision },
    );
    pass("results_confirmed", { m1: "A win", m2: "B win" });

    await eventService.changeEventStatus(actor, { eventId: event.id, status: "finished" });
    pass("event_finished_with_archive");

    ctx = {
      eventId: event.id,
      archiveId: (await prisma.eventArchive.findFirstOrThrow({ where: { eventId: event.id, version: 1 } })).id,
      fighterA: fighterA.id,
      fighterB: fighterB.id,
      fighterC: fighterC.id,
      fighterAName: fighterA.name,
      fighterBName: fighterB.name,
      fighterCName: fighterC.name,
      match1Id: m1.matchId,
      match2Id: m2.matchId,
      originalBName: fighterB.name,
      originalBGymId: fighterB.currentGymId,
      organizerLoginId: actor.loginId,
    };
  } else {
    pass("reuse_existing_event", { eventId: event!.id });
    const apps = await prisma.eventApplication.findMany({
      where: { eventId: event!.id },
      include: { fighter: true },
    });
    const fa = apps.find((a) => a.fighter.name.includes("A 선수"));
    const fb = apps.find((a) => a.fighter.name.includes("B 선수"));
    const fc = apps.find((a) => a.fighter.name.includes("C 선수"));
    assert.ok(fa && fb && fc);
    const matches = await prisma.bracketMatch.findMany({
      where: { bracket: { eventId: event!.id } },
      orderBy: { matchOrder: "asc" },
    });
    ctx = {
      eventId: event!.id,
      archiveId: event!.archives[0]!.id,
      fighterA: fa.fighterId,
      fighterB: fb.fighterId,
      fighterC: fc.fighterId,
      fighterAName: fa.fighter.name,
      fighterBName: fb.fighter.name,
      fighterCName: fc.fighter.name,
      match1Id: matches[0]!.id,
      match2Id: matches[1]!.id,
      originalBName: fb.fighter.name,
      originalBGymId: fb.fighter.currentGymId,
      organizerLoginId: actor.loginId,
    };
  }

  report.eventId = ctx.eventId;
  report.fighterIds = { A: ctx.fighterA, B: ctx.fighterB, C: ctx.fighterC };

  const ev = await prisma.event.findUniqueOrThrow({ where: { id: ctx.eventId } });
  assert.equal(ev.status, "finished");
  pass("event_status_finished");

  const archive = await prisma.eventArchive.findFirstOrThrow({
    where: { eventId: ctx.eventId, version: 1, status: "active" },
  });
  assert.equal(archive.version, 1);
  pass("archive_v1_active", { id: archive.id });

  const { measureSnapshotBytes } = await import("../src/lib/event-archive/types");
  report.archiveBytes = measureSnapshotBytes({
    eventSnapshot: archive.eventSnapshot,
    applicantsSnapshot: archive.applicantsSnapshot,
    bracketSnapshot: archive.bracketSnapshot,
    resultsSnapshot: archive.resultsSnapshot,
  });
  pass("archive_json_bytes", report.archiveBytes);

  const eventSnap = archive.eventSnapshot as { title?: string; eventDateLabel?: string };
  assert.equal(eventSnap.title, EVENT_TITLE);
  assert.ok(eventSnap.eventDateLabel);
  pass("event_snapshot", { title: eventSnap.title, date: eventSnap.eventDateLabel });

  const applicants = archive.applicantsSnapshot as { totalCount: number; rows: Array<{ fighterName: string }> };
  assert.equal(applicants.totalCount, 3);
  assert.ok(applicants.rows.some((r) => r.fighterName.includes("A 선수")));
  pass("applicant_snapshot_count", applicants.totalCount);

  const bracket = archive.bracketSnapshot as {
    matches: Array<{ matchId: string; red: { name: string } | null; blue: { name: string } | null }>;
  };
  assert.equal(bracket.matches.length, 2);
  const bMatches = bracket.matches.filter(
    (m) => m.red?.name?.includes("B 선수") || m.blue?.name?.includes("B 선수"),
  );
  assert.equal(bMatches.length, 2);
  pass("bracket_b_two_matches", bMatches.map((m) => m.matchId));

  const results = archive.resultsSnapshot as {
    rows: Array<{ fighterId: string; result: string; opponentId: string | null }>;
  };
  assert.equal(results.rows.length, 4);
  const aWin = results.rows.find((r) => r.fighterId === ctx.fighterA);
  const bLossVsA = results.rows.find((r) => r.fighterId === ctx.fighterB && r.opponentId === ctx.fighterA);
  const bWinVsC = results.rows.find((r) => r.fighterId === ctx.fighterB && r.opponentId === ctx.fighterC);
  const cLoss = results.rows.find((r) => r.fighterId === ctx.fighterC);
  assert.equal(aWin?.result, "win");
  assert.equal(bLossVsA?.result, "loss");
  assert.equal(bWinVsC?.result, "win");
  assert.equal(cLoss?.result, "loss");
  pass("results_snapshot_rows", { total: 4, aWin: true, bWin: true });

  const careerRows = await prisma.fighterCareerMatchRecord.findMany({
    where: { eventArchiveId: archive.id, status: "active" },
  });
  assert.equal(careerRows.length, 4);
  assert.equal(careerRows.filter((r) => r.fighterId === ctx.fighterB).length, 2);
  pass("career_active_records", { total: 4, bCount: 2 });

  const sA = await prisma.fighterCareerStats.findUnique({ where: { fighterId: ctx.fighterA } });
  const sB = await prisma.fighterCareerStats.findUnique({ where: { fighterId: ctx.fighterB } });
  const sC = await prisma.fighterCareerStats.findUnique({ where: { fighterId: ctx.fighterC } });
  assert.ok(sA && sB && sC);
  assert.equal(sA.wins, 1); assert.equal(sA.losses, 0); assert.equal(sA.totalMatches, 1);
  assert.equal(sB.wins, 1); assert.equal(sB.losses, 1); assert.equal(sB.totalMatches, 2);
  assert.equal(sC.wins, 0); assert.equal(sC.losses, 1); assert.equal(sC.totalMatches, 1);
  pass("career_stats", { A: "1-0", B: "1-1", C: "0-1" });

  const { fighterCareerService } = await import("../src/lib/services/fighter-career.service");
  await prisma.$transaction(async (tx) => {
    await fighterCareerService.syncFromArchiveInTransaction(tx, {
      eventId: ctx.eventId,
      eventArchiveId: archive.id,
      archiveVersion: 1,
      eventSnapshot: archive.eventSnapshot as never,
      resultsSnapshot: archive.resultsSnapshot as never,
    });
  });
  assert.equal(
    await prisma.fighterCareerMatchRecord.count({ where: { eventArchiveId: archive.id, status: "active" } }),
    4,
  );
  pass("idempotency_no_duplicate_career");

  const bCareer = careerRows.filter((r) => r.fighterId === ctx.fighterB);
  const snapName = bCareer[0]!.fighterNameSnapshot;
  await prisma.fighter.update({
    where: { id: ctx.fighterB },
    data: {
      name: `${PREFIX}B 선수 변경`,
      currentGymId: gymBeta.id,
    },
  });
  const archiveReload = await prisma.eventArchive.findUniqueOrThrow({ where: { id: archive.id } });
  const bracketReload = archiveReload.bracketSnapshot as typeof bracket;
  assert.ok(
    bracketReload.matches.filter((m) => m.red?.name?.includes("B") || m.blue?.name?.includes("B")).length === 2,
  );
  const careerReload = await prisma.fighterCareerMatchRecord.findMany({
    where: { fighterId: ctx.fighterB, eventArchiveId: archive.id, status: "active" },
  });
  assert.ok(careerReload.every((r) => r.fighterNameSnapshot === snapName));
  pass("immutability_live_fighter_change");

  await prisma.fighter.update({
    where: { id: ctx.fighterB },
    data: { name: ctx.originalBName, currentGymId: ctx.originalBGymId },
  });

  const archiveJsonBefore = JSON.stringify(archive.resultsSnapshot);
  await prisma.matchResult.updateMany({
    where: { eventId: ctx.eventId, fighterId: ctx.fighterA },
    data: { result: "loss" },
  });
  const archiveAfterLive = await prisma.eventArchive.findUniqueOrThrow({ where: { id: archive.id } });
  assert.equal(JSON.stringify(archiveAfterLive.resultsSnapshot), archiveJsonBefore);
  pass("archive_immutable_after_live_result_change");

  await prisma.matchResult.updateMany({
    where: { eventId: ctx.eventId, fighterId: ctx.fighterA },
    data: { result: "win" },
  });

  const { eventArchiveApplicantExcelService } = await import(
    "../src/lib/services/event-archive-applicant-excel.service"
  );
  const excel = await eventArchiveApplicantExcelService.buildWorkbookFromArchive(
    actor,
    ctx.eventId,
    ["fighterName", "gymName", "applicationStatus"],
  );
  const xlsxPath = join(OUT, "archive-applicants.xlsx");
  writeFileSync(xlsxPath, excel.buffer);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  const sheet = wb.worksheets[0]!;
  const headerRow = sheet.getRow(1).values as (string | undefined)[];
  assert.ok(headerRow.some((h) => typeof h === "string" && h.includes("선수")));
  assert.equal(sheet.rowCount, 4);
  const bodyText = sheet.getSheetValues().flat().join("|");
  assert.ok(bodyText.includes(ctx.fighterAName.split(" ").pop() ?? "A 선수"));
  pass("archive_excel_download", { rows: excel.rowCount, filename: excel.filename });

  const correctedResults = structuredClone(archive.resultsSnapshot) as typeof results;
  for (const row of correctedResults.rows) {
    if (row.fighterId === ctx.fighterA) row.result = "loss";
    if (row.fighterId === ctx.fighterB && row.opponentId === ctx.fighterA) row.result = "win";
    if (row.fighterId === ctx.fighterB && row.opponentId === ctx.fighterC) row.result = "win";
    if (row.fighterId === ctx.fighterC) row.result = "loss";
  }
  await fighterCareerService.rebuildCareerForEventArchive({
    eventId: ctx.eventId,
    eventArchiveId: archive.id,
    archiveVersion: 1,
    eventSnapshot: archive.eventSnapshot as never,
    resultsSnapshot: correctedResults as never,
  });
  const sA2 = await prisma.fighterCareerStats.findUnique({ where: { fighterId: ctx.fighterA } });
  const sB2 = await prisma.fighterCareerStats.findUnique({ where: { fighterId: ctx.fighterB } });
  const sC2 = await prisma.fighterCareerStats.findUnique({ where: { fighterId: ctx.fighterC } });
  assert.equal(sA2!.wins, 0); assert.equal(sA2!.losses, 1);
  assert.equal(sB2!.wins, 2); assert.equal(sB2!.losses, 0);
  assert.equal(sC2!.wins, 0); assert.equal(sC2!.losses, 1);
  const activeAfterRebuild = await prisma.fighterCareerMatchRecord.count({
    where: { eventArchiveId: archive.id, status: "active" },
  });
  assert.equal(activeAfterRebuild, 4);
  pass("rebuild_career_corrected", { A: "0-1", B: "2-0", C: "0-1" });

  await fighterCareerService.rebuildCareerForEventArchive({
    eventId: ctx.eventId,
    eventArchiveId: archive.id,
    archiveVersion: 1,
    eventSnapshot: archive.eventSnapshot as never,
    resultsSnapshot: archive.resultsSnapshot as never,
  });
  pass("rebuild_career_restored");

  writeFileSync(join(OUT, "context.json"), JSON.stringify(ctx, null, 2));
  return ctx;
}

async function runBrowserE2E(eventCtx: E2ECtx) {
  const { chromium } = await import("@playwright/test");
  const consoleErrors: string[] = [];
  const browser = await chromium.launch({ headless: true });

  async function withPage(viewport: { width: number; height: number }, fn: (page: import("playwright-core").Page) => Promise<void>) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await fn(page);
    await page.close();
  }

  await withPage({ width: 1440, height: 900 }, async (page) => {
    await login(page, eventCtx.organizerLoginId, DEMO_PASSWORD);
    await page.goto(`${BASE}/organizer/events/${eventCtx.eventId}/archive`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.getByRole("heading", { name: "대회 기록", exact: true }).waitFor({ timeout: 30000 });
    const body = await page.locator("body").innerText();
    assert.ok(body.includes("요약") || body.includes(EVENT_TITLE.slice(0, 20)));
    await page.screenshot({ path: join(OUT, "archive-1440.png"), fullPage: true });

    const tabs = ["신청자", "최종 대진표", "경기 결과"];
    for (const tab of tabs) {
      const btn = page.getByRole("button", { name: tab }).or(page.getByRole("tab", { name: tab }));
      if (await btn.count()) {
        await btn.first().click();
        await page.waitForTimeout(500);
      }
    }
    await page.screenshot({ path: join(OUT, "archive-tabs-1440.png"), fullPage: true });

    await page.emulateMedia({ media: "print" });
    await page.screenshot({ path: join(OUT, "archive-print-applicants-1440.png"), fullPage: true });
    pass("browser_archive_print_applicants");

    const bracketTab = page.getByRole("button", { name: "최종 대진표" }).or(page.getByRole("tab", { name: "최종 대진표" }));
    if (await bracketTab.count()) await bracketTab.first().click();
    await page.screenshot({ path: join(OUT, "archive-print-bracket-1440.png"), fullPage: true });
    pass("browser_archive_print_bracket");

    await page.emulateMedia({ media: "screen" });
    pass("browser_archive_1440");
  });

  await withPage({ width: 1440, height: 900 }, async (page) => {
    await login(page, "admin", DEMO_PASSWORD);
    await page.goto(`${BASE}/admin/fighters`, { waitUntil: "networkidle", timeout: 90000 });
    await page.screenshot({ path: join(OUT, "fighters-list-1440.png"), fullPage: true });
    pass("browser_fighters_list_1440");
  });

  await withPage({ width: 1440, height: 900 }, async (page) => {
    await login(page, "admin", DEMO_PASSWORD);
    await page.goto(`${BASE}/admin/fighters/${eventCtx.fighterB}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    const text = await page.locator("body").innerText();
    assert.ok(text.includes("1승") && text.includes("1패"));
    await page.screenshot({ path: join(OUT, "fighter-b-detail-1440.png"), fullPage: true });
    pass("browser_fighter_b_detail_1440");
  });

  await withPage({ width: 390, height: 844 }, async (page) => {
    await login(page, "admin", DEMO_PASSWORD);
    await page.goto(`${BASE}/admin/fighters/${eventCtx.fighterB}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.screenshot({ path: join(OUT, "fighter-b-390.png"), fullPage: true });
    const overflow = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    assert.ok(overflow.sw <= overflow.cw + 2, `horizontal overflow ${overflow.sw} > ${overflow.cw}`);
    pass("browser_fighter_b_390");
  });

  await withPage({ width: 390, height: 844 }, async (page) => {
    await login(page, eventCtx.organizerLoginId, DEMO_PASSWORD);
    await page.goto(`${BASE}/organizer/events/${eventCtx.eventId}/archive`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.screenshot({ path: join(OUT, "archive-390.png"), fullPage: true });
    pass("browser_archive_390");
  });

  await browser.close();
  const bad = consoleErrors.filter((e) => !/favicon|hydration|ResizeObserver|Failed to load resource/i.test(e));
  if (bad.length) report.checks.console_errors = bad;
  else pass("browser_no_console_errors");
}

try {
  const ctx = await runServiceE2E();
  if (!skipBrowser) await runBrowserE2E(ctx);
  else pass("browser_skipped");
} catch (e) {
  report.verdict = "ARCHIVE_CAREER_E2E_BLOCKED";
  report.blockedReason = e instanceof Error ? e.message : String(e);
  console.error(e);
}

writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log("\n=== VERDICT:", report.verdict, "===");
if (report.verdict !== "ARCHIVE_CAREER_E2E_PASS") process.exit(1);
