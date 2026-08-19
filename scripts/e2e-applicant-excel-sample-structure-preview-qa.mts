/**
 * Preview QA — applicant excel sample structure final.
 * Development yamanote only.
 *
 *   npx tsx scripts/e2e-applicant-excel-sample-structure-preview-qa.mts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Module from "node:module";
import ExcelJS from "exceljs";
import { chromium, type Page } from "playwright";

/** Inlined — .mts ESM cannot named-import the app .ts columns module reliably. */
const APPLICANT_EXCEL_HEADERS = [
  "번호",
  "체육관명",
  "선수명",
  "성별",
  "생년월일",
  "나이",
  "키",
  "체중",
  "전적",
  "운동경력",
  "경기구분",
  "체급",
  "체중기준",
  "종목",
  "연락처",
  "보호자이름",
  "보호자연락처",
  "메모",
] as const;
const APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL = "예시";
const APPLICANT_EXCEL_SHEET_DATA = "선수 신청";
const APPLICANT_EXCEL_SHEET_GUIDE = "입력 안내";

function assertDevelopmentYamanoteDatabaseUrl(databaseUrl: string) {
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error("REFUSING: expected Preview yamanote DB");
  }
}

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const PREFIX = "SAMPLE_STRUCT_QA_";
const BASE = "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "applicant-excel-sample-structure-qa");

type Report = Record<string, string>;

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function attachQuality(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const hydration: string[] = [];
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
  return { consoleErrors, pageErrors, hydration };
}

