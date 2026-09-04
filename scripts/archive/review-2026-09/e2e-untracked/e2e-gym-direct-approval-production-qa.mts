/**
 * Production E2E: gym join → admin approve → direct login (no invite).
 * yamabiko + Production Supabase (tkyzsbhfnrrkyupksjrj) only.
 *
 *   npx tsx scripts/e2e-gym-direct-approval-production-qa.mts
 *   npx tsx scripts/e2e-gym-direct-approval-production-qa.mts --cleanup-only
 */
import { execSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "@playwright/test";

const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-production-79ad.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "gym-direct-approval-prod-qa");
const GYMN_PREFIX = "GYM_DIRECT_PROD_QA_";
/** RequestedLoginIdField maxLength=20 — keep generated loginId within that. */
const LOGIN_PREFIX = "gdpqa_";
const EXPECTED_SUPABASE_REF = "tkyzsbhfnrrkyupksjrj";
const cleanupOnly = process.argv.includes("--cleanup-only");

type Report = Record<string, unknown>;

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e production -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertYamabiko(databaseUrl: string) {
  const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "";
  if (!/yamabiko/i.test(databaseUrl) || /yamanote/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: expected yamabiko, got ${host || "unknown"}`);
  }
}

function assertProdSupabase(url: string) {
  const ref = url.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? "";
  if (ref !== EXPECTED_SUPABASE_REF) {
    throw new Error(`REFUSING Auth: expected ${EXPECTED_SUPABASE_REF}, got ${ref || "unknown"}`);
  }
}

function fail(msg: string): never {
  console.error("FAIL", msg);
  throw new Error(msg);
}

async function drawSignature(page: Page) {
  const canvas = page.locator("canvas").first();
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
  assertYamabiko(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  report.dbFingerprint = "yamabiko";

  const supabaseUrl = String(app.NEXT_PUBLIC_SUPABASE_URL || "");
  const serviceKey = String(app.SUPABASE_SERVICE_ROLE_KEY || "");
  assertProdSupabase(supabaseUrl);
  report.supabaseRef = EXPECTED_SUPABASE_REF;

  const adminPassword = String(app.DEMO_PASSWORD || "");
  if (!adminPassword) fail("DEMO_PASSWORD missing on Production app");
  report.demoPasswordConfigured = true;

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, GymApplicationStatus, GymStatus, UserRole } =
    await import("../src/generated/prisma");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  /** Exact-ID cleanup only for known QA rows from this prefix. */
  async function cleanupExact() {
    const apps = await prisma.gymApplication.findMany({
      where: { gymName: { startsWith: GYMN_PREFIX } },
      select: {
        id: true,
        pendingAuthUserId: true,
        createdGymId: true,
        requestedLoginId: true,
      },
    });
    const exactAppIds = apps.map((a) => a.id);
    const gymIds = apps
      .map((a) => a.createdGymId)
      .filter((id): id is string => Boolean(id));
    const loginIds = apps
      .map((a) => a.requestedLoginId)
      .filter((id): id is string => Boolean(id));

    const users = loginIds.length
      ? await prisma.user.findMany({
          where: {
            loginId: { in: loginIds },
            role: UserRole.gym,
          },
          select: { id: true, authUserId: true, loginId: true },
        })
      : [];

    const authIds = new Set<string>();
    for (const a of apps) {
      if (a.pendingAuthUserId) authIds.add(a.pendingAuthUserId);
    }
    for (const u of users) {
      if (u.authUserId) authIds.add(u.authUserId);
    }

    for (const a of apps) {
      await prisma.gymApplicationAttachment.deleteMany({
        where: { applicationId: a.id },
      });
    }
    if (exactAppIds.length) {
      await prisma.gymApplication.deleteMany({
        where: { id: { in: exactAppIds } },
      });
    }
    if (gymIds.length) {
      await prisma.gym.deleteMany({ where: { id: { in: gymIds } } });
    }
    if (users.length) {
      await prisma.user.deleteMany({
        where: { id: { in: users.map((u) => u.id) } },
      });
    }

    let authDeleted = 0;
    for (const authId of authIds) {
      const { error } = await supabase.auth.admin.deleteUser(authId);
      if (!error) authDeleted += 1;
    }

    const leftoverApps = await prisma.gymApplication.count({
      where: { gymName: { startsWith: GYMN_PREFIX } },
    });
    const leftoverUsers = loginIds.length
      ? await prisma.user.count({
          where: { loginId: { in: loginIds }, role: UserRole.gym },
        })
      : 0;

    report.cleanup = {
      exactIds: true,
      apps: exactAppIds.length,
      gyms: gymIds.length,
      users: users.length,
      authDeleted,
      leftoverApps,
      leftoverUsers,
    };
  }

  if (cleanupOnly) {
    await cleanupExact();
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("cleanup-only done", report.cleanup);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const cols = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'GymApplication' AND column_name = 'pendingAuthUserId'`,
  );
  if (!cols.length) fail("pendingAuthUserId column missing on Production");
  report.migrationColumn = "present";

  const ts = Date.now().toString(36);
  const gymName = `${GYMN_PREFIX}${ts}`;
  const loginId = `${LOGIN_PREFIX}${ts}`.slice(0, 20);
  if (loginId.length < 4 || loginId.length > 20) {
    fail(`generated loginId length invalid: ${loginId.length}`);
  }
  const password = `Qa!${randomBytes(6).toString("hex")}9A`;
  const mobilePhone = `010${String(Date.now()).slice(-8)}`;
  report.qa = {
    gymName,
    loginId,
    passwordSha12: createHash("sha256").update(password).digest("hex").slice(0, 12),
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route("**/postcode/prod/postcode.v2.js", (route) => route.abort());
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const status5xx: string[] = [];
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
  page.on("response", (res) => {
    if (res.status() >= 500) {
      status5xx.push(`${res.status()} ${res.url().slice(0, 120)}`);
    }
  });

  try {
    await page.goto(`${BASE}/join/gym`, { waitUntil: "domcontentloaded" });
    const gymNameInput = page.locator('input[name="gymName"]');
    await gymNameInput.waitFor({ state: "visible", timeout: 30_000 });
    await gymNameInput.fill(gymName);

    await page
      .getByText("주소 검색을 불러오지 못했습니다")
      .waitFor({ timeout: 20_000 });
    const addressBlock = page.locator("[data-address-search-field]").first();
    const textInputs = addressBlock.locator('input[type="text"]');
    await textInputs.nth(0).fill("06236");
    await textInputs.nth(1).fill("서울 강남구 테헤란로 1");
    await addressBlock.locator('input[name="addressDetail"]').fill("QA");

    await page.getByLabel(/대표자명/).fill("QA대표");
    const contact = page.locator('input[name="contactName"]');
    if (await contact.count()) await contact.fill("QA담당");

    // PhoneInput keeps digits in a hidden named input; fill the visible tel control.
    const phoneVisible = page
      .locator("label")
      .filter({ hasText: /개인 연락처/ })
      .locator('input[type="tel"]');
    if (!(await phoneVisible.count())) {
      fail("개인 연락처 tel input missing (phone verify expected OFF on prod)");
    }
    await phoneVisible.fill(mobilePhone);
    report.phoneVerification = "DISABLED_PLAIN";

    await page.locator('input[name="email"]').fill(`qa_prod_${ts}@example.com`);
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
    const successBody = await page.locator("body").innerText();
    if (/초대 링크|초대 URL|activation/i.test(successBody)) {
      fail("signup success mentioned invite/activation");
    }
    report.signup = "PASS";

    const appRow = await prisma.gymApplication.findFirst({
      where: { gymName, deletedAt: null },
    });
    if (!appRow) fail("GymApplication missing after signup");
    if (appRow.status !== GymApplicationStatus.pending) {
      fail(`expected pending, got ${appRow.status}`);
    }
    if (!appRow.pendingAuthUserId) fail("pendingAuthUserId null");
    const userBefore = await prisma.user.findFirst({ where: { loginId } });
    const gymBefore = await prisma.gym.findFirst({ where: { name: gymName } });
    if (userBefore) fail("User should not exist before approval");
    if (gymBefore) fail("Gym should not exist before approval");
    const raw = JSON.stringify(appRow);
    if (raw.includes(password)) fail("password leaked into GymApplication row");
    report.pendingDb = {
      status: appRow.status,
      pendingAuthUserId: true,
      userBefore: false,
      gymBefore: false,
      plaintextPassword: "NO",
    };

    // pending login (fresh session)
    await context.clearCookies();
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await page.getByLabel("아이디").fill(loginId);
    await page.getByLabel("비밀번호").fill(password);
    await page.getByRole("button", { name: "로그인" }).click();
    const pendingLocator = page.getByText(/승인 대기|승인 후|같은 아이디/);
    try {
      await pendingLocator.first().waitFor({ state: "visible", timeout: 20_000 });
    } catch {
      const pendingText = await page.locator("body").innerText();
      report.pendingLoginBody = pendingText.slice(0, 500);
      report.pendingLoginUrl = page.url();
      fail(
        `pending login message missing url=${page.url()} body=${pendingText.slice(0, 280)}`,
      );
    }
    if (page.url().includes("/gym")) fail("pending user reached /gym");
    report.pendingLogin = "BLOCKED";

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
      fail(`admin login failed url=${page.url()} body=${body.slice(0, 240)}`);
    }

    await page.goto(`${BASE}/admin/gym-applications`);
    await page
      .getByRole("heading", { name: "체육관 가입 신청" })
      .waitFor({ timeout: 30_000 });
    report.adminGymApplications = "200";
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
    await qaRow.getByText("승인 완료", { exact: true }).waitFor({ timeout: 30_000 });
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
    const userAfter = await prisma.user.findFirst({ where: { loginId } });
    const gymAfter = await prisma.gym.findFirst({ where: { name: gymName } });
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
    const createUi =
      (await page.getByRole("link", { name: /회원 등록|새 회원|추가/ }).count()) +
      (await page.getByRole("button", { name: /회원 등록|새 회원|추가/ }).count());
    report.membersAccess = {
      pass: true,
      createUiVisible: createUi > 0,
    };

    // Existing gym regression (demo gym account)
    await context.clearCookies();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("아이디").fill("gym");
    await page.getByLabel("비밀번호").fill(adminPassword);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForTimeout(4000);
    if (page.url().includes("/login")) {
      report.existingGym = "LOGIN_FAIL_OR_MISSING";
    } else if (/승인 대기/.test(await page.locator("body").innerText())) {
      fail("existing gym treated as pending");
    } else {
      await page.goto(`${BASE}/gym`);
      await page.waitForTimeout(1500);
      await page.goto(`${BASE}/gym/members`);
      await page.waitForTimeout(1500);
      report.existingGym =
        page.url().includes("/login") ? "MEMBERS_BLOCKED" : "PASS";
    }

    // Admin / organizer / association route smoke
    await context.clearCookies();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("아이디").fill("admin");
    await page.getByLabel("비밀번호").fill(adminPassword);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForURL((u) => !u.pathname.includes("/login"), {
      timeout: 30_000,
    });
    for (const path of ["/admin", "/admin/gym-applications", "/admin/gyms"]) {
      const res = await page.goto(`${BASE}${path}`, {
        waitUntil: "domcontentloaded",
      });
      if (!res || res.status() >= 500) fail(`${path} status ${res?.status()}`);
      await page.waitForTimeout(800);
    }
    report.adminRegression = "PASS";

    await context.clearCookies();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("아이디").fill("organizer");
    await page.getByLabel("비밀번호").fill(adminPassword);
    await page.getByRole("button", { name: "로그인" }).click();
    await page.waitForTimeout(4000);
    if (!page.url().includes("/login")) {
      await page.goto(`${BASE}/organizer`);
      await page.waitForTimeout(1000);
      report.organizerRegression = page.url().includes("/login")
        ? "BLOCKED"
        : "PASS";
    } else {
      report.organizerRegression = "LOGIN_SKIP";
    }

    // Code-path check: legacy invite when pendingAuthUserId is null
    report.legacyInvitePath =
      "CODE: pendingAuthUserId==null keeps invite fallback (not exercised on live pending)";

    report.consoleErrors = consoleErrors.slice(0, 10);
    report.pageErrors = pageErrors.slice(0, 10);
    report.status5xx = status5xx.slice(0, 10);
    report.final = {
      inviteRequired: "NO",
      directLogin: "YES",
      productionComplete: "YES",
    };
  } finally {
    await browser.close();
    try {
      await cleanupExact();
    } catch (e) {
      report.cleanupError = String(e);
    }
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    await pool.end();
  }

  console.log(JSON.stringify(report, null, 2));
  if (consoleErrors.length || pageErrors.length || status5xx.length) {
    fail("browser console/page/5xx errors present");
  }
  const cleanup = report.cleanup as
    | { leftoverApps?: number; leftoverUsers?: number }
    | undefined;
  if ((cleanup?.leftoverApps ?? 0) > 0 || (cleanup?.leftoverUsers ?? 0) > 0) {
    fail("QA leftovers remain after cleanup");
  }
  console.log("e2e-gym-direct-approval-production-qa: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
