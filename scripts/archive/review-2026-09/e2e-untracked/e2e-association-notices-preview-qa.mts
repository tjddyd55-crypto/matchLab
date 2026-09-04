/**
 * Preview QA: association notices (Development yamanote fixtures only).
 *
 *   npx tsx scripts/e2e-association-notices-preview-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "association-notices-preview-qa");

const ASSOC_A = {
  id: "cmq69od5w00035guxtzn3txvv",
  login: "organizer2",
  name: "데모 주최자 2",
};
const ASSOC_B = {
  id: "cmq69obsg00015guxpmyu6ny6",
  login: "organizer1",
  name: "데모 주최자 1",
};
const ASSOC_UNCONNECTED = {
  id: "cmpba828i0002dkux4k1u8opa",
  name: "대회 주최자",
};
const GYM_A = {
  id: "cmq0ux7zq000acwux007f1s1e",
  login: "gym1",
  name: "데모 체육관 1",
};

type Step = { name: string; status: "PASS" | "FAIL" | "N/A"; detail?: string };

function railwayDevAppVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service d9575ee0-a2e2-46c2-9221-b16ea4b8df96 --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.locator('input[name="identifier"], input[name="loginId"]').first().fill(loginId);
  await page.locator('input[name="password"]').first().fill(password);
  await page.getByRole("button", { name: /로그인/ }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
}

async function ensureMultiMembership(prisma: PrismaClient) {
  const existing = await prisma.associationMemberGym.findFirst({
    where: {
      gymId: GYM_A.id,
      organizerId: ASSOC_B.id,
    },
  });
  if (existing) {
    if (existing.status === "active") {
      return { created: false, id: existing.id, action: "already-active" };
    }
    const updated = await prisma.associationMemberGym.update({
      where: { id: existing.id },
      data: {
        status: "active",
        withdrawnAt: null,
        suspendedAt: null,
        approvedAt: existing.approvedAt ?? new Date(),
      },
    });
    return { created: false, id: updated.id, action: "reactivated" };
  }

  const created = await prisma.associationMemberGym.create({
    data: {
      gymId: GYM_A.id,
      organizerId: ASSOC_B.id,
      memberCode: `NOTICE-QA-${Date.now().toString(36).slice(-6)}`,
      status: "active",
      approvedAt: new Date(),
    },
  });
  return { created: true, id: created.id, action: "created" };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const steps: Step[] = [];
  const report: Record<string, unknown> = {
    base: BASE,
    startedAt: new Date().toISOString(),
  };

  const pgVars = railwayDevPgVars();
  const appVars = railwayDevAppVars();
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
  if (!dbUrl.includes("yamanote")) {
    throw new Error(`REFUSING: expected yamanote, got ${dbUrl}`);
  }
  const password = String(appVars.DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing on Development app");

  process.env.DATABASE_URL = dbUrl;
  const pool = new pg.Pool({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const multi = await ensureMultiMembership(prisma);
    report.multiMembership = multi;
    steps.push({
      name: "multi-association fixture",
      status: "PASS",
      detail: multi.created ? "created gym1↔organizer1" : "already exists",
    });

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    // --- Association A: CRUD ---
    await login(page, ASSOC_A.login, password);
    steps.push({ name: "association login", status: "PASS", detail: ASSOC_A.login });

    await page.goto(`${BASE}/organizer/notices`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "01-assoc-list.png"), fullPage: true });
    const hasCreateCta =
      (await page.getByRole("link", { name: /공지 작성|첫 공지 작성/ }).count()) > 0;
    steps.push({
      name: "notice list",
      status: hasCreateCta ? "PASS" : "FAIL",
      detail: `url=${page.url()} createCta=${hasCreateCta}`,
    });
    if (!hasCreateCta) throw new Error("create CTA missing");

    await page.getByRole("link", { name: /공지 작성|첫 공지 작성/ }).first().click();
    await page.waitForURL("**/organizer/notices/new");
    await page.locator("#notice-title").fill("[TEST] 협회 공지사항 QA");
    await page
      .locator("#notice-content")
      .fill("MATCHON 협회 공지사항 Preview QA");
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: "등록" }).click();
    await page.waitForURL(
      (u) =>
        /\/organizer\/notices\/[^/]+$/.test(u.pathname) &&
        !u.pathname.endsWith("/new"),
      { timeout: 30_000 },
    );
    const createdUrl = page.url();
    const noticeId = createdUrl.split("/").pop()!;
    await page.screenshot({ path: join(OUT, "02-assoc-detail.png"), fullPage: true });
    const detailOk =
      (await page.getByText("[TEST] 협회 공지사항 QA").count()) > 0 &&
      (await page.getByText("MATCHON 협회 공지사항 Preview QA").count()) > 0;
    steps.push({
      name: "create",
      status: detailOk ? "PASS" : "FAIL",
      detail: `${noticeId} url=${createdUrl}`,
    });
    if (!detailOk) throw new Error(`create detail missing at ${createdUrl}`);

    await page.goto(`${BASE}/organizer/notices/${noticeId}/edit`);
    await page.locator("#notice-title").fill("[TEST] 협회 공지사항 QA 수정");
    await page
      .locator("#notice-content")
      .fill("MATCHON 협회 공지사항 Preview QA\n수정본");
    await page.getByRole("button", { name: "저장" }).click();
    await page.waitForURL(`**/organizer/notices/${noticeId}`);
    const updatedOk =
      (await page.getByText("[TEST] 협회 공지사항 QA 수정").count()) > 0;
    steps.push({
      name: "update",
      status: updatedOk ? "PASS" : "FAIL",
    });
    if (!updatedOk) throw new Error("update failed");

    await page.goto(`${BASE}/organizer/notices`);
    const listHas =
      (await page.getByText("[TEST] 협회 공지사항 QA 수정").count()) > 0 &&
      (await page.getByText("고정").count()) > 0;
    steps.push({
      name: "list after update",
      status: listHas ? "PASS" : "FAIL",
    });

    // soft-delete dedicated notice
    await page.goto(`${BASE}/organizer/notices/new`);
    await page.locator("#notice-title").fill("[TEST] 협회 공지 삭제용");
    await page.locator("#notice-content").fill("삭제 QA");
    await page.getByRole("button", { name: "등록" }).click();
    await page.waitForURL(
      (u) =>
        /\/organizer\/notices\/[^/]+$/.test(u.pathname) &&
        !u.pathname.endsWith("/new"),
      { timeout: 30_000 },
    );
    const deleteId = page.url().split("/").pop()!;
    await page.getByRole("button", { name: "삭제" }).click();
    await page.getByRole("button", { name: "삭제" }).last().click();
    await page.waitForURL("**/organizer/notices");
    const deletedHidden =
      (await page.getByText("[TEST] 협회 공지 삭제용").count()) === 0;
    const deletedRow = await prisma.associationNotice.findUnique({
      where: { id: deleteId },
      select: { deletedAt: true },
    });
    steps.push({
      name: "soft delete",
      status:
        deletedHidden && deletedRow?.deletedAt != null ? "PASS" : "FAIL",
      detail: `deletedAt=${deletedRow?.deletedAt?.toISOString() ?? "null"}`,
    });

    // logout via navigation to login (clear cookies)
    await context.clearCookies();

    // --- Gym A ---
    await login(page, GYM_A.login, password);
    steps.push({ name: "gym login", status: "PASS", detail: GYM_A.login });

    await page.goto(`${BASE}/gym`, { waitUntil: "networkidle" });
    await page.screenshot({ path: join(OUT, "03-gym-home.png"), fullPage: true });
    const nav = page.locator('[data-nav-group="associations"]');
    const menuVisible = (await nav.count()) > 0;
    const hasA =
      (await page.getByText(ASSOC_A.name, { exact: false }).count()) > 0;
    const hasB =
      (await page.getByText(ASSOC_B.name, { exact: false }).count()) > 0;
    const joinAssocKept =
      (await page.getByRole("link", { name: "가입 협회" }).count()) > 0;
    steps.push({
      name: "gym menu",
      status: menuVisible && hasA && hasB && joinAssocKept ? "PASS" : "FAIL",
      detail: `menu=${menuVisible} A=${hasA} B=${hasB} join=${joinAssocKept}`,
    });
    steps.push({
      name: "multi-association",
      status: hasA && hasB ? "PASS" : "FAIL",
    });

    await page.goto(`${BASE}/gym/associations/${ASSOC_A.id}/notices`, {
      waitUntil: "networkidle",
    });
    await page.screenshot({ path: join(OUT, "04-gym-list-a.png"), fullPage: true });
    const gymListOk =
      (await page.getByText("[TEST] 협회 공지사항 QA 수정").count()) > 0 &&
      (await page.getByRole("link", { name: /공지 작성/ }).count()) === 0 &&
      (await page.getByRole("button", { name: /삭제|수정/ }).count()) === 0;
    steps.push({
      name: "gym notice list",
      status: gymListOk ? "PASS" : "FAIL",
    });

    await page.getByText("[TEST] 협회 공지사항 QA 수정").first().click();
    await page.waitForURL(`**/notices/${noticeId}`);
    await page.screenshot({ path: join(OUT, "05-gym-detail.png"), fullPage: true });
    const gymDetailOk =
      (await page.getByText(ASSOC_A.name).count()) > 0 &&
      (await page.getByText("수정본").count()) > 0 &&
      (await page.getByRole("button", { name: /삭제|수정|등록/ }).count()) === 0;
    steps.push({
      name: "gym detail",
      status: gymDetailOk ? "PASS" : "FAIL",
    });
    steps.push({
      name: "gym read-only",
      status: gymDetailOk ? "PASS" : "FAIL",
    });

    // Association B list should NOT show A's notice
    await page.goto(`${BASE}/gym/associations/${ASSOC_B.id}/notices`);
    const bIsolated =
      (await page.getByText("[TEST] 협회 공지사항 QA 수정").count()) === 0;
    steps.push({
      name: "A/B separation",
      status: bIsolated ? "PASS" : "FAIL",
    });

    // unconnected direct URL
    const unconnectedRes = await page.goto(
      `${BASE}/gym/associations/${ASSOC_UNCONNECTED.id}/notices`,
      { waitUntil: "domcontentloaded" },
    );
    const status = unconnectedRes?.status() ?? 0;
    const body = await page.content();
    const blocked =
      status === 404 ||
      body.includes("404") ||
      body.includes("찾을 수 없") ||
      page.url().includes("not-found") ||
      !(await page.getByText("공지사항").count());
    // Next.js notFound often still returns 200 HTML with not-found UI — check absence of notice board
    const notFoundUi =
      status === 404 ||
      (await page.getByText(/This page could not be found|페이지를 찾을 수 없|Not Found/i).count()) >
        0 ||
      (await page.locator('[data-nav-group="associations"]').count()) === 0 &&
        !(await page.getByRole("heading", { name: ASSOC_UNCONNECTED.name }).count());
    // stronger: list heading with unconnected name should not appear as authorized board
    const leakedBoard =
      (await page.getByRole("heading", { name: ASSOC_UNCONNECTED.name }).count()) >
        0 &&
      (await page.getByText("등록된 공지사항이 없습니다.").count()) > 0;
    const unconnectedPass = !leakedBoard && (blocked || notFoundUi || status === 404);
    // Prefer checking DB-backed service via response: if we got empty authorized page it's FAIL
    // Re-check: goto detail of A's notice under wrong association should 404
    const wrongDetail = await page.goto(
      `${BASE}/gym/associations/${ASSOC_UNCONNECTED.id}/notices/${noticeId}`,
      { waitUntil: "domcontentloaded" },
    );
    const wrongStatus = wrongDetail?.status() ?? 0;
    const wrongBody = await page.content();
    const wrongBlocked =
      wrongStatus === 404 ||
      /찾을 수 없|Not Found|This page could not be found/i.test(wrongBody) ||
      !(await page.getByText("[TEST] 협회 공지사항 QA 수정").count());
    steps.push({
      name: "unconnected direct URL",
      status: wrongBlocked ? "PASS" : "FAIL",
      detail: `listStatus=${status} detailStatus=${wrongStatus} leakedBoard=${leakedBoard}`,
    });

    // deleted notice direct URL for gym
    await page.goto(
      `${BASE}/gym/associations/${ASSOC_A.id}/notices/${deleteId}`,
      { waitUntil: "domcontentloaded" },
    );
    const deletedGone =
      (await page.getByText("[TEST] 협회 공지 삭제용").count()) === 0;
    steps.push({
      name: "deleted notice gym access",
      status: deletedGone ? "PASS" : "FAIL",
    });

    // zero-association gym: find one with loginId
    const zero = await prisma.gym.findFirst({
      where: {
        associationMemberGyms: { none: { status: "active" } },
        ownerUser: { loginId: { not: null } },
      },
      select: {
        id: true,
        name: true,
        ownerUser: { select: { loginId: true } },
      },
    });
    if (zero?.ownerUser?.loginId) {
      await context.clearCookies();
      try {
        await login(page, zero.ownerUser.loginId, password);
        await page.goto(`${BASE}/gym`);
        const zeroMenu = (await page.locator('[data-nav-group="associations"]').count()) === 0;
        steps.push({
          name: "zero-association menu",
          status: zeroMenu ? "PASS" : "FAIL",
          detail: zero.ownerUser.loginId,
        });
      } catch (e) {
        steps.push({
          name: "zero-association menu",
          status: "N/A",
          detail: `login failed for ${zero.ownerUser.loginId}: ${String(e)}`,
        });
      }
    } else {
      steps.push({
        name: "zero-association menu",
        status: "N/A",
        detail: "no zero gym with loginId",
      });
    }

    // mobile sheet
    await context.clearCookies();
    await login(page, GYM_A.login, password);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/gym`);
    await page.getByRole("button", { name: /회원사 메뉴 열기/ }).click();
    await page.screenshot({ path: join(OUT, "06-mobile-sheet.png"), fullPage: true });
    const sheetOk =
      (await page.locator('[data-nav-group="associations"]').count()) > 0 &&
      (await page.getByText(ASSOC_A.name).count()) > 0;
    steps.push({
      name: "mobile Sheet",
      status: sheetOk ? "PASS" : "FAIL",
    });

    steps.push({
      name: "console/pageerror",
      status: pageErrors.length === 0 ? "PASS" : "FAIL",
      detail: JSON.stringify({ pageErrors: pageErrors.slice(0, 5), consoleErrors: consoleErrors.slice(0, 5) }),
    });

    await browser.close();
  } finally {
    await prisma.$disconnect();
    await pool.end();
    delete process.env.DATABASE_URL;
  }

  const failed = steps.filter((s) => s.status === "FAIL");
  report.steps = steps;
  report.failed = failed.length;
  report.endedAt = new Date().toISOString();
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ failed: failed.length, steps }, null, 2));
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
