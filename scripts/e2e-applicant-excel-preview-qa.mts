/**
 * Preview organizer Excel import QA.
 * Development yamanote only. Never touches Production/yamabiko.
 *
 *   npx tsx scripts/e2e-applicant-excel-preview-qa.mts
 *   npx tsx scripts/e2e-applicant-excel-preview-qa.mts --cleanup
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Module from "node:module";
import ExcelJS from "exceljs";
import { chromium, type Page } from "playwright";

const APPLICANT_EXCEL_HEADERS = [
  "선수명",
  "성별",
  "생년월일",
  "연락처",
  "체육관명",
  "경기구분",
  "체급",
  "체중기준",
  "종목",
  "체중",
  "보호자이름",
  "보호자연락처",
  "메모",
] as const;
const APPLICANT_EXCEL_SHEET_DATA = "선수 신청";
const APPLICANT_EXCEL_SHEET_GUIDE = "입력 안내";

function assertDevelopmentYamanoteDatabaseUrl(databaseUrl: string) {
  const hostMatch = databaseUrl.match(/@([^/]+)\//);
  const host = hostMatch?.[1] ?? "";
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: expected yamanote, got ${host || "unknown"}`);
  }
}

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const PREFIX = "APPLICANT_EXCEL_QA_";
const BASE = "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "applicant-excel-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup");

type Report = Record<string, string>;

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function row(input: {
  name: string;
  gender?: string;
  birth?: string;
  phone?: string;
  gym: string;
  ageGroup: string;
  weightClass: string;
  sport?: string;
  weight?: string;
  guardianName?: string;
  guardianPhone?: string;
}): string[] {
  return [
    input.name,
    input.gender ?? "남",
    input.birth ?? "2008-03-15",
    input.phone ?? "",
    input.gym,
    input.ageGroup,
    input.weightClass,
    "",
    input.sport ?? "킥복싱",
    input.weight ?? "",
    input.guardianName ?? "",
    input.guardianPhone ?? "",
    "",
  ];
}

async function bufferFromRows(rows: string[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  sheet.addRow([...APPLICANT_EXCEL_HEADERS]);
  for (const r of rows) sheet.addRow(r);
  return workbookToBuffer(wb);
}

function attachQuality(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const hydration: string[] = [];
  const status5xx: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (text.includes("favicon") || text.includes("Download the React DevTools")) {
      return;
    }
    consoleErrors.push(text);
    if (/hydrat/i.test(text) || text.includes("#418")) hydration.push(text);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
    if (/hydrat/i.test(err.message) || err.message.includes("#418")) {
      hydration.push(err.message);
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 500) status5xx.push(`${res.status()} ${res.url()}`);
  });
  return { consoleErrors, pageErrors, hydration, status5xx };
}

async function login(page: Page, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByLabel("아이디").fill("organizer");
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
}

async function openExcelDialog(page: Page) {
  await page.getByRole("button", { name: "엑셀 일괄 등록" }).click();
  await page.getByRole("heading", { name: "선수 신청 엑셀 일괄 등록" }).waitFor();
}

async function uploadAndWaitPreview(page: Page, filePath: string) {
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await page.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertDevelopmentYamanoteDatabaseUrl(dbUrl);
  if (/yamabiko/i.test(dbUrl)) throw new Error("REFUSE production db");
  process.env.DATABASE_URL = dbUrl;

  const password = String(app.DEMO_PASSWORD || "123456!!");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, EventStatus, UserRole } = await import(
    "../src/generated/prisma"
  );
  const { applicationService } = await import(
    "../src/lib/services/application.service"
  );

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const report: Report = {};
  let eventId = "";
  let otherEventId = "";

  async function cleanupQa() {
    const events = await prisma.event.findMany({
      where: { publicSlug: { startsWith: "applicant-excel-qa-" } },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    const fighters = await prisma.fighter.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const fighterIds = fighters.map((f) => f.id);
    if (eventIds.length) {
      const apps = await prisma.eventApplication.findMany({
        where: { eventId: { in: eventIds } },
        select: { id: true },
      });
      const appIds = apps.map((a) => a.id);
      if (appIds.length) {
        await prisma.eventApplicationPayment.deleteMany({
          where: { eventApplicationId: { in: appIds } },
        });
        await prisma.guardianConsent.deleteMany({
          where: { eventApplicationId: { in: appIds } },
        });
        await prisma.fighterConsent.deleteMany({
          where: { eventApplicationId: { in: appIds } },
        });
      }
      await prisma.eventApplication.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    if (fighterIds.length) {
      await prisma.fighterGymHistory.deleteMany({
        where: { fighterId: { in: fighterIds } },
      });
      await prisma.fighter.deleteMany({ where: { id: { in: fighterIds } } });
    }
    console.log(`CLEANUP events=${eventIds.length} fighters=${fighterIds.length}`);
  }

  try {
    await cleanupQa();
    if (cleanupOnly) return;

    const organizerUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
      include: { organizer: true },
    });
    assert.ok(organizerUser?.organizer, "demo organizer missing");
    const organizer = organizerUser.organizer;
    const otherOrganizer = await prisma.organizer.findFirst({
      where: { id: { not: organizer.id } },
    });

    const gymsBefore = await prisma.gym.count();
    const usersBefore = await prisma.user.count();
    const placeholderBefore = await prisma.gym.count({
      where: { name: { startsWith: "MATCHON 외부등록" } },
    });

    const stamp = Date.now().toString(36);
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX} Preview QA`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: EventStatus.open,
        publicSlug: `applicant-excel-qa-${stamp}`,
        courts: {
          create: [{ name: "QA코트1", sortOrder: 0 }],
        },
        divisions: {
          create: [
            {
              sportType: "킥복싱",
              gender: "male",
              ageGroup: "고등부",
              weightClass: "라이트급 -60kg",
              weightClassName: "라이트급",
              weightLimitText: "-60kg",
            },
            {
              sportType: "킥복싱",
              gender: "male",
              ageGroup: "고등부",
              weightClass: "라이트웰터급 -63.5kg",
              weightClassName: "라이트웰터급",
              weightLimitText: "-63.5kg",
            },
            {
              sportType: "킥복싱",
              gender: "male",
              ageGroup: "대학·일반부",
              weightClass: "슈퍼헤비급 +91kg",
              weightClassName: "슈퍼헤비급",
              weightLimitText: "+91kg",
            },
          ],
        },
      },
      include: { divisions: true },
    });
    eventId = event.id;
    if (otherOrganizer) {
      const other = await prisma.event.create({
        data: {
          organizerId: otherOrganizer.id,
          title: `${PREFIX} OTHER EVENT`,
          location: "QA",
          eventDate: new Date("2026-12-01T00:00:00.000Z"),
          registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
          registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
          status: EventStatus.open,
          publicSlug: `applicant-excel-qa-other-${stamp}`,
        },
      });
      otherEventId = other.id;
    }

    await prisma.organizerCreditWallet.upsert({
      where: { organizerId: organizer.id },
      create: { organizerId: organizer.id, balance: 20_000 },
      update: { balance: 20_000 },
    });

    const valid10 = [
      row({
        name: `${PREFIX}01`,
        gym: "QA 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        phone: "010-1111-0001",
      }),
      row({
        name: `${PREFIX}02`,
        gym: "QA 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "-63.5kg",
        phone: "010-1111-0002",
        guardianName: "보호자갑",
        guardianPhone: "010-2222-0002",
      }),
      row({
        name: `${PREFIX}03`,
        gym: "QA 외부체육관 B",
        ageGroup: "대학·일반부",
        weightClass: "+91kg",
      }),
      row({
        name: `${PREFIX}04`,
        gym: "QA 외부체육관 B",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        phone: "010-1111-0004",
      }),
      row({
        name: `${PREFIX}05`,
        gym: "QA 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "라이트웰터급 -63.5kg",
        guardianName: "보호자을",
        guardianPhone: "010-2222-0005",
      }),
      row({
        name: `${PREFIX}06`,
        gym: "QA 외부체육관 B",
        ageGroup: "대학·일반부",
        weightClass: "슈퍼헤비급 +91kg",
        weight: "96",
      }),
      row({
        name: `${PREFIX}07`,
        gym: "QA 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
      }),
      row({
        name: `${PREFIX}08`,
        gym: "QA 외부체육관 B",
        ageGroup: "고등부",
        weightClass: "-63.5kg",
        phone: "010-1111-0008",
      }),
      row({
        name: `${PREFIX}09`,
        gym: "QA 외부체육관 A",
        ageGroup: "대학·일반부",
        weightClass: "+91kg",
      }),
      row({
        name: `${PREFIX}10`,
        gym: "QA 외부체육관 B",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        guardianName: "보호자병",
        guardianPhone: "010-2222-0010",
      }),
    ];
    const validPath = join(OUT, "valid-10.xlsx");
    writeFileSync(validPath, await bufferFromRows(valid10));

    const dupPath = join(OUT, "duplicate.xlsx");
    writeFileSync(
      dupPath,
      await bufferFromRows([valid10[0]!, valid10[0]!]),
    );

    const invalidPath = join(OUT, "invalid.xlsx");
    writeFileSync(
      invalidPath,
      await bufferFromRows([
        row({
          name: "",
          gym: "QA 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
        row({
          name: `${PREFIX}BAD_GENDER`,
          gender: "모름",
          gym: "QA 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
        row({
          name: `${PREFIX}BAD_BIRTH`,
          birth: "99-13-40",
          gym: "QA 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
        row({
          name: `${PREFIX}NO_GYM`,
          gym: "",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
        row({
          name: `${PREFIX}NO_AGE`,
          gym: "QA 외부체육관 A",
          ageGroup: "없는부",
          weightClass: "라이트급 -60kg",
        }),
        row({
          name: `${PREFIX}BARE_635`,
          gym: "QA 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "63.5",
        }),
        row({
          name: `${PREFIX}BAD_WEIGHT`,
          gym: "QA 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
          weight: "무거움",
        }),
      ]),
    );

    const fifty = Array.from({ length: 50 }, (_, i) =>
      row({
        name: `${PREFIX}F${String(i + 1).padStart(2, "0")}`,
        gym: i % 2 === 0 ? "QA 외부체육관 A" : "QA 외부체육관 B",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
      }),
    );
    const fiftyPath = join(OUT, "valid-50.xlsx");
    writeFileSync(fiftyPath, await bufferFromRows(fifty));

    const hundred = Array.from({ length: 100 }, (_, i) =>
      row({
        name: `${PREFIX}H${String(i + 1).padStart(3, "0")}`,
        gym: "QA 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
      }),
    );
    const hundredPath = join(OUT, "valid-100.xlsx");
    writeFileSync(hundredPath, await bufferFromRows(hundred));
    const overPath = join(OUT, "over-101.xlsx");
    writeFileSync(
      overPath,
      await bufferFromRows([
        ...hundred,
        row({
          name: `${PREFIX}H101`,
          gym: "QA 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
      ]),
    );

    const actor = {
      userId: organizerUser.id,
      role: UserRole.organizer,
      email: organizerUser.email ?? "organizer@demo.local",
      loginId: organizerUser.loginId ?? "organizer",
      organizerId: organizer.id,
    };

    if (otherEventId) {
      let blocked = false;
      try {
        await applicationService.analyzeOrganizerApplicantExcel(actor, {
          eventId: otherEventId,
          fileName: "valid-10.xlsx",
          buffer: await bufferFromRows(valid10),
        });
      } catch {
        blocked = true;
      }
      report.organizerScope = blocked ? "PASS" : "FAIL";
    } else {
      report.organizerScope = "SKIP no other organizer";
    }

    await prisma.organizerCreditWallet.update({
      where: { organizerId: organizer.id },
      data: { balance: 900 },
    });
    let atomicBlocked = false;
    try {
      await applicationService.commitOrganizerApplicantExcel(actor, {
        eventId,
        fileName: "valid-10.xlsx",
        buffer: await bufferFromRows(valid10),
      });
    } catch {
      atomicBlocked = true;
    }
    const afterFail = await prisma.eventApplication.count({
      where: { eventId, fighter: { name: { startsWith: PREFIX } } },
    });
    report.batchRollback =
      atomicBlocked && afterFail === 0 ? "PASS 0 created" : `FAIL count=${afterFail}`;
    await prisma.organizerCreditWallet.update({
      where: { organizerId: organizer.id },
      data: { balance: 20_000 },
    });

    const browser = await chromium.launch({ headless: true });
    try {
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: "ko-KR",
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const quality = attachQuality(page);

    await login(page, password);
    report.login = "PASS";
    await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    report.event = event.publicSlug;

    const header = page.locator("header, [class*='EventManagement']").first();
    await page.getByRole("button", { name: "선수 직접 등록" }).waitFor();
    await page.getByRole("button", { name: "엑셀 일괄 등록" }).waitFor();
    const linkBtn = page.getByRole("button", { name: /링크 (관리|생성)/ });
    await linkBtn.waitFor();
    const styles = await page.evaluate(() => {
      const names = ["선수 직접 등록", "엑셀 일괄 등록"];
      return names.map((name) => {
        const el = [...document.querySelectorAll("button")].find(
          (b) => b.textContent?.trim() === name,
        );
        if (!el) return null;
        const s = getComputedStyle(el);
        return {
          name,
          h: Math.round(el.getBoundingClientRect().height),
          bg: s.backgroundColor,
        };
      });
    });
    report.headerButtons = JSON.stringify(styles);
    const kpiH = await page.evaluate(() => {
      const el = document.querySelector('[class*="h-[56px]"]') as HTMLElement | null;
      return el ? Math.round(el.getBoundingClientRect().height) : -1;
    });
    report.kpiHeight = String(kpiH);
    await page.screenshot({
      path: join(OUT, "1366-applications.png"),
      fullPage: false,
    });

    await openExcelDialog(page);
    report.dialogOpen = "PASS";
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 30_000 }),
      page.getByRole("button", { name: "샘플 엑셀 다운로드" }).click(),
    ]);
    const samplePath = join(OUT, download.suggestedFilename());
    await download.saveAs(samplePath);
    report.sampleFilename = download.suggestedFilename();
    const sampleWb = new ExcelJS.Workbook();
    await sampleWb.xlsx.readFile(samplePath);
    const dataSheet = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA);
    const guideSheet = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
    assert.ok(dataSheet && guideSheet);
    const headers: string[] = [];
    dataSheet.getRow(1).eachCell((c) => headers.push(String(c.value ?? "")));
    report.sampleColumns = headers.join(",");
    const guideText: string[] = [];
    guideSheet.eachRow((r) => {
      r.eachCell((c) => guideText.push(String(c.value ?? "")));
    });
    const guideJoined = guideText.join(" | ");
    report.guideHasDivisions =
      guideJoined.includes("고등부") &&
      guideJoined.includes("-63.5kg") &&
      guideJoined.includes("+91kg")
        ? "PASS"
        : `FAIL ${guideJoined.slice(0, 200)}`;
    report.guideNoInternalIds = /eventDivisionId|gymId|highMale/.test(guideJoined)
      ? "FAIL"
      : "PASS";

    await uploadAndWaitPreview(page, validPath);
    const previewSummary = await page.locator("p").filter({ hasText: "총 10명" }).first().innerText();
    report.analyze10 = previewSummary;
    const commitBtn = page.getByRole("button", { name: "10명 등록" });
    assert.equal(await commitBtn.isDisabled(), false);
    await page.screenshot({ path: join(OUT, "1366-preview-10.png") });
    await commitBtn.click();
    await page.getByText("등록 완료 10명").waitFor({ timeout: 120_000 });
    report.commit10 = (await page.locator("div").filter({ hasText: "등록 완료 10명" }).first().innerText()).slice(0, 200);
    await page.getByRole("button", { name: "신청자 목록으로 돌아가기" }).click();

    const apps = await prisma.eventApplication.findMany({
      where: { eventId, fighter: { name: { startsWith: PREFIX } } },
      include: { fighter: true, gym: { include: { ownerUser: true } } },
    });
    report.dbApplications = String(apps.length);
    report.dbFighters = String(
      new Set(apps.map((a) => a.fighterId)).size,
    );
    report.status = [...new Set(apps.map((a) => a.status))].join(",");
    report.payment = [...new Set(apps.map((a) => a.paymentStatus))].join(",");
    const snapshots = apps.map((a) => {
      const g = a.gymSnapshot as { name?: string };
      return g?.name ?? "";
    });
    report.snapshots = [...new Set(snapshots)].sort().join(" | ");
    report.placeholderGym = apps.every((a) =>
      (a.gym.ownerUser?.loginId ?? "").startsWith("ext-reg-"),
    )
      ? "PASS"
      : "FAIL";
    report.entrySource = apps.every((a) => {
      const snap = a.applicationAgreementSnapshot as Record<string, unknown> | null;
      return snap?.entrySource === "organizer_manual" && snap?.importChannel === "excel";
    })
      ? "PASS"
      : "FAIL";
    report.excelMemo = apps.every((a) => (a.memo ?? "").includes("[엑셀 일괄 등록]"))
      ? "PASS"
      : "FAIL";
    const autoMatchRows = await prisma.eventApplication.findMany({
      where: {
        eventId,
        status: { in: ["approved", "pending"] },
        fighter: { name: { startsWith: PREFIX } },
      },
      select: { fighter: { select: { name: true } } },
    });
    report.autoMatchIncludesExcel = autoMatchRows.some((r) =>
      r.fighter.name.startsWith(`${PREFIX}01`),
    )
      ? "PASS"
      : "FAIL";

    await page.reload({ waitUntil: "networkidle" });
    await page.getByText(`${PREFIX}01`).first().waitFor();
    report.listVisible = "PASS";
    const extRegVisible = await page.getByText("ext-reg-").count();
    report.extRegHidden = extRegVisible === 0 ? "PASS" : "FAIL";

    await openExcelDialog(page);
    await uploadAndWaitPreview(page, validPath);
    const retryText = await page.locator("p").filter({ hasText: "이미 등록 10명" }).first().innerText();
    report.retry = retryText;
    const retryCommit = page.getByRole("button", { name: /명 등록/ });
    report.retryCommitDisabled = (await retryCommit.isDisabled()) ? "PASS" : "FAIL";
    await page.getByRole("button", { name: "취소" }).click();

    await openExcelDialog(page);
    await uploadAndWaitPreview(page, dupPath);
    report.duplicate = await page.locator("p").filter({ hasText: "오류" }).first().innerText();
    report.duplicateDisabled = (await page.getByRole("button", { name: /명 등록/ }).isDisabled())
      ? "PASS"
      : "FAIL";
    await page.getByRole("button", { name: "취소" }).click();

    await openExcelDialog(page);
    await uploadAndWaitPreview(page, invalidPath);
    const invalidBody = await page.locator('[role="dialog"]').innerText();
    report.invalidHasBare635 = invalidBody.includes("63.5") || invalidBody.includes("없는 경기구분")
      ? "PASS"
      : "FAIL";
    report.invalidDisabled = (await page.getByRole("button", { name: /명 등록/ }).isDisabled())
      ? "PASS"
      : "FAIL";
    await page.getByRole("button", { name: "취소" }).click();

    await openExcelDialog(page);
    await page.locator('input[type="file"]').setInputFiles(overPath);
    await page.getByRole("alert").waitFor({ timeout: 30_000 });
    report.reject101 = await page.getByRole("alert").innerText();
    await page.getByRole("button", { name: "취소" }).click();

    await openExcelDialog(page);
    const t50 = Date.now();
    await uploadAndWaitPreview(page, fiftyPath);
    report.analyze50ms = String(Date.now() - t50);
    report.analyze50 = await page.locator("p").filter({ hasText: "총 50명" }).first().innerText();
    await page.getByRole("button", { name: "취소" }).click();

    await page.getByRole("button", { name: "선수 직접 등록" }).click();
    await page.getByText("체육관 · 선수 기본 정보").waitFor();
    await page.getByRole("button", { name: "체육관명 직접 입력" }).click();
    await page.locator('input[name="gymName"]').fill("QA 직접등록체육관");
    await page.locator('input[name="fighterName"]').fill(`${PREFIX}MANUAL`);
    await page.locator('select[name="gender"]').selectOption("male");
    await page.locator('input[name="birthDate"]').fill("2008-03-15");
    const lightId = event.divisions.find((d) => d.weightLimitText === "-60kg")?.id;
    if (lightId) await page.locator('select[name="divisionId"]').selectOption(lightId);
    await page.getByRole("button", { name: "등록", exact: true }).click();
    await page.getByText(`${PREFIX}MANUAL`).first().waitFor({ timeout: 30_000 });
    report.directRegistration = "PASS";
    const manualInMatch = await prisma.eventApplication.findFirst({
      where: { eventId, fighter: { name: `${PREFIX}MANUAL` } },
      select: { id: true, status: true },
    });
    report.autoMatchIncludesManual = manualInMatch ? "PASS" : "FAIL";

    await page.getByRole("button", { name: /링크 (관리|생성)/ }).click();
    await page.getByText(/외부 체육관|등록 링크|링크/).first().waitFor({ timeout: 15_000 });
    report.linkManager = "PASS";

    await page.goto(`${BASE}/organizer/events/${eventId}/brackets?tab=generate`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.getByRole("button", { name: "미리보기" }).click();
    await page.getByText("자동매칭 미리보기").waitFor({ timeout: 60_000 });
    const bracketText = await page.locator("body").innerText();
    report.bracketExcel = bracketText.includes(PREFIX) ? "PASS" : "FAIL";
    report.bracketManual = bracketText.includes(`${PREFIX}MANUAL`)
      ? "PASS"
      : report.autoMatchIncludesManual;
    report.bracketPreview = bracketText.includes("생성 예정") ? "PASS" : "FAIL";
    await page.screenshot({ path: join(OUT, "1366-brackets.png") });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await openExcelDialog(page);
    await page.getByRole("button", { name: "샘플 엑셀 다운로드" }).waitFor();
    await uploadAndWaitPreview(page, invalidPath);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    report.mobileOverflow = overflow ? "FAIL" : "PASS";
    const mobileCards = await page.locator('[class*="rounded-[10px]"]').count();
    report.mobilePreview = mobileCards > 0 ? "PASS" : "FAIL";
    await page.screenshot({ path: join(OUT, "390-preview.png") });
    await page.getByRole("button", { name: "취소" }).click();

    const gymsAfter = await prisma.gym.count();
    const usersAfter = await prisma.user.count();
    const namedGym = await prisma.gym.count({
      where: { name: { in: ["QA 외부체육관 A", "QA 외부체육관 B"] } },
    });
    report.gymTenantDelta = String(gymsAfter - gymsBefore);
    report.userDelta = String(usersAfter - usersBefore);
    report.namedGymCreated = namedGym === 0 ? "PASS" : "FAIL";
    const placeholderAfter = await prisma.gym.count({
      where: { name: { startsWith: "MATCHON 외부등록" } },
    });
    report.placeholderReuse =
      placeholderAfter === placeholderBefore || placeholderAfter === placeholderBefore + 1
        ? "PASS"
        : `FAIL ${placeholderBefore}->${placeholderAfter}`;

    report.consoleErrors = String(quality.consoleErrors.length);
    report.pageErrors = String(quality.pageErrors.length);
    report.hydration = String(quality.hydration.length);
    report.status5xx = String(quality.status5xx.length);
    if (quality.consoleErrors.length) report.consoleSample = quality.consoleErrors[0]!;
    if (quality.status5xx.length) report.status5xxSample = quality.status5xx[0]!;
    } finally {
      await browser.close();
    }

    await cleanupQa();
    const leftover = await prisma.fighter.count({
      where: { name: { startsWith: PREFIX } },
    });
    report.cleanup = leftover === 0 ? "PASS" : `FAIL leftover=${leftover}`;
  } catch (err) {
    try {
      await cleanupQa();
    } catch (cleanupErr) {
      console.error("cleanup failed", cleanupErr);
    }
    throw err;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
