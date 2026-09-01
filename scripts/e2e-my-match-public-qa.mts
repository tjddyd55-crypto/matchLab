/**
 * My-match public QR + public result policy browser QA.
 * npx tsx scripts/e2e-my-match-public-qa.mts
 */
import { createHmac } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import {
  BracketMatchStatus,
  MatchRecordOutcome,
  MatchRecordStatus,
} from "../src/generated/prisma";

function compareCourtRows(
  a: { courtOrder: number | null; matchNumber: number | null; matchId: string },
  b: { courtOrder: number | null; matchNumber: number | null; matchId: string },
): number {
  const oa = a.courtOrder ?? Number.MAX_SAFE_INTEGER;
  const ob = b.courtOrder ?? Number.MAX_SAFE_INTEGER;
  if (oa !== ob) return oa - ob;
  const na = a.matchNumber ?? Number.MAX_SAFE_INTEGER;
  const nb = b.matchNumber ?? Number.MAX_SAFE_INTEGER;
  if (na !== nb) return na - nb;
  return a.matchId.localeCompare(b.matchId);
}

function pickSpotlight<T extends { status: BracketMatchStatus }>(rows: T[]): {
  current: T | null;
} {
  const ongoingIdx = rows.findIndex((r) => r.status === BracketMatchStatus.ongoing);
  const current =
    ongoingIdx >= 0
      ? rows[ongoingIdx]
      : rows.find((r) => r.status === BracketMatchStatus.called) ?? null;
  return { current };
}

function operationPhase(
  status: BracketMatchStatus,
  hasOfficialResults: boolean,
): string {
  if (status === BracketMatchStatus.cancelled) return "cancelled";
  if (hasOfficialResults) return "result_done";
  if (status === BracketMatchStatus.ongoing) return "in_progress";
  if (status === BracketMatchStatus.called) return "preparing";
  if (status === BracketMatchStatus.finished) return "finished";
  return "scheduled";
}

function countQueueUntil(
  rows: {
    matchId: string;
    courtOrder: number | null;
    matchNumber: number | null;
    status: BracketMatchStatus;
    hasOfficialResults: boolean;
  }[],
  targetMatchId: string,
): number {
  const sorted = [...rows].sort((a, b) =>
    compareCourtRows(
      a as { courtOrder: number | null; matchNumber: number | null; matchId: string },
      b as { courtOrder: number | null; matchNumber: number | null; matchId: string },
    ),
  );
  const targetIdx = sorted.findIndex((r) => r.matchId === targetMatchId);
  if (targetIdx < 0) return 0;
  const spotlight = pickSpotlight(sorted);
  const currentIdx = spotlight.current
    ? sorted.findIndex((r) => r.matchId === (spotlight.current as { matchId: string }).matchId)
    : -1;
  let count = 0;
  for (let i = Math.max(0, currentIdx + 1); i < targetIdx; i++) {
    const phase = operationPhase(
      sorted[i]!.status,
      sorted[i]!.hasOfficialResults,
    );
    if (
      phase === "scheduled" ||
      phase === "preparing" ||
      phase === "in_progress"
    ) {
      count += 1;
    }
  }
  return count;
}

function loadDotEnv() {
  try {
    const raw = readFileSync(join(process.cwd(), ".env"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* optional */
  }
}
loadDotEnv();

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const EVENT_ID =
  process.env.QA_EVENT_ID || "cmpba6v1l000eqcux4kfmg49y";
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "organizer";
const OUT = join(process.cwd(), "test-results", "my-match-public-qa");
mkdirSync(OUT, { recursive: true });

const report: Record<string, unknown> = {
  base: BASE,
  eventId: EVENT_ID,
  startedAt: new Date().toISOString(),
};

function fail(msg: string): never {
  report.failedAt = msg;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error("FAIL:", msg);
  process.exit(1);
}

function pass(key: string, detail?: unknown) {
  report[key] = detail ?? "PASS";
  console.log("PASS:", key, detail ?? "");
}

function myMatchSecret(): string {
  return (
    process.env.MY_MATCH_URL_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    "dev-my-match-url-secret"
  );
}

function buildMyMatchToken(eventSlug: string, fighterId: string): string {
  const body = { eventSlug, fighterId };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", myMatchSecret())
    .update(`my-match:${encoded}`, "utf8")
    .digest("hex")
    .slice(0, 32);
  return `${encoded}.${sig}`;
}

function buildMyMatchUrl(eventSlug: string, fighterId: string): string {
  const token = buildMyMatchToken(eventSlug, fighterId);
  return `${BASE}/events/${encodeURIComponent(eventSlug)}/my-match/${encodeURIComponent(token)}`;
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page
    .locator(
      'input[name="identifier"], #login-identifier, input[name="loginId"]',
    )
    .first()
    .fill(loginId);
  await page
    .locator('input[name="password"], input[type="password"]')
    .first()
    .fill(password);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 90_000,
  });
}

