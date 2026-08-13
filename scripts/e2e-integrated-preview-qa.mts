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
import { createDecipheriv } from "node:crypto";

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
  "주민등록번호",
  "보험가입 개인정보동의",
  "경기구분",
  "체급",
  "체중기준",
  "종목",
  "연락처",
  "보호자이름",
  "보호자연락처",
  "메모",
] as const;
const APPLICANT_EXCEL_SHEET_DATA = "선수 신청";
const APPLICANT_EXCEL_SHEET_GUIDE = "입력 안내";

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

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

const RRN_A = "000000-0000001";
const RRN_B = "000000-0000016";
const RRN_C = "000000-0000021";
const RRN_D = "000000-0000107";
const RRN_DIGITS = [RRN_A, RRN_B, RRN_C, RRN_D].map((v) =>
  v.replace(/\D/g, ""),
);

function maskRrn(digits: string): string {
  return `${digits.slice(0, 6)}-${digits.slice(6, 7)}******`;
}

function parsePiiKey(raw: string): Buffer {
  const value = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(value)) return Buffer.from(value, "hex");
  const fromB64 = Buffer.from(value, "base64");
  if (fromB64.length === 32) return fromB64;
  throw new Error("invalid PII key");
}

function decryptPiiUtf8(blob: {
  cipher: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
}): string {
  const key = parsePiiKey(process.env.MATCHON_PII_ENCRYPTION_KEY || "");
  const decipher = createDecipheriv("aes-256-gcm", key, blob.iv);
  decipher.setAuthTag(Buffer.from(blob.authTag));
  return Buffer.concat([
    decipher.update(Buffer.from(blob.cipher)),
    decipher.final(),
  ]).toString("utf8");
}

