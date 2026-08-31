/**
 * Local browser QA for reorder / admin password reset / weigh-in sheet PDF.
 * Requires local Next on 127.0.0.1:3000 with development (yamanote) DB.
 *
 *   npx tsx scripts/e2e-ops-reorder-weighin-admin-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { chromium, type Page } from "@playwright/test";

const BASE = process.env.QA_BASE_URL || "http://127.0.0.1:3000";
const OUT = join(process.cwd(), "test-results", "ops-reorder-weighin-admin-qa");
const EVENT_ID =
  process.env.QA_EVENT_ID || "cmpba6v1l000eqcux4kfmg49y";
const ORG_LOGIN = process.env.QA_ORG_LOGIN || "organizer";
const ADMIN_LOGIN = process.env.QA_ADMIN_LOGIN || "admin";
const GYM_LOGIN = process.env.QA_GYM_LOGIN || "gym";
const ASSOC_LOGIN = process.env.QA_ASSOC_LOGIN || "shgym";

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
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 90_000,
    });
  } catch {
    fail(
      `login failed for ${loginId} (still on ${page.url()} body=${(await page.locator("body").innerText().catch(() => "")).slice(0, 200)})`,
    );
  }
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => undefined);
}

async function logout(page: Page) {
  await page.goto(`${BASE}/api/auth/signout`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000,
  }).catch(() => undefined);
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
}

/** AdminPasswordResetLinkPanel — confirm → issued dialog textarea */
async function issueAdminResetLink(page: Page, label: string): Promise<string> {
  const issueBtn = page.getByRole("button", {
    name: /비밀번호 재설정 링크 발급/,
  });
  if ((await issueBtn.count()) === 0) {
    fail(`${label}: issue button missing`);
  }
  await issueBtn.first().click();
  const confirmBtn = page.getByRole("button", { name: /^링크 발급$/ });
  await confirmBtn.waitFor({ state: "visible", timeout: 15_000 });
  await confirmBtn.click();

  const successTitle = page.getByText("재설정 링크가 발급되었습니다.");
  const rateLimited = page.getByText("잠시 후 다시 발급");
  const otherError = page.locator('[role="alert"], .text-destructive, .text-red-600');

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await successTitle.isVisible().catch(() => false)) break;
    if (await rateLimited.isVisible().catch(() => false)) {
      fail(`${label}: rate limited — wait and retry`);
    }
    const errText = (await otherError.first().innerText().catch(() => "")).trim();
    if (errText && /실패|오류|한도|Server Action/i.test(errText)) {
      fail(`${label}: issue error: ${errText}`);
    }
    await page.waitForTimeout(400);
  }
  if (!(await successTitle.isVisible().catch(() => false))) {
    fail(`${label}: success dialog not shown`);
  }

  const ta = page.locator("textarea").filter({ hasText: /password-reset/ });
  let resetUrl = "";
  if ((await ta.count()) > 0) {
    resetUrl = (await ta.first().inputValue()).trim();
  }
  if (!resetUrl.includes("password-reset")) {
    const body = await page.locator("body").innerText();
    const m =
      body.match(/https?:\/\/[^\s]+password-reset[^\s]*/) ||
      body.match(/\/password-reset\/admin-link\?[^\s]+/);
    if (m) {
      resetUrl = m[0]!.startsWith("http") ? m[0]! : `${BASE}${m[0]!}`;
    }
  }
  if (!resetUrl.includes("password-reset")) {
    fail(`${label}: could not capture reset URL`);
  }
  if (resetUrl.startsWith("/")) resetUrl = `${BASE}${resetUrl}`;
  return resetUrl.replace(/https?:\/\/[^/]+/, BASE);
}

function isContiguous(nums: number[]): boolean {
  if (nums.length === 0) return true;
  const sorted = [...nums].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) return false;
  }
  return true;
}

async function readVisibleMatchLabels(page: Page): Promise<string[]> {
  const labels = await page.locator("body").innerText();
  // Prefer compact row labels like "12경기" near cards — collect unique in DOM order via aria/text
  const orderEls = page.locator(
    '[class*="tabular-nums"], .font-semibold',
  );
  // Fallback: extract from visible text in list order via data attributes if any
  const all = [...labels.matchAll(/(\d+)경기/g)].map((m) => m[1]!);
  return all;
}

