/**
 * Preview E2E: gym join → admin approve → direct login (no invite).
 * Development yamanote only. Requires Railway CLI auth.
 *
 *   npx tsx scripts/e2e-gym-direct-approval-preview-qa.mts
 *   npx tsx scripts/e2e-gym-direct-approval-preview-qa.mts --cleanup-only
 */
import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";

const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "gym-direct-approval-qa");
const GYMN_PREFIX = "GYM_DIRECT_APPROVAL_QA_";
const MEMBER_PREFIX = "GYM_DIRECT_MEMBER_QA_";
const LOGIN_PREFIX = "gym_direct_qa_";
const cleanupOnly = process.argv.includes("--cleanup-only");

type Report = Record<string, unknown>;

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertYamanote(databaseUrl: string) {
  const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "";
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: expected yamanote, got ${host || "unknown"}`);
  }
}

function fail(msg: string): never {
  console.error("FAIL", msg);
  throw new Error(msg);
}

async function drawSignature(page: Page) {
  const canvas = page.locator('canvas').first();
  await canvas.waitFor({ timeout: 15_000 });
  const box = await canvas.boundingBox();
  if (!box) fail("signature canvas missing");
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 40, { steps: 6 });
  await page.mouse.up();
  const done = page.getByRole("button", { name: /서명 완료|완료/ });
  if (await done.count()) await done.first().click();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = { base: BASE, startedAt: new Date().toISOString() };

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  report.dbFingerprint = "yamanote";
  report.servingSha =
    String(app.RAILWAY_GIT_COMMIT_SHA || app.RAILWAY_GIT_COMMIT || "").trim() ||
    null;
  report.demoPasswordConfigured = Boolean(app.DEMO_PASSWORD);
  const adminPassword = String(app.DEMO_PASSWORD || "123456!!");

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, GymApplicationStatus, GymStatus, UserRole } =
    await import("../src/generated/prisma");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  async function cleanup() {
    const apps = await prisma.gymApplication.findMany({
      where: { gymName: { startsWith: GYMN_PREFIX } },
      select: {
        id: true,
        pendingAuthUserId: true,
        createdGymId: true,
        requestedLoginId: true,
      },
    });
    const gymIds = apps
      .map((a) => a.createdGymId)
      .filter((id): id is string => Boolean(id));
    const loginIds = apps
      .map((a) => a.requestedLoginId)
      .filter((id): id is string => Boolean(id));

    if (gymIds.length) {
      const members = await prisma.gymMember.findMany({
        where: {
          gymId: { in: gymIds },
          name: { startsWith: MEMBER_PREFIX },
        },
        select: { id: true },
      });
      const memberIds = members.map((m) => m.id);
      if (memberIds.length) {
        await prisma.gymMemberPayment.deleteMany({
          where: { gymMemberId: { in: memberIds } },
        });
        await prisma.gymMemberSubscription.deleteMany({
          where: { gymMemberId: { in: memberIds } },
        });
        await prisma.gymMember.deleteMany({ where: { id: { in: memberIds } } });
      }
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { loginId: { in: loginIds.length ? loginIds : ["__none__"] } },
          { loginId: { startsWith: LOGIN_PREFIX } },
        ],
        role: UserRole.gym,
      },
      select: { id: true, authUserId: true },
    });

    for (const a of apps) {
      await prisma.gymApplicationAttachment.deleteMany({
        where: { applicationId: a.id },
      });
    }
    await prisma.gymApplication.deleteMany({
      where: { id: { in: apps.map((a) => a.id) } },
    });
    if (gymIds.length) {
      await prisma.gym.deleteMany({ where: { id: { in: gymIds } } });
    }
    if (users.length) {
      await prisma.user.deleteMany({
        where: { id: { in: users.map((u) => u.id) } },
      });
    }
    report.cleanup = {
      apps: apps.length,
      gyms: gymIds.length,
      users: users.length,
    };
  }

  if (cleanupOnly) {
    await cleanup();
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("cleanup-only done", report.cleanup);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // Column must exist
  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'GymApplication' AND column_name = 'pendingAuthUserId'`,
  );
  if (!cols.length) {
    fail("pendingAuthUserId column missing — apply migration on yamanote first");
  }
  report.migrationColumn = "present";

  const ts = Date.now().toString(36);
  const gymName = `${GYMN_PREFIX}${ts}`;
  const loginId = `${LOGIN_PREFIX}${ts}`.slice(0, 20);
  const password = `Qa!${randomBytes(6).toString("hex")}9A`;
  const mobilePhone = `010${String(Date.now()).slice(-8)}`;
  const passwordHashForLogOnly = createHash("sha256")
    .update(password)
    .digest("hex")
    .slice(0, 12);
  report.qa = { gymName, loginId, passwordSha12: passwordHashForLogOnly };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  // Force AddressSearchField scriptFailed → editable postal/base fields.
  await page.route("**/postcode/prod/postcode.v2.js", (route) => route.abort());
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const ignoreConsole = (t: string) =>
    /postcode\.v2\.js|Failed to load resource|net::ERR_|daumcdn|useActionState was called outside of a transition/i.test(
      t,
    );
  page.on("console", (m) => {
    if (m.type() === "error") {
      const t = m.text().slice(0, 200);
      if (!ignoreConsole(t)) consoleErrors.push(t);
    }
  });
  page.on("pageerror", (e) => {
    const t = e.message.slice(0, 200);
    if (!ignoreConsole(t)) pageErrors.push(t);
  });

  try {
    // Signup
    await page.goto(`${BASE}/join/gym`, { waitUntil: "domcontentloaded" });
    const gymNameInput = page.locator('input[name="gymName"]');
    await gymNameInput.waitFor({ state: "visible", timeout: 30_000 });
    await gymNameInput.fill(gymName);

    await page
      .getByText("주소 검색을 불러오지 못했습니다")
      .waitFor({ timeout: 20_000 });
    const addressBlock = page.locator("[data-address-search-field]").first();
    const textInputs = addressBlock.locator('input[type="text"]');
    // postal, base, detail (all editable after scriptFailed)
    await textInputs.nth(0).fill("06236");
    await textInputs.nth(1).fill("서울 강남구 테헤란로 1");
    await addressBlock.locator('input[name="addressDetail"]').fill("QA");

    await page.getByLabel(/대표자명/).fill("QA대표");
    const contact = page.locator('input[name="contactName"]');
    if (await contact.count()) await contact.fill("QA담당");

    // Phone verification (Development mock + E2E inbox)
    const phoneInput = page.locator("#phone-verify-input");
    const plainMobile = page.locator('input[name="mobilePhone"]');
    if (await phoneInput.count()) {
      await phoneInput.fill(mobilePhone);
      await page.getByRole("button", { name: "인증번호 발송" }).click();
      const requestIdAttr = page.locator("[data-e2e-request-id]");
      const phoneError = page.getByRole("alert");
      await Promise.race([
        requestIdAttr.waitFor({ timeout: 20_000 }),
        phoneError.waitFor({ timeout: 20_000 }),
      ]).catch(() => undefined);
      if (await phoneError.count()) {
        const errText = await phoneError.first().innerText();
        if (errText && !(await requestIdAttr.count())) {
          fail(`phone verification request failed: ${errText}`);
        }
      }
      await requestIdAttr.waitFor({ timeout: 5_000 });
      const requestId = await requestIdAttr.getAttribute("data-e2e-request-id");
      if (!requestId) fail("e2e requestId missing after SMS request");
      let code: string | null = null;
      for (let i = 0; i < 20; i++) {
        const inboxRes = await page.request.get(
          `${BASE}/api/internal/phone-verification/e2e-inbox?requestId=${encodeURIComponent(requestId)}`,
        );
        if (inboxRes.ok()) {
          const body = (await inboxRes.json()) as {
            data?: { code?: string };
          };
          code = body.data?.code ?? null;
          if (code) break;
        }
        await page.waitForTimeout(500);
      }
      if (!code) fail("e2e inbox code not found");
      await page.locator("#phone-verify-code").fill(code);
      await page.getByRole("button", { name: "인증 확인" }).click();
      await page.getByText("인증 완료").waitFor({ timeout: 15_000 });
      report.phoneVerification = "PASS";
    } else if (await plainMobile.count()) {
      await plainMobile.fill(mobilePhone);
      report.phoneVerification = "DISABLED_PLAIN";
    } else {
      fail("phone input missing");
    }

    await page.locator('input[name="email"]').fill(`qa_${ts}@example.com`);
    await page.locator('input[name="requestedLoginId"]').fill(loginId);
    await page.getByRole("button", { name: "중복 확인" }).click();
    await page.waitForTimeout(1500);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('input[name="passwordConfirm"]').fill(password);

    await page.locator('input[name="privacyConsent"]').check();
    await page.locator('input[name="registrationConsent"]').check();
    await page.locator('input[name="signatureName"]').fill("QA대표");
    await page.locator('input[name="signatureConsent"]').check();
    await drawSignature(page);

    await page.getByRole("button", { name: "가입 신청 제출" }).click();
    await page.getByText("가입 신청이 완료되었습니다").waitFor({ timeout: 60_000 });
    await page.getByText(/신청한 계정으로 로그인/).waitFor();
    report.signup = "PASS";

    const appRow = await prisma.gymApplication.findFirst({
      where: { gymName, deletedAt: null },
    });
    if (!appRow) fail("GymApplication missing after signup");
    if (appRow.status !== GymApplicationStatus.pending) {
      fail(`expected pending, got ${appRow.status}`);
    }
    if (!appRow.pendingAuthUserId) fail("pendingAuthUserId null");
    const userBefore = await prisma.user.findFirst({
      where: { loginId },
    });
    const gymBefore = await prisma.gym.findFirst({
      where: { name: gymName },
    });
    if (userBefore) fail("User should not exist before approval");
    if (gymBefore) fail("Gym should not exist before approval");
    report.pendingDb = {
      status: appRow.status,
      pendingAuthUserId: Boolean(appRow.pendingAuthUserId),
      userBefore: false,
      gymBefore: false,
    };

    // plaintext check on application row
    const raw = JSON.stringify(appRow);
    if (raw.includes(password)) fail("password leaked into GymApplication row");
    report.plaintextPassword = "NO";

    // pending login
    await page.goto(`${BASE}/login`);
    await page.getByLabel("아이디").fill(loginId);
    await page.getByLabel("비밀번호").fill(password);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForTimeout(3000);
    const pendingText = await page.locator("body").innerText();
    if (!/승인 대기|승인 후/.test(pendingText)) {
      fail("pending login message missing");
    }
    if (page.url().includes("/gym")) fail("pending user reached /gym");
    report.pendingLogin = "BLOCKED";

    // Admin approve
    await context.clearCookies();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("아이디").fill("admin");
    await page.getByLabel("비밀번호").fill(adminPassword);
    await page.getByRole("button", { name: "로그인" }).click();
    try {
      await page.waitForURL((url) => !url.pathname.includes("/login"), {
        timeout: 30_000,
      });
    } catch {
      const body = await page.locator("body").innerText();
      fail(
        `admin login failed url=${page.url()} body=${body.slice(0, 240)}`,
      );
    }
    if (page.url().includes("/login")) fail("admin login failed");

    await page.goto(`${BASE}/admin/gym-applications`);
    await page
      .getByRole("heading", { name: "체육관 가입 신청" })
      .waitFor({ timeout: 30_000 });
    const qaRow = page.locator("li").filter({ hasText: gymName }).first();
    await qaRow.waitFor({ timeout: 15_000 });
    await qaRow.getByRole("button", { name: "체육관 승인" }).click();
    await page
      .getByText("이 체육관의 MATCHON 이용을 승인하시겠습니까?")
      .waitFor({ state: "visible", timeout: 10_000 });
    const [approveRes] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/admin/gym-applications/") &&
          res.url().includes("/approve") &&
          res.request().method() === "POST",
        { timeout: 45_000 },
      ),
      page
        .locator("[data-slot='dialog-footer'], [role='dialog']")
        .getByRole("button", { name: "체육관 승인" })
        .click(),
    ]);
    if (!approveRes.ok()) {
      const body = await approveRes.text();
      fail(`approve API ${approveRes.status()}: ${body.slice(0, 300)}`);
    }
    const approveJson = (await approveRes.json()) as {
      data?: { gymId?: string; loginReady?: boolean; inviteUrl?: string | null };
    };
    if (!approveJson.data?.gymId) fail("approve API missing gymId");
    if (!approveJson.data.loginReady) fail("approve API loginReady=false");
    if (approveJson.data.inviteUrl) fail("approve API returned inviteUrl");
    await qaRow.getByText("승인 완료", { exact: true }).waitFor({
      timeout: 30_000,
    });
    await qaRow.getByText(/별도 초대 링크는 필요하지 않습니다/).waitFor({
      timeout: 10_000,
    });
    report.adminApprove = "PASS";

    const appAfter = await prisma.gymApplication.findUnique({
      where: { id: appRow.id },
    });
    if (appAfter?.status !== GymApplicationStatus.approved) {
      fail("application not approved");
    }
    if (appAfter.pendingAuthUserId) fail("pendingAuthUserId should be cleared");
    if (appAfter.ownerInviteTokenHash) fail("invite should not be created");
    const userAfter = await prisma.user.findFirst({
      where: { loginId },
    });
    const gymAfter = await prisma.gym.findFirst({
      where: { name: gymName },
    });
    if (!userAfter?.authUserId) fail("User/authUserId missing");
    if (userAfter.authUserId !== appRow.pendingAuthUserId) {
      fail("authUserId linkage mismatch");
    }
    if (!gymAfter || gymAfter.status !== GymStatus.active) fail("Gym not active");
    if (gymAfter.ownerUserId !== userAfter.id) fail("owner relation mismatch");
    report.approvedState = {
      application: "approved",
      invite: "NO",
      user: true,
      gymActive: true,
      authLinked: true,
    };

    // Direct login
    await context.clearCookies();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("아이디").fill(loginId);
    await page.getByLabel("비밀번호").fill(password);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForURL(/\/gym/, { timeout: 30_000 });
    report.directLogin = "PASS";

    await page.goto(`${BASE}/gym/members`);
    await page.waitForTimeout(2000);
    if (page.url().includes("/login")) fail("/gym/members blocked after approve");
    report.membersAccess = "PASS";

    // member create smoke if UI allows
    const newMember = page.getByRole("link", { name: /회원 등록|새 회원|추가/ });
    if (await newMember.count()) {
      await newMember.first().click();
      await page.waitForTimeout(1000);
      const nameInput = page.locator('input[name="name"]');
      if (await nameInput.count()) {
        await nameInput.fill(`${MEMBER_PREFIX}${ts}`);
        const phone = page.locator('input[name="phone"]');
        if (await phone.count()) await phone.fill("01099998888");
        const submit = page.getByRole("button", { name: /저장|등록|생성/ });
        if (await submit.count()) {
          await submit.first().click();
          await page.waitForTimeout(2000);
          report.memberCreate = "ATTEMPTED";
        }
      }
    } else {
      report.memberCreate = "UI_SKIP";
    }

    report.consoleErrors = consoleErrors.slice(0, 10);
    report.pageErrors = pageErrors.slice(0, 10);
    report.final = {
      inviteRequired: "NO",
      directLogin: "YES",
      productionChanged: "NO",
    };
  } finally {
    await browser.close();
    try {
      await cleanup();
    } catch (e) {
      report.cleanupError = String(e);
    }
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    await pool.end();
  }

  console.log(JSON.stringify(report, null, 2));
  if (consoleErrors.length || pageErrors.length) {
    fail("browser console/page errors present");
  }
  console.log("e2e-gym-direct-approval-preview-qa: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