function readConsentSnapshot(raw: unknown): {
  type?: string;
  version?: string;
  title?: string;
  text?: string;
  agreedAt?: string;
  provenance?: string;
} | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as {
    type?: string;
    version?: string;
    title?: string;
    text?: string;
    agreedAt?: string;
    provenance?: string;
  };
}

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
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  ) as Promise<number>;
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
  return page.evaluate(
    `(function() {
      var digits = ${JSON.stringify(RRN_DIGITS)};
      function scan(store) {
        var n = 0;
        for (var i = 0; i < store.length; i += 1) {
          var k = store.key(i) || "";
          var v = store.getItem(k) || "";
          for (var j = 0; j < digits.length; j += 1) {
            var d = digits[j];
            var dashed = d.slice(0, 6) + "-" + d.slice(6);
            if (k.indexOf(d) !== -1 || v.indexOf(d) !== -1 || v.indexOf(dashed) !== -1) {
              n += 1;
              break;
            }
          }
        }
        return n;
      }
      return { local: scan(localStorage), session: scan(sessionStorage) };
    })()`,
  ) as Promise<{ local: number; session: number }>;
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
  } = await import("../src/generated/prisma");

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const queryLog: string[] = [];
  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
    log: [{ emit: "event", level: "query" }],
  });
  prisma.$on("query" as never, (e: { query: string }) => {
    queryLog.push(e.query);
  });
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
    const masked = maskRrn(expectedDigits);
    if (row.insuranceRrnMasked !== masked) {
      fail(`masked mismatch ${row.insuranceRrnMasked} != ${masked}`);
    }
    const plain = decryptPiiUtf8({
      cipher: Uint8Array.from(row.insuranceRrnCipher),
      iv: Uint8Array.from(row.insuranceRrnIv),
      authTag: Uint8Array.from(row.insuranceRrnAuthTag),
    });
    if (plain !== expectedDigits) fail("decrypt mismatch");
    const snap = readConsentSnapshot(row.insuranceConsentSnapshot);
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
      include: { ownedGym: true },
    });
    if (!gymUser?.ownedGym) fail("demo gym missing");
    const gym = gymUser.ownedGym;
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
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await orgPage.getByRole("heading", { name: "신청자 관리" }).waitFor({
      timeout: 60_000,
    });
    const directBtn = orgPage.getByRole("button", { name: "선수 직접 등록" });
    await directBtn.waitFor({ timeout: 30_000 });
    await directBtn.click();
    try {
      await orgPage.locator("#manual-fighterName").waitFor({ timeout: 20_000 });
    } catch {
      await orgPage.screenshot({
        path: join(OUT, "direct-open-fail.png"),
        fullPage: true,
      });
      fail(
        `direct panel did not open: ${(await orgPage.locator("body").innerText()).slice(0, 400)}`,
      );
    }
    await orgPage.getByRole("button", { name: "체육관명 직접 입력" }).click();
    await orgPage.locator("#manual-gymName").fill(`${ATHLETE_PREFIX}직접체육관`);
    await orgPage.locator("#manual-fighterName").fill(`${ATHLETE_PREFIX}직접`);
    await orgPage.locator("#manual-gender").selectOption("male");
    await orgPage.locator("#manual-birthDate").fill("2008-05-12");
    await orgPage.locator("#manual-phone").fill("010-7000-0001");
    await orgPage.locator("#manual-divisionId").selectOption(div60.id);
    await orgPage.locator("#manual-recordText").fill("3전 2승 1패");
    await orgPage.locator("#manual-careerText").fill("킥복싱 2년");
    await orgPage.locator("#manual-rrn").fill(RRN_A);
    await orgPage.locator('input[name="insuranceConsentConfirmed"]').check();
    await orgPage.getByRole("button", { name: "등록", exact: true }).click();
    const directName = orgPage.getByText(`${ATHLETE_PREFIX}직접`, { exact: true });
    try {
      await directName.first().waitFor({ timeout: 45_000 });
    } catch {
      await orgPage.screenshot({
        path: join(OUT, "direct-submit-fail.png"),
        fullPage: true,
      });
      const dbApp = await prisma.eventApplication.findFirst({
        where: { eventId, fighter: { name: `${ATHLETE_PREFIX}직접` } },
      });
      fail(
        `direct UI missing fighter (db=${Boolean(dbApp)}): ${(await orgPage.locator("body").innerText()).slice(0, 500)}`,
      );
    }
    const listText = await orgPage.locator("body").innerText();
    assertNoPlainInText("applicant list", listText);
    if (!listText.includes(maskRrn(RRN_A.replace(/\D/g, "")))) {
      /* compact list may omit masked RRN; detail is required */
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

    await orgPage.setViewportSize({ width: 390, height: 844 });
    await orgPage.waitForTimeout(500);
    const card = orgPage.locator("[data-slot='card']").filter({
      hasText: `${ATHLETE_PREFIX}직접`,
    }).first();
    await card.waitFor({ timeout: 20_000 });
    const detailText = await card.innerText();
    assertNoPlainInText("applicant detail", detailText);
    if (!detailText.includes("3전 2승 1패") || !detailText.includes("킥복싱 2년")) {
      fail(`detail missing record/career: ${detailText.slice(0, 300)}`);
    }
    if (!detailText.includes(maskRrn(RRN_A.replace(/\D/g, "")))) {
      fail(`detail missing masked RRN: ${detailText.slice(0, 300)}`);
    }
    pass("direct-detail-masked");
    await orgPage.setViewportSize({ width: 1366, height: 768 });
    await orgPage.waitForTimeout(300);

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
    await extPage.goto(externalUrl, { waitUntil: "networkidle", timeout: 90_000 });
    await extPage.getByText("외부 체육관 선수 등록").waitFor({ timeout: 30_000 });
    async function fillLabelInput(label: string, value: string) {
      await extPage
        .locator("label")
        .filter({ hasText: label })
        .locator("input")
        .first()
        .fill(value);
    }
    await fillLabelInput("체육관명 *", `${ATHLETE_PREFIX}외부체육관`);
    await fillLabelInput("담당자명 *", "김담당");
    await fillLabelInput("연락처 *", "010-7000-1000");
    await fillLabelInput("이름 *", `${ATHLETE_PREFIX}외부`);
    await extPage.getByLabel("1번 선수 생년월일").fill("2007-04-01");
    await extPage
      .locator("label")
      .filter({ hasText: "체급 *" })
      .locator("select")
      .selectOption(div635.id);
    await extPage.getByLabel("전적").fill("무전");
    await extPage.getByLabel("운동경력").fill("복싱 1년");
    await extPage.getByLabel("주민등록번호 *").fill(RRN_B);
    const birthVal = await extPage.getByLabel("1번 선수 생년월일").inputValue();
    if (birthVal !== "2007-04-01") fail(`external birth not set: ${birthVal}`);
    const divVal = await extPage
      .locator("label")
      .filter({ hasText: "체급 *" })
      .locator("select")
      .inputValue();
    if (divVal !== div635.id) fail(`external division not set: ${divVal}`);
    const rrnVal = await extPage.getByLabel("주민등록번호 *").inputValue();
    if (!rrnVal.replace(/\D/g, "").startsWith("0000000000016")) {
      fail(`external RRN not set: ${rrnVal}`);
    }
    const gymNameVal = await extPage
      .locator("label")
      .filter({ hasText: "체육관명 *" })
      .locator("input")
      .first()
      .inputValue();
    if (gymNameVal !== `${ATHLETE_PREFIX}외부체육관`) {
      fail(`external gym name not set: ${gymNameVal}`);
    }
    const submitExt = extPage.getByRole("button", { name: "1명 신청하기" });
    await submitExt.scrollIntoViewIfNeeded();
    await submitExt.click();
    const extAlert = extPage.locator("[role=alert], .text-destructive").first();
    try {
      await extAlert.waitFor({ timeout: 10_000 });
    } catch {
      await extPage.screenshot({ path: join(OUT, "external-consent.png"), fullPage: true });
      fail(
        `expected consent error, got: ${(await extPage.locator("body").innerText()).slice(0, 500)}`,
      );
    }
    const extErr = await extAlert.innerText();
    if (!/보험가입 개인정보 동의/.test(extErr)) {
      fail(`expected consent error, got: ${extErr}`);
    }
    if (await prisma.eventApplication.findFirst({
      where: { eventId, fighter: { name: `${ATHLETE_PREFIX}외부` } },
    })) {
      fail("external submit succeeded without consent");
    }
    pass("external-consent-blocking");
    await extPage.locator('input[type="checkbox"]').last().check();
    await submitExt.click();
    await extPage.getByRole("button", { name: /명 신청 완료/ }).waitFor({
      timeout: 20_000,
    });
    await extPage.getByRole("button", { name: /명 신청 완료/ }).click();
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
    writeFileSync(qaPath, await workbookToBuffer(qaWb));

    await orgPage.goto(`${BASE}/organizer/events/${eventId}/applications`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("button", { name: "엑셀 일괄 등록" }).click();
    await orgPage.getByRole("heading", { name: /엑셀 일괄 등록/ }).waitFor();
    const samplePath = join(OUT, "sample.xlsx");
    const [download] = await Promise.all([
      orgPage.waitForEvent("download", { timeout: 20_000 }).catch(() => null),
      orgPage.getByRole("button", { name: /샘플 엑셀 다운로드|샘플 엑셀/ }).click(),
    ]);
    if (!download) fail("sample excel download did not start");
    await download.saveAs(samplePath);
    const sampleWb = new ExcelJS.Workbook();
    await sampleWb.xlsx.readFile(samplePath);
    if (!sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_GUIDE)) fail("sample guide sheet missing");
    if (!sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)) fail("sample data sheet missing");
    const sampleData = sampleWb.getWorksheet(APPLICANT_EXCEL_SHEET_DATA)!;
    const headerRow = sampleData.getRow(1);
    const headers = [...APPLICANT_EXCEL_HEADERS].map((_, i) =>
      String(headerRow.getCell(i + 1).value ?? ""),
    );
    for (const need of ["전적", "운동경력", "주민등록번호", "보험가입 개인정보동의"]) {
      if (!headers.includes(need)) fail(`sample missing header ${need}`);
    }
    const example = sampleData.getRow(2);
    const exampleText = [...APPLICANT_EXCEL_HEADERS]
      .map((_, i) => String(example.getCell(i + 1).value ?? ""))
      .join(" ");
    if (!exampleText.includes("3전 2승 1패") || !exampleText.includes("킥복싱 2년")) {
      fail("sample example row missing record/career");
    }
    pass("excel-sample-download");

    await orgPage.locator('input[type="file"]').setInputFiles(qaPath);
    await orgPage.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
    const previewText = await orgPage.locator("body").innerText();
    assertNoPlainInText("excel preview", previewText);
    if (!previewText.includes("3전 2승 1패") || !previewText.includes("킥복싱 2년")) {
      fail("excel preview missing record/career");
    }
    if (!/오류/.test(previewText)) fail("excel missing-consent row not flagged");
    const commitDisabled = await orgPage.getByRole("button", { name: /명 등록/ }).isDisabled();
    if (!commitDisabled) fail("excel commit enabled despite consent error");
    pass("excel-preview-masking-consent-error");

    await orgPage.getByRole("button", { name: "다시 선택" }).click();
    const qaOkWb = new ExcelJS.Workbook();
    const qaOkSheet = qaOkWb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
    qaOkSheet.addRow([...APPLICANT_EXCEL_HEADERS]);
    qaOkSheet.addRow(
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
    qaOkSheet.addRow(
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
    qaOkSheet.addRow(
      excelRow({
        no: "3",
        name: `${ATHLETE_PREFIX}엑셀3`,
        ageGroup: "대학·일반부",
        weightClass: "슈퍼헤비급 +91kg",
        limit: "+91kg",
        rrn: RRN_D,
        consent: "동의",
        record: "1전 1패",
        career: "무에타이 6개월",
      }),
    );
    const qaOkPath = join(OUT, "athletes-ok.xlsx");
    writeFileSync(qaOkPath, await workbookToBuffer(qaOkWb));
    await orgPage.locator('input[type="file"]').setInputFiles(qaOkPath);
    await orgPage.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
    await orgPage.getByRole("button", { name: "3명 등록" }).click();
    await orgPage.getByText(/등록 완료 3명/).waitFor({ timeout: 90_000 });
    const excelApps = await prisma.eventApplication.findMany({
      where: {
        eventId,
        fighter: { name: { in: [`${ATHLETE_PREFIX}엑셀1`, `${ATHLETE_PREFIX}엑셀2`, `${ATHLETE_PREFIX}엑셀3`] } },
      },
      include: { fighter: true },
    });
    if (excelApps.length !== 3) fail(`excel commit count ${excelApps.length} expected 3`);
    const excelDigits: Record<string, string> = {
      [`${ATHLETE_PREFIX}엑셀1`]: RRN_A.replace(/\D/g, ""),
      [`${ATHLETE_PREFIX}엑셀2`]: RRN_C.replace(/\D/g, ""),
      [`${ATHLETE_PREFIX}엑셀3`]: RRN_D.replace(/\D/g, ""),
    };
    for (const app of excelApps) {
      await assertApplicationSecurity(
        app.id,
        excelDigits[app.fighter.name]!,
        "excel_operator_attested",
      );
    }
    pass("excel-commit-3", { count: excelApps.length });

    await orgPage.getByRole("button", { name: "신청자 목록으로 돌아가기" }).click();
    await orgPage.getByRole("button", { name: "엑셀 일괄 등록" }).click();
    await orgPage.getByRole("heading", { name: /엑셀 일괄 등록/ }).waitFor();
    await orgPage.locator('input[type="file"]').setInputFiles(qaOkPath);
    await orgPage.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
    const retryText = await orgPage.locator("body").innerText();
    if (!/이미 등록/.test(retryText)) fail("excel retry missing skip_existing");
    pass("excel-retry-skip-existing");
    await orgPage.getByRole("button", { name: "취소" }).click().catch(() => null);

    if (otherEventId) {
      const crossRes = await orgPage.goto(
        `${BASE}/organizer/events/${otherEventId}/applications`,
        { waitUntil: "domcontentloaded", timeout: 60_000 },
      );
      await orgPage.waitForTimeout(1500);
      const cross = await orgPage.locator("body").innerText();
      assertNoPlainInText("cross-organizer page", cross);
      if (/ATHLETE_PII_QA_/.test(cross)) fail("cross-organizer leaked athlete PII");
      const status = crossRes?.status() ?? 0;
      if (![200, 403, 404].includes(status) && status >= 500) {
        fail(`cross-organizer unexpected ${status}`);
      }
      pass("cross-organizer-scope", { status });
    }

    await orgPage.goto(`${BASE}/organizer/division-templates/new`, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await orgPage.getByRole("heading", { name: "새 체급표 템플릿" }).waitFor({
      timeout: 30_000,
    });
    await orgPage.locator('input[placeholder="킥복싱"]').fill("킥복싱");
    await orgPage.getByRole("button", { name: "엑셀 업로드" }).click();
    try {
      await orgPage.getByRole("heading", { name: /체급표 Excel|체급표 엑셀/ }).waitFor({
        timeout: 20_000,
      });
    } catch {
      await orgPage.screenshot({ path: join(OUT, "weight-excel.png"), fullPage: true });
      fail(
        `weight excel dialog missing: ${(await orgPage.locator("body").innerText()).slice(0, 400)}`,
      );
    }
    if (await orgPage.locator('input[type="file"]:not(.sr-only)').count()) {
      fail("native file input visually exposed");
    }
    const dropzone = orgPage.getByLabel("Excel 파일 업로드");
    await dropzone.waitFor();
    const wcPath = join(OUT, "weight-class.xlsx");
    const wcWb = new ExcelJS.Workbook();
    const wcSheet = wcWb.addWorksheet("체급표");
    wcSheet.addRow(["부문", "성별", "체급명", "체중", "기준", "정렬순서"]);
    wcSheet.addRow(["고등부", "남성", "라이트웰터급", "63.5", "under", "1"]);
    wcSheet.addRow(["대학·일반부", "남성", "슈퍼헤비급", "91", "over", "2"]);
    writeFileSync(wcPath, await workbookToBuffer(wcWb));
    await orgPage.getByRole("dialog").locator('input[type="file"]').setInputFiles(wcPath);
    try {
      await orgPage.getByText(/-63\.5|\+91/).first().waitFor({ timeout: 45_000 });
    } catch {
      await orgPage.screenshot({ path: join(OUT, "weight-preview.png"), fullPage: true });
      fail(
        `weight preview missing: ${(await orgPage.locator("body").innerText()).slice(0, 500)}`,
      );
    }
    const wcText = await orgPage.locator("body").innerText();
    if (!wcText.includes("-63.5") && !/-63\.5/.test(wcText)) fail("weight preview missing -63.5");
    if (!wcText.includes("+91") && !/\+91/.test(wcText)) fail("weight preview missing +91");
    const confirmWc = orgPage.getByRole("button", { name: /신규 행만 반영|반영/ });
    if (await confirmWc.count()) {
      await confirmWc.first().click();
      await orgPage.waitForTimeout(2000);
    }
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
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await gymPage.getByRole("heading", { name: "기본 정보" }).waitFor({
      timeout: 30_000,
    });
    if (await gymPage.locator('input[type="email"], input[name="email"]').count()) {
      fail("create member email field present");
    }
    const payDefault = await gymPage.locator('select[name="paymentMethod"]').inputValue();
    if (payDefault !== "card") fail(`new payment default ${payDefault} != card`);
    await gymPage.locator('input[name="name"]').fill(`${MEMBER_PREFIX}신규`);
    await gymPage.locator('input[type="tel"]').first().fill("010-7333-0001");
    async function setStartAndPlan(start: string, planId: string) {
      const startInput = gymPage.locator('input[name="subscriptionStartedAt"]');
      await startInput.click();
      await startInput.fill(start);
      await gymPage.locator('select[name="planId"]').selectOption(planId);
      for (let i = 0; i < 20; i += 1) {
        const v = await gymPage.locator('input[name="subscriptionEndsAt"]').inputValue();
        if (v) return v;
        await gymPage.waitForTimeout(150);
      }
      const startV = await gymPage.locator('input[name="subscriptionStartedAt"]').inputValue();
      const planV = await gymPage.locator('select[name="planId"]').inputValue();
      const payV = await gymPage.locator('input[name="paymentAmount"]').inputValue();
      fail(
        `end date empty after start=${startV} plan=${planV} pay=${payV} expectedStart=${start} expectedPlan=${planId}`,
      );
    }
    const endsAt = await setStartAndPlan("2026-08-11", plan3m.id);
    if (endsAt !== "2026-11-10") fail(`3-month end ${endsAt} != 2026-11-10`);
    const endsJan1 = await setStartAndPlan("2026-01-01", plan1m.id);
    if (endsJan1 !== "2026-01-31") fail(`Jan1 + 1m end ${endsJan1} != 2026-01-31`);
    const ends1m = await setStartAndPlan("2026-01-31", plan1m.id);
    if (ends1m !== "2026-02-27") fail(`Jan31 + 1m end ${ends1m} != 2026-02-27`);
    const endsLeapJan = await setStartAndPlan("2024-01-31", plan1m.id);
    if (endsLeapJan !== "2024-02-28") fail(`2024-01-31 + 1m ${endsLeapJan} != 2024-02-28`);
    const endsLeapFeb = await setStartAndPlan("2024-02-29", plan1m.id);
    if (endsLeapFeb !== "2024-03-28") fail(`2024-02-29 + 1m ${endsLeapFeb} != 2024-03-28`);
    const endsMar31 = await setStartAndPlan("2026-03-31", plan1m.id);
    if (endsMar31 !== "2026-04-29") fail(`2026-03-31 + 1m ${endsMar31} != 2026-04-29`);
    await setStartAndPlan("2026-08-11", plan3m.id);
    await gymPage.getByRole("button", { name: "회원 등록" }).click();
    try {
      await gymPage.waitForURL(
        (u) =>
          /\/gym\/members\/[^/]+$/.test(u.pathname) &&
          !u.pathname.endsWith("/new") &&
          !u.pathname.endsWith("/edit"),
        { timeout: 60_000 },
      );
    } catch {
      await gymPage.screenshot({ path: join(OUT, "member-create.png"), fullPage: true });
      fail(
        `member create did not navigate: ${gymPage.url()} ${(await gymPage.locator("body").innerText()).slice(0, 400)}`,
      );
    }
    pass("member-create-email-card-enddate", {
      endsAt,
      endsJan1,
      ends1m,
      endsLeapJan,
      endsLeapFeb,
      endsMar31,
    });

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
      const rows = await prisma.gymMember.findMany({
        where: { gymId: gym.id, memberNumber: { startsWith: "M-" } },
        select: { memberNumber: true },
      });
      let n = 0;
      for (const row of rows) {
        const mm = /^M-(\d+)$/.exec(row.memberNumber);
        if (!mm) continue;
        n = Math.max(n, Number(mm[1]));
      }
      return `M-${String(n + 1).padStart(6, "0")}`;
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
    if (!refundText.includes("80,000")) fail(`refund display != 80,000: ${refundText}`);
    pass("payment-crosscheck-refund");
    pass("member-list-pc-columns");

    const qaSubs = await prisma.gymMember.findMany({
      where: { gymId: gym.id, name: { startsWith: MEMBER_PREFIX } },
      include: {
        subscriptions: { orderBy: { startedAt: "desc" }, take: 1 },
      },
    });
    const attStarts = qaSubs
      .filter((m) => m.subscriptions[0]?.startedAt)
      .map((m) => ({
        gymMemberId: m.id,
        startedAt: m.subscriptions[0]!.startedAt,
      }));
    const subIds = qaSubs
      .map((m) => m.subscriptions[0]?.id)
      .filter((id): id is string => Boolean(id));
    const earliest = attStarts.reduce(
      (min, item) => (item.startedAt < min ? item.startedAt : min),
      attStarts[0]!.startedAt,
    );
    queryLog.length = 0;
    await prisma.gymMemberAttendance.findMany({
      where: {
        gymId: gym.id,
        gymMemberId: { in: attStarts.map((i) => i.gymMemberId) },
        deletedAt: null,
        attendanceDate: { gte: earliest },
      },
      select: { gymMemberId: true, attendanceDate: true },
    });
    const attQueryCount = queryLog.length;
    queryLog.length = 0;
    await prisma.gymMemberPayment.findMany({
      where: {
        gymId: gym.id,
        subscriptionId: { in: subIds },
        cancelledAt: null,
        status: {
          in: [GymMemberPaymentStatus.paid, GymMemberPaymentStatus.refunded],
        },
      },
      select: {
        subscriptionId: true,
        amount: true,
        refunds: { where: { cancelledAt: null }, select: { amount: true } },
      },
    });
    const payQueryCount = queryLog.length;
    if (attQueryCount > 2) fail(`attendance N+1 queries=${attQueryCount}`);
    if (payQueryCount > 4) fail(`payment N+1 queries=${payQueryCount}`);
    pass("member-list-n1", { attendanceQueries: attQueryCount, paymentQueries: payQueryCount });

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
    for (const label of ["출석", "결제"]) {
      if (!mobileText.includes(label)) fail(`mobile card missing ${label}`);
    }
    const mOx = await overflowX(mobile);
    if (mOx > 0) fail(`member list mobile overflowX=${mOx}`);
    pass("member-list-mobile", { overflowX: mOx });

    const memBefore = await prisma.gymMember.count({ where: { gymId: gym.id } });
    const subBefore = await prisma.gymMemberSubscription.count({ where: { gymId: gym.id } });
    const payBefore = await prisma.gymMemberPayment.count({ where: { gymId: gym.id } });
    const fighterBefore = await prisma.fighter.count({ where: { currentGymId: gym.id } });

    await gymPage.goto(`${BASE}/gym/members`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    const selfBtn = gymPage.getByRole("button", { name: "셀프등록 링크" }).first();
    await selfBtn.waitFor({ timeout: 30_000 });
    await selfBtn.click();
    const selfDlg = gymPage.getByRole("dialog");
    await selfDlg.waitFor({ timeout: 20_000 });
    const urlEl = selfDlg.locator("p.break-all");
    await urlEl.waitFor({ timeout: 20_000 });
    let selfUrl = (await urlEl.innerText()).trim();
    if (!selfUrl.includes("/gym-register/")) fail(`self-reg url unexpected: ${selfUrl}`);
    pass("self-reg-link");
    await gymPage.keyboard.press("Escape");

    const pub = await browser.newPage({ viewport: { width: 390, height: 844 } });
    attachQuality(pub);
    await pub.goto(selfUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (await pub.locator('input[type="email"], input[name="email"]').count()) {
      fail("self-reg public email field present");
    }
    await pub.getByRole("textbox", { name: "이름 *", exact: true }).fill(`${SELF_PREFIX}성인`);
    await pub.locator("button").filter({ hasText: /^남성$/ }).click();
    await pub.getByRole("textbox", { name: "연락처 *", exact: true }).fill("010-7444-0001");
    await pub.getByLabel("생년월일 *").fill("1998-03-03");
    await pub.getByRole("button", { name: "다음" }).click();
    const nos = pub.getByRole("button", { name: "아니오" });
    const n = await nos.count();
    if (n < 4) fail(`health 아니오 buttons ${n} < 4`);
    for (let i = 0; i < 4; i += 1) await nos.nth(i).click();
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

    await gymPage.goto(`${BASE}/gym/members`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    await gymPage.getByRole("button", { name: "엑셀 회원 업로드" }).click();
    await gymPage.getByRole("heading", { name: "엑셀 회원 업로드" }).waitFor();
    const memberImportWb = new ExcelJS.Workbook();
    const memberImportSheet = memberImportWb.addWorksheet("회원");
    memberImportSheet.addRow(["회원명", "연락처", "회원권"]);
    memberImportSheet.addRow([`${MEMBER_PREFIX}엑셀분석`, "01075550001", plan3m.name]);
    const memberImportPath = join(OUT, "members-import.xlsx");
    writeFileSync(memberImportPath, await workbookToBuffer(memberImportWb));
    await gymPage.locator('input[type="file"]').setInputFiles(memberImportPath);
    await gymPage.getByText(/행/).first().waitFor({ timeout: 45_000 });
    pass("member-excel-analyze");
    await gymPage.keyboard.press("Escape");

    const attBeforeSmoke = await prisma.gymMemberAttendance.count({
      where: { gymMemberId: attMember.id, deletedAt: null },
    });
    await gymPage.goto(`${BASE}/gym/attendance`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await gymPage.getByRole("button", { name: "수동 출석 등록" }).click();
    await gymPage.getByPlaceholder("회원명·번호 검색").fill(`${MEMBER_PREFIX}출석`);
    await gymPage.locator("button", { hasText: `${MEMBER_PREFIX}출석` }).click();
    await gymPage.getByRole("button", { name: "저장" }).click();
    await gymPage.waitForTimeout(2500);
    const attAfterSmoke = await prisma.gymMemberAttendance.count({
      where: { gymMemberId: attMember.id, deletedAt: null },
    });
    if (attAfterSmoke !== attBeforeSmoke + 1) {
      fail(`attendance smoke delta ${attAfterSmoke - attBeforeSmoke}`);
    }
    pass("attendance-real-smoke", { before: attBeforeSmoke, after: attAfterSmoke });

    await gymPage.goto(`${BASE}/gym/attendance/kiosks`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await gymPage.getByRole("heading", { name: /출석 키오스크/ }).waitFor();
    pass("kiosk-page");

    await orgPage.goto(`${BASE}/organizer/events/${eventId}/check-in`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("heading", { name: /계체/ }).waitFor();
    pass("weigh-in-access");
    await orgPage.goto(`${BASE}/organizer/events/${eventId}/brackets`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("heading", { name: /대진/ }).waitFor();
    pass("bracket-access");
    await orgPage.goto(`${BASE}/organizer/events/${eventId}/results`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await orgPage.getByRole("heading", { name: /결과/ }).waitFor().catch(async () => {
      await orgPage.getByText(/결과/).first().waitFor();
    });
    pass("result-access");

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
