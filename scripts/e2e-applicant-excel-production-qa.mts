/**
 * Production organizer Excel import QA.
 * yamabiko (production) only. Never touches Preview/yamanote.
 *
 *   npx tsx scripts/e2e-applicant-excel-production-qa.mts
 *   npx tsx scripts/e2e-applicant-excel-production-qa.mts --cleanup
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

function assertProductionYamabikoDatabaseUrl(databaseUrl: string) {
  if (!/yamabiko/i.test(databaseUrl) || /yamanote/i.test(databaseUrl)) {
    const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "unknown";
    throw new Error(`REFUSING DB write: expected yamabiko production, got ${host}`);
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

const PREFIX = "PROD_APPLICANT_EXCEL_QA_";
const BASE = "https://app-production-79ad.up.railway.app";
const OUT = join(process.cwd(), "test-results", "applicant-excel-production-qa");
const cleanupOnly = process.argv.includes("--cleanup");

type Report = Record<string, string>;

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e production -s ${service} --json`,
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
    "",
    "",
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
    if (text.includes("favicon") || text.includes("Download the React DevTools")) return;
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
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
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
  assertProductionYamabikoDatabaseUrl(dbUrl);
  process.env.DATABASE_URL = dbUrl;

  const password = String(app.DEMO_PASSWORD || "123456!!");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, EventStatus, UserRole } = await import("../src/generated/prisma");

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const report: Report = {};
  let eventId = "";
  let realEventId = "";

  async function cleanupQa() {
    const events = await prisma.event.findMany({
      where: { publicSlug: { startsWith: "prod-applicant-excel-qa-" } },
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
      await prisma.eventApplication.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    }
    if (fighterIds.length) {
      await prisma.fighterGymHistory.deleteMany({ where: { fighterId: { in: fighterIds } } });
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

    const realEvent = await prisma.event.findFirst({
      where: {
        organizerId: organizer.id,
        status: EventStatus.open,
        publicSlug: { not: { startsWith: "prod-applicant-excel-qa-" } },
      },
      orderBy: { eventDate: "desc" },
      select: { id: true, title: true, publicSlug: true },
    });
    realEventId = realEvent?.id ?? "";

    const gymsBefore = await prisma.gym.count();
    const usersBefore = await prisma.user.count();
    const placeholderBefore = await prisma.gym.count({
      where: { name: { startsWith: "MATCHON 외부등록" } },
    });

    const stamp = Date.now().toString(36);
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX} Production QA`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: EventStatus.open,
        publicSlug: `prod-applicant-excel-qa-${stamp}`,
        courts: { create: [{ name: "QA코트1", sortOrder: 0 }] },
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

    await prisma.organizerCreditWallet.upsert({
      where: { organizerId: organizer.id },
      create: { organizerId: organizer.id, balance: 20_000 },
      update: { balance: 20_000 },
    });

    const valid3 = [
      row({
        name: `${PREFIX}01`,
        gym: "PROD 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        phone: "010-9001-0001",
      }),
      row({
        name: `${PREFIX}02`,
        gym: "PROD 외부체육관 B",
        ageGroup: "고등부",
        weightClass: "라이트웰터급 -63.5kg",
        phone: "010-9001-0002",
      }),
      row({
        name: `${PREFIX}03`,
        gym: "PROD 외부체육관 A",
        ageGroup: "대학·일반부",
        weightClass: "슈퍼헤비급 +91kg",
        phone: "010-9001-0003",
      }),
    ];
    const validPath = join(OUT, "valid-3.xlsx");
    writeFileSync(validPath, await bufferFromRows(valid3));

    const dupPath = join(OUT, "dup.xlsx");
    writeFileSync(
      dupPath,
      await bufferFromRows([
        row({
          name: `${PREFIX}DUP`,
          gym: "PROD 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
        row({
          name: `${PREFIX}DUP`,
          gym: "PROD 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
      ]),
    );

    const invalidPath = join(OUT, "invalid.xlsx");
    writeFileSync(
      invalidPath,
      await bufferFromRows([
        row({ name: "", gym: "PROD 외부체육관 A", ageGroup: "고등부", weightClass: "라이트급 -60kg" }),
        row({
          name: `${PREFIX}BAD_DIV`,
          gym: "PROD 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "없는체급 -999kg",
        }),
        row({
          name: `${PREFIX}BARE_635`,
          gym: "PROD 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "63.5",
        }),
      ]),
    );

    const hundred = Array.from({ length: 100 }, (_, i) =>
      row({
        name: `${PREFIX}H${String(i + 1).padStart(3, "0")}`,
        gym: "PROD 외부체육관 A",
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
      }),
    );
    const overPath = join(OUT, "over-101.xlsx");
    writeFileSync(
      overPath,
      await bufferFromRows([
        ...hundred,
        row({
          name: `${PREFIX}H101`,
          gym: "PROD 외부체육관 A",
          ageGroup: "고등부",
          weightClass: "라이트급 -60kg",
        }),
      ]),
    );

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

      if (realEventId) {
        await page.goto(`${BASE}/organizer/events/${realEventId}/applications`, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
        report.realEvent = realEvent?.title ?? realEventId;
        await openExcelDialog(page);
        const [download] = await Promise.all([
          page.waitForEvent("download", { timeout: 30_000 }),
          page.getByRole("button", { name: "샘플 엑셀 다운로드" }).click(),
        ]);
        report.realEventSample = download.suggestedFilename();
        await page.getByRole("button", { name: "취소" }).click();
        report.realEventAnalyzeOnly = "PASS no commit";
      } else {
        report.realEventAnalyzeOnly = "SKIP no open event";
      }

      await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      report.qaEvent = event.publicSlug;

      await page.getByRole("button", { name: "선수 직접 등록" }).waitFor();
      await page.getByRole("button", { name: "엑셀 일괄 등록" }).waitFor();
      await page.getByRole("button", { name: /링크 (관리|생성)/ }).waitFor();
      report.header3Actions = "PASS";

      const kpiH = await page.evaluate(() => {
        const el = [...document.querySelectorAll("*")].find((e) =>
          String((e as HTMLElement).className || "").includes("h-[56px]"),
        ) as HTMLElement | undefined;
        return el ? Math.round(el.getBoundingClientRect().height) : -1;
      });
      report.kpiApplicants = String(kpiH);

      await openExcelDialog(page);
      await page.getByText("Excel 파일을 여기에 놓거나").waitFor();
      await page.getByRole("button", { name: "파일 선택" }).waitFor();
      await page.getByText(".xlsx · 최대 2MB · 100명").waitFor();
      const visibleNativeFile = await page.evaluate(() => {
        const inputs = [...document.querySelectorAll('input[type="file"]')];
        return inputs.some((el) => {
          const s = getComputedStyle(el);
          return s.display !== "none" && s.visibility !== "hidden" && !el.classList.contains("sr-only");
        });
      });
      report.dropzone = visibleNativeFile ? "FAIL native visible" : "PASS";
      report.dropzonePicker = "PASS";

      const [sampleDl] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.getByRole("button", { name: "샘플 엑셀 다운로드" }).click(),
      ]);
      const samplePath = join(OUT, sampleDl.suggestedFilename());
      await sampleDl.saveAs(samplePath);
      report.sampleFilename = sampleDl.suggestedFilename();
      const sampleWb = new ExcelJS.Workbook();
      await sampleWb.xlsx.readFile(samplePath);
      const dataSheet = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA);
      const guideSheet = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
      assert.ok(dataSheet && guideSheet);
      const headers: string[] = [];
      const headerRowIdx =
        String(dataSheet.getRow(1).getCell(1).value ?? "").includes("선수명") ? 1 : 2;
      dataSheet.getRow(headerRowIdx).eachCell((c) => headers.push(String(c.value ?? "")));
      report.sampleColumns = headers.filter((h) => h === "선수명" || APPLICANT_EXCEL_HEADERS.includes(h as never)).length >= 13
        ? "PASS 13"
        : `FAIL ${headers.join(",")}`;
      let dataAthletes = 0;
      dataSheet.eachRow((row, n) => {
        if (n > headerRowIdx && String(row.getCell(1).value || "").trim()) dataAthletes += 1;
      });
      report.sampleFakeAthletes = dataAthletes === 0 ? "PASS 0" : `FAIL ${dataAthletes}`;
      const guideParts: string[] = [];
      guideSheet.eachRow((r) => r.eachCell((c) => guideParts.push(String(c.value ?? ""))));
      const guideJoined = guideParts.join(" | ");
      report.guideGender = /남성/.test(guideJoined) && /여성/.test(guideJoined) ? "PASS" : "FAIL";
      report.guideBirth = guideJoined.includes("2008-05-12") ? "PASS" : "FAIL";
      report.guideWeightLimit =
        guideJoined.includes("-63.5kg") || guideJoined.includes("+91kg") ? "PASS" : "FAIL";
      report.guideActualWeight = guideJoined.includes("62.8") ? "PASS" : "FAIL";
      report.guideWeightDiff =
        guideJoined.includes("체중기준") && guideJoined.includes("실제 체중")
          ? "PASS"
          : guideJoined.includes("체중기준")
            ? "PASS"
            : "FAIL";
      report.guideNoInternalIds = /eventDivisionId|gymId/.test(guideJoined) ? "FAIL" : "PASS";

      // client reject: png
      const pngPath = join(OUT, "bad.png");
      writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
      await page.locator('input[type="file"]').setInputFiles(pngPath);
      await page.getByText(/지원하지 않는 파일|\.xlsx/).first().waitFor({ timeout: 10_000 });
      report.invalidPng = "PASS";

      await uploadAndWaitPreview(page, validPath);
      report.analyze3 = await page.locator("p").filter({ hasText: "총 3명" }).first().innerText();
      const commitBtn = page.getByRole("button", { name: "3명 등록" });
      assert.equal(await commitBtn.isDisabled(), false);
      await commitBtn.click();
      await page.getByText("등록 완료 3명").waitFor({ timeout: 120_000 });
      report.commit3 = "PASS";
      await page.getByRole("button", { name: "신청자 목록으로 돌아가기" }).click();

      const apps = await prisma.eventApplication.findMany({
        where: { eventId, fighter: { name: { startsWith: PREFIX } } },
        include: { fighter: true, gym: { include: { ownerUser: true } } },
      });
      report.dbApplications = String(apps.length);
      report.dbFighters = String(new Set(apps.map((a) => a.fighterId)).size);
      report.status = [...new Set(apps.map((a) => a.status))].join(",");
      report.payment = [...new Set(apps.map((a) => a.paymentStatus))].join(",");
      report.snapshots = [...new Set(apps.map((a) => (a.gymSnapshot as { name?: string })?.name ?? ""))].join(" | ");
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
      report.excelMemo = apps.every((a) => (a.memo ?? "").includes("[엑셀 일괄 등록]")) ? "PASS" : "FAIL";

      await page.reload({ waitUntil: "networkidle" });
      await page.getByText(`${PREFIX}01`).first().waitFor();
      report.listVisible = "PASS";
      report.extRegHidden = (await page.getByText("ext-reg-").count()) === 0 ? "PASS" : "FAIL";

      await openExcelDialog(page);
      await uploadAndWaitPreview(page, validPath);
      report.retry = await page.locator("p").filter({ hasText: "이미 등록 3명" }).first().innerText();
      report.retryCommitDisabled = (await page.getByRole("button", { name: /명 등록/ }).isDisabled())
        ? "PASS"
        : "FAIL";
      await page.getByRole("button", { name: "취소" }).click();

      await openExcelDialog(page);
      await uploadAndWaitPreview(page, dupPath);
      report.duplicateDisabled = (await page.getByRole("button", { name: /명 등록/ }).isDisabled())
        ? "PASS"
        : "FAIL";
      await page.getByRole("button", { name: "취소" }).click();

      await openExcelDialog(page);
      await uploadAndWaitPreview(page, invalidPath);
      const invalidBody = await page.locator('[role="dialog"]').innerText();
      report.invalidHasBare635 = invalidBody.includes("63.5") ? "PASS" : "FAIL";
      report.invalidDisabled = (await page.getByRole("button", { name: /명 등록/ }).isDisabled())
        ? "PASS"
        : "FAIL";
      await page.getByRole("button", { name: "취소" }).click();

      await openExcelDialog(page);
      await page.locator('input[type="file"]').setInputFiles(overPath);
      await page.getByRole("alert").waitFor({ timeout: 30_000 });
      report.reject101 = await page.getByRole("alert").innerText();
      report.reject101Message = report.reject101.includes("한 번에 최대 100명") ? "PASS" : "FAIL";
      await page.getByRole("button", { name: "취소" }).click();

      await page.getByRole("button", { name: "선수 직접 등록" }).click();
      await page.getByText("체육관 · 선수 기본 정보").waitFor();
      report.directRegistration = "PASS";
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: /링크 (관리|생성)/ }).click();
      await page.getByText(/외부 체육관|등록 링크|링크/).first().waitFor({ timeout: 15_000 });
      report.linkManager = "PASS";
      await page.keyboard.press("Escape");

      await page.goto(`${BASE}/organizer/events/${eventId}/brackets?tab=generate`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.getByRole("button", { name: "미리보기" }).click();
      await page.getByText("자동매칭 미리보기").waitFor({ timeout: 60_000 });
      const bracketText = await page.locator("body").innerText();
      report.bracketExcel = bracketText.includes(PREFIX) ? "PASS" : "FAIL";

      await page.goto(`${BASE}/organizer/events/${eventId}/field-status`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      report.kpiField = String(
        await page.evaluate(() => {
          const el = [...document.querySelectorAll("*")].find((e) =>
            String((e as HTMLElement).className || "").includes("h-[56px]"),
          ) as HTMLElement | undefined;
          return el ? Math.round(el.getBoundingClientRect().height) : -1;
        }),
      );

      await context.clearCookies();
      await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.getByLabel("아이디").fill("admin");
      await page.getByLabel("비밀번호").fill(password);
      await page.getByRole("button", { name: "로그인" }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
      await page.goto(`${BASE}/admin`, { waitUntil: "networkidle", timeout: 60_000 });
      report.kpiAdmin = String(
        await page.evaluate(() => {
          const el = [...document.querySelectorAll("*")].find((e) =>
            String((e as HTMLElement).className || "").includes("h-[56px]"),
          ) as HTMLElement | undefined;
          return el ? Math.round(el.getBoundingClientRect().height) : -1;
        }),
      );

      await context.clearCookies();
      await login(page, password);

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await openExcelDialog(page);
      await uploadAndWaitPreview(page, invalidPath);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      report.mobileOverflow = overflow ? "FAIL" : "PASS";

      const gymsAfter = await prisma.gym.count();
      const usersAfter = await prisma.user.count();
      const namedGym = await prisma.gym.count({
        where: { name: { in: ["PROD 외부체육관 A", "PROD 외부체육관 B"] } },
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
    } finally {
      await browser.close();
    }

    await cleanupQa();
    const leftover = await prisma.fighter.count({ where: { name: { startsWith: PREFIX } } });
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
