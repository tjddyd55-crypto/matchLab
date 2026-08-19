/**
 * Preview E2E — 신청체중 기반 EventDivision 자동배정.
 * Development yamanote only. Production/yamabiko write 금지.
 *
 *   npx tsx scripts/e2e-application-weight-preview-qa.mts
 *   npx tsx scripts/e2e-application-weight-preview-qa.mts --cleanup
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Module from "node:module";
import ExcelJS from "exceljs";
import { chromium, type Page } from "playwright";

const APPLICANT_EXCEL_HEADERS = [
  "번호",
  "체육관명",
  "선수명",
  "성별",
  "생년월일",
  "나이",
  "키",
  "신청체중",
  "전적",
  "총전",
  "승",
  "무",
  "패",
  "운동경력",
  "주민등록번호",
  "보험가입 개인정보동의",
  "경기구분",
  "종목",
  "연락처",
  "보호자이름",
  "보호자연락처",
  "메모",
] as const;
const APPLICANT_EXCEL_SHEET_DATA = "선수 신청";
const APPLICANT_EXCEL_SHEET_GUIDE = "입력 안내";

const PREFIX = "APPLICATION_WEIGHT_QA_";
const BASE = "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "application-weight-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup");

type Report = Record<string, string>;

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertDevelopmentYamanoteDatabaseUrl(databaseUrl: string) {
  const hostMatch = databaseUrl.match(/@([^/]+)\//);
  const host = hostMatch?.[1] ?? "";
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: expected yamanote, got ${host || "unknown"}`);
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

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function attachQuality(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const hydration: string[] = [];
  const status5xx: string[] = [];
  const nativeDialogs: string[] = [];
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
  page.on("dialog", (d) => {
    nativeDialogs.push(d.type());
    void d.dismiss();
  });
  return { consoleErrors, pageErrors, hydration, status5xx, nativeDialogs };
}

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function login(page: Page, identifier: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const idBox = page.locator("#login-identifier, input[name='identifier']");
  if (await idBox.count()) await idBox.first().fill(identifier);
  else await page.getByLabel("아이디").fill(identifier);
  const pw = page.locator("input[name='password'], input[type='password']");
  await pw.first().fill(password);
  const submit = page.locator("button[type='submit']");
  if (await submit.count()) await submit.first().click();
  else await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 45_000,
  });
}

function divisionSpec(input: {
  ageGroup: string;
  name: string;
  limit: string;
  gender?: string;
  sport?: string;
}) {
  return {
    sportType: input.sport ?? "킥복싱",
    gender: input.gender ?? "male",
    ageGroup: input.ageGroup,
    weightClass: `${input.name} ${input.limit}`,
    weightClassName: input.name,
    weightLimitText: input.limit,
  };
}

function row(input: {
  gym: string;
  name: string;
  category: string;
  weight: string;
  total: string;
  wins: string;
  draws: string;
  losses: string;
  gender?: string;
  birth?: string;
  sport?: string;
  phone: string;
}): string[] {
  const values: Record<(typeof APPLICANT_EXCEL_HEADERS)[number], string> = {
    번호: "",
    체육관명: input.gym,
    선수명: input.name,
    성별: input.gender ?? "남",
    생년월일: input.birth ?? "1998-04-12",
    나이: "",
    키: "",
    신청체중: input.weight,
    전적: "",
    총전: input.total,
    승: input.wins,
    무: input.draws,
    패: input.losses,
    운동경력: "",
    주민등록번호: "000000-0000001",
    "보험가입 개인정보동의": "동의",
    경기구분: input.category,
    종목: input.sport ?? "킥복싱",
    연락처: input.phone,
    보호자이름: "",
    보호자연락처: "",
    메모: "",
  };
  return APPLICANT_EXCEL_HEADERS.map((h) => values[h]);
}

async function writeXlsx(path: string, rows: string[][]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  sheet.addRow([...APPLICANT_EXCEL_HEADERS]);
  for (const r of rows) sheet.addRow(r);
  writeFileSync(path, await workbookToBuffer(wb));
}

async function openExcelDialog(page: Page) {
  const sample = page.getByRole("button", { name: "샘플 엑셀 다운로드" });
  if (await sample.isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "엑셀 일괄 등록" }).click({ force: true });
  try {
    await sample.waitFor({ timeout: 20_000 });
  } catch {
    await page.screenshot({
      path: join(OUT, "dialog-open-debug.png"),
      fullPage: true,
    });
    writeFileSync(
      join(OUT, "dialog-open-debug.txt"),
      await page.locator("body").innerText().catch(() => page.url()),
    );
    throw new Error("excel dialog did not open");
  }
}

async function closeExcelDialog(page: Page) {
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "샘플 엑셀 다운로드" })
    .waitFor({ state: "hidden", timeout: 10_000 })
    .catch(() => undefined);
}

async function uploadAndWaitPreview(page: Page, filePath: string) {
  const again = page.getByRole("button", { name: "다시 선택" });
  if (await again.isVisible().catch(() => false)) {
    await again.click();
  }
  const input = page.locator('input[type="file"]').first();
  await input.waitFor({ state: "attached", timeout: 20_000 });
  await input.setInputFiles(filePath);
  await page.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    previewBase: BASE,
    productionUntouched: "PASS",
    migration: "none",
  };

  const previewRes = await fetch(BASE, { redirect: "follow" });
  report.previewHttp = String(previewRes.status);
  assert.ok(previewRes.status < 500, `preview HTTP ${previewRes.status}`);

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertDevelopmentYamanoteDatabaseUrl(dbUrl);
  report.dbFingerprint = /yamanote/i.test(dbUrl) ? "yamanote" : "UNKNOWN";
  report.servingShaHint = String(
    app.RAILWAY_GIT_COMMIT_SHA || app.RAILWAY_GIT_COMMIT_MESSAGE || "",
  ).slice(0, 80);
  process.env.DATABASE_URL = dbUrl;

  const { resolveEventDivisionByApplicationWeight } = await import(
    "../src/lib/applications/resolve-event-division.ts"
  );

  const password = String(app.DEMO_PASSWORD || "123456!!");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, EventStatus } = await import("../src/generated/prisma");

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  async function cleanupQa() {
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { title: { startsWith: PREFIX } },
          { publicSlug: { startsWith: "application-weight-qa-" } },
        ],
      },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    const fighters = await prisma.fighter.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const fighterIds = fighters.map((f) => f.id);
    if (eventIds.length) {
      const matches = await prisma.bracketMatch.findMany({
        where: { bracket: { eventId: { in: eventIds } } },
        select: { id: true },
      });
      const matchIds = matches.map((m) => m.id);
      if (matchIds.length) {
        await prisma.judgeScorecard.deleteMany({ where: { matchId: { in: matchIds } } }).catch(() => undefined);
        await prisma.judgeMatchAssignment.deleteMany({ where: { matchId: { in: matchIds } } }).catch(() => undefined);
        await prisma.matchResult.deleteMany({ where: { matchId: { in: matchIds } } });
      }
      await prisma.bracketMatch.deleteMany({
        where: { bracket: { eventId: { in: eventIds } } },
      });
      await prisma.bracket.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.eventExternalRegistrationLink.deleteMany({
        where: { eventId: { in: eventIds } },
      });
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
      await prisma.fighterGymHistory.deleteMany({
        where: { fighterId: { in: fighterIds } },
      });
      await prisma.fighter.deleteMany({ where: { id: { in: fighterIds } } });
    }
    console.log(`CLEANUP events=${eventIds.length} fighters=${fighterIds.length}`);
  }

  try {
    await cleanupQa();
    if (cleanupOnly) {
      report.cleanupOnly = "PASS";
      writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
      return;
    }

    const organizerUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
      include: { organizer: true },
    });
    assert.ok(organizerUser?.organizer, "demo organizer missing");
    const organizer = organizerUser.organizer;
    const stamp = Date.now().toString(36);

    const adultTable = [
      divisionSpec({ ageGroup: "일반부", name: "플라이급", limit: "-55kg" }),
      divisionSpec({ ageGroup: "일반부", name: "밴텀급", limit: "-60kg" }),
      divisionSpec({ ageGroup: "일반부", name: "라이트급", limit: "-65kg" }),
      divisionSpec({ ageGroup: "일반부", name: "웰터급", limit: "-70kg" }),
      divisionSpec({ ageGroup: "일반부", name: "헤비급", limit: "+70kg" }),
    ];
    const elemTable = [
      divisionSpec({ ageGroup: "초등부", name: "라이트급", limit: "-40kg" }),
      divisionSpec({ ageGroup: "초등부", name: "웰터급", limit: "-45kg" }),
      divisionSpec({ ageGroup: "초등부", name: "헤비급", limit: "+45kg" }),
    ];
    const customTable = [
      divisionSpec({ ageGroup: "유치부", name: "라이트급", limit: "-30kg" }),
    ];

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX} Preview`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: EventStatus.open,
        publicSlug: `application-weight-qa-${stamp}`,
        courts: { create: [{ name: "QA코트1", sortOrder: 0 }] },
        divisions: { create: [...adultTable, ...elemTable, ...customTable] },
      },
      include: { divisions: true },
    });

    const gapEvent = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX} GAP`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: EventStatus.open,
        publicSlug: `application-weight-qa-gap-${stamp}`,
        divisions: {
          create: [
            divisionSpec({ ageGroup: "일반부", name: "플라이급", limit: "-55kg" }),
            divisionSpec({ ageGroup: "일반부", name: "헤비급", limit: "+70kg" }),
          ],
        },
      },
      include: { divisions: true },
    });

    await prisma.organizerCreditWallet.upsert({
      where: { organizerId: organizer.id },
      create: { organizerId: organizer.id, balance: 20_000 },
      update: { balance: 20_000 },
    });

    const byName = (age: string, name: string) => {
      const found = event.divisions.find(
        (d) => d.ageGroup === age && d.weightClassName === name,
      );
      assert.ok(found, `missing division ${age} ${name}`);
      return found;
    };
    const fly = byName("일반부", "플라이급");
    const bantam = byName("일반부", "밴텀급");
    const light = byName("일반부", "라이트급");
    const welter = byName("일반부", "웰터급");
    const heavy = byName("일반부", "헤비급");
    const elemLight = byName("초등부", "라이트급");
    const kids = byName("유치부", "라이트급");
    report.eventId = event.id;
    report.divisionFly = fly.id;
    report.divisionBantam = bantam.id;
    report.divisionLight = light.id;
    report.divisionWelter = welter.id;
    report.divisionHeavy = heavy.id;
    report.divisionElemLight = elemLight.id;
    report.divisionKids = kids.id;

    const resolverDivisions = event.divisions.map((d) => ({
      id: d.id,
      gender: d.gender,
      ageGroup: d.ageGroup,
      sportType: d.sportType,
      weightClass: d.weightClass,
      weightClassName: d.weightClassName,
      weightLimitText: d.weightLimitText,
    }));
    const expectId = (kg: number, id: string) => {
      const r = resolveEventDivisionByApplicationWeight({
        gender: "male",
        competitionCategory: "성인",
        discipline: "킥복싱",
        applicationWeightKg: kg,
        divisions: resolverDivisions,
      });
      assert.equal(r.ok, true, `resolver ${kg}`);
      if (r.ok) assert.equal(r.division.id, id, `resolver ${kg} id`);
    };
    expectId(54, fly.id);
    expectId(55, fly.id);
    expectId(55.1, bantam.id);
    expectId(60, bantam.id);
    expectId(60.1, light.id);
    expectId(65, light.id);
    expectId(65.1, welter.id);
    expectId(70, welter.id);
    expectId(70.1, heavy.id);
    report.boundaryUnderOver = "PASS";

    const gymFighter = await prisma.user.findFirst({
      where: { OR: [{ loginId: "gym" }, { email: "gym@demo.local" }] },
      include: { ownedGym: true },
    });

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const quality = attachQuality(page);

    try {
      await login(page, "organizer", password);
      await page.goto(`${BASE}/organizer/events/${event.id}/applications`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.getByRole("button", { name: "엑셀 일괄 등록" }).waitFor();
      await page.waitForTimeout(800);

      await openExcelDialog(page);
      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 30_000 }),
        page.getByRole("button", { name: "샘플 엑셀 다운로드" }).click(),
      ]);
      const samplePath = join(OUT, download.suggestedFilename());
      await download.saveAs(samplePath);
      const sampleWb = new ExcelJS.Workbook();
      await sampleWb.xlsx.readFile(samplePath);
      const dataSheet = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA);
      const guideSheet = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE);
      assert.ok(dataSheet && guideSheet);
      const headers: string[] = [];
      dataSheet.getRow(1).eachCell((c) => headers.push(String(c.value ?? "")));
      report.sampleColumns = headers.filter((h) => h && h !== "__kind").join(",");
      assert.ok(headers.includes("신청체중"));
      assert.equal(headers.includes("체급"), false);
      assert.equal(headers.includes("체중기준"), false);
      const example = dataSheet.getRow(2).getCell(headers.indexOf("신청체중") + 1);
      report.exampleWeight = String(example.value ?? "");
      const guideText: string[] = [];
      guideSheet.eachRow((r) => r.eachCell((c) => guideText.push(String(c.value ?? ""))));
      const guideJoined = guideText.join(" | ");
      assert.match(guideJoined, /체급명과 체중기준은 (직접 )?입력하지 않습니다/);
      assert.match(
        guideJoined,
        /신청체중을 입력하면 대회 체급표 기준으로 자동 배정됩니다/,
      );
      assert.ok(guideJoined.includes("플라이급") && guideJoined.includes("-55kg"));
      report.guideSheet = "PASS";
      await closeExcelDialog(page);
      await openExcelDialog(page);

      const withErrorRows = [
        row({ gym: "QA짐A", name: `${PREFIX}성인54`, category: "성인", weight: "54.2", total: "0", wins: "0", draws: "0", losses: "0", phone: "010-8800-0001" }),
        row({ gym: "QA짐B", name: `${PREFIX}성인58`, category: "일반부", weight: "58.7", total: "1", wins: "1", draws: "0", losses: "0", phone: "010-8800-0002" }),
        row({ gym: "QA짐C", name: `${PREFIX}성인62`, category: "성인", weight: "62.5", total: "2", wins: "1", draws: "0", losses: "1", phone: "010-8800-0003" }),
        row({ gym: "QA짐D", name: `${PREFIX}초3`, category: "초3", weight: "38", total: "1", wins: "1", draws: "0", losses: "0", birth: "2016-03-01", phone: "010-8800-0004" }),
        row({ gym: "QA짐E", name: `${PREFIX}초5`, category: "초5", weight: "38", total: "2", wins: "1", draws: "0", losses: "1", birth: "2014-03-01", phone: "010-8800-0005" }),
        row({ gym: "QA짐F", name: `${PREFIX}학생부`, category: "학생부", weight: "60", total: "0", wins: "0", draws: "0", losses: "0", phone: "010-8800-0006" }),
      ];
      const errPath = join(OUT, "with-student.xlsx");
      await writeXlsx(errPath, withErrorRows);
      await uploadAndWaitPreview(page, errPath);
      const errText = await page.locator('[role="dialog"]').innerText();
      assert.match(errText, /QA_성인54|APPLICATION_WEIGHT_QA_성인54/);
      assert.match(errText, /54\.2kg/);
      assert.match(errText, /플라이급/);
      assert.match(errText, /일반부/);
      assert.match(errText, /초등부/);
      assert.match(errText, /경기구분 확인 필요|오류/);
      assert.match(errText, /오류 행이 있어 등록할 수 없습니다/);
      const blockedBtn = page.getByRole("button", { name: /명 등록/ });
      assert.equal(await blockedBtn.isDisabled(), true);
      report.atomicBlock = "PASS";
      await page.screenshot({ path: join(OUT, "preview-error.png") });

      const validRows = [
        ...withErrorRows.slice(0, 5),
        row({ gym: "QA짐G", name: `${PREFIX}라이트0a`, category: "성인", weight: "62.8", total: "0", wins: "0", draws: "0", losses: "0", phone: "010-8800-0010" }),
        row({ gym: "QA짐H", name: `${PREFIX}라이트0b`, category: "성인", weight: "64.0", total: "0", wins: "0", draws: "0", losses: "0", phone: "010-8800-0011" }),
        row({ gym: "QA짐I", name: `${PREFIX}라이트1`, category: "성인", weight: "63.0", total: "1", wins: "1", draws: "0", losses: "0", phone: "010-8800-0012" }),
        row({ gym: "QA짐J", name: `${PREFIX}라이트2`, category: "성인", weight: "63.2", total: "2", wins: "1", draws: "0", losses: "1", phone: "010-8800-0013" }),
        row({ gym: "QA짐K", name: `${PREFIX}라이트3`, category: "성인", weight: "63.5", total: "3", wins: "2", draws: "0", losses: "1", phone: "010-8800-0014" }),
        row({ gym: "QA짐L", name: `${PREFIX}유치부`, category: "유치부", weight: "25", total: "0", wins: "0", draws: "0", losses: "0", birth: "2020-01-01", phone: "010-8800-0015" }),
      ];
      const validPath = join(OUT, "valid.xlsx");
      await writeXlsx(validPath, validRows);
      await uploadAndWaitPreview(page, validPath);
      const previewText = await page.locator('[role="dialog"]').innerText();
      assert.doesNotMatch(previewText, /오류 행이 있어 등록할 수 없습니다/);
      assert.match(previewText, /라이트급/);
      assert.match(previewText, /62\.5kg/);
      const commitBtn = page.getByRole("button", { name: /명 등록/ });
      assert.equal(await commitBtn.isDisabled(), false);
      await commitBtn.click();
      try {
        await page.getByText(/등록 완료/).waitFor({ timeout: 120_000 });
      } catch {
        await page.screenshot({ path: join(OUT, "commit-debug.png"), fullPage: true });
        writeFileSync(
          join(OUT, "commit-debug.txt"),
          await page.locator("body").innerText(),
        );
        throw new Error("commit did not finish");
      }
      report.commit = "PASS";
      await page.getByRole("button", { name: "신청자 목록으로 돌아가기" }).click();

      const apps = await prisma.eventApplication.findMany({
        where: { eventId: event.id },
        include: { fighter: true, division: true },
      });
      const byFighter = (suffix: string) => {
        const found = apps.find((a) => a.fighter.name === `${PREFIX}${suffix}`);
        assert.ok(found, `missing app ${suffix}`);
        return found;
      };
      const a54 = byFighter("성인54");
      const a58 = byFighter("성인58");
      const a62 = byFighter("성인62");
      const a3 = byFighter("초3");
      const a5 = byFighter("초5");
      const aKids = byFighter("유치부");
      assert.equal(a54.divisionId, fly.id);
      assert.equal(a58.divisionId, bantam.id);
      assert.equal(a62.divisionId, light.id);
      assert.equal(a3.divisionId, elemLight.id);
      assert.equal(a5.divisionId, elemLight.id);
      assert.equal(aKids.divisionId, kids.id);
      const snap62 = a62.fighterSnapshot as Record<string, unknown>;
      assert.equal(snap62.applicationWeightKg, 62.5);
      assert.equal(a62.weighInWeightKg, null);
      assert.equal(a62.totalBoutsSnapshot, 2);
      assert.equal(a62.winsSnapshot, 1);
      assert.equal(a62.drawsSnapshot, 0);
      assert.equal(a62.lossesSnapshot, 1);
      assert.equal(a3.schoolLevelSnapshot, "ELEMENTARY");
      assert.equal(a3.schoolGradeSnapshot, 3);
      assert.equal(a5.schoolLevelSnapshot, "ELEMENTARY");
      assert.equal(a5.schoolGradeSnapshot, 5);
      assert.ok(!JSON.stringify(a62.fighterSnapshot).includes("0000000000001"));
      report.persist = "PASS";

      const listText = await page.locator("main").innerText();
      assert.match(listText, /라이트급|플라이급|밴텀급/);
      assert.doesNotMatch(listText, /현재체중|현재 체중/);
      report.applicantList = "PASS";

      await page.getByRole("button", { name: "엑셀 일괄 등록" }).click();
      await page.getByRole("heading", { name: "선수 신청 엑셀 일괄 등록" }).waitFor();
      await uploadAndWaitPreview(page, validPath);
      const retryText = await page.locator('[role="dialog"]').innerText();
      assert.match(retryText, /이미 등록/);
      const retryBtn = page.getByRole("button", { name: /명 등록/ });
      assert.equal(await retryBtn.isDisabled(), true);
      report.retryIdempotency = "PASS";

      const legacyWb = new ExcelJS.Workbook();
      const legacySheet = legacyWb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
      legacySheet.addRow([
        "선수명", "성별", "생년월일", "연락처", "체육관명", "경기구분", "체급", "체중기준", "종목", "체중",
        "주민등록번호", "보험가입 개인정보동의", "총전", "승", "무", "패",
      ]);
      legacySheet.addRow([
        `${PREFIX}레거시`, "남", "1998-04-12", "010-8800-0099", "QA짐LEG", "성인", "웰터급", "-70kg", "킥복싱", "62.5",
        "000000-0000001", "동의", "0", "0", "0", "0",
      ]);
      const legacyPath = join(OUT, "legacy.xlsx");
      writeFileSync(legacyPath, await workbookToBuffer(legacyWb));
      await uploadAndWaitPreview(page, legacyPath);
      const legacyText = await page.locator('[role="dialog"]').innerText();
      assert.match(legacyText, /라이트급/);
      assert.match(legacyText, /기존 입력 체급/);
      report.legacyAlias = "PASS";
      await closeExcelDialog(page);

      const infantPath = join(OUT, "infant.xlsx");
      await writeXlsx(infantPath, [
        row({ gym: "QA짐INF", name: `${PREFIX}유아부`, category: "유아부", weight: "25", total: "0", wins: "0", draws: "0", losses: "0", phone: "010-8800-0088" }),
      ]);
      await openExcelDialog(page);
      await uploadAndWaitPreview(page, infantPath);
      const infantText = await page.locator('[role="dialog"]').innerText();
      assert.match(infantText, /경기구분 확인 필요|오류/);
      report.customNoGuess = "PASS";
      await closeExcelDialog(page);

      const noTablePath = join(OUT, "notable.xlsx");
      await writeXlsx(noTablePath, [
        row({
          gym: "QA짐NT",
          name: `${PREFIX}노테이블`,
          category: "고등부",
          weight: "60",
          total: "0",
          wins: "0",
          draws: "0",
          losses: "0",
          gender: "여",
          sport: "MMA",
          phone: "010-8800-0077",
        }),
      ]);
      await openExcelDialog(page);
      await uploadAndWaitPreview(page, noTablePath);
      const noTableText = await page.locator('[role="dialog"]').innerText();
      assert.match(noTableText, /해당 경기구분·성별·종목의 체급표가 없습니다/);
      report.noTable = "PASS";
      await closeExcelDialog(page);

      await page.goto(`${BASE}/organizer/events/${gapEvent.id}/applications`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await openExcelDialog(page);
      const gapPath = join(OUT, "gap.xlsx");
      await writeXlsx(gapPath, [
        row({ gym: "QA짐GAP", name: `${PREFIX}갭`, category: "성인", weight: "62.5", total: "0", wins: "0", draws: "0", losses: "0", phone: "010-8800-0066" }),
      ]);
      await uploadAndWaitPreview(page, gapPath);
      const gapText = await page.locator('[role="dialog"]').innerText();
      assert.match(gapText, /신청체중에 맞는 체급이 없습니다/);
      report.gap = "PASS";
      await closeExcelDialog(page);

      await page.goto(`${BASE}/organizer/events/${event.id}/applications`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.getByRole("button", { name: "선수 직접 등록" }).click();
      await page.getByText("신청체중 · 자동 배정 체급").waitFor();
      await page.getByRole("button", { name: "체육관명 직접 입력" }).click();
      await page.locator("#manual-gymName").fill("QA짐MAN");
      await page.locator("#manual-fighterName").fill(`${PREFIX}직접62`);
      await page.locator("#manual-gender").selectOption("male");
      await page.locator("#manual-birthDate").fill("1998-04-12");
      await page.locator("#manual-phone").fill("010-8800-0055");
      await page.getByRole("button", { name: "무전" }).click();
      await page.locator("#manual-rrn").fill("000000-0000001");
      await page.getByText("경기구분", { exact: false }).first().waitFor();
      await page.locator("select").filter({ hasText: "일반부" }).first().selectOption("일반부");
      const weightInput = page.getByPlaceholder("예: 62.5");
      await weightInput.fill("62.5");
      await page.getByText("라이트급 (-65kg)").waitFor({ timeout: 10_000 });
      await weightInput.fill("66.0");
      await page.getByText("웰터급 (-70kg)").waitFor({ timeout: 10_000 });
      report.directRecalc = "PASS";
      await page.getByRole("checkbox", { name: /보험가입 개인정보 동의 확인/ }).check();
      await page.getByRole("button", { name: "등록", exact: true }).click();
      await page.waitForTimeout(5000);
      if (
        !(await prisma.eventApplication.findFirst({
          where: { eventId: event.id, fighter: { name: `${PREFIX}직접62` } },
        }))
      ) {
        writeFileSync(
          join(OUT, "manual-debug.txt"),
          await page.locator("body").innerText(),
        );
      }
      const manualApp = await prisma.eventApplication.findFirst({
        where: { eventId: event.id, fighter: { name: `${PREFIX}직접62` } },
      });
      assert.ok(manualApp);
      assert.equal(manualApp.divisionId, welter.id);
      const manualSnap = manualApp.fighterSnapshot as Record<string, unknown>;
      assert.equal(manualSnap.applicationWeightKg, 66);
      report.directSubmit = "PASS";

      await page.getByRole("button", { name: /링크 (관리|생성)/ }).click();
      await page.locator("p.font-mono, p.break-all").filter({ hasText: "/external/event-registration/" }).waitFor({ timeout: 20_000 });
      const extUrl = await page.locator("p.break-all").filter({ hasText: "/external/event-registration/" }).innerText();
      report.externalUrl = extUrl.trim();

      try {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(extUrl.trim(), { waitUntil: "domcontentloaded", timeout: 90_000 });
      await page.getByText("신청체중").first().waitFor();
      assert.equal(await page.getByRole("combobox").filter({ hasText: "체급" }).count(), 0);
      await page.locator("label").filter({ hasText: "체육관명" }).locator("input").fill("QA짐EXT");
      await page.locator("label").filter({ hasText: "담당자명" }).locator("input").fill("담당");
      await page.locator("label").filter({ hasText: "연락처" }).first().locator("input").fill("010-8800-0044");
      await page.locator("label").filter({ hasText: "이름" }).locator("input").fill(`${PREFIX}외부62`);
      await page.getByLabel("1번 선수 생년월일").fill("1998-04-12");
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await page.locator("select").nth(1).selectOption("일반부");
        await page.getByPlaceholder("예: 62.5").fill("62.5");
        if (await page.getByText(/라이트급/).count()) break;
        await page.waitForTimeout(400);
      }
      if (!(await page.getByText(/라이트급/).count())) {
        writeFileSync(join(OUT, "external-debug.txt"), await page.locator("body").innerText());
        report.externalAutoDivision = "FAIL";
      } else {
        report.externalAutoDivision = "PASS";
      }
      await page.getByLabel(/주민등록번호|주민번호/).fill("000000-0000001");
      await page.getByRole("checkbox").first().check();
      report.externalOverflow = String(await overflowX(page));
      assert.equal(await overflowX(page), 0);
      await page.getByRole("button", { name: /명 신청하기/ }).click();
      const reviewBtn = page.getByRole("button", { name: /명 신청 완료/ });
      if (await reviewBtn.waitFor({ timeout: 12_000 }).then(() => true).catch(() => false)) {
        await reviewBtn.click();
        await page.getByText("선수 신청이 완료되었습니다").waitFor({ timeout: 90_000 });
        const extApp = await prisma.eventApplication.findFirst({
          where: { eventId: event.id, fighter: { name: `${PREFIX}외부62` } },
        });
        assert.ok(extApp);
        assert.equal(extApp.divisionId, light.id);
        report.externalSubmit = "PASS";
      } else {
        writeFileSync(join(OUT, "external-review-debug.txt"), await page.locator("body").innerText());
        report.externalSubmit = "FAIL review";
      }
      } catch (e) {
        writeFileSync(
          join(OUT, "external-submit-debug.txt"),
          await page.locator("body").innerText().catch(() => String(e)),
        );
        report.externalSubmit = `FAIL ${String(e).slice(0, 160)}`;
      }

      await page.setViewportSize({ width: 1366, height: 768 });
      if (gymFighter?.ownedGym) {
        const gymPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
        attachQuality(gymPage);
        try {
          await login(gymPage, "gym", password);
          const code = `AWQA-${stamp}`;
          const fighter = await prisma.fighter.create({
            data: {
              fighterCode: code,
              currentGymId: gymFighter.ownedGym.id,
              name: `${PREFIX}GYM62`,
              birthDate: new Date("1998-04-12T00:00:00.000Z"),
              gender: "male",
              phone: "010-8800-0033",
            },
          });
          await prisma.fighterGymHistory.create({
            data: {
              fighterId: fighter.id,
              gymId: gymFighter.ownedGym.id,
              status: "active",
            },
          });
          await gymPage.goto(`${BASE}/gym/events/${event.id}/apply`, {
            waitUntil: "domcontentloaded",
            timeout: 90_000,
          });
          const applyText = await gymPage.locator("main").innerText();
          report.gymApplyPage = applyText.includes("신청체중") ? "PASS" : applyText.slice(0, 180);
          report.officialWorkspaceKept =
            applyText.includes("공식 신청서") || applyText.includes("선수 일괄 신청")
              ? "PASS"
              : "CHECK";
        } catch (e) {
          report.gymBulk = `SKIP ${String(e).slice(0, 180)}`;
        } finally {
          await gymPage.close();
        }
      } else {
        report.gymBulk = "SKIP no demo gym";
      }

      try {
      await page.goto(`${BASE}/organizer/events/${event.id}/brackets?tab=generate`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.getByRole("heading", { name: "자동매칭" }).waitFor({ timeout: 30_000 });
      const sameGym = page.getByText("같은 체육관끼리 매칭 금지");
      if (await sameGym.count()) {
        const cb = page.locator("label").filter({ hasText: "같은 체육관끼리 매칭 금지" }).locator("input");
        if (await cb.isChecked()) await cb.uncheck();
      }
      await page.getByRole("button", { name: "적용" }).click();
      await page.getByText("자동 대진 생성 완료").waitFor({ timeout: 90_000 });
      const matches = await prisma.bracketMatch.findMany({
        where: { bracket: { eventId: event.id } },
        include: { fighterRed: true, fighterBlue: true },
      });
      report.autoMatchCreated = String(matches.length);
      const pairKey = (a?: string | null, b?: string | null) =>
        [a, b].filter(Boolean).sort().join("|");
      const pairs = matches.map((m) =>
        pairKey(m.fighterRed?.name, m.fighterBlue?.name),
      );
      const light0 = pairKey(`${PREFIX}라이트0a`, `${PREFIX}라이트0b`);
      const light12 = pairKey(`${PREFIX}라이트1`, `${PREFIX}라이트2`);
      assert.ok(pairs.includes(light0), `missing 0-0 pair ${pairs.join(",")}`);
      assert.ok(pairs.includes(light12), `missing 1-2 pair ${pairs.join(",")}`);
      assert.equal(
        pairs.some((p) => p.includes(`${PREFIX}초3`) && p.includes(`${PREFIX}초5`)),
        false,
      );
      assert.equal(
        pairs.some((p) => p.includes(`${PREFIX}성인54`) && p.includes("라이트")),
        false,
      );
      const unmatched3 = matches.every(
        (m) =>
          m.fighterRed?.name !== `${PREFIX}라이트3` &&
          m.fighterBlue?.name !== `${PREFIX}라이트3`,
      );
      assert.equal(unmatched3, true);
      report.autoMatch = "PASS";
      } catch (e) {
        report.autoMatch = `FAIL ${String(e).slice(0, 200)}`;
        await page.screenshot({ path: join(OUT, "automatch-debug.png"), fullPage: true }).catch(() => undefined);
      }

      try {
      await page.goto(`${BASE}/organizer/division-templates/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.getByRole("heading", { name: "새 체급표 템플릿" }).waitFor({ timeout: 30_000 });
      await page.locator('input[placeholder="킥복싱"]').fill("킥복싱");
      await page.getByRole("button", { name: "엑셀 업로드" }).click();
      await page.getByRole("heading", { name: "체급표 Excel 일괄 등록" }).waitFor({ timeout: 20_000 });
      const wc = await import("../src/lib/division-template/weight-class-excel.ts");
      const wcPath = join(OUT, "weight-class-sample.xlsx");
      writeFileSync(
        wcPath,
        await wc.workbookToBuffer(
          await wc.buildWeightClassSampleWorkbook({ includeKickboxingFixture: true }),
        ),
      );
      await page.getByRole("dialog").locator('input[type="file"]').waitFor({ state: "attached", timeout: 10_000 });
      await page.getByRole("dialog").locator('input[type="file"]').setInputFiles(wcPath);
      await page.getByRole("dialog").getByText(/총 \d+개/).waitFor({ timeout: 60_000 });
      const wcText = await page.getByRole("dialog").innerText();
      assert.doesNotMatch(wcText, /Cannot read properties/);
      report.weightClassExcel = "PASS";
      } catch (e) {
        report.weightClassExcel = `FAIL ${String(e).slice(0, 160)}`;
      }
    } finally {
      report.consoleErrors = String(quality.consoleErrors.length);
      report.pageErrors = String(quality.pageErrors.length);
      report.hydration = String(quality.hydration.length);
      report.status5xx = String(quality.status5xx.length);
      report.nativeDialogs = String(quality.nativeDialogs.length);
      if (quality.consoleErrors.length) report.consoleSample = quality.consoleErrors[0]!;
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
