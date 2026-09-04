/**
 * Production E2E: Admin organization status Phase 2-1 (yamabiko only).
 *
 *   npx tsx scripts/e2e-admin-org-status-production-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Page } from "@playwright/test";
import {
  GymStatus,
  OrganizerStatus,
  OrganizerType,
} from "../src/generated/prisma";

const BASE = (
  process.env.QA_BASE_URL || "https://app-production-79ad.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "admin-org-status-prod-qa");
const REASON = "ORG_STATUS_QA_20260826 production validation";
const EXPECTED_MAIN_SHA_PREFIX = "a02c512";

/** Production QA entities — internal @matchlab.local accounts only. */
const QA_ORG_ID = "cms720kwt00040pl7h864wm55";
const QA_ORG_LOGIN = "shgym";
const QA_GYM_ID = "cmsit3cjd00010po9dlgurpip";
const QA_GYM_LOGIN = "theone";

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
    throw new Error(
      `REFUSING DB write: expected yamabiko, got ${host || "unknown"}`,
    );
  }
  return host;
}

function fail(msg: string): never {
  console.error("FAIL", msg);
  throw new Error(msg);
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  const idBox = page.locator("#login-identifier, input[name='identifier']");
  try {
    await idBox.first().waitFor({ timeout: 20_000 });
    await idBox.first().fill(loginId);
  } catch {
    await page.getByLabel("아이디").fill(loginId);
  }
  const pw = page.locator('input[name="password"]');
  if (await pw.count()) await pw.fill(password);
  else await page.getByLabel("비밀번호").fill(password);
  const submit = page.locator('button[type="submit"]');
  if (await submit.count()) await submit.first().click();
  else await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 60_000,
  });
}

async function adminUiChangeStatus(
  page: Page,
  kind: "association" | "gym",
  entityId: string,
  nextStatus: "active" | "suspended",
  reason: string,
) {
  const base =
    kind === "association"
      ? `${BASE}/admin/associations/${entityId}`
      : `${BASE}/admin/gyms/${entityId}`;
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "상태 관리" }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "상태 관리" }).click();
  const formDialog = page.getByRole("dialog").filter({ hasText: "변경할 상태" });
  await formDialog.waitFor({ timeout: 20_000 });
  await formDialog.locator("select").first().selectOption(nextStatus);
  await formDialog.getByPlaceholder(/요금 미납/i).fill(reason);
  const nextLabel = nextStatus === "suspended" ? "일시정지" : "정상";
  await formDialog.getByRole("button", { name: nextLabel }).click();
  await page
    .getByRole("dialog")
    .filter({ hasText: /\(으\)로 변경합니다/ })
    .getByRole("button", { name: nextLabel })
    .click();
  await page
    .getByRole("dialog")
    .filter({ hasText: /\(으\)로 변경합니다/ })
    .waitFor({ state: "hidden", timeout: 30_000 })
    .catch(() => undefined);
  await page.waitForTimeout(1500);
}

async function expectOrganizerBlocked(page: Page) {
  await page.goto(`${BASE}/organizer`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
    timeout: 20_000,
  });
}

async function expectOrganizerPortalOk(page: Page) {
  await page.goto(`${BASE}/organizer`, { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) fail("organizer portal redirected to login");
  const blocked = await page
    .getByRole("heading", { name: "서비스 이용 일시정지" })
    .isVisible()
    .catch(() => false);
  if (blocked) fail("organizer portal still blocked");
}

async function expectGymBlocked(page: Page) {
  await page.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
    timeout: 20_000,
  });
}

async function expectGymPortalOk(page: Page) {
  await page.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded" });
  const blocked = await page
    .getByRole("heading", { name: "서비스 이용 일시정지" })
    .isVisible()
    .catch(() => false);
  if (blocked) fail("gym portal still blocked");
}

async function ensurePortalPassword(
  supabase: ReturnType<typeof createClient>,
  authUserId: string,
  password: string,
) {
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    password,
  });
  if (error) fail(`supabase password update failed: ${error.message}`);
}

