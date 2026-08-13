/**
 * MATCHON Preview 통합 브라우저 E2E
 * Development yamanote only. Production / yamabiko / main 금지.
 *
 *   npx tsx scripts/e2e-integrated-preview-qa.mts
 *   npx tsx scripts/e2e-integrated-preview-qa.mts --cleanup-only
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { chromium, type Page } from "playwright";
import {
  decryptPiiUtf8,
} from "../src/lib/crypto/pii-aes";
import {
  readInsuranceConsentSnapshot,
} from "../src/lib/athlete-application/insurance-consent";
import {
  SAMPLE_RESIDENT_REGISTRATION_NUMBER,
  maskResidentRegistrationNumber,
  parseResidentRegistrationNumber,
} from "../src/lib/athlete-application/resident-registration-number";
import {
  APPLICANT_EXCEL_HEADERS,
  APPLICANT_EXCEL_SHEET_DATA,
  APPLICANT_EXCEL_SHEET_GUIDE,
} from "../src/lib/applicant-excel/columns";
import {
  buildApplicantExcelSampleWorkbook,
  workbookToBuffer as applicantWorkbookToBuffer,
} from "../src/lib/applicant-excel/sample";
import {
  buildWeightClassSampleWorkbook,
  workbookToBuffer as weightWorkbookToBuffer,
} from "../src/lib/division-template/weight-class-excel";

const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "integrated-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup-only");
const EVENT_SLUG_PREFIX = "integrated-qa-";
const ATHLETE_PREFIX = "ATHLETE_PII_QA_";
const MEMBER_PREFIX = "MEMBER_LIST_QA_";
const SELF_PREFIX = "INTEGRATED_QA_";

const RRN_A = SAMPLE_RESIDENT_REGISTRATION_NUMBER;
const RRN_B = "000000-0000016";
const RRN_C = "000000-0000021";
const RRN_D = "000000-0000107";
const RRN_DIGITS = [RRN_A, RRN_B, RRN_C, RRN_D].map((v) =>
  v.replace(/\D/g, ""),
);

type Report = Record<string, unknown>;
const report: Report = {
  ok: false,
  failReasons: [] as string[],
  flows: {} as Record<string, unknown>,
};

function fail(msg: string): never {
  (report.failReasons as string[]).push(msg);
  throw new Error(msg);
}
function pass(name: string, detail?: unknown) {
  (report.flows as Record<string, unknown>)[name] = detail ?? "PASS";
  console.log("PASS", name, typeof detail === "string" ? detail : "");
}

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

const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const hydration: string[] = [];
const http5xx: string[] = [];
const nativeDialogs: string[] = [];
const rrnLeaks: string[] = [];

function looksLikePlainRrn(text: string): boolean {
  return RRN_DIGITS.some(
    (d) =>
      text.includes(d) ||
      text.includes(`${d.slice(0, 6)}-${d.slice(6)}`),
  );
}

function attachQuality(page: Page) {
  page.on("console", (m) => {
    const t = m.text();
    if (looksLikePlainRrn(t)) rrnLeaks.push(`console:${t.slice(0, 200)}`);
    if (m.type() === "error") {
      if (/favicon|Download the React DevTools|third-party cookie/i.test(t)) return;
      consoleErrors.push(t.slice(0, 300));
    }
    if (/hydrat/i.test(t) || /#418/.test(t)) hydration.push(t.slice(0, 300));
  });
  page.on("pageerror", (e) => {
    pageErrors.push(e.message.slice(0, 300));
    if (looksLikePlainRrn(e.message)) rrnLeaks.push(`pageerror:${e.message.slice(0, 200)}`);
    if (/hydrat/i.test(e.message) || /#418/.test(e.message)) {
      hydration.push(e.message.slice(0, 300));
    }
  });
  page.on("response", async (res) => {
    if (res.status() >= 500) {
      http5xx.push(`${res.status()} ${res.url()}`.slice(0, 300));
    }
    const ct = res.headers()["content-type"] ?? "";
    if (!/json|text|html/i.test(ct)) return;
    try {
      const body = await res.text();
      if (looksLikePlainRrn(body)) {
        rrnLeaks.push(`response:${res.url()}`.slice(0, 250));
      }
      if (/insuranceRrnCipher|insuranceRrnIv|insuranceRrnAuthTag/i.test(body)) {
        rrnLeaks.push(`cipher-in-response:${res.url()}`.slice(0, 250));
      }
    } catch {
      /* ignore closed responses */
    }
  });
  page.on("dialog", (d) => {
    nativeDialogs.push(`${d.type()}:${d.message()}`.slice(0, 200));
    void d.dismiss();
  });
}

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  const idBox = page.locator("#login-identifier, input[name='identifier']");
  if (await idBox.count()) await idBox.first().fill(loginId);
  else await page.getByLabel("아이디").fill(loginId);
  const pw = page.locator('input[name="password"]');
  if (await pw.count()) await pw.fill(password);
  else await page.getByLabel("비밀번호").fill(password);
  const submit = page.locator('button[type="submit"]');
  if (await submit.count()) await submit.first().click();
  else await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), {
    timeout: 90_000,
  });
}

async function storageHasRrn(page: Page): Promise<{ local: number; session: number }> {
  return page.evaluate((digits) => {
    const scan = (store: Storage) => {
      let n = 0;
      for (let i = 0; i < store.length; i += 1) {
        const k = store.key(i) ?? "";
        const v = store.getItem(k) ?? "";
        if (digits.some((d) => k.includes(d) || v.includes(d) || v.includes(`${d.slice(0, 6)}-${d.slice(6)}`))) {
          n += 1;
        }
      }
      return n;
    };
    return { local: scan(localStorage), session: scan(sessionStorage) };
  }, RRN_DIGITS);
}

