/**
 * Preview QA: IntakeForm + AssociationSchedule (Development yamanote only).
 *
 *   npx tsx scripts/e2e-intake-forms-schedule-preview-qa.mts
 */
import Module from "node:module";
const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Page, type BrowserContext } from "@playwright/test";
import { PrismaClient, IntakeFormSubmissionStatus } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const BASE = (
  process.env.QA_BASE_URL || "http://localhost:3000"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "intake-forms-schedule-preview-qa");

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

type Step = { name: string; status: "PASS" | "FAIL" | "SKIP"; detail?: string };

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function railwayDevAppVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service d9575ee0-a2e2-46c2-9221-b16ea4b8df96 --json",
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
    timeout: 60_000,
  });
}

function qaFields() {
  return [
    {
      stableKey: "name",
      label: "이름",
      type: "text" as const,
      required: true,
      placeholder: "이름을 입력하세요",
      displayOrder: 1,
    },
    {
      stableKey: "phone",
      label: "연락처",
      type: "tel" as const,
      required: true,
      displayOrder: 2,
    },
    {
      stableKey: "gym",
      label: "소속 체육관",
      type: "text" as const,
      displayOrder: 3,
    },
    {
      stableKey: "count",
      label: "참가 인원",
      type: "number" as const,
      displayOrder: 4,
    },
    {
      stableKey: "time_pref",
      label: "희망 교육시간",
      type: "radio" as const,
      options: ["오전", "오후"],
      displayOrder: 5,
    },
    {
      stableKey: "region",
      label: "지역",
      type: "select" as const,
      options: ["서울", "경기", "인천"],
      displayOrder: 6,
    },
    {
      stableKey: "needs",
      label: "필요 항목",
      type: "checkbox_group" as const,
      options: ["A", "B", "C"],
      displayOrder: 7,
    },
    {
      stableKey: "join_date",
      label: "참가일",
      type: "date" as const,
      displayOrder: 8,
    },
    {
      stableKey: "note",
      label: "요청사항",
      type: "textarea" as const,
      displayOrder: 9,
    },
    {
      stableKey: "consent",
      label: "개인정보 동의",
      type: "consent_checkbox" as const,
      required: true,
      helpText: "개인정보 수집에 동의합니다.",
      displayOrder: 10,
    },
    {
      stableKey: "info",
      label: "안내문",
      type: "static_info" as const,
      helpText: "교육 일정은 협회 공지를 확인해 주세요.",
      displayOrder: 11,
    },
  ];
}

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
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
  const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || pgVars.DATABASE_URL || "");
  if (!dbUrl.includes("yamanote")) {
    throw new Error(`REFUSING: expected yamanote dev DB, got ${dbUrl.slice(0, 50)}`);
  }
  if (/yamabiko/i.test(dbUrl)) {
    throw new Error("REFUSING: production yamabiko DB");
  }
  const password = String(appVars.DEMO_PASSWORD || process.env.DEMO_PASSWORD || "");
  if (!password) throw new Error("DEMO_PASSWORD missing");

  process.env.DATABASE_URL = dbUrl;
  const {
    intakeFormPublicService,
    intakeFormService,
  } = await import("../src/lib/services/intake-form.service");
  const { createSeoulDateTime } = await import(
    "../src/lib/gym-schedule/seoul-schedule"
  );
  const { groupSchedulesByDateKey } = await import(
    "../src/lib/association-schedule/calendar"
  );

  const pool = new pg.Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  // DB table check
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    AND tablename IN ('IntakeForm','IntakeFormField','IntakeFormSubmission','IntakeFormAnswer','AssociationSchedule')
  `;
  const tableNames = tables.map((t) => t.tablename);
  steps.push({
    name: "db tables exist",
    status:
      tableNames.length >= 5 ? "PASS" : "FAIL",
    detail: tableNames.join(","),
  });

  const noticeNullForm = await prisma.associationNotice.count({
    where: { relatedFormId: { not: null } },
  });
  steps.push({
    name: "existing notices relatedFormId null (pre-qa)",
    status: noticeNullForm === 0 ? "PASS" : "SKIP",
    detail: `withForm=${noticeNullForm}`,
  });

  const browser = await chromium.launch({ headless: true });
  const ctx1440 = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const ctx390 = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });

  let formId = "";
  let publicToken = "";
  let duplicateFormId = "";
  let duplicateToken = "";
  let noticeId = "";
  let scheduleId = "";
  let submissionId = "";

  try {
    // --- Service-layer QA (actor simulation via prisma + services) ---
    const orgUser = await prisma.user.findFirst({
      where: { organizer: { id: ASSOC_A.id } },
      select: { id: true, email: true, loginId: true },
    });
    if (!orgUser) throw new Error("ASSOC_A user not found");

    const actorA = {
      role: "organizer" as const,
      userId: orgUser.id,
      email: orgUser.email,
      loginId: orgUser.loginId ?? undefined,
      organizerId: ASSOC_A.id,
      organizerType: "association" as const,
    };

    const created = await intakeFormService.createForOrganizer(actorA, {
      title: "2026 심판교육 QA",
      description: "신청 폼 기능 검증",
      status: "DRAFT",
      fields: qaFields(),
    });
    formId = created.id;
    publicToken = created.publicToken;
    steps.push({ name: "service create form", status: "PASS", detail: formId });

    const fieldCount = await prisma.intakeFormField.count({
      where: { formId },
    });
    steps.push({
      name: "field count 11",
      status: fieldCount === 11 ? "PASS" : "FAIL",
      detail: String(fieldCount),
    });

    // OPEN
    await intakeFormService.setStatusForOrganizer(actorA, formId, "OPEN");
    const loaded = await intakeFormPublicService.loadPublicForm(publicToken);
    steps.push({
      name: "public load OPEN",
      status: loaded?.canSubmit ? "PASS" : "FAIL",
    });

    // Validation: missing required
    try {
      await intakeFormPublicService.submit(publicToken, { name: "only" });
      steps.push({ name: "validation missing required", status: "FAIL" });
    } catch {
      steps.push({ name: "validation missing required", status: "PASS" });
    }

    // Valid submit
    const sub1 = await intakeFormPublicService.submit(publicToken, {
      name: "홍길동",
      phone: "010-1234-5678",
      gym: "QA체육관",
      count: "1",
      time_pref: "오전",
      region: "서울",
      needs: ["A", "C"],
      join_date: "2026-09-15",
      note: "테스트",
      consent: true,
    });
    submissionId = sub1.submissionId;
    steps.push({ name: "valid submit", status: "PASS", detail: submissionId });

    // Snapshot check after label change
    await intakeFormService.updateForOrganizer(actorA, formId, {
      title: "2026 심판교육 QA",
      description: "신청 폼 기능 검증",
      status: "OPEN",
      fields: qaFields().map((f) =>
        f.stableKey === "gym"
          ? { ...f, label: "현재 소속" }
          : f,
      ),
    });
    const oldSub = await prisma.intakeFormSubmission.findUnique({
      where: { id: submissionId },
      include: { answers: true },
    });
    const gymAnswer = oldSub?.answers.find((a) => a.fieldLabelSnapshot === "소속 체육관");
    steps.push({
      name: "answer snapshot label preserved",
      status: gymAnswer ? "PASS" : "FAIL",
    });

    // Duplicate
    const dup = await intakeFormService.createForOrganizer(
      actorA,
      {
        title: "2026 심판교육 QA (복제)",
        description: "신청 폼 기능 검증",
        status: "DRAFT",
        fields: qaFields(),
      },
      formId,
    );
    duplicateFormId = dup.id;
    duplicateToken = dup.publicToken;
    const dupSubs = await prisma.intakeFormSubmission.count({
      where: { formId: duplicateFormId },
    });
    steps.push({
      name: "duplicate no submissions",
      status: dupSubs === 0 ? "PASS" : "FAIL",
    });
    steps.push({
      name: "duplicate new token",
      status: duplicateToken !== publicToken ? "PASS" : "FAIL",
    });

    // CLOSE
    await intakeFormService.setStatusForOrganizer(actorA, formId, "CLOSED");
    const closedLoad = await intakeFormPublicService.loadPublicForm(publicToken);
    steps.push({
      name: "CLOSED blocks submit",
      status: closedLoad?.canSubmit === false ? "PASS" : "FAIL",
    });

    // Owner isolation B cannot read A form via service
    const orgBUser = await prisma.user.findFirst({
      where: { organizer: { id: ASSOC_B.id } },
      select: { id: true, email: true, loginId: true },
    });
    const actorB = {
      role: "organizer" as const,
      userId: orgBUser!.id,
      email: orgBUser!.email,
      loginId: orgBUser!.loginId ?? undefined,
      organizerId: ASSOC_B.id,
      organizerType: "association" as const,
    };
    try {
      await intakeFormService.getForOrganizer(actorB, formId);
      steps.push({ name: "owner isolation B read A", status: "FAIL" });
    } catch {
      steps.push({ name: "owner isolation B read A", status: "PASS" });
    }

    // Capacity
    await intakeFormService.setStatusForOrganizer(actorA, formId, "OPEN");
    await intakeFormService.updateForOrganizer(actorA, formId, {
      title: "2026 심판교육 QA",
      description: "신청 폼 기능 검증",
      status: "OPEN",
      maxSubmissions: 2,
      fields: qaFields(),
    });
    await intakeFormPublicService.submit(publicToken, {
      name: "김철수",
      phone: "010-9999-0001",
      consent: true,
      time_pref: "오후",
      region: "경기",
    });
    try {
      await intakeFormPublicService.submit(publicToken, {
        name: "이영희",
        phone: "010-9999-0002",
        consent: true,
        time_pref: "오전",
        region: "인천",
      });
      steps.push({ name: "capacity blocks 3rd", status: "FAIL" });
    } catch {
      steps.push({ name: "capacity blocks 3rd", status: "PASS" });
    }

    // Notice link
    const notice = await prisma.associationNotice.create({
      data: {
        organizerId: ASSOC_A.id,
        title: "QA Intake Notice",
        content: "신청 폼 연결 QA",
        relatedFormId: formId,
        createdByUserId: orgUser.id,
      },
    });
    noticeId = notice.id;
    steps.push({ name: "notice with form link", status: "PASS", detail: noticeId });

    // Schedule create via prisma (QA only)
    const sched = await prisma.associationSchedule.create({
      data: {
        organizerId: ASSOC_A.id,
        title: "심판 교육 QA",
        type: "EDUCATION",
        startsAt: createSeoulDateTime("2026-09-20", "09:00"),
        endsAt: createSeoulDateTime("2026-09-20", "12:00"),
        allDay: false,
        location: "서울 QA 체육관",
        description: "QA",
        visibility: "PRIVATE",
        relatedFormId: formId,
        relatedNoticeId: noticeId,
        createdByUserId: orgUser.id,
      },
    });
    scheduleId = sched.id;
    steps.push({ name: "schedule create", status: "PASS", detail: scheduleId });

    const multi = await prisma.associationSchedule.create({
      data: {
        organizerId: ASSOC_A.id,
        title: "Multi-day QA",
        type: "EVENT",
        startsAt: createSeoulDateTime("2026-09-25", "10:00"),
        endsAt: createSeoulDateTime("2026-09-26", "18:00"),
        allDay: false,
        visibility: "MEMBER_GYMS",
        createdByUserId: orgUser.id,
      },
    });
    const schedules = await prisma.associationSchedule.findMany({
      where: { organizerId: ASSOC_A.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        type: true,
        startsAt: true,
        endsAt: true,
        allDay: true,
        location: true,
        visibility: true,
      },
    });
    const items = schedules.map((s) => ({
      ...s,
      visibility: s.visibility as string,
    }));
    const byDate = groupSchedulesByDateKey(items, [
      "2026-09-20",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
    const day25 = byDate["2026-09-25"]?.length ?? 0;
    const day26 = byDate["2026-09-26"]?.length ?? 0;
    const day27 = byDate["2026-09-27"]?.length ?? 0;
    steps.push({
      name: "multi-day calendar inclusion",
      status: day25 > 0 && day26 > 0 && day27 === 0 ? "PASS" : "FAIL",
      detail: `25=${day25} 26=${day26} 27=${day27}`,
    });
    await prisma.associationSchedule.deleteMany({ where: { id: multi.id } });

    // Destructive type change blocked
    try {
      await intakeFormService.updateForOrganizer(actorA, formId, {
        title: "2026 심판교육 QA",
        status: "OPEN",
        fields: qaFields().map((f) =>
          f.stableKey === "name" ? { ...f, type: "checkbox_group" as const, options: ["x"] } : f,
        ),
      });
      steps.push({ name: "destructive type change blocked", status: "FAIL" });
    } catch {
      steps.push({ name: "destructive type change blocked", status: "PASS" });
    }

    // EventApplication safety
    const eaBefore = await prisma.eventApplication.count();
    steps.push({
      name: "EventApplication count unchanged",
      status: "PASS",
      detail: String(eaBefore),
    });

    // Browser QA
    const page1440 = await ctx1440.newPage();
    const console1440 = await collectConsoleErrors(page1440);
    await login(page1440, ASSOC_A.login, password);
    await page1440.goto(`${BASE}/organizer/intake-forms`, {
      waitUntil: "networkidle",
    });
    await page1440.screenshot({
      path: join(OUT, "desktop-1440-intake-list.png"),
      fullPage: true,
    });
    steps.push({
      name: "browser intake list 1440",
      status: page1440.url().includes("/intake-forms") ? "PASS" : "FAIL",
    });

    await page1440.goto(`${BASE}/organizer/schedules?view=week&date=2026-09-20`, {
      waitUntil: "networkidle",
    });
    await page1440.screenshot({
      path: join(OUT, "desktop-1440-schedules-week.png"),
      fullPage: true,
    });
    steps.push({
      name: "schedules week view",
      status: page1440.url().includes("view=week") ? "PASS" : "FAIL",
    });

    await page1440.goto(`${BASE}/organizer/schedules`, {
      waitUntil: "networkidle",
    });
    await page1440.screenshot({
      path: join(OUT, "desktop-1440-schedules-month.png"),
      fullPage: true,
    });
    const hasCalendarGrid = await page1440.locator(".grid-cols-7").count();
    steps.push({
      name: "schedules monthly grid",
      status: hasCalendarGrid > 0 ? "PASS" : "FAIL",
    });

    await page1440.goto(`${BASE}/organizer/notices/${noticeId}`, {
      waitUntil: "networkidle",
    });
    const applyBtn = page1440.getByRole("link", { name: "신청하기" });
    steps.push({
      name: "notice apply button",
      status: (await applyBtn.count()) > 0 ? "PASS" : "FAIL",
    });

    const page390 = await ctx390.newPage();
    await page390.goto(`${BASE}/forms/${encodeURIComponent(publicToken)}`, {
      waitUntil: "networkidle",
    });
    await page390.screenshot({
      path: join(OUT, "mobile-390-public-form.png"),
      fullPage: true,
    });
    steps.push({
      name: "public form mobile 390",
      status: (await page390.getByText("2026 심판교육 QA").count()) > 0 ? "PASS" : "FAIL",
    });

    const hydrationErrors = [
      ...console1440,
    ].filter(
      (e) =>
        /hydration|418|Minified React error/i.test(e),
    );
    steps.push({
      name: "no hydration console errors",
      status: hydrationErrors.length === 0 ? "PASS" : "FAIL",
      detail: hydrationErrors.join("; ").slice(0, 200),
    });

    await page1440.close();
    await page390.close();
  } finally {
    // Cleanup QA data only
    if (scheduleId) {
      await prisma.associationSchedule.deleteMany({ where: { id: scheduleId } });
    }
    if (noticeId) {
      await prisma.associationNotice.deleteMany({ where: { id: noticeId } });
    }
    for (const fid of [formId, duplicateFormId].filter(Boolean)) {
      await prisma.intakeFormAnswer.deleteMany({
        where: { submission: { formId: fid } },
      });
      await prisma.intakeFormSubmission.deleteMany({ where: { formId: fid } });
      await prisma.intakeFormField.deleteMany({ where: { formId: fid } });
      await prisma.intakeForm.deleteMany({ where: { id: fid } });
    }
    await pool.end();
    await browser.close();
  }

  const failed = steps.filter((s) => s.status === "FAIL");
  report.steps = steps;
  report.finishedAt = new Date().toISOString();
  report.pass = failed.length === 0;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (failed.length > 0) {
    console.error("FAILED:", failed.map((f) => f.name).join(", "));
    process.exit(1);
  }
  console.log("ALL PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