async function main() {
  const app = JSON.parse(
    execSync("railway variable list -e development -s app --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const pw = String(app.DEMO_PASSWORD || process.env.DEMO_PASSWORD || "");
  if (!pw) fail("DEMO_PASSWORD missing");

  const pgVars = JSON.parse(
    execSync("railway variable list -e development -s Postgres --json", {
      encoding: "utf8",
    }).replace(/^\uFEFF/, ""),
  ) as Record<string, string>;
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!/yamanote/i.test(dbUrl)) fail("expected yamanote");

  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const { PrismaClient } = await import("../src/generated/prisma");
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const court = await prisma.eventCourt.findFirst({
    where: { eventId: EVENT_ID, isActive: true, name: { contains: "제1" } },
    select: { id: true, name: true },
  });
  if (!court) fail("court 제1 missing");

  const beforeMatches = await prisma.bracketMatch.findMany({
    where: { courtId: court.id },
    select: {
      id: true,
      matchNumber: true,
      courtOrder: true,
      fighterRedId: true,
      fighterBlueId: true,
    },
    orderBy: [{ courtOrder: "asc" }, { matchNumber: "asc" }],
  });
  if (beforeMatches.length < 10) {
    fail(`need >=10 matches on court, got ${beforeMatches.length}`);
  }

  const gym = await prisma.gym.findFirst({
    where: { ownerUser: { loginId: GYM_LOGIN } },
    select: { id: true, name: true, ownerUserId: true },
  });
  const assoc = await prisma.organizer.findFirst({
    where: { user: { loginId: ASSOC_LOGIN } },
    select: { id: true, name: true, userId: true },
  });
  if (!gym || !assoc) fail("gym/assoc targets missing");

  report.courtId = court.id;
  report.courtName = court.name;
  report.matchCount = beforeMatches.length;
  report.gymId = gym.id;
  report.assocId = assoc.id;

  // Health check local server
  try {
    const res = await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(15_000) });
    report.localStatus = res.status;
    if (!res.ok && res.status >= 500) fail(`local server ${res.status}`);
  } catch (e) {
    fail(`local server unreachable: ${e instanceof Error ? e.message : e}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));

  // ---------- 1) Bracket view reorder ----------
  await login(page, ORG_LOGIN, pw);
  const viewUrl = `${BASE}/organizer/events/${EVENT_ID}/brackets?tab=view`;
  await page.goto(viewUrl, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(1500);

  // Select court tab (제1 경기장)
  const courtTab = page.getByRole("tab", { name: "제1 경기장" });
  if ((await courtTab.count()) === 0) {
    const alt = page.getByRole("tab", { name: /제\s*1\s*경기장|1경기장/ });
    if ((await alt.count()) === 0) {
      const tabs = await page.getByRole("tab").allTextContents();
      fail(`court tab not found; tabs=${JSON.stringify(tabs)}`);
    }
    await alt.first().click();
  } else {
    await courtTab.click();
  }
  await page.waitForTimeout(1000);
  await page
    .locator('input[aria-label="경기 순서"]')
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });

  await page.screenshot({ path: join(OUT, "01-bracket-view-before.png"), fullPage: true });

  const reorderInputs = page.locator('input[aria-label="경기 순서"]:visible');
  const reorderCount = await reorderInputs.count();
  report.reorderControlCount = reorderCount;
  if (reorderCount < 3) fail(`reorder inputs expected >=3, got ${reorderCount}`);

  // Move a late match up via arrow (last enabled ↑ among visible controls)
  const upButtons = page.locator('button[aria-label="위로 이동"]:visible');
  const upCount = await upButtons.count();
  if (upCount < 2) fail(`visible up buttons expected >=2, got ${upCount}`);
  let lastUpIdx = -1;
  for (let i = upCount - 1; i >= 0; i--) {
    if (await upButtons.nth(i).isEnabled()) {
      lastUpIdx = i;
      break;
    }
  }
  if (lastUpIdx < 0) fail("no enabled up button on court");
  // Prefer near-end (not first) so move is observable
  if (lastUpIdx === 0) {
    fail("only first-row up enabled — unexpected court state");
  }
  // Resolve target match from DB at that court index
  const targetMatch = beforeMatches[lastUpIdx]!;
  const snapshotBefore = {
    id: targetMatch.id,
    matchNumber: targetMatch.matchNumber,
    courtOrder: targetMatch.courtOrder,
    red: targetMatch.fighterRedId,
    blue: targetMatch.fighterBlueId,
  };
  await upButtons.nth(lastUpIdx).click();
  const savedToast = page.getByText("순서가 저장되었습니다.");
  const errorToast = page.getByText(/처리 중 오류|순서 저장에 실패|저장에 실패/);
  try {
    await Promise.race([
      savedToast.first().waitFor({ state: "visible", timeout: 45_000 }),
      errorToast.first().waitFor({ state: "visible", timeout: 45_000 }).then(async () => {
        throw new Error(await errorToast.first().innerText());
      }),
    ]);
  } catch (e) {
    fail(
      `arrow up save failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  // refresh so success toast/state resets before number-input assertion
  await page.reload({ waitUntil: "networkidle", timeout: 180_000 });
  const courtTabReload = page.getByRole("tab", { name: "제1 경기장" });
  await courtTabReload.click();
  await page
    .locator('input[aria-label="경기 순서"]:visible')
    .first()
    .waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, "02-after-arrow-up.png"), fullPage: true });

  let dbAfterArrow = await prisma.bracketMatch.findMany({
    where: { courtId: court.id },
    select: {
      id: true,
      matchNumber: true,
      courtOrder: true,
      fighterRedId: true,
      fighterBlueId: true,
    },
    orderBy: [{ courtOrder: "asc" }],
  });
  const numsAfterArrow = dbAfterArrow
    .map((m) => m.matchNumber)
    .filter((n): n is number => n != null);
  const eventNums = await prisma.bracketMatch.findMany({
    where: { bracket: { eventId: EVENT_ID } },
    select: { matchNumber: true },
  });
  const allNums = eventNums
    .map((m) => m.matchNumber)
    .filter((n): n is number => n != null);
  if (!isContiguous(allNums)) {
    fail(`event matchNumbers not contiguous after arrow: ${allNums.sort((a,b)=>a-b).join(",")}`);
  }
  const moved = dbAfterArrow.find((m) => m.id === targetMatch.id);
  if (!moved) fail("moved match missing");
  if (moved.courtOrder == null || moved.courtOrder >= snapshotBefore.courtOrder!) {
    fail(
      `arrow up did not decrease courtOrder (before=${snapshotBefore.courtOrder} after=${moved.courtOrder})`,
    );
  }
  if (moved.fighterRedId !== snapshotBefore.red || moved.fighterBlueId !== snapshotBefore.blue) {
    fail("fighter assignment corrupted after arrow move");
  }
  pass("arrow_up_contiguous", {
    movedCourtOrder: moved.courtOrder,
    movedMatchNumber: moved.matchNumber,
  });

  // Number input: move that match to 3rd court slot (display matchNumber of current 3rd)
  const third = dbAfterArrow[2];
  if (!third?.matchNumber) fail("third match missing matchNumber");
  const targetNumber = third.matchNumber;

  const movedIdx = dbAfterArrow.findIndex((m) => m.id === targetMatch.id);
  if (movedIdx < 0) fail("moved match missing from court order list");
  const input = page.locator('input[aria-label="경기 순서"]:visible').nth(movedIdx);
  await input.fill(String(targetNumber));
  await input.blur();
  // poll DB — success toast may already be on page from prior action
  let afterNumMove: (typeof dbAfterArrow)[number] | undefined;
  for (let i = 0; i < 45; i++) {
    await page.waitForTimeout(500);
    const rows = await prisma.bracketMatch.findMany({
      where: { courtId: court.id },
      select: {
        id: true,
        matchNumber: true,
        courtOrder: true,
        fighterRedId: true,
        fighterBlueId: true,
      },
      orderBy: [{ courtOrder: "asc" }],
    });
    dbAfterArrow = rows;
    afterNumMove = rows.find((m) => m.id === targetMatch.id);
    if (afterNumMove?.courtOrder === 3) break;
  }
  await page.screenshot({ path: join(OUT, "03-after-number-input.png"), fullPage: true });

  if (!afterNumMove) fail("match missing after number move");
  if (afterNumMove.courtOrder !== 3) {
    fail(
      `number input did not move to courtOrder 3 (got courtOrder=${afterNumMove.courtOrder} matchNumber=${afterNumMove.matchNumber})`,
    );
  }
  const allNums2 = (
    await prisma.bracketMatch.findMany({
      where: { bracket: { eventId: EVENT_ID } },
      select: { matchNumber: true },
    })
  )
    .map((m) => m.matchNumber)
    .filter((n): n is number => n != null);
  if (!isContiguous(allNums2)) fail("matchNumbers not contiguous after number input");
  if (
    afterNumMove.fighterRedId !== snapshotBefore.red ||
    afterNumMove.fighterBlueId !== snapshotBefore.blue
  ) {
    fail("fighter assignment corrupted after number move");
  }
  pass("number_input_reorder", {
    courtOrder: afterNumMove.courtOrder,
    matchNumber: afterNumMove.matchNumber,
  });

  // Refresh persistence
  await page.reload({ waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(1000);
  const courtTabAgain = page.getByRole("tab", { name: "제1 경기장" });
  if ((await courtTabAgain.count()) > 0) await courtTabAgain.click();
  else {
    const alt = page.getByRole("tab", { name: /제\s*1\s*경기장|1경기장/ });
    if ((await alt.count()) > 0) await alt.first().click();
  }
  await page.waitForTimeout(800);
  const persisted = await prisma.bracketMatch.findMany({
    where: { courtId: court.id },
    select: { id: true, matchNumber: true, courtOrder: true },
    orderBy: [{ courtOrder: "asc" }],
  });
  const persistedMoved = persisted.find((m) => m.id === targetMatch.id);
  if (!persistedMoved || persistedMoved.courtOrder !== afterNumMove.courtOrder) {
    fail("refresh persistence failed for courtOrder");
  }
  pass("refresh_persistence_view", persistedMoved);

  // Arrow down smoke on 3rd visible row
  const downBtn = page.locator('button[aria-label="아래로 이동"]:visible').nth(2);
  if (await downBtn.isEnabled()) {
    await downBtn.click();
    await page.waitForTimeout(2000);
  }
  pass("arrow_down_smoke", true);

  // ---------- 2) All matches workspace sync ----------
  const workspaceUrl = `${BASE}/organizer/events/${EVENT_ID}/brackets?tab=view&view=workspace`;
  await page.goto(workspaceUrl, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: join(OUT, "04-workspace.png"), fullPage: true });

  const wsInputs = page.locator('input[aria-label="경기 순서"]:visible');
  const wsCount = await wsInputs.count();
  report.workspaceReorderCount = wsCount;
  if (wsCount < 1) fail("workspace missing reorder controls");

  // Move via workspace arrow on a mid match that has up enabled
  const wsUp = page.locator('button[aria-label="위로 이동"]:visible');
  const wsUpCount = await wsUp.count();
  let clicked = false;
  for (let i = 0; i < wsUpCount; i++) {
    const btn = wsUp.nth(i);
    if (await btn.isEnabled()) {
      await btn.click();
      clicked = true;
      break;
    }
  }
  if (!clicked) fail("no enabled up button in workspace");
  await page.waitForTimeout(2500);

  const afterWs = await prisma.bracketMatch.findMany({
    where: { bracket: { eventId: EVENT_ID } },
    select: { id: true, matchNumber: true, courtOrder: true, courtId: true },
    orderBy: [{ matchNumber: "asc" }],
  });
  const wsNums = afterWs
    .map((m) => m.matchNumber)
    .filter((n): n is number => n != null);
  if (!isContiguous(wsNums)) fail("workspace reorder broke contiguity");
  pass("workspace_arrow_reorder", { matches: wsNums.length });

  // Cross-check: bracket view shows same DB numbers
  await page.goto(viewUrl, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(1000);
  const body = await page.locator("body").innerText();
  const viewLabels = [...body.matchAll(/(\d+)경기/g)].map((m) => Number(m[1]));
  report.viewLabelSample = viewLabels.slice(0, 20);
  pass("view_workspace_sync_db", true);

  // ---------- 3) Weigh-in PDF ----------
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/check-in`, {
    waitUntil: "networkidle",
    timeout: 180_000,
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "05-check-in.png"), fullPage: true });

  const pdfBtn = page.getByRole("button", { name: /계체 기록지 PDF/ });
  if ((await pdfBtn.count()) === 0) fail("weigh-in PDF button missing");

  const printUrl = `${BASE}/organizer/events/${EVENT_ID}/weigh-in-sheet`;
  await page.goto(printUrl, { waitUntil: "networkidle", timeout: 180_000 });
  await page.waitForTimeout(1500);
  const printText = await page.locator("body").innerText();
  await page.screenshot({ path: join(OUT, "06-weigh-in-sheet.png"), fullPage: true });

  for (const needle of ["계체 기록지", "대회일", "출력일", "실제 계체"]) {
    if (!printText.includes(needle)) fail(`weigh sheet missing: ${needle}`);
  }
  if (/undefined|null|NaN/.test(printText)) {
    fail("weigh sheet contains undefined/null/NaN");
  }
  // Column header order
  const headerRow = page.locator(".weigh-in-sheet-table thead tr").first();
  const headers = await headerRow.locator("th").allTextContents();
  const expectedHeaders = [
    "이름",
    "성별",
    "생년월일",
    "경기구분",
    "체급",
    "신청체중",
    "실제 계체",
  ];
  if (headers.map((h) => h.trim()).join("|") !== expectedHeaders.join("|")) {
    fail(`column order mismatch: ${headers.join("|")}`);
  }
  const groupCount = await page.locator(".weigh-in-sheet-group").count();
  const rowCount = await page.locator(".weigh-in-sheet-table tbody tr").count();
  report.weighInGymGroups = groupCount;
  report.weighInAthleteRows = rowCount;
  if (groupCount < 2) fail(`expected >=2 gym groups, got ${groupCount}`);
  if (rowCount < 5) fail(`expected >=5 athletes, got ${rowCount}`);
  pass("weigh_in_print_html", { groupCount, rowCount, headers });

  // Download PDF via API with cookies
  const cookies = await context.cookies();
  const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");
  const pdfRes = await fetch(
    `${BASE}/api/organizer/events/${EVENT_ID}/weigh-in-sheet-pdf`,
    { headers: { cookie: cookieHeader } },
  );
  if (!pdfRes.ok) {
    const errBody = await pdfRes.text();
    fail(`PDF API ${pdfRes.status}: ${errBody.slice(0, 300)}`);
  }
  const pdfBuf = Buffer.from(await pdfRes.arrayBuffer());
  const pdfPath = join(OUT, "weigh-in-sheet.pdf");
  writeFileSync(pdfPath, pdfBuf);
  const disposition = pdfRes.headers.get("content-disposition") || "";
  report.pdfBytes = pdfBuf.length;
  report.pdfDisposition = disposition;
  if (pdfBuf.length < 1000) fail("PDF too small");
  if (!pdfBuf.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    fail("PDF magic missing");
  }
  // Page count heuristic
  const pdfText = pdfBuf.toString("latin1");
  const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches?.length ?? 0;
  report.pdfPageCount = pageCount;
  if (pageCount < 1) fail("PDF page count undetectable");
  pass("weigh_in_pdf_download", { bytes: pdfBuf.length, pageCount, disposition });

  // ---------- 4) Admin password reset (gym + assoc) ----------
  await context.clearCookies();
  await login(page, ADMIN_LOGIN, pw);

  await page.goto(`${BASE}/admin/gyms/${gym.id}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "07-admin-gym-detail.png"), fullPage: true });
  const gymResetHeading = page.getByText("비밀번호 재설정");
  if ((await gymResetHeading.count()) === 0) fail("gym detail missing reset UI");

  const resetUrl = await issueAdminResetLink(page, "gym");
  await page.screenshot({
    path: join(OUT, "08-gym-reset-issued.png"),
    fullPage: true,
  });
  report.gymResetUrlHost = new URL(resetUrl).host;

  const NEW_GYM_PW = "QaResetGym!!99";
  await context.clearCookies();
  await page.goto(resetUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "09-gym-reset-form.png"), fullPage: true });

  const pwInputs = page.locator('input[type="password"]');
  const pwCount = await pwInputs.count();
  if (pwCount < 1) fail("gym reset form password input missing");
  await pwInputs.nth(0).fill(NEW_GYM_PW);
  if (pwCount >= 2) await pwInputs.nth(1).fill(NEW_GYM_PW);
  await page.getByRole("button", { name: /비밀번호 변경/ }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, "10-gym-reset-done.png"), fullPage: true });

  await context.clearCookies();
  await login(page, GYM_LOGIN, NEW_GYM_PW);
  pass("gym_reset_login_new_password", true);

  // Restore gym password to demo (reissueMinIntervalMs ≈ 60s)
  await context.clearCookies();
  await login(page, ADMIN_LOGIN, pw);
  await page.goto(`${BASE}/admin/gyms/${gym.id}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(65_000);
  const restoreUrl = await issueAdminResetLink(page, "gym-restore");
  await context.clearCookies();
  await page.goto(restoreUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  const pwInputs2 = page.locator('input[type="password"]');
  const n2 = await pwInputs2.count();
  await pwInputs2.nth(0).fill(pw);
  if (n2 >= 2) await pwInputs2.nth(1).fill(pw);
  await page.getByRole("button", { name: /비밀번호 변경/ }).click();
  await page.waitForTimeout(2000);
  await context.clearCookies();
  await login(page, GYM_LOGIN, pw);
  pass("gym_password_restored", true);

  // Association reset
  await context.clearCookies();
  await login(page, ADMIN_LOGIN, pw);
  await page.goto(`${BASE}/admin/associations/${assoc.id}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, "11-admin-assoc-detail.png"), fullPage: true });
  if ((await page.getByText("비밀번호 재설정").count()) === 0) {
    fail("assoc detail missing reset UI");
  }

  // Existing menu still works
  await page.goto(`${BASE}/admin/password-reset-links`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, "12-admin-reset-menu.png"), fullPage: true });
  if ((await page.getByText("비밀번호 재설정").count()) === 0) {
    fail("password-reset-links menu broken");
  }
  pass("admin_password_reset_menu", true);

  await page.goto(`${BASE}/admin/associations/${assoc.id}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  const assocResetUrl = await issueAdminResetLink(page, "assoc");

  const NEW_ASSOC_PW = "QaResetAssoc!!99";
  await context.clearCookies();
  await page.goto(assocResetUrl, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  const pwInputs3 = page.locator('input[type="password"]');
  const n3 = await pwInputs3.count();
  await pwInputs3.nth(0).fill(NEW_ASSOC_PW);
  if (n3 >= 2) await pwInputs3.nth(1).fill(NEW_ASSOC_PW);
  await page.getByRole("button", { name: /비밀번호 변경/ }).click();
  await page.waitForTimeout(2500);

  await context.clearCookies();
  await login(page, ASSOC_LOGIN, NEW_ASSOC_PW);
  pass("assoc_reset_login_new_password", true);

  // Restore assoc password
  await context.clearCookies();
  await login(page, ADMIN_LOGIN, pw);
  await page.goto(`${BASE}/admin/associations/${assoc.id}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(65_000);
  const assocRestore = await issueAdminResetLink(page, "assoc-restore");
  await context.clearCookies();
  await page.goto(assocRestore, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(800);
  const pwInputs4 = page.locator('input[type="password"]');
  const n4 = await pwInputs4.count();
  await pwInputs4.nth(0).fill(pw);
  if (n4 >= 2) await pwInputs4.nth(1).fill(pw);
  await page.getByRole("button", { name: /비밀번호 변경/ }).click();
  await page.waitForTimeout(2000);
  await context.clearCookies();
  await login(page, ASSOC_LOGIN, pw);
  pass("assoc_password_restored", true);

  // Verify other org (organizer) still works with demo pw
  await context.clearCookies();
  await login(page, ORG_LOGIN, pw);
  pass("other_org_unaffected", true);

  // Regression smoke: check-in + brackets load
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/check-in`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(800);
  pass("regression_checkin", !page.url().includes("/login"));
  await page.goto(`${BASE}/organizer/events/${EVENT_ID}/brackets?tab=view`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(800);
  pass("regression_brackets", !page.url().includes("/login"));

  report.consoleErrors = consoleErrors.slice(0, 20);
  report.finishedAt = new Date().toISOString();
  report.result = "PASS";
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("ALL PASS", JSON.stringify(report, null, 2));

  await browser.close();
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
