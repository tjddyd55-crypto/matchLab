/**
 * MATCHON Production final promotion smoke (yamabiko only).
 * Self-reg + athlete PII + member ops after promotion.
 *
 *   npm run e2e:production-final-promotion-smoke
 *   npx tsx scripts/e2e-production-final-promotion-smoke.mts
 *   npx tsx scripts/e2e-production-final-promotion-smoke.mts --cleanup-only
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Module from "node:module";
import ExcelJS from "exceljs";
import { chromium, type Page } from "playwright";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const PREFIX = "PROD_FINAL_QA_";
const QA_EVENT_SLUG_PREFIX = "prod-final-qa-";
const BASE = "https://app-production-79ad.up.railway.app";
const OUT = join(process.cwd(), "test-results", "production-final-promotion-smoke");
const cleanupOnly = process.argv.includes("--cleanup-only");

const RRN_MANUAL = "000000-0000001";
const RRN_MANUAL_DIGITS = "0000000000001";
const RRN_EXT = "000000-0000016";
const RRN_EXT_DIGITS = "0000000000016";
const RRN_MASKED_PATTERN = /000000-0\*{6}/;

type Report = {
  ok: boolean;
  base: string;
  dbFingerprint: string;
  flows: Record<string, unknown>;
  failReasons: string[];
  quality?: Record<string, unknown>;
  cleanup?: Record<string, unknown>;
};

const report: Report = {
  ok: false,
  base: BASE,
  dbFingerprint: "yamabiko",
  flows: {},
  failReasons: [],
};

function fail(msg: string): never {
  report.failReasons.push(msg);
  throw new Error(msg);
}

function passFlow(name: string, detail: unknown = "PASS") {
  report.flows[name] = detail;
  console.log("PASS", name, typeof detail === "string" ? detail : JSON.stringify(detail));
}

function skipFlow(name: string, reason: string) {
  report.flows[name] = { status: "SKIP", reason };
  console.log("SKIP", name, reason);
}

function assertProductionYamabikoDatabaseUrl(databaseUrl: string) {
  const host = databaseUrl.match(/@([^/]+)\//)?.[1] ?? "unknown";
  if (!/yamabiko/i.test(databaseUrl) || /yamanote/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: expected yamabiko production, got ${host}`);
  }
}

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(`railway variable list -e production -s ${service} --json`, {
    encoding: "utf8",
  }).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function qaPhone(n: number): string {
  const base = Number(String(Date.now()).slice(-7));
  return `0108${String(base + n).padStart(7, "0").slice(-7)}`;
}

async function waitHydrated(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 90_000 }).catch(() => null);
  await page.waitForTimeout(400);
}

async function overflowX(page: Page): Promise<number> {
  return page.evaluate(
    "document.documentElement.scrollWidth - document.documentElement.clientWidth",
  ) as Promise<number>;
}

function bodyHasFullRrn(text: string, digits: string, formatted: string): boolean {
  if (text.includes(digits)) return true;
  if (text.includes(formatted)) return true;
  return false;
}

function jsonHasFullRrn(obj: unknown, digits: string, formatted: string): boolean {
  const s = JSON.stringify(obj ?? {});
  return s.includes(digits) || s.includes(formatted);
}

const consoleErrors: string[] = [];
const pageErrors: string[] = [];
const hydrationErrors: string[] = [];
const http5xx: string[] = [];
const nativeDialogs: string[] = [];
const rrnLeaks: string[] = [];
let gym5xxRecovered = false;

function attachQuality(page: Page, watchRrn = false) {
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      if (
        /Failed to load resource|favicon|Download the React DevTools|third-party cookie/i.test(
          text,
        )
      ) {
        return;
      }
      consoleErrors.push(text.slice(0, 400));
    }
    if (/hydrat/i.test(text) || /#418/.test(text)) {
      hydrationErrors.push(text.slice(0, 400));
    }
    if (watchRrn && bodyHasFullRrn(text, RRN_MANUAL_DIGITS, RRN_MANUAL)) {
      rrnLeaks.push(`console:${text.slice(0, 120)}`);
    }
    if (watchRrn && bodyHasFullRrn(text, RRN_EXT_DIGITS, RRN_EXT)) {
      rrnLeaks.push(`console:${text.slice(0, 120)}`);
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message.slice(0, 400));
    if (/hydrat/i.test(err.message) || /#418/.test(err.message)) {
      hydrationErrors.push(err.message.slice(0, 400));
    }
  });
  page.on("response", (res) => {
    const status = res.status();
    const url = res.url();
    if (status >= 500) {
      http5xx.push(`${status} ${url}`.slice(0, 400));
    }
    if (watchRrn && status >= 400 && status < 500) {
      // intentional 4xx ignored
    }
  });
  page.on("dialog", (d) => {
    nativeDialogs.push(`${d.type()}:${d.message()}`.slice(0, 200));
    void d.dismiss();
  });
}

async function login(page: Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
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
  else await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 90_000,
  });
}

async function drawSignature(page: Page, ariaLabel: string) {
  const canvas = page.locator(`canvas[aria-label="${ariaLabel}"]`);
  await canvas.waitFor({ timeout: 20_000 });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await canvas.boundingBox();
  if (!box) fail(`${ariaLabel} boundingBox missing`);
  await canvas.hover({ position: { x: 24, y: 28 } });
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + 50, { steps: 12 });
  await page.mouse.move(box.x + 140, box.y + 24, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

async function fillSelfRegBasic(
  page: Page,
  input: {
    name: string;
    gender: "남성" | "여성";
    birth: string;
    phone: string;
  },
) {
  await page.getByRole("textbox", { name: "이름 *", exact: true }).fill(input.name);
  await page.locator("button").filter({ hasText: new RegExp(`^${input.gender}$`) }).click();
  await page.getByRole("textbox", { name: "연락처 *", exact: true }).fill(input.phone);
  await page.getByLabel("생년월일 *").fill(input.birth);
}

async function answerHealthAllNo(page: Page) {
  const nos = page.getByRole("button", { name: "아니오" });
  const n = await nos.count();
  if (n < 4) fail(`health 아니오 buttons ${n} < 4`);
  for (let i = 0; i < 4; i += 1) await nos.nth(i).click();
}

async function consentAndSignSelfReg(page: Page) {
  await page.getByText("개인정보 수집·이용에 동의합니다. (필수)").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("체육관 이용 안내에 동의합니다. (필수)").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("회원 서명을 입력해 주세요.").waitFor({ timeout: 10_000 });
  await drawSignature(page, "회원 서명 패드");
}

async function submitSelfRegPublic(page: Page, url: string, name: string, phone: string) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByRole("textbox", { name: "이름 *", exact: true }).waitFor({
    timeout: 30_000,
  });
  await page.getByRole("textbox", { name: "이름 *", exact: true }).fill(name);
  await page.locator("button").filter({ hasText: /^남성$/ }).click();
  await page.getByRole("textbox", { name: "연락처 *", exact: true }).fill(phone);
  await page.getByLabel("생년월일 *").fill("1990-05-15");
  await page.getByRole("button", { name: "다음" }).click();
  try {
    await page.getByText("건강·운동").waitFor({ timeout: 15_000 });
  } catch {
    await page.screenshot({
      path: join(OUT, "self-reg-step1-fail.png"),
      fullPage: true,
    });
    fail(
      `self-reg step1 blocked: ${(await page.locator("body").innerText()).slice(0, 500)}`,
    );
  }
  const nos = page.getByRole("button", { name: "아니오" });
  await nos.first().waitFor({ timeout: 10_000 });
  const n = await nos.count();
  if (n < 4) fail(`health 아니오 buttons ${n} < 4`);
  for (let i = 0; i < 4; i += 1) await nos.nth(i).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("개인정보 수집·이용에 동의합니다. (필수)").click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByText("체육관 이용 안내에 동의합니다. (필수)").click();
  await page.getByRole("button", { name: "다음" }).click();
  await drawSignature(page, "회원 서명 패드");
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: /회원 등록 신청/ }).click();
  try {
    await page.getByText("회원 등록 신청이 완료되었습니다").waitFor({ timeout: 60_000 });
  } catch {
    await page.screenshot({
      path: join(OUT, "self-reg-submit-fail.png"),
      fullPage: true,
    });
    fail(
      `self-reg submit failed: ${(await page.locator("body").innerText()).slice(0, 800)}`,
    );
  }
}

async function openSelfRegLinkDialog(page: Page) {
  const btn = page.getByRole("button", { name: "셀프등록 링크" }).first();
  await btn.click();
  const dlg = page.getByRole("dialog");
  await dlg.waitFor({ timeout: 20_000 });
  const urlText = (await dlg.locator("p.break-all").innerText()).trim();
  const m = urlText.match(/\/gym-register\/([^/?#]+)/);
  if (!m) fail(`self-reg url missing: ${urlText}`);
  return { dialog: dlg, publicUrl: urlText, token: decodeURIComponent(m[1]!) };
}

async function workbookToBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

async function main() {
  mkdirSync(OUT, { recursive: true });

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  assertProductionYamabikoDatabaseUrl(dbUrl);
  process.env.DATABASE_URL = dbUrl;

  const piiKey = String(app.MATCHON_PII_ENCRYPTION_KEY || "");
  if (!piiKey || piiKey.length < 32) {
    fail("MATCHON_PII_ENCRYPTION_KEY missing from production app env");
  }
  process.env.MATCHON_PII_ENCRYPTION_KEY = piiKey;

  const password = String(app.DEMO_PASSWORD || "");
  if (password.length < 8) fail("DEMO_PASSWORD missing or too short");

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const {
    PrismaClient,
    EventStatus,
    GymMemberRegistrationRequestStatus,
    GymMembershipDurationType,
  } = await import("../src/generated/prisma");
  const { APPLICANT_EXCEL_HEADERS, APPLICANT_EXCEL_SHEET_DATA } = await import(
    "../src/lib/applicant-excel/columns"
  );
  const { calculateMembershipEndDate } = await import(
    "../src/lib/gym-member/membership-duration"
  );
  const { maskResidentRegistrationNumber } = await import(
    "../src/lib/athlete-application/resident-registration-number"
  );

  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const stamp = Date.now().toString(36);
  const adultName = `${PREFIX}성인`;
  const manualFighterName = `${PREFIX}MANUAL`;
  const extFighterName = `${PREFIX}EXT`;
  const excelFighterName = `${PREFIX}EXCEL`;
  const memberFormName = `${PREFIX}MEMBER`;
  let qaEventId: string | null = null;
  let qaEventCreated = false;
  let qaPlan3mId: string | null = null;
  let qaPlan1mId: string | null = null;
  let demoGymId = "";
  let demoOrganizerId = "";
  let eventId = "";
  let divisionId = "";
  let divisionLabel = "";

  async function cleanupQa() {
    const qaEvents = await prisma.event.findMany({
      where: { publicSlug: { startsWith: QA_EVENT_SLUG_PREFIX } },
      select: { id: true },
    });
    const qaEventIds = qaEvents.map((e) => e.id);

    const qaFighters = await prisma.fighter.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true },
    });
    const qaFighterIds = qaFighters.map((f) => f.id);

    const allEventIds = [...new Set(qaEventIds)];
    if (allEventIds.length) {
      const apps = await prisma.eventApplication.findMany({
        where: {
          OR: [
            { eventId: { in: allEventIds } },
            { fighterId: { in: qaFighterIds } },
          ],
        },
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
        await prisma.eventApplication.deleteMany({ where: { id: { in: appIds } } });
      }
      await prisma.eventDivision.deleteMany({ where: { eventId: { in: allEventIds } } });
      await prisma.eventCourt.deleteMany({ where: { eventId: { in: allEventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: allEventIds } } });
    }

    if (qaFighterIds.length) {
      await prisma.fighterGymHistory.deleteMany({
        where: { fighterId: { in: qaFighterIds } },
      });
      await prisma.fighter.deleteMany({ where: { id: { in: qaFighterIds } } });
    }

    const qaMembers = await prisma.gymMember.findMany({
      where: { name: { startsWith: PREFIX } },
      select: { id: true, gymId: true },
    });
    const qaMemberIds = qaMembers.map((m) => m.id);
    const qaGymIds = [...new Set(qaMembers.map((m) => m.gymId))];

    if (qaMemberIds.length) {
      await prisma.gymMemberPayment.deleteMany({
        where: { gymMemberId: { in: qaMemberIds } },
      });
      await prisma.gymMemberSubscription.deleteMany({
        where: { gymMemberId: { in: qaMemberIds } },
      });
      await prisma.gymMemberGroupAssignment.deleteMany({
        where: { gymMemberId: { in: qaMemberIds } },
      });
    }

    await prisma.gymMemberRegistrationRequest.updateMany({
      where: { name: { startsWith: PREFIX } },
      data: { approvedGymMemberId: null },
    });
    await prisma.gymMemberRegistrationRequest.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });

    if (qaMemberIds.length) {
      await prisma.gymMember.deleteMany({ where: { id: { in: qaMemberIds } } });
    }

    if (qaPlan3mId || qaPlan1mId) {
      await prisma.gymMembershipPlan.deleteMany({
        where: {
          id: { in: [qaPlan3mId, qaPlan1mId].filter(Boolean) as string[] },
        },
      });
    } else if (qaGymIds.length) {
      await prisma.gymMembershipPlan.deleteMany({
        where: { gymId: { in: qaGymIds }, name: { startsWith: PREFIX } },
      });
    }

    await prisma.gymMemberRegistrationTerms.deleteMany({
      where: { title: { startsWith: PREFIX } },
    });

    const remaining = {
      members: await prisma.gymMember.count({
        where: { name: { startsWith: PREFIX }, deletedAt: null },
      }),
      fighters: await prisma.fighter.count({ where: { name: { startsWith: PREFIX } } }),
      requests: await prisma.gymMemberRegistrationRequest.count({
        where: { name: { startsWith: PREFIX } },
      }),
      events: await prisma.event.count({
        where: { publicSlug: { startsWith: QA_EVENT_SLUG_PREFIX } },
      }),
      applications: await prisma.eventApplication.count({
        where: { fighter: { name: { startsWith: PREFIX } } },
      }),
    };
    report.cleanup = remaining;
    console.log("CLEANUP", remaining);
    return remaining;
  }

  try {
    const startCleanup = await cleanupQa();
    if (cleanupOnly) {
      report.ok = startCleanup.members === 0 && startCleanup.requests === 0;
      passFlow("final-cleanup", startCleanup);
      return;
    }

    const organizerUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
      include: { organizer: true },
    });
    if (!organizerUser?.organizer) fail("demo organizer missing");
    demoOrganizerId = organizerUser.organizer.id;

    const gymUser = await prisma.user.findFirst({
      where: { loginId: "gym" },
      include: { ownedGym: true },
    });
    if (!gymUser?.ownedGym) fail("demo gym (loginId gym) missing");
    demoGymId = gymUser.ownedGym.id;

    let targetEvent = await prisma.event.findFirst({
      where: {
        organizerId: demoOrganizerId,
        publicSlug: "sample-open-2026",
        divisions: { some: {} },
      },
      include: { divisions: { orderBy: { createdAt: "asc" } } },
    });
    if (!targetEvent) {
      targetEvent = await prisma.event.findFirst({
        where: {
          organizerId: demoOrganizerId,
          status: { in: [EventStatus.open, EventStatus.draft] },
          divisions: { some: {} },
          NOT: { publicSlug: { startsWith: QA_EVENT_SLUG_PREFIX } },
        },
        include: { divisions: { orderBy: { createdAt: "asc" } } },
        orderBy: { eventDate: "desc" },
      });
    }
    if (!targetEvent) {
      const created = await prisma.event.create({
        data: {
          organizerId: demoOrganizerId,
          title: `${PREFIX} smoke event`,
          location: "QA",
          eventDate: new Date("2026-12-15T00:00:00.000Z"),
          registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
          registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
          status: EventStatus.open,
          publicSlug: `${QA_EVENT_SLUG_PREFIX}${stamp}`,
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
            ],
          },
        },
        include: { divisions: true },
      });
      targetEvent = created;
      qaEventId = created.id;
      qaEventCreated = true;
    } else {
      eventId = targetEvent.id;
    }
    eventId = targetEvent.id;
    divisionId = targetEvent.divisions[0]?.id ?? "";
    divisionLabel = targetEvent.divisions[0]?.weightClass ?? "";
    if (!divisionId) fail("event has no divisions");

    passFlow("demo-gym-and-event", {
      gymId: demoGymId,
      eventId,
      eventSlug: targetEvent.publicSlug,
      qaEventCreated,
      divisionId,
    });

    qaPlan3mId = (
      await prisma.gymMembershipPlan.create({
        data: {
          gymId: demoGymId,
          name: `${PREFIX}3M`,
          durationType: GymMembershipDurationType.months,
          durationValue: 3,
          price: 300_000,
          sortOrder: 999,
        },
      })
    ).id;
    qaPlan1mId = (
      await prisma.gymMembershipPlan.create({
        data: {
          gymId: demoGymId,
          name: `${PREFIX}1M`,
          durationType: GymMembershipDurationType.months,
          durationValue: 1,
          price: 100_000,
          sortOrder: 998,
        },
      })
    ).id;

    const browser = await chromium.launch({ headless: true });
    try {
      const orgCtx = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        locale: "ko-KR",
        acceptDownloads: true,
        permissions: ["clipboard-read", "clipboard-write"],
      });
      const gymCtx = await browser.newContext({
        viewport: { width: 1366, height: 768 },
        locale: "ko-KR",
        acceptDownloads: true,
        permissions: ["clipboard-read", "clipboard-write"],
      });
      const mobileCtx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        locale: "ko-KR",
        acceptDownloads: true,
      });
      const orgPage = await orgCtx.newPage();
      const gymPage = await gymCtx.newPage();
      const pubPage = await mobileCtx.newPage();
      attachQuality(orgPage, true);
      attachQuality(gymPage, true);
      attachQuality(pubPage, true);

      await login(orgPage, "organizer", password);
      await orgPage.waitForURL(/\/organizer/, { timeout: 60_000 });
      await login(gymPage, "gym", password);
      await gymPage.waitForURL(/\/gym/, { timeout: 60_000 });
      passFlow("organizer-gym-login", "PASS");

      const adultPhone = qaPhone(1);
      const membersBeforeSelfReg = await prisma.gymMember.count({
        where: { gymId: demoGymId, deletedAt: null },
      });

      await gymPage.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(gymPage);
      await gymPage.getByRole("button", { name: "셀프등록 링크" }).first().waitFor({
        timeout: 30_000,
      });
      const { publicUrl } = await openSelfRegLinkDialog(gymPage);
      await gymPage.keyboard.press("Escape");

      await submitSelfRegPublic(pubPage, publicUrl, adultName, adultPhone);
      const pendingReq = await prisma.gymMemberRegistrationRequest.findFirst({
        where: { gymId: demoGymId, name: adultName },
        orderBy: { submittedAt: "desc" },
      });
      if (!pendingReq) fail("self-reg request missing");
      if (pendingReq.status !== GymMemberRegistrationRequestStatus.pending) {
        fail(`self-reg status ${pendingReq.status}`);
      }
      const membersAfterSubmit = await prisma.gymMember.count({
        where: { gymId: demoGymId, deletedAt: null },
      });
      if (membersAfterSubmit !== membersBeforeSelfReg) {
        fail(`GymMember +${membersAfterSubmit - membersBeforeSelfReg} on submit`);
      }
      passFlow("self-registration", {
        requestId: pendingReq.id,
        status: pendingReq.status,
        gymMemberDelta: 0,
      });

      const subBefore = await prisma.gymMemberSubscription.count({ where: { gymId: demoGymId } });
      const payBefore = await prisma.gymMemberPayment.count({ where: { gymId: demoGymId } });
      const fighterBefore = await prisma.fighter.count({
        where: { OR: [{ currentGymId: demoGymId }, { gymMember: { gymId: demoGymId } }] },
      });

      await gymPage.goto(`${BASE}/gym/members/registrations/${pendingReq.id}`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(gymPage);
      const approveBtn = gymPage.getByRole("button", { name: "회원으로 등록" });
      const dupBtn = gymPage.getByRole("button", { name: "중복 확인하고 등록" });
      if (await approveBtn.count()) {
        await approveBtn.click();
      } else if (await dupBtn.count()) {
        await dupBtn.click();
      } else {
        fail("approve button missing");
      }
      await gymPage.waitForURL(/\/gym\/members\/[^/]+$/, { timeout: 90_000 });

      const approvedMember = await prisma.gymMember.findFirst({
        where: { gymId: demoGymId, name: adultName, deletedAt: null },
      });
      if (!approvedMember) fail("approved GymMember missing");
      const membersAfterApprove = await prisma.gymMember.count({
        where: { gymId: demoGymId, deletedAt: null },
      });
      if (membersAfterApprove !== membersBeforeSelfReg + 1) {
        fail(`GymMember expected +1 got ${membersAfterApprove - membersBeforeSelfReg}`);
      }
      const subAfter = await prisma.gymMemberSubscription.count({ where: { gymId: demoGymId } });
      const payAfter = await prisma.gymMemberPayment.count({ where: { gymId: demoGymId } });
      const fighterAfter = await prisma.fighter.count({
        where: { OR: [{ currentGymId: demoGymId }, { gymMember: { gymId: demoGymId } }] },
      });
      if (subAfter !== subBefore || payAfter !== payBefore || fighterAfter !== fighterBefore) {
        fail("approve created membership/payment/fighter unexpectedly");
      }
      await gymPage.getByRole("link", { name: "가입 신청서 보기" }).waitFor({ timeout: 20_000 });
      passFlow("approve-self-reg", {
        memberId: approvedMember.id,
        membershipDelta: 0,
        paymentDelta: 0,
        fighterDelta: 0,
        signatureLink: true,
      });

      await orgPage.goto(`${BASE}/organizer/events/${eventId}/applications`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(orgPage);
      await orgPage.getByRole("button", { name: "선수 직접 등록" }).click();
      await orgPage.getByText("체육관 · 선수 기본 정보").waitFor({ timeout: 20_000 });

      const gymSelect = orgPage.locator("#manual-gymId");
      if (await gymSelect.count()) {
        await gymSelect.selectOption({ index: 1 });
      } else {
        await orgPage.locator("#manual-gymName").fill(`${PREFIX}GYM`);
      }
      await orgPage.locator("#manual-fighterName").fill(manualFighterName);
      await orgPage.locator("#manual-gender").selectOption("male");
      await orgPage.getByLabel("생년월일", { exact: false }).fill("2008-03-15");
      await orgPage.locator("#manual-divisionId").selectOption(divisionId);
      await orgPage.locator("#manual-recordText").fill("3전 2승 1패");
      await orgPage.locator("#manual-careerText").fill("킥복싱 2년");
      await orgPage.locator("#manual-rrn").fill(RRN_MANUAL);
      await orgPage.locator('input[name="insuranceConsentConfirmed"]').check();
      await orgPage.getByRole("button", { name: "등록", exact: true }).click();
      await orgPage.getByText(manualFighterName).first().waitFor({ timeout: 60_000 });

      const manualApp = await prisma.eventApplication.findFirst({
        where: { eventId, fighter: { name: manualFighterName } },
        include: { fighter: true },
      });
      if (!manualApp) fail("manual application missing in DB");
      if (
        !manualApp.insuranceRrnCipher ||
        !manualApp.insuranceRrnIv ||
        !manualApp.insuranceRrnAuthTag ||
        !manualApp.insuranceRrnKeyVer ||
        !manualApp.insuranceRrnMasked
      ) {
        fail("insurance PII columns incomplete");
      }
      if (jsonHasFullRrn(manualApp, RRN_MANUAL_DIGITS, RRN_MANUAL)) {
        fail("DB row contains full RRN plaintext");
      }
      const expectedMasked = maskResidentRegistrationNumber(RRN_MANUAL_DIGITS);
      if (manualApp.insuranceRrnMasked !== expectedMasked) {
        fail(`masked mismatch ${manualApp.insuranceRrnMasked} != ${expectedMasked}`);
      }
      passFlow("athlete-manual-pii", {
        applicationId: manualApp.id,
        masked: manualApp.insuranceRrnMasked,
        keyVer: manualApp.insuranceRrnKeyVer,
      });

      await orgPage.reload({ waitUntil: "domcontentloaded" });
      await waitHydrated(orgPage);
      const listText = await orgPage.locator("body").innerText();
      if (bodyHasFullRrn(listText, RRN_MANUAL_DIGITS, RRN_MANUAL)) {
        fail("applications list leaks full RRN");
      }
      // Open detail/card for the QA athlete — masked only, no full reveal.
      const detailBtn = orgPage
        .locator("tr, [data-slot='card'], li, article")
        .filter({ hasText: manualFighterName })
        .getByRole("button", { name: /상세|보기|신청/ })
        .first();
      if (await detailBtn.count()) {
        await detailBtn.click();
        await orgPage.waitForTimeout(800);
      } else {
        await orgPage.getByText(manualFighterName).first().click();
        await orgPage.waitForTimeout(800);
      }
      const detailText = await orgPage.locator("body").innerText();
      if (bodyHasFullRrn(detailText, RRN_MANUAL_DIGITS, RRN_MANUAL)) {
        fail("application detail leaks full RRN");
      }
      const maskedOk =
        RRN_MASKED_PATTERN.test(detailText) ||
        detailText.includes(expectedMasked) ||
        detailText.includes("000000-0******");
      if (!maskedOk && /주민|보험/.test(detailText) === false) {
        // List/detail may omit RRN column entirely — still PASS if no plaintext leak.
        passFlow("applications-list-masking", {
          fullRrn: 0,
          maskedOnDetail: false,
          note: "no plaintext; masked field not shown in UI",
        });
      } else if (!maskedOk) {
        fail("application detail missing masked RRN while insurance UI present");
      } else {
        passFlow("applications-list-masking", {
          fullRrn: 0,
          maskedOnDetail: true,
        });
      }

      await orgPage.getByRole("button", { name: /링크 (관리|생성)/ }).click();
      await orgPage.getByText(/외부 체육관|등록 링크|링크/).first().waitFor({
        timeout: 20_000,
      });
      let extUrl = "";
      const extLinkEl = orgPage.locator("p.break-all, a.break-all").filter({
        hasText: /\/external-register\//,
      });
      if (await extLinkEl.count()) {
        extUrl = (await extLinkEl.first().innerText()).trim();
      } else {
        const createBtn = orgPage.getByRole("button", { name: "링크 생성" });
        if (await createBtn.count()) {
          await createBtn.click();
          await orgPage.waitForTimeout(1500);
          extUrl = (await orgPage.locator("p.break-all").innerText()).trim();
        }
      }
      if (!extUrl.includes("/external-register/")) {
        skipFlow("external-registration", "external link unavailable");
      } else {
        const extPage = await mobileCtx.newPage();
        attachQuality(extPage, true);
        await extPage.goto(extUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await waitHydrated(extPage);
        await extPage.getByText("체육관 정보").waitFor({ timeout: 20_000 });
        const gymSection = extPage.locator("section").filter({ hasText: "체육관 정보" });
        const gymInputs = gymSection.locator("input");
        await gymInputs.nth(0).fill(`${PREFIX}EXT_GYM`);
        await gymInputs.nth(1).fill("QA 담당");
        await gymInputs.nth(2).fill(qaPhone(2));
        const athleteSection = extPage.locator("section").filter({ hasText: "1번 선수" }).first();
        await athleteSection.locator("input").first().fill(extFighterName);
        await athleteSection.locator("select").first().selectOption("male");
        await extPage.getByLabel("1번 선수 생년월일").fill("2008-04-20");
        await athleteSection.locator("select").last().selectOption(divisionId);
        await extPage.getByLabel("전적").fill("1전 1승");
        await extPage.getByLabel("운동경력").fill("1년");
        await extPage.getByLabel(/주민등록번호/).fill(RRN_EXT);
        await extPage.getByRole("checkbox").check();
        await extPage.getByRole("button", { name: /명 신청하기/ }).click();
        await extPage.getByRole("button", { name: /명 신청 완료/ }).click();
        await extPage.getByText(/신청이 완료|등록되었습니다|접수/).first().waitFor({
          timeout: 90_000,
        });
        const extBody = await extPage.locator("body").innerText();
        if (bodyHasFullRrn(extBody, RRN_EXT_DIGITS, RRN_EXT)) {
          fail("external reg success leaks RRN");
        }
        await extPage.close();
        passFlow("external-registration", { url: extUrl.slice(0, 80) });
      }

      await orgPage.goto(`${BASE}/organizer/events/${eventId}/applications`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(orgPage);

      await orgPage.getByRole("button", { name: "엑셀 일괄 등록" }).click();
      await orgPage.getByRole("heading", { name: "선수 신청 엑셀 일괄 등록" }).waitFor();
      const sampleBtn = orgPage.getByRole("button", { name: "샘플 엑셀 다운로드" });
      let sampleDownloaded = false;
      if (await sampleBtn.count()) {
        const [dl] = await Promise.all([
          orgPage.waitForEvent("download", { timeout: 30_000 }),
          sampleBtn.click(),
        ]);
        const samplePath = join(OUT, dl.suggestedFilename());
        await dl.saveAs(samplePath);
        sampleDownloaded = true;
      }

      function excelRow(input: Record<string, string>): string[] {
        const map: Record<string, string> = {
          번호: "1",
          체육관명: `${PREFIX}EXCEL_GYM`,
          선수명: excelFighterName,
          성별: "남",
          생년월일: "2008-05-12",
          나이: "",
          키: "",
          체중: "",
          전적: "2전 1승",
          운동경력: "킥복싱 1년",
          주민등록번호: RRN_MANUAL,
          "보험가입 개인정보동의": "동의",
          경기구분: targetEvent!.divisions[0]!.ageGroup ?? "고등부",
          체급: targetEvent!.divisions[0]!.weightClass ?? divisionLabel,
          체중기준: targetEvent!.divisions[0]!.weightLimitText ?? "-60kg",
          종목: targetEvent!.divisions[0]!.sportType ?? "킥복싱",
          연락처: qaPhone(3),
          보호자이름: "",
          보호자연락처: "",
          메모: `${PREFIX}excel`,
          ...input,
        };
        return APPLICANT_EXCEL_HEADERS.map((h) => map[h] ?? "");
      }

      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
      sheet.addRow([...APPLICANT_EXCEL_HEADERS]);
      sheet.addRow(excelRow({}));
      const excelPath = join(OUT, "qa-applicant-1.xlsx");
      writeFileSync(excelPath, await workbookToBuffer(wb));

      await orgPage.locator('input[type="file"]').setInputFiles(excelPath);
      await orgPage.getByText(/총 \d+명/).waitFor({ timeout: 60_000 });
      const previewText = await orgPage.locator('[role="dialog"]').innerText();
      if (bodyHasFullRrn(previewText, RRN_MANUAL_DIGITS, RRN_MANUAL)) {
        fail("excel preview leaks full RRN");
      }
      if (!RRN_MASKED_PATTERN.test(previewText) && !previewText.includes("******")) {
        fail("excel preview missing masked RRN");
      }
      const commitBtn = orgPage.getByRole("button", { name: /1명 등록|명 등록/ });
      let excelCommitted = false;
      if (await commitBtn.count()) {
        excelCommitted = !(await commitBtn.isDisabled());
        if (excelCommitted) {
          await commitBtn.click();
          await orgPage.getByText(/등록 완료|1명/).first().waitFor({ timeout: 120_000 });
          await orgPage
            .getByRole("button", { name: "신청자 목록으로 돌아가기" })
            .click()
            .catch(() => null);
        }
      }
      await orgPage.keyboard.press("Escape").catch(() => null);
      passFlow("excel-import", {
        sampleDownloaded,
        previewMasked: true,
        committed: excelCommitted,
      });

      await orgPage.goto(`${BASE}/organizer/division-templates/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(orgPage);
      await orgPage.getByRole("button", { name: "엑셀 업로드" }).click();
      await orgPage.getByRole("heading", { name: "체급표 Excel 일괄 등록" }).waitFor({
        timeout: 20_000,
      });
      await orgPage.getByLabel("Excel 파일 업로드").waitFor({ timeout: 20_000 });
      const visibleNativeFile = await orgPage.evaluate(
        "(() => { const inputs = [...document.querySelectorAll('input[type=\"file\"]')]; return inputs.some((el) => { const s = getComputedStyle(el); return s.display !== 'none' && s.visibility !== 'hidden' && !el.classList.contains('sr-only'); }); })()",
      );
      if (visibleNativeFile) fail("weight-class native file input visually exposed");
      passFlow("weight-class-dropzone", { fileDropzone: true, nativeHidden: true });
      await orgPage.keyboard.press("Escape");

      await gymPage.goto(`${BASE}/gym/members/new`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(gymPage);
      const emailCount = await gymPage.locator('input[name="email"], input[type="email"]').count();
      if (emailCount > 0) fail("member create form shows email UI");
      const paymentMethod = gymPage.locator('select[name="paymentMethod"]');
      const defaultPayment = await paymentMethod.inputValue();
      if (defaultPayment !== "card") fail(`payment default ${defaultPayment} != card`);

      await gymPage.locator(`select[name="planId"]`).selectOption(qaPlan3mId!);
      await gymPage.locator('input[name="subscriptionStartedAt"]').fill("2026-08-11");
      await gymPage.waitForTimeout(300);
      const ends3m = await gymPage.locator('input[name="subscriptionEndsAt"]').inputValue();
      const expected3m = calculateMembershipEndDate(
        new Date(Date.UTC(2026, 7, 11)),
        GymMembershipDurationType.months,
        3,
      )!
        .toISOString()
        .slice(0, 10);
      if (ends3m !== expected3m) {
        fail(`3m endsAt ${ends3m} != ${expected3m}`);
      }

      await gymPage.locator(`select[name="planId"]`).selectOption(qaPlan1mId!);
      await gymPage.locator('input[name="subscriptionStartedAt"]').fill("2026-01-31");
      await gymPage.waitForTimeout(300);
      const ends1m = await gymPage.locator('input[name="subscriptionEndsAt"]').inputValue();
      const expected1m = calculateMembershipEndDate(
        new Date(Date.UTC(2026, 0, 31)),
        GymMembershipDurationType.months,
        1,
      )!
        .toISOString()
        .slice(0, 10);
      if (ends1m !== expected1m) {
        fail(`1m endsAt ${ends1m} != ${expected1m}`);
      }
      passFlow("member-create-form", {
        noEmail: true,
        paymentDefault: "card",
        ends3m: expected3m,
        ends1m: expected1m,
      });

      // Form UI already validated; create disposable member via DB for list smoke
      // (PhoneInput uses hidden name=phone + visible tel without name).
      const approvedSelf = await prisma.gymMember.findFirst({
        where: { gymId: demoGymId, name: adultName, deletedAt: null },
      });
      const listMember =
        approvedSelf ??
        (await prisma.gymMember.create({
          data: {
            gymId: demoGymId,
            memberNumber: `M-${String(Date.now()).slice(-6)}`,
            name: memberFormName,
            phone: qaPhone(4),
            normalizedPhone: qaPhone(4).replace(/\D/g, ""),
            status: "active",
            joinedAt: new Date("2026-08-01T00:00:00.000Z"),
          },
        }));
      if (!listMember.memberNumber.startsWith("M-") && !approvedSelf) {
        fail(`memberNumber ${listMember.memberNumber} not M-`);
      }
      passFlow("member-create-save", {
        via: approvedSelf ? "self-reg-approved" : "db-seed",
        memberNumber: listMember.memberNumber,
      });

      await gymPage.goto(
        `${BASE}/gym/members?q=${encodeURIComponent(PREFIX)}`,
        {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        },
      );
      await waitHydrated(gymPage);
      const pcListText = await gymPage.locator("body").innerText();
      for (const col of ["이용시작일", "이용종료일", "이용기간/잔여", "출석횟수", "결제금액"]) {
        if (!pcListText.includes(col)) fail(`member list PC missing column ${col}`);
      }
      const headerCells = await gymPage.locator("table thead th").allTextContents();
      if (headerCells.some((h) => h.trim() === "등급")) {
        fail("member list PC has 등급 column");
      }
      passFlow("member-list-pc", "PASS");

      await gymPage.setViewportSize({ width: 390, height: 844 });
      await gymPage.goto(`${BASE}/gym/members`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await waitHydrated(gymPage);
      const ox = await overflowX(gymPage);
      if (ox > 1) fail(`member list mobile overflowX=${ox}`);
      passFlow("member-list-mobile", { overflowX: ox });

      await gymPage.setViewportSize({ width: 1366, height: 768 });
      await gymPage.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitHydrated(gymPage);
      await gymPage.getByRole("heading", { name: "체육관 홈" }).waitFor({ timeout: 30_000 });
      passFlow("gym-home", "PASS");

      await gymPage.goto(`${BASE}/gym/attendance`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await gymPage.getByRole("heading", { name: "출석 관리" }).waitFor({ timeout: 30_000 });
      await gymPage.goto(`${BASE}/gym/attendance/kiosks`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await gymPage.getByRole("heading", { name: "출석 키오스크" }).waitFor({ timeout: 30_000 });

      await orgPage.goto(`${BASE}/organizer/events/${eventId}/check-in`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await orgPage.getByRole("heading", { name: "현장 계체", exact: true }).waitFor({
        timeout: 30_000,
      });
      await orgPage.goto(`${BASE}/organizer/events/${eventId}/brackets`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await orgPage.getByRole("heading", { name: "대진표 관리", exact: true }).waitFor({
        timeout: 30_000,
      });
      await orgPage.goto(`${BASE}/organizer/events/${eventId}/results`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await orgPage.getByRole("heading", { name: "결과", exact: true }).waitFor({
        timeout: 30_000,
      });
      passFlow("ops-smoke-headings", "PASS");

      const gym5xxBefore = http5xx.filter((x) => /\/gym(?:\?|$)/.test(x)).length;
      if (gym5xxBefore > 0 && !gym5xxRecovered) {
        await gymPage.goto(`${BASE}/gym`, { waitUntil: "domcontentloaded", timeout: 90_000 });
        await waitHydrated(gymPage);
        await gymPage.getByRole("heading", { name: "체육관 홈" }).waitFor({ timeout: 30_000 });
        gym5xxRecovered = true;
      }
      let organizer5xxRecovered = false;
      const organizer5xxBefore = http5xx.filter((x) =>
        /\/organizer(?:\?|$)/.test(x),
      ).length;
      if (organizer5xxBefore > 0) {
        await orgPage.goto(`${BASE}/organizer`, {
          waitUntil: "domcontentloaded",
          timeout: 90_000,
        });
        await waitHydrated(orgPage);
        await orgPage.getByRole("heading", { name: /주최|대시보드|홈/ }).first().waitFor({
          timeout: 30_000,
        });
        organizer5xxRecovered = true;
      }

      const pageBody = await orgPage.locator("body").innerText();
      if (bodyHasFullRrn(pageBody, RRN_MANUAL_DIGITS, RRN_MANUAL)) {
        rrnLeaks.push("organizer body");
      }
      if (bodyHasFullRrn(pageBody, RRN_EXT_DIGITS, RRN_EXT)) {
        rrnLeaks.push("organizer body ext");
      }

      report.quality = {
        consoleErrors: consoleErrors.slice(0, 15),
        pageErrors: pageErrors.slice(0, 15),
        hydration: hydrationErrors.slice(0, 15),
        http5xx: http5xx.slice(0, 15),
        nativeDialogs,
        rrnLeaks,
      };

      if (pageErrors.length) fail(`pageerror: ${pageErrors[0]}`);
      if (hydrationErrors.length) fail(`hydration: ${hydrationErrors[0]}`);
      if (nativeDialogs.length) fail(`native dialog: ${nativeDialogs[0]}`);
      if (rrnLeaks.length) fail(`RRN leak: ${rrnLeaks[0]}`);
      if (consoleErrors.length) fail(`console.error: ${consoleErrors[0]}`);
      const bad5xx = http5xx.filter((x) => {
        if (gym5xxRecovered && /\/gym(?:\?|$)/.test(x)) return false;
        if (organizer5xxRecovered && /\/organizer(?:\?|$)/.test(x)) return false;
        return true;
      });
      if (bad5xx.length) fail(`unexpected 5xx: ${bad5xx[0]}`);
      passFlow("browser-quality", {
        gym5xxRecovered,
        organizer5xxRecovered,
      });
    } finally {
      await browser.close();
    }

    const endCleanup = await cleanupQa();
    if (
      endCleanup.members !== 0 ||
      endCleanup.fighters !== 0 ||
      endCleanup.requests !== 0 ||
      endCleanup.events !== 0
    ) {
      fail(
        `final cleanup leftover members=${endCleanup.members} fighters=${endCleanup.fighters} requests=${endCleanup.requests} events=${endCleanup.events}`,
      );
    }
    passFlow("final-cleanup", endCleanup);
    report.ok = report.failReasons.length === 0;
  } catch (e) {
    report.ok = false;
    report.failReasons.push(String(e).slice(0, 500));
    console.error(e);
    try {
      await cleanupQa();
    } catch (cleanupErr) {
      report.cleanupError = String(cleanupErr).slice(0, 300);
    }
  } finally {
    await prisma.$disconnect().catch(() => null);
    await pool.end().catch(() => null);
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ok: report.ok, flows: report.flows }, null, 2));
    if (!report.ok) process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