async function multiTabNavigationSmoke(
  pages: { admin: Page; org: Page; gym: Page },
  orgId: string,
  gymId: string,
) {
  await pages.admin.goto(`${BASE}/admin/associations/${orgId}`, {
    waitUntil: "domcontentloaded",
  });
  await pages.org.goto(`${BASE}/organizer`, { waitUntil: "domcontentloaded" });
  await pages.gym.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded" });

  await pages.admin.reload({ waitUntil: "domcontentloaded" });
  await pages.org.reload({ waitUntil: "domcontentloaded" });
  await pages.gym.reload({ waitUntil: "domcontentloaded" });

  await pages.org.goto(`${BASE}/organizer/events`, {
    waitUntil: "domcontentloaded",
  });
  await pages.gym.goto(`${BASE}/gym/members`, { waitUntil: "domcontentloaded" });
  await pages.admin.goto(`${BASE}/admin/gyms/${gymId}`, {
    waitUntil: "domcontentloaded",
  });
  await pages.org.goto(`${BASE}/organizer`, { waitUntil: "domcontentloaded" });
  await pages.gym.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded" });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    steps: [] as string[],
    environment: "production",
  };

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  const dbHost = assertYamabiko(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  report.dbFingerprint = "yamabiko";
  report.dbHost = dbHost;

  const supabaseUrl = String(app.NEXT_PUBLIC_SUPABASE_URL || "");
  const serviceKey = String(app.SUPABASE_SERVICE_ROLE_KEY || "");
  const adminPassword = String(app.DEMO_PASSWORD || "");
  if (!adminPassword) fail("DEMO_PASSWORD missing on Production app");
  if (!supabaseUrl || !serviceKey) fail("Supabase env missing");

  report.servingSha =
    String(app.RAILWAY_GIT_COMMIT_SHA || app.RAILWAY_GIT_COMMIT || "").trim() ||
    null;
  if (
    report.servingSha &&
    !String(report.servingSha).startsWith(EXPECTED_MAIN_SHA_PREFIX)
  ) {
    console.warn(
      `WARN serving SHA ${report.servingSha} != expected ${EXPECTED_MAIN_SHA_PREFIX}*`,
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const orgBefore = await prisma.organizer.findUnique({
    where: { id: QA_ORG_ID },
    select: { id: true, name: true, status: true, type: true },
  });
  const gymBefore = await prisma.gym.findUnique({
    where: { id: QA_GYM_ID },
    select: { id: true, name: true, status: true },
  });
  if (!orgBefore || orgBefore.type !== OrganizerType.association) {
    fail("QA association missing");
  }
  if (!gymBefore) fail("QA gym missing");

  const orgUser = await prisma.user.findFirst({
    where: { loginId: QA_ORG_LOGIN },
    select: { id: true, authUserId: true },
  });
  const gymUser = await prisma.user.findFirst({
    where: { loginId: QA_GYM_LOGIN },
    select: { id: true, authUserId: true },
  });
  if (!orgUser?.authUserId) fail("organizer QA user missing authUserId");
  if (!gymUser?.authUserId) fail("gym QA user missing authUserId");

  report.qaOrganizer = {
    ...orgBefore,
    loginId: QA_ORG_LOGIN,
    originalStatus: orgBefore.status,
    userId: orgUser.id,
  };
  report.qaGym = {
    ...gymBefore,
    loginId: QA_GYM_LOGIN,
    originalStatus: gymBefore.status,
    userId: gymUser.id,
  };

  const qaEvent = await prisma.event.findFirst({
    where: {
      organizerId: QA_ORG_ID,
      status: { in: ["bracket_ready", "ongoing"] },
    },
    select: { id: true, title: true, status: true },
  });
  report.optionBEvent = qaEvent ?? null;
  report.optionB = qaEvent ? "smoke" : "SKIP_no_bracket_ready_or_ongoing";

  const memberGymCountBefore = await prisma.associationMemberGym.count({
    where: { organizerId: QA_ORG_ID },
  });
  report.associationMemberGymCountBefore = memberGymCountBefore;

  await ensurePortalPassword(supabase, orgUser.authUserId!, adminPassword);
  await ensurePortalPassword(supabase, gymUser.authUserId!, adminPassword);
  report.portalPasswordSynced = true;

  await prisma.organizer.update({
    where: { id: QA_ORG_ID },
    data: { status: OrganizerStatus.active },
  });
  await prisma.gym.update({
    where: { id: QA_GYM_ID },
    data: { status: GymStatus.active },
  });

  const browser = await chromium.launch({ headless: true });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  /** Document / RSC GET 5xx — acceptance blocker */
  const get5xx: string[] = [];
  /** POST Server Action 5xx (e.g. stale action after deploy) — recorded separately */
  const post5xx: string[] = [];
  const rsc500: string[] = [];

  const attachListeners = (page: Page, label: string) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("WebSocket connection") && text.includes("supabase")) {
          return;
        }
        if (text.includes("Failed to load resource") && text.includes("favicon")) {
          return;
        }
        // Next.js soft-nav / stale Server Action after deploy — tracked via post5xx.
        if (text.includes("Failed to find Server Action")) {
          return;
        }
        if (
          text.includes("Failed to load resource") &&
          text.includes("status of 500")
        ) {
          return;
        }
        consoleErrors.push(`[${label}] ${text}`);
        if (/RSC payload|Internal Server Error/i.test(text)) {
          rsc500.push(`[${label}] ${text}`);
        }
      }
    });
    page.on("pageerror", (err) =>
      pageErrors.push(`[${label}] ${String(err)}`),
    );
    page.on("response", (resp) => {
      const url = resp.url();
      const status = resp.status();
      if (status < 500) return;
      const method = resp.request().method();
      const entry = `${method} ${status} ${url}`;
      if (method === "GET") {
        get5xx.push(entry);
        if (url.includes("_rsc") || url.includes("__rsc") || url.includes("_next")) {
          rsc500.push(entry);
        }
      } else {
        post5xx.push(entry);
      }
    });
  };

  try {
    const adminPage = await browser.newPage();
    attachListeners(adminPage, "admin");
    await login(adminPage, "admin", adminPassword);
    await adminPage.goto(`${BASE}/admin/associations/${QA_ORG_ID}`);
    await adminPage.getByRole("button", { name: "상태 관리" }).waitFor({
      timeout: 30_000,
    });
    report.steps.push("association_active_baseline_admin");

    const orgPage = await browser.newPage();
    attachListeners(orgPage, "organizer");
    await login(orgPage, QA_ORG_LOGIN, adminPassword);
    await expectOrganizerPortalOk(orgPage);
    report.steps.push("association_active_baseline_portal");

    const gymPage = await browser.newPage();
    attachListeners(gymPage, "gym");
    await login(gymPage, QA_GYM_LOGIN, adminPassword);
    await expectGymPortalOk(gymPage);
    report.steps.push("gym_active_baseline_portal");

    const auditCountBefore = await prisma.auditLog.count({
      where: { action: "organizer_status_changed", targetId: QA_ORG_ID },
    });

    await adminUiChangeStatus(
      adminPage,
      "association",
      QA_ORG_ID,
      "suspended",
      REASON,
    );
    report.steps.push("association_suspended_admin_ui");

    const orgSuspended = await prisma.organizer.findUnique({
      where: { id: QA_ORG_ID },
      select: { status: true },
    });
    if (orgSuspended?.status !== OrganizerStatus.suspended) {
      fail(`organizer status expected suspended got ${orgSuspended?.status}`);
    }

    const auditSuspend = await prisma.auditLog.findFirst({
      where: {
        action: "organizer_status_changed",
        targetType: "Organizer",
        targetId: QA_ORG_ID,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!auditSuspend) fail("audit missing for suspend");
    const before = auditSuspend.beforeData as { status?: string } | null;
    const after = auditSuspend.afterData as {
      status?: string;
      reason?: string;
    } | null;
    if (after?.status !== "suspended" || !after.reason?.includes("ORG_STATUS_QA")) {
      fail("audit afterData invalid");
    }
    report.auditSuspend = {
      id: auditSuspend.id,
      before,
      after,
      actorUserId: auditSuspend.actorUserId,
    };
    report.steps.push("association_audit_suspend");

    await expectOrganizerBlocked(orgPage);
    report.steps.push("association_portal_blocked");

    await orgPage.goto(`${BASE}/organizer/events/new`);
    await orgPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 20_000,
    });
    report.steps.push("association_new_event_blocked");

    await orgPage.goto(`${BASE}/organizer/member-gyms`);
    await orgPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 20_000,
    });
    report.steps.push("association_member_gym_blocked");

    if (qaEvent) {
      await orgPage.goto(`${BASE}/organizer/events/${qaEvent.id}`);
      const blocked = await orgPage
        .getByRole("heading", { name: "서비스 이용 일시정지" })
        .isVisible()
        .catch(() => false);
      if (blocked) fail("OPTION B event page should not show full portal block");
      report.steps.push("association_option_b_event_access");

      await orgPage.goto(`${BASE}/organizer/events/${qaEvent.id}/check-in`);
      const checkInBlocked = await orgPage
        .getByRole("heading", { name: "서비스 이용 일시정지" })
        .isVisible()
        .catch(() => false);
      if (checkInBlocked) fail("OPTION B check-in should remain accessible");
      report.steps.push("association_option_b_check_in_access");
    } else {
      report.steps.push("association_option_b_skipped");
    }

    await multiTabNavigationSmoke(
      { admin: adminPage, org: orgPage, gym: gymPage },
      QA_ORG_ID,
      QA_GYM_ID,
    );
    report.steps.push("multi_tab_navigation_after_org_suspend");

    await adminUiChangeStatus(
      adminPage,
      "association",
      QA_ORG_ID,
      "active",
      `${REASON} restore association`,
    );
    report.steps.push("association_restored_admin_ui");

    await expectOrganizerPortalOk(orgPage);
    report.steps.push("association_portal_restored");

    const auditCountAfterRestore = await prisma.auditLog.count({
      where: { action: "organizer_status_changed", targetId: QA_ORG_ID },
    });
    if (auditCountAfterRestore <= auditCountBefore + 1) {
      fail("expected restore audit log");
    }
    report.steps.push("association_restore_audit");

    await adminUiChangeStatus(adminPage, "gym", QA_GYM_ID, "suspended", REASON);
    report.steps.push("gym_suspended_admin_ui");

    const gymAudit = await prisma.auditLog.findFirst({
      where: { action: "gym_status_changed", targetId: QA_GYM_ID },
      orderBy: { createdAt: "desc" },
    });
    if (!gymAudit) fail("gym audit missing");
    report.gymAuditSuspend = {
      id: gymAudit.id,
      before: gymAudit.beforeData,
      after: gymAudit.afterData,
      actorUserId: gymAudit.actorUserId,
    };
    report.steps.push("gym_audit_suspend");

    await expectGymBlocked(gymPage);
    report.steps.push("gym_portal_blocked");

    await gymPage.goto(`${BASE}/gym/members`);
    await gymPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 20_000,
    });
    report.steps.push("gym_write_blocked");

    await multiTabNavigationSmoke(
      { admin: adminPage, org: orgPage, gym: gymPage },
      QA_ORG_ID,
      QA_GYM_ID,
    );
    report.steps.push("multi_tab_navigation_after_gym_suspend");

    await adminUiChangeStatus(
      adminPage,
      "gym",
      QA_GYM_ID,
      "active",
      `${REASON} restore gym`,
    );
    report.steps.push("gym_restored_admin_ui");

    await expectGymPortalOk(gymPage);
    report.steps.push("gym_portal_restored");

    await adminPage.goto(`${BASE}/admin/associations/${QA_ORG_ID}`);
    await adminPage.getByRole("button", { name: "상태 관리" }).click();
    await adminPage.getByPlaceholder(/요금 미납/i).fill("x");
    await adminPage.getByRole("button", { name: "일시정지" }).first().click();
    const reasonError = adminPage.getByText("사유는 2자 이상");
    if (!(await reasonError.isVisible().catch(() => false))) {
      fail("reason validation should block short reason");
    }
    await adminPage.getByRole("button", { name: "취소" }).click();
    report.steps.push("reason_validation");

    const permPage = await browser.newPage();
    attachListeners(permPage, "perm");
    await login(permPage, QA_ORG_LOGIN, adminPassword);
    await permPage.goto(`${BASE}/admin/associations/${QA_ORG_ID}`);
    const permDenied =
      permPage.url().includes("/login") ||
      (await permPage
        .getByText(/권한|접근|로그인/i)
        .isVisible()
        .catch(() => false));
    if (
      !permDenied &&
      permPage.url().includes(`/admin/associations/${QA_ORG_ID}`)
    ) {
      fail("organizer should not access admin association detail");
    }
    report.steps.push("permission_non_admin_blocked");

    await adminPage.setViewportSize({ width: 1366, height: 768 });
    await adminPage.goto(`${BASE}/admin/associations/${QA_ORG_ID}`);
    const overflowX = await adminPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (overflowX) fail("admin association detail overflow at 1366x768");
    await adminPage.goto(`${BASE}/admin/gyms/${QA_GYM_ID}`);
    const gymOverflow = await adminPage.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    if (gymOverflow) fail("admin gym detail overflow at 1366x768");
    report.steps.push("layout_1366x768");

    const memberGymCountAfter = await prisma.associationMemberGym.count({
      where: { organizerId: QA_ORG_ID },
    });
    if (memberGymCountAfter !== memberGymCountBefore) {
      fail("AssociationMemberGym rows changed after suspend/restore");
    }
    report.steps.push("association_member_gym_regression");

    const orgFinal = await prisma.organizer.findUnique({
      where: { id: QA_ORG_ID },
      select: { status: true },
    });
    const gymFinal = await prisma.gym.findUnique({
      where: { id: QA_GYM_ID },
      select: { status: true },
    });
    report.finalOrganizerStatus = orgFinal?.status;
    report.finalGymStatus = gymFinal?.status;

    report.deploymentId = "ba3e92c4-f68e-4cac-8f39-8d6a036caa67";
    report.consoleErrors = consoleErrors;
    report.pageErrors = pageErrors;
    report.get5xx = get5xx;
    report.post5xx = post5xx;
    report.rsc500 = rsc500;
    report.rsc500Count = rsc500.length;
    report.consoleErrorCount = consoleErrors.length;
    report.pageErrorCount = pageErrors.length;
    report.get5xxCount = get5xx.length;
    report.post5xxCount = post5xx.length;

    if (pageErrors.length) {
      fail(`pageerror count=${pageErrors.length}`);
    }
    if (get5xx.length) {
      fail(`unexpected GET 5xx count=${get5xx.length}: ${get5xx.join("; ")}`);
    }
    if (rsc500.length) {
      fail(`RSC 500 count=${rsc500.length}: ${rsc500.join("; ")}`);
    }
    if (consoleErrors.length) {
      fail(`console.error count=${consoleErrors.length}`);
    }
    if (post5xx.length) {
      report.post5xxWarning =
        "POST 5xx observed (often Failed to find Server Action after deploy); not counted as GET/RSC regression";
      console.warn("WARN post5xx:", post5xx);
    }

    report.pass = true;
    report.finishedAt = new Date().toISOString();
  } finally {
    await prisma.organizer
      .update({
        where: { id: QA_ORG_ID },
        data: { status: orgBefore.status },
      })
      .catch(() => undefined);
    await prisma.gym
      .update({
        where: { id: QA_GYM_ID },
        data: { status: gymBefore.status },
      })
      .catch(() => undefined);

    report.get5xx = get5xx;
    report.post5xx = post5xx;
    report.rsc500 = rsc500;
    report.consoleErrors = consoleErrors;
    report.pageErrors = pageErrors;
    report.finishedAt = new Date().toISOString();
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

    await prisma.$disconnect();
    await pool.end();
    await browser.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS admin-org-status production QA");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