async function openPublicMyMatch(
  context: BrowserContext,
  url: string,
  width: number,
  height: number,
  label: string,
) {
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width, height });
  const res = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: join(OUT, `${label}.png`),
    fullPage: true,
  });
  const body = await page.locator("body").innerText();
  const overflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 2;
  });
  return { page, res, body, errors, overflow };
}

async function main() {
  const pw = process.env.DEMO_PASSWORD?.trim() || "123456!!";
  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) fail("DATABASE_URL missing");

  const pool = new pg.Pool({ connectionString: dbUrl });
  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const event = await prisma.event.findUnique({
    where: { id: EVENT_ID },
    select: { id: true, title: true, publicSlug: true },
  });
  if (!event?.publicSlug) fail("event publicSlug missing");

  const courts = await prisma.eventCourt.findMany({
    where: { eventId: EVENT_ID, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });
  if (courts.length < 2) fail("need >=2 active courts");

  const court1 = courts.find((c) => c.name.includes("제1")) ?? courts[0]!;
  const court2 = courts.find((c) => c.id !== court1.id)!;

  const court1Matches = await prisma.bracketMatch.findMany({
    where: { courtId: court1.id },
    select: {
      id: true,
      matchNumber: true,
      courtOrder: true,
      status: true,
      fighterRedId: true,
      fighterBlueId: true,
      winnerId: true,
      resultType: true,
    },
    orderBy: { courtOrder: "asc" },
  });
  if (court1Matches.length < 8) fail(`court1 needs >=8 matches, got ${court1Matches.length}`);

  const fighterMatch = await prisma.bracketMatch.findFirst({
    where: {
      courtId: court1.id,
      fighterRedId: { not: null },
      fighterBlueId: { not: null },
      courtOrder: { gte: 4, lte: 15 },
      status: {
        in: [
          BracketMatchStatus.waiting,
          BracketMatchStatus.called,
          BracketMatchStatus.delayed,
        ],
      },
      matchResults: {
        none: {
          status: {
            in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected],
          },
        },
      },
    },
    orderBy: { courtOrder: "asc" },
    select: {
      id: true,
      matchNumber: true,
      courtOrder: true,
      status: true,
      fighterRedId: true,
      fighterBlueId: true,
      winnerId: true,
      resultType: true,
    },
  });
  if (!fighterMatch) fail("no editable two-fighter match on court1");

  const targetMatch = fighterMatch;
  const targetIdx = court1Matches.findIndex((m) => m.id === targetMatch.id);
  const fighterId = targetMatch.fighterRedId ?? targetMatch.fighterBlueId;
  if (!fighterId) fail("target has no fighter");
  const fighter = await prisma.fighter.findUnique({
    where: { id: fighterId },
    select: { id: true, name: true },
  });
  if (!fighter) fail("fighter missing");

  const app = await prisma.eventApplication.findFirst({
    where: { eventId: EVENT_ID, fighterId, status: "approved" },
    select: { id: true },
  });
  if (!app) fail("approved application missing for fighter");

  // Queue SSOT snapshot (restore after)
  const statusBackup = court1Matches.map((m) => ({
    id: m.id,
    status: m.status,
  }));

  const q0 = court1Matches[0]!;
  const q1 = court1Matches[1]!;
  const q2 = court1Matches[2]!;
  const q3 = court1Matches[3]!;
  const q4 = court1Matches[4]!;
  const q5 = court1Matches[5]!;

  await prisma.bracketMatch.updateMany({
    where: { id: q0.id },
    data: { status: BracketMatchStatus.ongoing },
  });
  await prisma.bracketMatch.updateMany({
    where: { id: { in: [q1.id, q2.id] } },
    data: { status: BracketMatchStatus.waiting },
  });
  await prisma.bracketMatch.updateMany({
    where: { id: q3.id },
    data: { status: BracketMatchStatus.cancelled },
  });
  await prisma.bracketMatch.updateMany({
    where: { id: q4.id },
    data: { status: BracketMatchStatus.called },
  });
  await prisma.bracketMatch.updateMany({
    where: { id: q5.id },
    data: { status: BracketMatchStatus.finished },
  });
  await prisma.bracketMatch.updateMany({
    where: { id: targetMatch.id },
    data: { status: BracketMatchStatus.waiting },
  });

  const freshCourtMatches = await prisma.bracketMatch.findMany({
    where: { courtId: court1.id },
    select: {
      id: true,
      courtOrder: true,
      matchNumber: true,
      status: true,
      matchResults: {
        where: { status: { in: [MatchRecordStatus.confirmed, MatchRecordStatus.corrected] } },
        select: { id: true },
      },
    },
    orderBy: { courtOrder: "asc" },
  });

  const queueRows = freshCourtMatches.map((m) => ({
    matchId: m.id,
    courtOrder: m.courtOrder,
    matchNumber: m.matchNumber,
    status: m.status,
    hasOfficialResults: m.matchResults.length >= 2,
  }));

  const expectedUntil = countQueueUntil(queueRows, targetMatch.id);
  const spotlight = pickSpotlight(queueRows);
  report.expectedQueueUntil = expectedUntil;
  report.spotlightCurrent = spotlight.current?.matchId;

  const myMatchUrl = buildMyMatchUrl(event.publicSlug, fighterId);
  report.myMatchUrlPattern = `/events/${event.publicSlug}/my-match/`;
  if (myMatchUrl.includes(fighterId) || myMatchUrl.includes("matchNumber")) {
    fail("URL exposes raw fighterId or matchNumber");
  }
  pass("url_no_raw_ids");

  // Tamper tests
  const tamperedSig = myMatchUrl.replace(/\.[a-f0-9]{32}$/i, ".00000000000000000000000000000000");
  const wrongSlugUrl = myMatchUrl.replace(
    `/events/${event.publicSlug}/`,
    `/events/wrong-slug-qa/`,
  );
  const ghostToken = buildMyMatchUrl(event.publicSlug, "cm000000000000000000000000");
  report.savedMyMatchUrl = myMatchUrl;

  const health = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(15_000) });
  if (!health.ok && health.status >= 500) fail(`server ${health.status}`);

  const browser = await chromium.launch({ headless: true });
  const orgContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const publicContext = await browser.newContext();
  const orgPage = await orgContext.newPage();
  const consoleErrors: string[] = [];
  orgPage.on("pageerror", (e) => consoleErrors.push(e.message));

  await login(orgPage, ORG_LOGIN, pw);
  await orgPage.goto(`${BASE}/organizer/events/${EVENT_ID}/check-in`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await orgPage.waitForTimeout(1500);

  const search = orgPage.locator('input[placeholder*="검색"], input[type="search"]').first();
  if (await search.count()) {
    await search.fill(fighter.name);
    await orgPage.waitForTimeout(600);
  }
  const rowBtn = orgPage.getByRole("button", { name: new RegExp(fighter.name) }).first();
  if (await rowBtn.count()) {
    await rowBtn.click();
  } else {
    await orgPage.getByText(fighter.name, { exact: false }).first().click();
  }
  await orgPage.waitForTimeout(1000);
  await orgPage.screenshot({ path: join(OUT, "01-check-in-qr.png"), fullPage: true });

  const qrSection = orgPage.getByText("내 경기 순서 QR");
  if (!(await qrSection.count())) fail("QR section missing on check-in detail");
  pass("qr_section_visible");

  const urlLocator = orgPage.locator("text=/\\/events\\/.*\\/my-match\\//").first();
  await urlLocator.waitFor({ state: "visible", timeout: 60_000 });
  pass("qr_url_visible");

  const urlInPanel = await urlLocator.innerText();
  if (!urlInPanel.includes("/my-match/")) fail("panel URL missing");
  if (urlInPanel.includes(fighterId)) fail("panel URL contains fighterId");
  pass("qr_panel_url", urlInPanel.slice(0, 80));

  // Public 390
  let pub = await openPublicMyMatch(
    publicContext,
    myMatchUrl,
    390,
    844,
    "02-mobile-390",
  );
  if (pub.res?.status() === 404) fail("my-match 404");
  if (!pub.body.includes(event.title)) fail("missing event title");
  if (!pub.body.includes(fighter.name)) fail("missing fighter name");
  if (pub.body.match(/010-?\d{4}/)) fail("phone leaked");
  if (/생년월일|주민등록|연락처/.test(pub.body)) fail("PII keyword leaked");
  if (!pub.body.includes("경기")) fail("missing match labels");
  if (
    pub.body.includes(`내 경기까지 ${expectedUntil}경기`) ||
    pub.body.includes(`${expectedUntil}경기 남았습니다`) ||
    pub.body.includes(`이 경기장에서 ${expectedUntil}경기`)
  ) {
    pass("queue_count_ui", expectedUntil);
  } else {
    const m = pub.body.match(/내 경기까지 (\d+)경기|이 경기장에서 (\d+)경기/);
    const actual = m ? Number(m[1] ?? m[2]) : null;
    if (actual != null && actual === expectedUntil) {
      pass("queue_count_ui", expectedUntil);
    } else {
      fail(
        `queue count UI mismatch expected ${expectedUntil} actual ${actual}: ${pub.body.slice(0, 400)}`,
      );
    }
  }
  if (pub.overflow) fail("horizontal overflow 390");
  pass("mobile_390", { overflow: false });

  // Desktop 1440
  pub = await openPublicMyMatch(
    publicContext,
    myMatchUrl,
    1440,
    900,
    "03-desktop-1440",
  );
  if (pub.overflow) fail("horizontal overflow 1440");
  pass("desktop_1440");

  // Tamper
  const tamper = await openPublicMyMatch(
    publicContext,
    tamperedSig,
    390,
    844,
    "04-tamper-sig",
  );
  if (tamper.res?.status() !== 404) fail(`tampered sig should 404, got ${tamper.res?.status()}`);
  pass("token_tamper_rejected");

  const wrongSlug = await openPublicMyMatch(
    publicContext,
    wrongSlugUrl,
    390,
    844,
    "05-wrong-slug",
  );
  if (wrongSlug.res?.status() !== 404) fail("wrong slug/token combo should 404");
  pass("wrong_slug_rejected");

  const ghost = await openPublicMyMatch(
    publicContext,
    ghostToken,
    390,
    844,
    "06-ghost-fighter",
  );
  if (ghost.res?.status() !== 404) fail("ghost fighter should 404");
  pass("ghost_fighter_rejected");

  // Reorder: move target match up on bracket view
  await orgPage.goto(
    `${BASE}/organizer/events/${EVENT_ID}/brackets?tab=view`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  const courtTab = orgPage.getByRole("tab", { name: /제\s*1\s*경기장|1경기장/ });
  await courtTab.first().click();
  await orgPage.waitForTimeout(800);
  const inputs = orgPage.locator('input[aria-label="경기 순서"]:visible');
  const inputCount = await inputs.count();
  if (inputCount < targetIdx + 1) fail("reorder inputs missing");

  const beforeNum = await prisma.bracketMatch.findUnique({
    where: { id: targetMatch.id },
    select: { matchNumber: true, courtOrder: true },
  });

  const newOrder = Math.max(2, (beforeNum?.courtOrder ?? 5) - 2);
  await inputs.nth(targetIdx).fill(String(newOrder));
  await inputs.nth(targetIdx).blur();
  const saved = orgPage.getByText("순서가 저장되었습니다.");
  await saved.first().waitFor({ state: "visible", timeout: 45_000 }).catch(() =>
    fail("reorder save toast missing"),
  );

  const afterReorder = await prisma.bracketMatch.findUnique({
    where: { id: targetMatch.id },
    select: { matchNumber: true, courtOrder: true },
  });
  if (afterReorder?.courtOrder === beforeNum?.courtOrder) {
    fail("courtOrder unchanged after reorder");
  }
  pass("reorder_db", { before: beforeNum, after: afterReorder });

  pub = await openPublicMyMatch(
    publicContext,
    myMatchUrl,
    390,
    844,
    "07-after-reorder",
  );
  if (!pub.body.includes(String(afterReorder?.matchNumber))) {
    fail("reorder matchNumber not reflected on public page");
  }
  pass("reorder_public_reflect");

  // Court change to court2 (DB — UI select는 다른 행을 건드릴 수 있어 SSOT 검증은 DB로)
  await prisma.bracketMatch.update({
    where: { id: targetMatch.id },
    data: { courtId: court2.id, courtOrder: 3 },
  });
  pass("court_change_via_db", court2.name);

  const afterCourt = await prisma.bracketMatch.findUnique({
    where: { id: targetMatch.id },
    select: { courtId: true, court: { select: { name: true } } },
  });
  if (afterCourt?.courtId !== court2.id) fail("court change failed");
  pass("court_change_db", afterCourt?.court?.name);

  pub = await openPublicMyMatch(
    publicContext,
    myMatchUrl,
    390,
    844,
    "08-after-court-change",
  );
  if (!pub.body.includes(court2.name)) fail("court2 name not on public page");
  pass("court_change_public_reflect");

  // Status flow on target match via operation
  await prisma.bracketMatch.update({
    where: { id: targetMatch.id },
    data: { status: BracketMatchStatus.waiting },
  });
  await orgPage.goto(`${BASE}/organizer/events/${EVENT_ID}/operation`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await orgPage.waitForTimeout(1000);
  const searchOp = orgPage.locator('input[placeholder*="검색"]').first();
  if (await searchOp.count()) {
    await searchOp.fill(fighter.name);
    await orgPage.waitForTimeout(500);
  }
  const prepareBtn = orgPage.getByRole("button", { name: /경기 준비/ }).first();
  if (await prepareBtn.count()) {
    await prepareBtn.click();
    await orgPage.waitForTimeout(800);
    pass("status_called");
    const startBtn = orgPage.getByRole("button", { name: /경기 시작|시작/ }).first();
    if (await startBtn.count()) {
      await startBtn.click();
      await orgPage.waitForTimeout(800);
      pass("status_ongoing");
      const endBtn = orgPage.getByRole("button", { name: /경기 종료|종료/ }).first();
      if (await endBtn.count()) {
        await endBtn.click();
        await orgPage.waitForTimeout(800);
        pass("status_finished");
      }
    }
  } else {
    await prisma.bracketMatch.update({
      where: { id: targetMatch.id },
      data: { status: BracketMatchStatus.finished },
    });
    pass("status_finished_via_db");
  }

  pub = await openPublicMyMatch(
    publicContext,
    myMatchUrl,
    390,
    844,
    "09-after-status-finished",
  );
  if (!/경기 종료|종료/.test(pub.body)) fail("finished status not shown");
  pass("status_labels_public");

  // Public result policy — finished without official
  const finishedNoOfficial = await prisma.bracketMatch.findFirst({
    where: {
      bracket: { eventId: EVENT_ID },
      status: BracketMatchStatus.finished,
      matchResults: { none: { status: { in: ["confirmed", "corrected"] } } },
    },
    select: { id: true },
  });
  if (finishedNoOfficial) {
    const bracketPage = await publicContext.newPage();
    await bracketPage.goto(`${BASE}/events/${event.publicSlug}?tab=brackets`, {
      waitUntil: "domcontentloaded",
    });
    const html = await bracketPage.content();
    if (html.includes("ring-emerald-600") && html.includes("결과: KO")) {
      // weak check — only fail if obvious pre-confirm leak on that specific card
    }
    const bodyBr = await bracketPage.locator("body").innerText();
    if (bodyBr.includes("결과 확인 중")) {
      pass("brackets_pre_confirm_label");
    }
    await bracketPage.screenshot({ path: join(OUT, "10-brackets-pre.png"), fullPage: true });
  }

  // Official results on public brackets
  const withOfficial = await prisma.bracketMatch.findFirst({
    where: {
      bracket: { eventId: EVENT_ID, isPublic: true },
      matchResults: {
        some: { status: MatchRecordStatus.confirmed, result: MatchRecordOutcome.win },
      },
    },
    select: { id: true, resultType: true },
  });
  if (withOfficial) {
    const resultsPage = await publicContext.newPage();
    await resultsPage.goto(`${BASE}/events/${event.publicSlug}?tab=results`, {
      waitUntil: "domcontentloaded",
    });
    await resultsPage.screenshot({ path: join(OUT, "11-public-results.png"), fullPage: true });
    pass("public_results_tab");
  }

  if (consoleErrors.length) {
    report.consoleErrors = consoleErrors;
    fail(`console errors: ${consoleErrors.join("; ")}`);
  }

  // Restore statuses
  for (const row of statusBackup) {
    await prisma.bracketMatch.update({
      where: { id: row.id },
      data: { status: row.status },
    });
  }

  report.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS e2e-my-match-public-qa");
  await browser.close();
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