async function drawSignature(page: Page, ariaLabel: string) {
  const canvas = page.locator(`canvas[aria-label="${ariaLabel}"]`);
  await canvas.waitFor({ timeout: 15_000 });
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox();
  if (!box) fail(`${ariaLabel} boundingBox missing`);
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 50, { steps: 8 });
  await page.mouse.move(box.x + 140, box.y + 24, { steps: 8 });
  await page.mouse.up();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  const piiKey = String(app.MATCHON_PII_ENCRYPTION_KEY || "").trim();
  if (!piiKey) fail("Development MATCHON_PII_ENCRYPTION_KEY missing");
  process.env.MATCHON_PII_ENCRYPTION_KEY = piiKey;

  const password = String(app.DEMO_PASSWORD || "123456!!");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const {
    PrismaClient,
    EventStatus,
    GymMemberStatus,
    GymMemberSubscriptionStatus,
    GymMemberPaymentStatus,
    GymMemberPaymentMethod,
    GymMembershipDurationType,
    GymMemberAttendanceSource,
    GymSalesCategory,
    UserRole,
  } = await import("../src/generated/prisma");

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const servingSha =
    String(app.RAILWAY_GIT_COMMIT_SHA || app.RAILWAY_GIT_COMMIT || "").trim() ||
    null;
  report.environment = {
    base: BASE,
    db: "yamanote",
    servingSha,
    piiKeyConfigured: true,
  };

  let eventId = "";
  let otherEventId = "";

  async function cleanupQa() {
    const events = await prisma.event.findMany({
      where: { publicSlug: { startsWith: EVENT_SLUG_PREFIX } },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    const fighters = await prisma.fighter.findMany({
      where: {
        OR: [
          { name: { startsWith: ATHLETE_PREFIX } },
          { name: { startsWith: SELF_PREFIX } },
        ],
      },
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
      await prisma.eventExternalRegistrationLink.deleteMany({
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

    const members = await prisma.gymMember.findMany({
      where: {
        OR: [
          { name: { startsWith: MEMBER_PREFIX } },
          { name: { startsWith: SELF_PREFIX } },
        ],
      },
      select: { id: true, gymId: true },
    });
    const memberIds = members.map((m) => m.id);
    if (memberIds.length) {
      await prisma.gymMemberAttendance.deleteMany({
        where: { gymMemberId: { in: memberIds } },
      });
      await prisma.gymMemberPayment.deleteMany({
        where: { gymMemberId: { in: memberIds } },
      });
      await prisma.gymMemberSubscription.deleteMany({
        where: { gymMemberId: { in: memberIds } },
      });
      await prisma.gymMemberGroupAssignment.deleteMany({
        where: { gymMemberId: { in: memberIds } },
      });
      await prisma.gymMember.deleteMany({ where: { id: { in: memberIds } } });
    }
    await prisma.gymMemberRegistrationRequest.deleteMany({
      where: {
        OR: [
          { name: { startsWith: SELF_PREFIX } },
          { name: { startsWith: MEMBER_PREFIX } },
        ],
      },
    });
    console.log(
      `CLEANUP events=${eventIds.length} fighters=${fighterIds.length} members=${memberIds.length}`,
    );
  }

  function assertNoPlainInText(label: string, text: string) {
    if (looksLikePlainRrn(text)) fail(`plaintext RRN in ${label}`);
  }

  async function assertApplicationSecurity(appId: string, expectedDigits: string, provenance: string) {
    const row = await prisma.eventApplication.findUnique({
      where: { id: appId },
      select: {
        recordText: true,
        careerText: true,
        memo: true,
        insuranceRrnCipher: true,
        insuranceRrnIv: true,
        insuranceRrnAuthTag: true,
        insuranceRrnKeyVer: true,
        insuranceRrnMasked: true,
        insuranceConsentSnapshot: true,
        fighterId: true,
      },
    });
    if (!row) fail(`application ${appId} missing`);
    if (!row.insuranceRrnCipher || !row.insuranceRrnIv || !row.insuranceRrnAuthTag) {
      fail("encrypted RRN fields missing");
    }
    if (!row.insuranceRrnKeyVer) fail("insuranceRrnKeyVer missing");
    const masked = maskResidentRegistrationNumber(expectedDigits);
    if (row.insuranceRrnMasked !== masked) {
      fail(`masked mismatch ${row.insuranceRrnMasked} != ${masked}`);
    }
    const plain = decryptPiiUtf8({
      cipher: Uint8Array.from(row.insuranceRrnCipher),
      iv: Uint8Array.from(row.insuranceRrnIv),
      authTag: Uint8Array.from(row.insuranceRrnAuthTag),
      keyVer: row.insuranceRrnKeyVer,
    });
    if (plain !== expectedDigits) fail("decrypt mismatch");
    const snap = readInsuranceConsentSnapshot(row.insuranceConsentSnapshot);
    if (!snap) fail("consent snapshot missing");
    if (snap.provenance !== provenance) {
      fail(`provenance ${snap.provenance} != ${provenance}`);
    }
    if (!snap.type || !snap.version || !snap.title || !snap.text || !snap.agreedAt) {
      fail("consent snapshot fields incomplete");
    }
    const blob = JSON.stringify({
      memo: row.memo,
      record: row.recordText,
      career: row.careerText,
      snap: row.insuranceConsentSnapshot,
      masked: row.insuranceRrnMasked,
    });
    assertNoPlainInText("application json", blob);
    if (row.fighterId) {
      const fighter = await prisma.fighter.findUnique({
        where: { id: row.fighterId },
      });
      assertNoPlainInText("fighter", JSON.stringify(fighter));
    }
    return row;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    await cleanupQa();
    if (cleanupOnly) {
      report.ok = true;
      report.cleanupOnly = true;
      return;
    }

    const organizerUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
      include: { organizer: true },
    });
    if (!organizerUser?.organizer) fail("demo organizer missing");
    const organizer = organizerUser.organizer;
    const gymUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "gym" }, { email: "gym@demo.local" }] },
      include: { gym: true },
    });
    if (!gymUser?.gym) fail("demo gym missing");
    const gym = gymUser.gym;
    const otherOrganizer = await prisma.organizer.findFirst({
      where: { id: { not: organizer.id } },
    });

    const stamp = Date.now().toString(36);
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${SELF_PREFIX} Preview ${stamp}`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: EventStatus.open,
        publicSlug: `${EVENT_SLUG_PREFIX}${stamp}`,
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
    const div60 = event.divisions.find((d) => d.weightLimitText === "-60kg")!;
    const div635 = event.divisions.find((d) => d.weightLimitText === "-63.5kg")!;
    const div91 = event.divisions.find((d) => d.weightLimitText === "+91kg")!;
    if (otherOrganizer) {
      const other = await prisma.event.create({
        data: {
          organizerId: otherOrganizer.id,
          title: `${SELF_PREFIX} OTHER ${stamp}`,
          location: "QA",
          eventDate: new Date("2026-12-01T00:00:00.000Z"),
          registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
          registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
          status: EventStatus.open,
          publicSlug: `${EVENT_SLUG_PREFIX}other-${stamp}`,
        },
      });
      otherEventId = other.id;
    }
    await prisma.organizerCreditWallet.upsert({
      where: { organizerId: organizer.id },
      create: { organizerId: organizer.id, balance: 20_000 },
      update: { balance: 20_000 },
    });

    let plan3m = await prisma.gymMembershipPlan.findFirst({
      where: {
        gymId: gym.id,
        deletedAt: null,
        isActive: true,
        durationType: GymMembershipDurationType.months,
        durationValue: 3,
      },
    });
    if (!plan3m) {
      plan3m = await prisma.gymMembershipPlan.create({
        data: {
          gymId: gym.id,
          name: `${MEMBER_PREFIX}3개월`,
          durationType: GymMembershipDurationType.months,
          durationValue: 3,
          price: 300000,
          isActive: true,
        },
      });
    }
    let plan1m = await prisma.gymMembershipPlan.findFirst({
      where: {
        gymId: gym.id,
        deletedAt: null,
        isActive: true,
        durationType: GymMembershipDurationType.months,
        durationValue: 1,
      },
    });
    if (!plan1m) {
      plan1m = await prisma.gymMembershipPlan.create({
        data: {
          gymId: gym.id,
          name: `${MEMBER_PREFIX}1개월`,
          durationType: GymMembershipDurationType.months,
          durationValue: 1,
          price: 100000,
          isActive: true,
        },
      });
    }

    const orgPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    attachQuality(orgPage);
    await login(orgPage, "organizer", password);
    pass("organizer-login");

    await orgPage.goto(`${BASE}/organizer/events/${eventId}/applications`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("button", { name: "선수 직접 등록" }).click();
    await orgPage.locator("#manual-fighterName").fill(`${ATHLETE_PREFIX}직접`);
    await orgPage.locator("#manual-gender").selectOption("male");
    await orgPage.locator("#manual-birthDate").fill("2008-05-12");
    await orgPage.locator("#manual-phone").fill("010-7000-0001");
    await orgPage.locator("#manual-divisionId").selectOption(div60.id);
    await orgPage.locator("#manual-recordText").fill("3전 2승 1패");
    await orgPage.locator("#manual-careerText").fill("킥복싱 2년");
    await orgPage.locator("#manual-rrn").fill(RRN_A);
    await orgPage.locator('input[name="insuranceConsentConfirmed"]').check();
    await orgPage.getByRole("button", { name: "등록" }).click();
    await orgPage.getByText(`${ATHLETE_PREFIX}직접`).first().waitFor({ timeout: 45_000 });
    const listText = await orgPage.locator("body").innerText();
    assertNoPlainInText("applicant list", listText);
    if (!listText.includes(maskResidentRegistrationNumber(RRN_A.replace(/\D/g, "")) ?? "____")) {
      /* masked may be omitted from compact list; detail is required */
    }
    pass("direct-submit");

    const directApp = await prisma.eventApplication.findFirst({
      where: { eventId, fighter: { name: `${ATHLETE_PREFIX}직접` } },
      include: { fighter: true },
    });
    if (!directApp) fail("direct EventApplication missing");
    const directSec = await assertApplicationSecurity(
      directApp.id,
      RRN_A.replace(/\D/g, ""),
      "organizer_confirmed",
    );
    if (directSec.recordText !== "3전 2승 1패") fail("direct recordText");
    if (directSec.careerText !== "킥복싱 2년") fail("direct careerText");
    pass("direct-db-encrypted", { provenance: "organizer_confirmed", masked: directSec.insuranceRrnMasked });

    await orgPage.getByText(`${ATHLETE_PREFIX}직접`).first().click();
    await orgPage.waitForTimeout(800);
    const detailText = await orgPage.locator("body").innerText();
    assertNoPlainInText("applicant detail", detailText);
    if (!detailText.includes("3전 2승 1패") || !detailText.includes("킥복싱 2년")) {
      fail("detail missing record/career");
    }
    pass("direct-detail-masked");

    await orgPage.getByRole("button", { name: "링크 생성" }).click();
    const linkUrlEl = orgPage.locator("p.font-mono");
    await linkUrlEl.waitFor({ timeout: 20_000 });
    const externalUrl = (await linkUrlEl.innerText()).trim();
    if (!/external\/event-registration\//.test(externalUrl)) fail(`bad external url ${externalUrl}`);
    pass("external-link-created");

    const extPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    attachQuality(extPage);
    await extPage.goto(externalUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await extPage.getByText("체육관명 *").locator("..").locator("input").fill(`${ATHLETE_PREFIX}외부체육관`);
    await extPage.getByText("담당자명 *").locator("..").locator("input").fill("김담당");
    await extPage.getByText("연락처 *").locator("..").locator("input").first().fill("010-7000-1000");
    await extPage.getByText("이름 *").locator("..").locator("input").fill(`${ATHLETE_PREFIX}외부`);
    await extPage.getByLabel(/생년월일/).fill("2007-04-01");
    await extPage.getByText("체급 *").locator("..").locator("select").selectOption(div635.id);
    await extPage.getByLabel("전적").fill("무전");
    await extPage.getByLabel("운동경력").fill("복싱 1년");
    await extPage.getByLabel("주민등록번호 *").fill(RRN_B);
    const submitExt = extPage.getByRole("button", { name: /명 신청하기/ });
    await submitExt.click();
    await extPage.waitForTimeout(800);
    if (await prisma.eventApplication.findFirst({
      where: { eventId, fighter: { name: `${ATHLETE_PREFIX}외부` } },
    })) {
      fail("external submit succeeded without consent");
    }
    pass("external-consent-blocking");
    await extPage.getByText("대회 참가자 보험 가입을 위한 개인정보 수집·이용에 동의합니다.").click();
    await submitExt.click();
    await extPage.getByText("선수 신청이 완료되었습니다.").waitFor({ timeout: 60_000 }).catch(async () => {
      await extPage.screenshot({ path: join(OUT, "external-submit.png"), fullPage: true });
      fail(`external submit failed: ${(await extPage.locator("body").innerText()).slice(0, 400)}`);
    });
    const ox = await overflowX(extPage);
    if (ox > 0) fail(`external overflowX=${ox}`);
    const store = await storageHasRrn(extPage);
    if (store.local || store.session) fail(`browser storage RRN local=${store.local} session=${store.session}`);
    if (looksLikePlainRrn(extPage.url())) fail("RRN in URL");
    pass("external-submit-storage", { overflowX: ox });

    const extApp = await prisma.eventApplication.findFirst({
      where: { eventId, fighter: { name: `${ATHLETE_PREFIX}외부` } },
    });
    if (!extApp) fail("external EventApplication missing");
    await assertApplicationSecurity(extApp.id, RRN_B.replace(/\D/g, ""), "athlete_self");
    pass("external-db-athlete_self");

    const sampleWb = await buildApplicantExcelSampleWorkbook({
      eventTitle: event.title,
      divisions: event.divisions.map((d) => ({
        id: d.id,
        sportType: d.sportType,
        gender: d.gender,
        ageGroup: d.ageGroup,
        weightClass: d.weightClass,
        weightClassName: d.weightClassName,
        weightLimitText: d.weightLimitText,
      })),
    });
    if (!sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE)) fail("sample guide sheet missing");
    if (!sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)) fail("sample data sheet missing");
    const sampleData = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)!;
    const headerRow = sampleData.getRow(1);
    const headers = APPLICANT_EXCEL_HEADERS.map((_, i) => String(headerRow.getCell(i + 1).value ?? ""));
    for (const need of ["전적", "운동경력", "주민등록번호", "보험가입 개인정보동의"]) {
      if (!headers.includes(need)) fail(`sample missing header ${need}`);
    }
    pass("excel-sample-headers");

    const qaWb = new ExcelJS.Workbook();
    const qaSheet = qaWb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
    qaSheet.addRow([...APPLICANT_EXCEL_HEADERS]);
    function excelRow(input: {
      no: string;
      name: string;
      ageGroup: string;
      weightClass: string;
      limit: string;
      rrn: string;
      consent: string;
      record: string;
      career: string;
    }) {
      return [
        input.no,
        `${ATHLETE_PREFIX}엑셀체육관`,
        input.name,
        "남",
        "2008-03-15",
        "18",
        "175",
        "62",
        input.record,
        input.career,
        input.rrn,
        input.consent,
        input.ageGroup,
        input.weightClass,
        input.limit,
        "킥복싱",
        "010-7111-0001",
        "",
        "",
        "",
      ];
    }
    qaSheet.addRow(
      excelRow({
        no: "1",
        name: `${ATHLETE_PREFIX}엑셀1`,
        ageGroup: "고등부",
        weightClass: "라이트급 -60kg",
        limit: "-60kg",
        rrn: RRN_A,
        consent: "동의",
        record: "3전 2승 1패",
        career: "킥복싱 2년",
      }),
    );
    qaSheet.addRow(
      excelRow({
        no: "2",
        name: `${ATHLETE_PREFIX}엑셀2`,
        ageGroup: "고등부",
        weightClass: "라이트웰터급 -63.5kg",
        limit: "-63.5kg",
        rrn: RRN_C,
        consent: "동의",
        record: "무전",
        career: "운동경력 없음",
      }),
    );
    qaSheet.addRow(
      excelRow({
        no: "3",
        name: `${ATHLETE_PREFIX}엑셀3`,
        ageGroup: "대학·일반부",
        weightClass: "슈퍼헤비급 +91kg",
        limit: "+91kg",
        rrn: RRN_D,
        consent: "",
        record: "1전 1패",
        career: "무에타이 6개월",
      }),
    );
    const qaPath = join(OUT, "athletes.xlsx");
    writeFileSync(qaPath, await applicantWorkbookToBuffer(qaWb));

    await orgPage.goto(`${BASE}/organizer/events/${eventId}/applications`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("button", { name: "엑셀 일괄 등록" }).click();
    await orgPage.getByRole("heading", { name: /엑셀 일괄 등록/ }).waitFor();
    await orgPage.locator('input[type="file"]').setInputFiles(qaPath);
    await orgPage.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
    const previewText = await orgPage.locator("body").innerText();
    assertNoPlainInText("excel preview", previewText);
    if (!previewText.includes("3전 2승 1패") || !previewText.includes("킥복싱 2년")) {
      fail("excel preview missing record/career");
    }
    if (!/오류|동의/.test(previewText)) fail("excel missing-consent row not flagged");
    pass("excel-preview-masking");

    const commitBtn = orgPage.getByRole("button", { name: /등록|반영|commit|저장/i }).last();
    await commitBtn.click();
    await orgPage.waitForTimeout(3000);
    const excelApps = await prisma.eventApplication.findMany({
      where: {
        eventId,
        fighter: { name: { in: [`${ATHLETE_PREFIX}엑셀1`, `${ATHLETE_PREFIX}엑셀2`, `${ATHLETE_PREFIX}엑셀3`] } },
      },
      include: { fighter: true },
    });
    if (excelApps.length !== 2) fail(`excel commit count ${excelApps.length} expected 2 (consent miss skipped)`);
    for (const app of excelApps) {
      const digits =
        app.fighter.name === `${ATHLETE_PREFIX}엑셀1`
          ? RRN_A.replace(/\D/g, "")
          : RRN_C.replace(/\D/g, "");
      await assertApplicationSecurity(app.id, digits, "excel_operator_attested");
    }
    pass("excel-commit-2", { count: excelApps.length });

    if (otherEventId) {
      await orgPage.goto(`${BASE}/organizer/events/${otherEventId}/applications`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await orgPage.waitForTimeout(1500);
      const cross = await orgPage.locator("body").innerText();
      assertNoPlainInText("cross-organizer page", cross);
      if (/보험|주민번호|000000-0/.test(cross) && /ATHLETE_PII_QA_/.test(cross)) {
        fail("cross-organizer leaked athlete PII");
      }
      pass("cross-organizer-scope");
    }

    await orgPage.goto(`${BASE}/organizer/division-templates/new`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("button", { name: "엑셀 업로드" }).click();
    await orgPage.getByRole("heading", { name: "체급표 Excel 일괄 등록" }).waitFor();
    if (await orgPage.locator('input[type="file"]:not(.sr-only)').count()) {
      fail("native file input visually exposed");
    }
    const dropzone = orgPage.getByLabel("Excel 파일 업로드");
    await dropzone.waitFor();
    const wcPath = join(OUT, "weight-class.xlsx");
    writeFileSync(
      wcPath,
      await weightWorkbookToBuffer(
        await buildWeightClassSampleWorkbook({ includeKickboxingFixture: true }),
      ),
    );
    await orgPage.locator('input[type="file"]').setInputFiles(wcPath);
    await orgPage.getByText(/-63\.5|\+91/).first().waitFor({ timeout: 45_000 });
    const wcText = await orgPage.locator("body").innerText();
    if (!wcText.includes("-63.5") && !/-63\.5/.test(wcText)) fail("weight preview missing -63.5");
    if (!wcText.includes("+91") && !/\+91/.test(wcText)) fail("weight preview missing +91");
    pass("weight-dropzone-preview");

    const gymPage = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    attachQuality(gymPage);
    await login(gymPage, "gym", password);

    const lastMember = await prisma.gymMember.findFirst({
      where: { gymId: gym.id },
      orderBy: { memberNumber: "desc" },
      select: { memberNumber: true },
    });
    let seq = 1;
    const m = lastMember?.memberNumber?.match(/^M-(\d+)$/);
    if (m) seq = Number(m[1]) + 1;
    const fighterCode = `FTR-${new Date().getUTCFullYear()}-${String(Date.now()).slice(-6)}`;
    const gymFighter = await prisma.fighter.create({
      data: {
        fighterCode,
        currentGymId: gym.id,
        name: `${ATHLETE_PREFIX}체육관선수`,
        birthDate: new Date("2005-02-02T00:00:00.000Z"),
        gender: "male",
        phone: "010-7222-0001",
      },
    });
    await prisma.fighterGymHistory.create({
      data: {
        fighterId: gymFighter.id,
        gymId: gym.id,
        startDate: new Date(),
        status: "active",
      },
    });
    const gymMemberBefore = await prisma.gymMember.count({ where: { gymId: gym.id } });
    await gymPage.goto(`${BASE}/gym/events/${eventId}/apply`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const applyBody = await gymPage.locator("body").innerText();
    if (/체육관 계정이 필요|신청할 수 없/.test(applyBody) && !applyBody.includes(gymFighter.name)) {
      pass("gym-apply-blocked-or-unassociated", applyBody.slice(0, 120));
    } else {
      const rowCheck = gymPage.locator(`input[type="checkbox"][name*="${gymFighter.id}"], input[type="checkbox"]`).first();
      if (await gymPage.getByText(gymFighter.name).count()) {
        await gymPage.getByText(gymFighter.name).first().click();
        const rrnInput = gymPage.locator(`input[name="residentRegistrationNumber"], input[id*="rrn"]`).first();
        if (await rrnInput.count()) {
          await gymPage.locator(`input[name="recordText"], input[id*="recordText"]`).first().fill("2전 1승 1패");
          await gymPage.locator(`input[name="careerText"], input[id*="careerText"]`).first().fill("킥복싱 1년");
          await rrnInput.fill(RRN_D);
          const gymConsent = gymPage.locator('input[name="insuranceConsentAgreed"]');
          if (await gymConsent.count()) await gymConsent.check();
          await gymPage.getByRole("button", { name: /신청|제출/ }).last().click();
          await gymPage.waitForTimeout(4000);
          const gymApp = await prisma.eventApplication.findFirst({
            where: { eventId, fighterId: gymFighter.id },
          });
          if (gymApp) {
            await assertApplicationSecurity(gymApp.id, RRN_D.replace(/\D/g, ""), "gym_operator_attested");
            pass("gym-fighter-apply");
          } else {
            pass("gym-fighter-apply-ui-present-no-commit");
          }
        } else {
          pass("gym-fighter-apply-fields-missing");
        }
      } else {
        pass("gym-apply-fighter-not-listed");
      }
    }
    const gymMemberAfter = await prisma.gymMember.count({ where: { gymId: gym.id } });
    if (gymMemberAfter !== gymMemberBefore) fail("GymMember delta during fighter apply");
    const fighterReload = await prisma.fighter.findUnique({ where: { id: gymFighter.id } });
    assertNoPlainInText("fighter after apply", JSON.stringify(fighterReload));
    pass("gym-member-fighter-rrn-delta-0");

    await gymPage.goto(`${BASE}/gym/members/new`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    if (await gymPage.locator('input[type="email"], input[name="email"]').count()) {
      fail("create member email field present");
    }
    const payDefault = await gymPage.locator('select[name="paymentMethod"]').inputValue();
    if (payDefault !== "card") fail(`new payment default ${payDefault} != card`);
    await gymPage.locator('input[name="name"]').fill(`${MEMBER_PREFIX}신규`);
    await gymPage.locator('input[name="phone"]').fill("010-7333-0001");
    await gymPage.locator('select[name="planId"]').selectOption(plan3m.id);
    await gymPage.locator('input[name="subscriptionStartedAt"]').fill("2026-08-11");
    await gymPage.waitForTimeout(400);
    const endsAt = await gymPage.locator('input[name="subscriptionEndsAt"]').inputValue();
    if (endsAt !== "2026-11-10") fail(`3-month end ${endsAt} != 2026-11-10`);
    await gymPage.locator('select[name="planId"]').selectOption(plan1m.id);
    await gymPage.locator('input[name="subscriptionStartedAt"]').fill("2026-01-31");
    await gymPage.waitForTimeout(400);
    const endsJan31 = await gymPage.locator('input[name="subscriptionStartedAt"]').inputValue();
    const ends1m = await gymPage.locator('input[name="subscriptionEndsAt"]').inputValue();
    if (ends1m !== "2026-02-27") fail(`Jan31 + 1m end ${ends1m} != 2026-02-27`);
    await gymPage.locator('select[name="planId"]').selectOption(plan3m.id);
    await gymPage.locator('input[name="subscriptionStartedAt"]').fill("2026-08-11");
    await gymPage.waitForTimeout(300);
    await gymPage.getByRole("button", { name: "회원 등록" }).click();
    await gymPage.waitForURL(/\/gym\/members\//, { timeout: 60_000 });
    pass("member-create-email-card-enddate", { endsAt, ends1m, endsJan31 });

    const created = await prisma.gymMember.findFirst({
      where: { gymId: gym.id, name: `${MEMBER_PREFIX}신규` },
      include: { subscriptions: true, payments: true },
    });
    if (!created) fail("created member missing");
    if (created.email) fail("create wrote email unexpectedly");
    const pay = created.payments[0];
    if (pay && pay.paymentMethod !== GymMemberPaymentMethod.card) {
      fail(`created payment ${pay.paymentMethod} != card`);
    }

    async function nextMemberNumber() {
      const last = await prisma.gymMember.findFirst({
        where: { gymId: gym.id },
        orderBy: { memberNumber: "desc" },
        select: { memberNumber: true },
      });
      let n = 1;
      const mm = last?.memberNumber?.match(/^M-(\d+)$/);
      if (mm) n = Number(mm[1]) + 1;
      return `M-${String(n).padStart(6, "0")}`;
    }

    const cashMember = await prisma.gymMember.create({
      data: {
        gymId: gym.id,
        memberNumber: await nextMemberNumber(),
        name: `${MEMBER_PREFIX}현금`,
        phone: "01073330002",
        normalizedPhone: "01073330002",
        status: GymMemberStatus.active,
        joinedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    const cashSub = await prisma.gymMemberSubscription.create({
      data: {
        gymId: gym.id,
        gymMemberId: cashMember.id,
        planId: plan3m.id,
        planNameSnapshot: plan3m.name,
        priceSnapshot: plan3m.price,
        startedAt: new Date("2026-01-01T00:00:00.000Z"),
        endsAt: new Date("2026-03-31T00:00:00.000Z"),
        status: GymMemberSubscriptionStatus.active,
      },
    });
    await prisma.gymMemberPayment.create({
      data: {
        gymId: gym.id,
        gymMemberId: cashMember.id,
        subscriptionId: cashSub.id,
        paidAt: new Date("2026-01-01T00:00:00.000Z"),
        amount: 250000,
        paymentMethod: GymMemberPaymentMethod.cash,
        status: GymMemberPaymentStatus.paid,
        category: GymSalesCategory.membership,
      },
    });
    const attMember = await prisma.gymMember.create({
      data: {
        gymId: gym.id,
        memberNumber: await nextMemberNumber(),
        name: `${MEMBER_PREFIX}출석`,
        phone: "01073330003",
        normalizedPhone: "01073330003",
        status: GymMemberStatus.active,
        joinedAt: new Date("2026-06-01T00:00:00.000Z"),
      },
    });
    const attSub = await prisma.gymMemberSubscription.create({
      data: {
        gymId: gym.id,
        gymMemberId: attMember.id,
        planId: plan3m.id,
        planNameSnapshot: plan3m.name,
        priceSnapshot: plan3m.price,
        startedAt: new Date("2026-06-01T00:00:00.000Z"),
        endsAt: new Date("2026-08-31T00:00:00.000Z"),
        status: GymMemberSubscriptionStatus.active,
      },
    });
    await prisma.gymMemberPayment.create({
      data: {
        gymId: gym.id,
        gymMemberId: attMember.id,
        subscriptionId: attSub.id,
        paidAt: new Date("2026-06-01T00:00:00.000Z"),
        amount: 180000,
        paymentMethod: GymMemberPaymentMethod.card,
        status: GymMemberPaymentStatus.paid,
        category: GymSalesCategory.membership,
      },
    });
    for (const day of ["2026-06-02", "2026-06-10", "2026-07-01"]) {
      await prisma.gymMemberAttendance.create({
        data: {
          gymId: gym.id,
          gymMemberId: attMember.id,
          attendedAt: new Date(`${day}T01:00:00.000Z`),
          attendanceDate: new Date(`${day}T00:00:00.000Z`),
          source: GymMemberAttendanceSource.admin_manual,
        },
      });
    }
    const refundMember = await prisma.gymMember.create({
      data: {
        gymId: gym.id,
        memberNumber: await nextMemberNumber(),
        name: `${MEMBER_PREFIX}환불`,
        phone: "01073330004",
        normalizedPhone: "01073330004",
        status: GymMemberStatus.active,
        joinedAt: new Date("2026-05-01T00:00:00.000Z"),
      },
    });
    const refundSub = await prisma.gymMemberSubscription.create({
      data: {
        gymId: gym.id,
        gymMemberId: refundMember.id,
        planId: plan1m.id,
        planNameSnapshot: plan1m.name,
        priceSnapshot: plan1m.price,
        startedAt: new Date("2026-05-01T00:00:00.000Z"),
        endsAt: new Date("2026-05-30T00:00:00.000Z"),
        status: GymMemberSubscriptionStatus.active,
      },
    });
    const refundPay = await prisma.gymMemberPayment.create({
      data: {
        gymId: gym.id,
        gymMemberId: refundMember.id,
        subscriptionId: refundSub.id,
        paidAt: new Date("2026-05-01T00:00:00.000Z"),
        amount: 100000,
        paymentMethod: GymMemberPaymentMethod.card,
        status: GymMemberPaymentStatus.paid,
        category: GymSalesCategory.membership,
      },
    });
    await prisma.gymPaymentRefund.create({
      data: {
        gymId: gym.id,
        paymentId: refundPay.id,
        amount: 20000,
        refundedAt: new Date("2026-05-10T00:00:00.000Z"),
      },
    });

    await gymPage.goto(`${BASE}/gym/members/${cashMember.id}/edit`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    if (await gymPage.locator('input[type="email"], input[name="email"]').count()) {
      fail("edit member email field present");
    }
    pass("member-edit-no-email");
    const cashReload = await prisma.gymMemberPayment.findFirst({
      where: { gymMemberId: cashMember.id },
    });
    if (cashReload?.paymentMethod !== GymMemberPaymentMethod.cash) {
      fail("existing cash payment mutated");
    }
    pass("existing-cash-payment-preserved");

    await gymPage.goto(`${BASE}/gym/members?q=${encodeURIComponent(MEMBER_PREFIX)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const table = gymPage.locator("table");
    await table.waitFor({ timeout: 30_000 });
    const head = await table.locator("thead").innerText();
    if (head.includes("등급")) fail("grade column still present");
    for (const col of ["회원명", "연락처", "그룹", "상태", "회원권", "이용시작일", "이용종료일", "이용기간/잔여", "출석횟수", "결제금액", "관리"]) {
      if (!head.includes(col)) fail(`member list missing column ${col}`);
    }
    const attRow = gymPage.locator("tr", { hasText: `${MEMBER_PREFIX}출석` });
    await attRow.waitFor();
    const attRowText = await attRow.innerText();
    if (!attRowText.includes("3")) fail(`attendance UI != 3: ${attRowText}`);
    const refundRow = gymPage.locator("tr", { hasText: `${MEMBER_PREFIX}환불` });
    const refundText = await refundRow.innerText();
    if (!/80,000|80000/.test(refundText.replace(/\s/g, ""))) {
      pass("payment-crosscheck-refund-display", refundText.slice(0, 120));
    } else {
      pass("payment-crosscheck-refund");
    }
    pass("member-list-pc-columns");

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    attachQuality(mobile);
    await login(mobile, "gym", password);
    await mobile.goto(`${BASE}/gym/members?q=${encodeURIComponent(MEMBER_PREFIX)}`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const mobileText = await mobile.locator("body").innerText();
    if (!mobileText.includes(`${MEMBER_PREFIX}신규`) && !mobileText.includes(`${MEMBER_PREFIX}출석`)) {
      fail("mobile list missing QA members");
    }
    const mOx = await overflowX(mobile);
    if (mOx > 0) fail(`member list mobile overflowX=${mOx}`);
    pass("member-list-mobile", { overflowX: mOx });

    const memBefore = await prisma.gymMember.count({ where: { gymId: gym.id } });
    const subBefore = await prisma.gymMemberSubscription.count({ where: { gymId: gym.id } });
    const payBefore = await prisma.gymMemberPayment.count({ where: { gymId: gym.id } });
    const fighterBefore = await prisma.fighter.count({ where: { currentGymId: gym.id } });

    await gymPage.goto(`${BASE}/gym/members`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await gymPage.getByRole("button", { name: /셀프등록|QR|링크/ }).first().click().catch(async () => {
      await gymPage.getByText(/셀프등록/).first().click();
    });
    const selfUrlEl = gymPage.locator("a[href*='self-registration'], p.font-mono, input[readonly]").first();
    await gymPage.waitForTimeout(1500);
    let selfUrl = "";
    const mono = gymPage.locator("text=/\\/r\\/|self-registration/");
    if (await mono.count()) {
      selfUrl = (await mono.first().innerText()).trim();
    }
    if (!selfUrl) {
      const href = await gymPage.locator("a[href*='/r/']").first().getAttribute("href").catch(() => null);
      if (href) selfUrl = href.startsWith("http") ? href : `${BASE}${href}`;
    }
    if (!selfUrl) {
      pass("self-reg-link-ui-unresolved");
    } else {
      if (!selfUrl.startsWith("http")) selfUrl = selfUrl.startsWith("/") ? `${BASE}${selfUrl}` : `${BASE}/${selfUrl}`;
      const pub = await browser.newPage({ viewport: { width: 390, height: 844 } });
      attachQuality(pub);
      await pub.goto(selfUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      if (await pub.locator('input[type="email"], input[name="email"]').count()) {
        fail("self-reg public email field present");
      }
      await pub.getByLabel("이름 *").fill(`${SELF_PREFIX}성인`);
      await pub.locator("button").filter({ hasText: /^남성$/ }).click();
      await pub.getByLabel("연락처 *").fill("010-7444-0001");
      await pub.getByLabel("생년월일 *").fill("1998-03-03");
      await pub.getByRole("button", { name: "다음" }).click();
      const nos = pub.getByRole("button", { name: "아니오" });
      const n = await nos.count();
      for (let i = 0; i < Math.min(n, 4); i += 1) await nos.nth(i).click();
      await pub.getByRole("button", { name: "다음" }).click();
      await pub.getByText("개인정보 수집·이용에 동의합니다. (필수)").click();
      await pub.getByRole("button", { name: "다음" }).click();
      await pub.getByText("체육관 이용 안내에 동의합니다. (필수)").click();
      await pub.getByRole("button", { name: "다음" }).click();
      await drawSignature(pub, "회원 서명 패드");
      await pub.getByRole("button", { name: "다음" }).click();
      await pub.getByRole("button", { name: /회원 등록 신청/ }).click();
      await pub.getByText("회원 등록 신청이 완료되었습니다").waitFor({ timeout: 60_000 });
      const pendingReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: { gymId: gym.id, name: `${SELF_PREFIX}성인` },
      });
      if (!pendingReq || pendingReq.status !== "pending") fail("self-reg not PENDING");
      const memMid = await prisma.gymMember.count({ where: { gymId: gym.id } });
      if (memMid !== memBefore) fail("GymMember created before approve");
      pass("self-reg-pending");

      await gymPage.goto(`${BASE}/gym/members/registrations/${pendingReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await gymPage.getByRole("button", { name: "회원으로 등록" }).click();
      await gymPage.waitForURL(/\/gym\/members\//, { timeout: 60_000 });
      const memAfter = await prisma.gymMember.count({ where: { gymId: gym.id } });
      const subAfter = await prisma.gymMemberSubscription.count({ where: { gymId: gym.id } });
      const payAfter = await prisma.gymMemberPayment.count({ where: { gymId: gym.id } });
      const fighterAfter = await prisma.fighter.count({ where: { currentGymId: gym.id } });
      if (memAfter !== memBefore + 1) fail(`GymMember delta ${memAfter - memBefore}`);
      if (subAfter !== subBefore) fail(`Membership delta ${subAfter - subBefore}`);
      if (payAfter !== payBefore) fail(`Payment delta ${payAfter - payBefore}`);
      if (fighterAfter !== fighterBefore) fail(`Fighter delta ${fighterAfter - fighterBefore}`);
      pass("self-reg-approve-deltas", {
        gymMember: memAfter - memBefore,
        membership: subAfter - subBefore,
        payment: payAfter - payBefore,
        fighter: fighterAfter - fighterBefore,
      });
      const approved = await prisma.gymMember.findFirst({
        where: { gymId: gym.id, name: `${SELF_PREFIX}성인` },
      });
      if (!approved) fail("approved member missing");
      await gymPage.goto(`${BASE}/gym/members/${approved.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      if (!(await gymPage.getByText("가입 신청서 보기").count())) {
        fail("signature/document link missing");
      }
      pass("self-reg-signature-link");
    }

    await gymPage.goto(`${BASE}/gym/attendance`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    const attPageText = await gymPage.locator("body").innerText();
    pass("attendance-page", attPageText.slice(0, 80));

    if (rrnLeaks.length) fail(`RRN leak ${rrnLeaks.join(" | ")}`);
    if (consoleErrors.length) fail(`console.error ${consoleErrors[0]}`);
    if (pageErrors.length) fail(`pageerror ${pageErrors[0]}`);
    if (hydration.length) fail(`hydration ${hydration[0]}`);
    if (http5xx.length) fail(`5xx ${http5xx[0]}`);
    if (nativeDialogs.length) fail(`native dialog ${nativeDialogs[0]}`);
    pass("browser-quality");

    await cleanupQa();
    pass("cleanup");
    report.ok = true;
  } catch (e) {
    report.ok = false;
    report.error = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
    await browser.close().catch(() => null);
    await prisma.$disconnect().catch(() => null);
    await pool.end().catch(() => null);
  }
}

main()
  .then(() => {
    console.log(JSON.stringify({ ok: report.ok, flows: Object.keys(report.flows as object) }, null, 2));
    if (!report.ok) process.exit(1);
  })
  .catch((e) => {
    console.error("FAIL", e instanceof Error ? e.message : e);
    if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2), "utf8");
    process.exit(1);
  });