async function login(page: Page, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByLabel("아이디").fill("organizer");
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45_000 });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertDevelopmentYamanoteDatabaseUrl(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  const password = String(app.DEMO_PASSWORD || "123456!!");

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, EventStatus } = await import("../src/generated/prisma");
  const { parseApplicantExcelWorkbook } = await import(
    "../src/lib/applicant-excel/parse"
  );
  const { analyzeApplicantExcelRows } = await import(
    "../src/lib/applicant-excel/analyze"
  );

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const report: Report = {};
  let eventId = "";

  async function cleanup() {
    const events = await prisma.event.findMany({
      where: { publicSlug: { startsWith: "sample-struct-qa-" } },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    const fighters = await prisma.fighter.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
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
    if (fighters.length) {
      const ids = fighters.map((f) => f.id);
      await prisma.fighterGymHistory.deleteMany({ where: { fighterId: { in: ids } } });
      await prisma.fighter.deleteMany({ where: { id: { in: ids } } });
    }
  }

  try {
    await cleanup();
    const organizerUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
      include: { organizer: true },
    });
    assert.ok(organizerUser?.organizer);
    const stamp = Date.now().toString(36);
    const event = await prisma.event.create({
      data: {
        organizerId: organizerUser.organizer.id,
        title: `${PREFIX} Preview`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: EventStatus.open,
        publicSlug: `sample-struct-qa-${stamp}`,
        courts: { create: [{ name: "QA코트", sortOrder: 0 }] },
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
      where: { organizerId: organizerUser.organizer.id },
      create: { organizerId: organizerUser.organizer.id, balance: 20_000 },
      update: { balance: 20_000 },
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
      await page.getByRole("button", { name: "선수 직접 등록" }).waitFor();
      await page.getByRole("button", { name: "엑셀 일괄 등록" }).waitFor();
      await page.getByRole("button", { name: /링크 (관리|생성)/ }).waitFor();
      report.header3 = "PASS";
      report.kpi56 = String(
        await page.evaluate(() => {
          const el = [...document.querySelectorAll("*")].find((e) =>
            String((e as HTMLElement).className || "").includes("h-[56px]"),
          ) as HTMLElement | undefined;
          return el ? Math.round(el.getBoundingClientRect().height) : -1;
        }),
      );

      await page.getByRole("button", { name: "엑셀 일괄 등록" }).click();
      await page
        .getByText(/샘플의 2행 예시를 참고해 3행부터 실제 선수를 입력하세요/)
        .waitFor();
      await page.getByText("Excel 파일을 여기에 놓거나").waitFor();
      report.dropzone = "PASS";

      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.getByRole("button", { name: "샘플 엑셀 다운로드" }).click(),
      ]);
      const samplePath = join(OUT, download.suggestedFilename());
      await download.saveAs(samplePath);
      report.sampleFile = download.suggestedFilename();

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(samplePath);
      const data = wb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)!;
      const guide = wb.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE)!;
      assert.ok(data && guide);
      assert.equal(String(data.getRow(1).getCell(1).value), "번호");
      assert.equal(String(data.getRow(1).getCell(2).value), "체육관명");
      assert.equal(String(data.getRow(1).getCell(3).value), "선수명");
      assert.equal(
        String(data.getRow(2).getCell(1).value),
        APPLICANT_EXCEL_EXAMPLE_NUMBER_LABEL,
      );
      assert.equal(String(data.getRow(2).getCell(4).value), "남");
      report.sampleStructure = "PASS 1header 2example";
      const headerOrder = APPLICANT_EXCEL_HEADERS.map((h, i) =>
        String(data.getRow(1).getCell(i + 1).value ?? ""),
      );
      report.columnOrder =
        headerOrder.join(",") === APPLICANT_EXCEL_HEADERS.join(",")
          ? "PASS"
          : `FAIL ${headerOrder.join("|")}`;

      const parsedOnlyExample = await parseApplicantExcelWorkbook(
        Buffer.from(await wb.xlsx.writeBuffer()),
      );
      report.exampleOnlyRows = String(parsedOnlyExample.rows.length);
      report.exampleSkipped = String(parsedOnlyExample.skippedExampleRows);

      const dLight = event.divisions.find((d) => d.weightLimitText === "-60kg")!;
      const d635 = event.divisions.find((d) => d.weightLimitText === "-63.5kg")!;
      const d91 = event.divisions.find((d) => d.weightLimitText === "+91kg")!;

      function addPlayer(
        no: string,
        name: string,
        age: string,
        wc: string,
        limit: string,
      ) {
        data.addRow([
          no,
          "QA체육관A",
          name,
          "남",
          "2008-03-15",
          "18",
          "175",
          "62.8",
          "무전",
          "킥복싱 1년",
          age,
          wc,
          limit,
          "킥복싱",
          "010-9000-0001",
          "",
          "",
          "qa",
        ]);
      }
      addPlayer("1", `${PREFIX}01`, dLight.ageGroup!, dLight.weightClass, dLight.weightLimitText!);
      addPlayer("2", `${PREFIX}02`, d635.ageGroup!, d635.weightClass, d635.weightLimitText!);
      addPlayer("3", `${PREFIX}03`, d91.ageGroup!, d91.weightClass, d91.weightLimitText!);
      const with3Path = join(OUT, "sample-plus-3.xlsx");
      await wb.xlsx.writeFile(with3Path);

      const parsed3 = await parseApplicantExcelWorkbook(
        Buffer.from(await wb.xlsx.writeBuffer()),
      );
      assert.equal(parsed3.rows.length, 3);
      assert.equal(parsed3.skippedExampleRows, 1);
      const preview3 = analyzeApplicantExcelRows({
        fileName: "sample-plus-3.xlsx",
        headerRow: parsed3.headerRow,
        rows: parsed3.rows,
        divisions: event.divisions.map((d) => ({
          id: d.id,
          sportType: d.sportType,
          ruleType: d.ruleType,
          gender: d.gender,
          ageGroup: d.ageGroup,
          weightClass: d.weightClass,
          weightClassName: d.weightClassName,
          weightLimitText: d.weightLimitText,
          skillLevel: d.skillLevel,
        })),
        existing: [],
      });
      assert.equal(preview3.counts.create, 3);
      assert.equal(preview3.counts.error, 0);
      report.analyze3KeepExample = "PASS";

      await page.locator('input[type="file"]').setInputFiles(with3Path);
      await page.getByText(/총 3명/).waitFor({ timeout: 60_000 });
      const summary = await page.locator("p").filter({ hasText: "총 3명" }).first().innerText();
      report.uiPreview3 = summary;
      assert.ok(summary.includes("등록 예정 3"));
      assert.ok(!summary.includes("홍길동"));
      await page.getByRole("button", { name: "3명 등록" }).click();
      await page.getByText("등록 완료 3명").waitFor({ timeout: 120_000 });
      report.commit3 = "PASS";
      await page.getByRole("button", { name: "신청자 목록으로 돌아가기" }).click();

      const apps = await prisma.eventApplication.count({
        where: { eventId, fighter: { name: { startsWith: PREFIX } } },
      });
      const exampleApps = await prisma.eventApplication.count({
        where: { eventId, fighter: { name: "홍길동" } },
      });
      report.dbApps = String(apps);
      report.exampleDb = String(exampleApps);

      await page.getByRole("button", { name: "엑셀 일괄 등록" }).click();
      await page.locator('input[type="file"]').setInputFiles(with3Path);
      await page.getByText(/이미 등록 3명/).waitFor({ timeout: 60_000 });
      report.retry = "PASS";
      await page.getByRole("button", { name: "취소" }).click();

      // delete-example workbook
      const wb2 = new ExcelJS.Workbook();
      await wb2.xlsx.readFile(samplePath);
      const data2 = wb2.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)!;
      data2.spliceRows(2, 1);
      data2.addRow([
        "1",
        "QA체육관B",
        `${PREFIX}DEL1`,
        "남",
        "2008-03-15",
        "",
        "175",
        "60",
        "",
        "",
        dLight.ageGroup,
        dLight.weightClass,
        dLight.weightLimitText,
        "킥복싱",
        "",
        "",
        "",
        "",
      ]);
      data2.addRow([
        "2",
        "QA체육관B",
        `${PREFIX}DEL2`,
        "남",
        "2008-04-15",
        "",
        "176",
        "61",
        "",
        "",
        d635.ageGroup,
        d635.weightClass,
        d635.weightLimitText,
        "킥복싱",
        "",
        "",
        "",
        "",
      ]);
      const delPath = join(OUT, "example-deleted.xlsx");
      await wb2.xlsx.writeFile(delPath);
      const parsedDel = await parseApplicantExcelWorkbook(
        Buffer.from(await wb2.xlsx.writeBuffer()),
      );
      assert.equal(parsedDel.skippedExampleRows, 0);
      assert.equal(parsedDel.rows.length, 2);
      assert.equal(parsedDel.rows[0]?.values.선수명, `${PREFIX}DEL1`);
      report.deleteExample = "PASS";

      // operational file
      const opsBuf = Buffer.from(
        await import("node:fs").then((fs) =>
          fs.readFileSync(join(process.cwd(), "dev", "2026_9_5 마포구청장배 선수.xlsx")),
        ),
      );
      let opsErr = "";
      try {
        await parseApplicantExcelWorkbook(opsBuf);
      } catch (e) {
        opsErr = e instanceof Error ? e.message : String(e);
      }
      report.opsFileError = opsErr;
      report.opsMissingBoth =
        opsErr.includes("경기구분") && opsErr.includes("체급") ? "PASS" : "FAIL";

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${BASE}/organizer/events/${eventId}/applications`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.getByRole("button", { name: "엑셀 일괄 등록" }).click();
      await page.getByRole("button", { name: "파일 선택" }).waitFor();
      report.mobileOverflow = (await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      ))
        ? "FAIL"
        : "PASS";

      report.consoleErrors = String(quality.consoleErrors.length);
      report.pageErrors = String(quality.pageErrors.length);
      report.hydration = String(quality.hydration.length);
    } finally {
      await browser.close();
    }

    await cleanup();
    const leftover = await prisma.fighter.count({
      where: { name: { startsWith: PREFIX } },
    });
    report.cleanup = leftover === 0 ? "PASS" : `FAIL ${leftover}`;
  } catch (err) {
    try {
      await cleanup();
    } catch {}
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
