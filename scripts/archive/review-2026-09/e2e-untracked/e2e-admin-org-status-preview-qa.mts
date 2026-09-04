/**
 * Preview E2E: Admin organization status Phase 2-1 (yamanote only).
 *
 *   npx tsx scripts/e2e-admin-org-status-preview-qa.mts
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import {
  EventStatus,
  GymStatus,
  OrganizerStatus,
  OrganizerType,
} from "../src/generated/prisma";

const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "admin-org-status-qa");
const REASON = "ORG_STATUS_QA_20260826 preview validation";

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
  return host;
}

function fail(msg: string): never {
  console.error("FAIL", msg);
  throw new Error(msg);
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("아이디").fill(loginId);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 30_000,
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
  await page.getByRole("button", { name: "상태 관리" }).waitFor({ timeout: 20_000 });
  await page.getByRole("button", { name: "상태 관리" }).click();
  const formDialog = page.getByRole("dialog").filter({ hasText: "변경할 상태" });
  await formDialog.waitFor({ timeout: 20_000 });
  await formDialog.locator("select").first().waitFor();
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
    .waitFor({ state: "hidden", timeout: 20_000 })
    .catch(() => undefined);
  await page.waitForTimeout(2000);
}

async function expectOrganizerBlocked(page: Page) {
  await page.goto(`${BASE}/organizer`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
    timeout: 15_000,
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

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    steps: [] as string[],
  };

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  const dbHost = assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  report.dbFingerprint = "yamanote";
  report.dbHost = dbHost;
  report.servingSha =
    String(app.RAILWAY_GIT_COMMIT_SHA || app.RAILWAY_GIT_COMMIT || "").trim() ||
    null;

  const adminPassword = String(app.DEMO_PASSWORD || "123456!!");
  if (report.servingSha && !String(report.servingSha).startsWith("1c54a9a")) {
    console.warn(`WARN serving SHA ${report.servingSha} != expected 1c54a9a`);
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new Pool({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const QA_ORG_ID = "cmpba828i0002dkux4k1u8opa";
  const QA_GYM_ID = "cmpba82nc0004dkuxbg2o30vy";
  const QA_ORG_LOGIN = "organizer";
  const QA_GYM_LOGIN = "gym";

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

  report.qaOrganizer = { ...orgBefore, loginId: QA_ORG_LOGIN };
  report.qaGym = { ...gymBefore, loginId: QA_GYM_LOGIN };

  const qaEvent = await prisma.event.findFirst({
    where: { organizerId: QA_ORG_ID },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true },
  });
  const eventOriginalStatus = qaEvent?.status ?? null;
  if (qaEvent && qaEvent.status !== EventStatus.bracket_ready) {
    await prisma.event.update({
      where: { id: qaEvent.id },
      data: { status: EventStatus.bracket_ready },
    });
    report.optionBEventPatched = {
      id: qaEvent.id,
      from: qaEvent.status,
      to: "bracket_ready",
    };
  }
  report.optionBEvent = qaEvent;

  const memberGymCountBefore = await prisma.associationMemberGym.count({
    where: { organizerId: QA_ORG_ID },
  });
  report.associationMemberGymCountBefore = memberGymCountBefore;

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

  const attachListeners = (page: Page) => {
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (text.includes("WebSocket connection") && text.includes("supabase")) {
          return;
        }
        consoleErrors.push(text);
      }
    });
    page.on("pageerror", (err) => pageErrors.push(String(err)));
    page.on("response", (resp) => {
      if (resp.status() >= 500) {
        report.http5xx = [
          ...((report.http5xx as string[] | undefined) ?? []),
          `${resp.status()} ${resp.url()}`,
        ];
      }
    });
  };

  try {
    const adminPage = await browser.newPage();
    attachListeners(adminPage);
    await login(adminPage, "admin", adminPassword);
    await adminPage.goto(`${BASE}/admin/associations/${QA_ORG_ID}`);
    await adminPage.getByRole("button", { name: "상태 관리" }).waitFor({
      timeout: 20_000,
    });
    report.steps.push("association_active_baseline_admin");

    const orgPage = await browser.newPage();
    attachListeners(orgPage);
    await login(orgPage, QA_ORG_LOGIN, adminPassword);
    await expectOrganizerPortalOk(orgPage);
    report.steps.push("association_active_baseline_portal");

    const auditCountBefore = await prisma.auditLog.count({
      where: {
        action: "organizer_status_changed",
        targetId: QA_ORG_ID,
      },
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
    const after = auditSuspend.afterData as { status?: string; reason?: string } | null;
    if (after?.status !== "suspended" || !after.reason?.includes("ORG_STATUS_QA")) {
      fail("audit afterData invalid");
    }
    report.auditSuspend = { id: auditSuspend.id, before, after };
    report.steps.push("association_audit_suspend");

    await expectOrganizerBlocked(orgPage);
    report.steps.push("association_portal_blocked");

    await orgPage.goto(`${BASE}/organizer/events/new`);
    await orgPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 15_000,
    });
    report.steps.push("association_new_event_blocked");

    await orgPage.goto(`${BASE}/organizer/member-gyms`);
    await orgPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 15_000,
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
    }

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
      where: {
        action: "organizer_status_changed",
        targetId: QA_ORG_ID,
      },
    });
    if (auditCountAfterRestore <= auditCountBefore + 1) {
      fail("expected restore audit log");
    }
    report.steps.push("association_restore_audit");

    await adminPage.goto(`${BASE}/admin/gyms/${QA_GYM_ID}`, {
      waitUntil: "domcontentloaded",
    });
    await adminUiChangeStatus(adminPage, "gym", QA_GYM_ID, "suspended", REASON);
    report.steps.push("gym_suspended_admin_ui");

    const gymAudit = await prisma.auditLog.findFirst({
      where: {
        action: "gym_status_changed",
        targetId: QA_GYM_ID,
      },
      orderBy: { createdAt: "desc" },
    });
    if (!gymAudit) fail("gym audit missing");
    report.gymAuditSuspend = gymAudit.id;
    report.steps.push("gym_audit_suspend");

    const gymPage = await browser.newPage();
    attachListeners(gymPage);
    await login(gymPage, QA_GYM_LOGIN, adminPassword);
    await gymPage.goto(`${BASE}/gym`);
    await gymPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 15_000,
    });
    report.steps.push("gym_portal_blocked");

    await gymPage.goto(`${BASE}/gym/members`);
    await gymPage.getByRole("heading", { name: "서비스 이용 일시정지" }).waitFor({
      timeout: 15_000,
    });
    report.steps.push("gym_write_blocked");

    await adminUiChangeStatus(
      adminPage,
      "gym",
      QA_GYM_ID,
      "active",
      `${REASON} restore gym`,
    );
    report.steps.push("gym_restored_admin_ui");

    await gymPage.goto(`${BASE}/gym`);
    const gymStillBlocked = await gymPage
      .getByRole("heading", { name: "서비스 이용 일시정지" })
      .isVisible()
      .catch(() => false);
    if (gymStillBlocked) fail("gym should restore");
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
    attachListeners(permPage);
    await login(permPage, QA_ORG_LOGIN, adminPassword);
    await permPage.goto(`${BASE}/admin/associations/${QA_ORG_ID}`);
    const permDenied =
      permPage.url().includes("/login") ||
      (await permPage.getByText(/권한|접근|로그인/i).isVisible().catch(() => false));
    if (!permDenied && permPage.url().includes(`/admin/associations/${QA_ORG_ID}`)) {
      fail("organizer should not access admin association detail");
    }
    report.steps.push("permission_non_admin_blocked");

    const memberGymCountAfter = await prisma.associationMemberGym.count({
      where: { organizerId: QA_ORG_ID },
    });
    if (memberGymCountAfter !== memberGymCountBefore) {
      fail("AssociationMemberGym rows changed after suspend/restore");
    }
    report.steps.push("association_member_gym_regression");

    report.deploymentId = "70064d0d-526a-4f55-9033-5bc26801c56b";
    report.finalDevelopSha = "2ecbdff";
    report.consoleErrors = consoleErrors;
    report.pageErrors = pageErrors;
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    if (consoleErrors.length) {
      console.warn("console.error warnings (non-fatal if pageerror=0):", consoleErrors);
      report.consoleErrorWarnings = consoleErrors;
    }
    if (pageErrors.length) fail(`pageerror count=${pageErrors.length}`);

    report.pass = true;
    report.finishedAt = new Date().toISOString();
  } finally {
    await prisma.organizer
      .update({
        where: { id: QA_ORG_ID },
        data: { status: OrganizerStatus.active },
      })
      .catch(() => undefined);
    await prisma.gym
      .update({
        where: { id: QA_GYM_ID },
        data: { status: GymStatus.active },
      })
      .catch(() => undefined);
    if (qaEvent && eventOriginalStatus) {
      await prisma.event
        .update({
          where: { id: qaEvent.id },
          data: { status: eventOriginalStatus },
        })
        .catch(() => undefined);
    }
    await prisma.$disconnect();
    await pool.end();
    await browser.close();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log("PASS admin-org-status preview QA");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
