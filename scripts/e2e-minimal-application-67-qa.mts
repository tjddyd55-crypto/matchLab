/**
 * 67명 실제 Excel + minimal 1차 신청 Preview E2E (Development yamanote only)
 *
 *   npx tsx scripts/e2e-minimal-application-67-qa.mts --file "c:/Users/.../MATCHON_선수신청_업로드.xlsx"
 *   npx tsx scripts/e2e-minimal-application-67-qa.mts --cleanup
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import Module from "node:module";
import { chromium, type Page } from "playwright";

const PREFIX = "MINIMAL_APPLICATION_QA_";
const BASE = "https://app-preview-member-gym-b.up.railway.app";
const OUT = join(process.cwd(), "test-results", "minimal-application-67-qa");
const DEFAULT_FILE =
  "c:/Users/tjddy/Desktop/신청자/MATCHON_선수신청_업로드.xlsx";

function argValue(flag: string): string | undefined {
  const prefixed = process.argv.find((a) => a.startsWith(`${flag}=`));
  if (prefixed) return prefixed.slice(flag.length + 1);
  const idx = process.argv.indexOf(flag);
  const next = idx >= 0 ? process.argv[idx + 1] : undefined;
  if (next && !next.startsWith("-")) return next;
  return undefined;
}

const fileArg = argValue("--file") ?? DEFAULT_FILE;
const eventIdArg = argValue("--event-id");
const cleanupOnly = process.argv.includes("--cleanup");
const skipBrowser = process.argv.includes("--local-only");
const keepQa = process.argv.includes("--keep");

type Report = Record<string, string>;

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertDevelopmentYamanoteDatabaseUrl(databaseUrl: string) {
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: not yamanote (${databaseUrl.slice(0, 40)}...)`);
  }
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
    if (text.includes("favicon") || text.includes("React DevTools")) return;
    consoleErrors.push(text);
    if (/hydrat|#418/i.test(text)) hydration.push(text);
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
    if (/hydrat|#418/i.test(err.message)) hydration.push(err.message);
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

async function login(page: Page, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  if (!page.url().includes("/login")) return;
  const idBox = page.locator("#login-identifier, input[name='identifier']");
  if (await idBox.count()) await idBox.first().fill("organizer");
  else await page.getByLabel("아이디").fill("organizer");
  await page.locator("input[type='password']").first().fill(password);
  await page.locator("button[type='submit']").first().click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 45_000 });
}

async function openExcelDialog(page: Page) {
  const sample = page.getByRole("button", { name: "샘플 엑셀 다운로드" });
  if (await sample.isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "엑셀 일괄 등록" }).click({ force: true });
  await sample.waitFor({ timeout: 20_000 });
}

async function uploadAndWaitPreview(page: Page, filePath: string) {
  const again = page.getByRole("button", { name: "다시 선택" });
  if (await again.isVisible().catch(() => false)) await again.click();
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles(filePath);
  await page.getByText(/총 \d+명/).waitFor({ timeout: 120_000 });
}

async function cleanupQa(prisma: import("@prisma/client").PrismaClient) {
  const events = await prisma.event.findMany({
    where: { title: { startsWith: PREFIX } },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);
  const apps = eventIds.length
    ? await prisma.eventApplication.findMany({
        where: { eventId: { in: eventIds } },
        select: { id: true, fighterId: true },
      })
    : [];
  const appIds = apps.map((a) => a.id);
  const fighterIds = [...new Set(apps.map((a) => a.fighterId))];
  if (appIds.length) {
    await prisma.eventApplicationPayment.deleteMany({
      where: { eventApplicationId: { in: appIds } },
    });
  }
  if (eventIds.length) {
    await prisma.bracketMatch.deleteMany({ where: { bracket: { eventId: { in: eventIds } } } });
    await prisma.bracket.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.eventApplication.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
  }
  const named = await prisma.fighter.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });
  const allFighterIds = [...new Set([...fighterIds, ...named.map((f) => f.id)])];
  if (allFighterIds.length) {
    await prisma.fighterGymHistory.deleteMany({ where: { fighterId: { in: allFighterIds } } });
    await prisma.fighter.deleteMany({ where: { id: { in: allFighterIds } } });
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const report: Report = {
    excelFile: fileArg,
    previewBase: BASE,
    productionUntouched: "PASS",
  };
  assert.ok(existsSync(fileArg), `Excel not found: ${fileArg}`);

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertDevelopmentYamanoteDatabaseUrl(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  report.dbFingerprint = "yamanote";
  report.servingShaHint = String(app.RAILWAY_GIT_COMMIT_SHA || "").slice(0, 12);

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  if (cleanupOnly) {
    await cleanupQa(prisma);
    console.log("cleanup OK");
    await pool.end();
    return;
  }

  const { parseApplicantExcelWorkbook } = await import("../src/lib/applicant-excel/parse");
  const { analyzeApplicantExcelRows } = await import("../src/lib/applicant-excel/analyze");
  const { readFileSync: _ } = { readFileSync }; // keep import

  const buffer = readFileSync(fileArg);
  const parsed = await parseApplicantExcelWorkbook(buffer);
  report.excelRows = String(parsed.rows.length);

  let eventId = eventIdArg ?? "";
  if (!eventId) {
    await cleanupQa(prisma);
    const organizerUser = await prisma.user.findFirst({
      where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
      include: { organizer: true },
    });
    assert.ok(organizerUser?.organizer, "demo organizer missing");
    const source = await prisma.event.findFirst({
      where: {
        title: { not: { startsWith: PREFIX } },
        status: { in: ["open", "closed", "bracket_ready", "ongoing"] },
      },
      include: { divisions: true },
      orderBy: { updatedAt: "desc" },
    });
    const ranked = await prisma.event.findMany({
      where: { title: { not: { startsWith: PREFIX } } },
      include: { divisions: true },
      take: 30,
      orderBy: { updatedAt: "desc" },
    });
    const template =
      ranked.sort((a, b) => b.divisions.length - a.divisions.length)[0] ?? source;
    assert.ok(template && template.divisions.length > 0, "no division template event");
    report.divisionTemplateEvent = template.title;
    const stamp = Date.now().toString(36);
    const created = await prisma.event.create({
      data: {
        organizerId: organizerUser.organizer.id,
        title: `${PREFIX}67 Excel`,
        location: "QA",
        eventDate: new Date("2026-12-01T00:00:00.000Z"),
        registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
        status: "open",
        publicSlug: `minimal-application-qa-${stamp}`,
        courts: { create: [{ name: "QA코트1", sortOrder: 0 }] },
        divisions: {
          create: template.divisions.map((d) => ({
            sportType: d.sportType,
            ruleType: d.ruleType,
            gender: d.gender,
            ageGroup: d.ageGroup,
            weightClass: d.weightClass,
            weightClassName: d.weightClassName,
            weightLimitText: d.weightLimitText,
            skillLevel: d.skillLevel,
          })),
        },
      },
      include: { divisions: true },
    });
    await prisma.organizerCreditWallet.upsert({
      where: { organizerId: organizerUser.organizer.id },
      create: { organizerId: organizerUser.organizer.id, balance: 50_000 },
      update: { balance: { increment: 5_000 } },
    });
    eventId = created.id;
    report.eventTitle = created.title;
    report.eventDivisions = String(created.divisions.length);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { divisions: true },
  });
  assert.ok(event, `event ${eventId} not found`);
  report.eventId = event.id;

  const divisions = event.divisions.map((d) => ({
    id: d.id,
    sportType: d.sportType,
    ruleType: d.ruleType,
    gender: d.gender,
    ageGroup: d.ageGroup,
    weightClass: d.weightClass,
    weightClassName: d.weightClassName,
    weightLimitText: d.weightLimitText,
    skillLevel: d.skillLevel,
  }));

  const existing = await prisma.eventApplication.findMany({
    where: { eventId: event.id },
    include: {
      fighter: { select: { name: true, birthDate: true, gender: true } },
    },
  });
  const { identityFromExistingApplication } = await import("../src/lib/applicant-excel/analyze");
  const existingIdentities = existing.map((row) =>
    identityFromExistingApplication({
      id: row.id,
      divisionId: row.divisionId,
      gymSnapshot: row.gymSnapshot,
      fighter: row.fighter,
    }),
  );

  const preview = analyzeApplicantExcelRows({
    fileName: fileArg.split(/[/\\]/).pop() ?? "upload.xlsx",
    headerRow: parsed.headerRow,
    rows: parsed.rows,
    divisions,
    existing: existingIdentities,
  });

  report.previewTotal = String(preview.totalRows);
  report.previewCreate = String(preview.counts.create);
  report.previewError = String(preview.counts.error);
  report.previewSkip = String(preview.counts.skipExisting);

  const errors = preview.rows
    .filter((r) => r.decision === "error")
    .map((r) => ({
      row: r.excelRow,
      name: r.fighterName,
      errors: r.errors.join("; "),
    }));
  writeFileSync(join(OUT, "local-preview-errors.json"), JSON.stringify(errors, null, 2));
  writeFileSync(
    join(OUT, "local-preview-summary.json"),
    JSON.stringify(
      preview.rows.map((r) => ({
        row: r.excelRow,
        name: r.fighterName,
        decision: r.decision,
        ageGroup: r.ageGroup,
        normalized: r.normalizedAgeGroup,
        grade: r.schoolGradeSnapshot,
        divisionId: r.divisionId,
        division: r.divisionLabel,
        weight: r.applicationWeightKg,
        rrn: r.insuranceRrnMasked || null,
        consent: r.insuranceConsentLabel,
        errors: r.errors,
      })),
      null,
      2,
    ),
  );

  const rrnErrors = errors.filter((e) => /주민/.test(e.errors));
  const consentErrors = errors.filter((e) => /보험가입 개인정보/.test(e.errors));
  report.rrnHardErrors = String(rrnErrors.length);
  report.consentHardErrors = String(consentErrors.length);
  report.errorGenderEmpty = String(
    errors.filter((e) => e.errors.includes("성별을 남/여로 입력해 주세요.")).length,
  );
  report.errorAmbiguousDivision = String(
    errors.filter((e) => e.errors.includes("체급이 여러 개")).length,
  );
  report.errorRecordMismatch = String(
    errors.filter((e) => e.errors.includes("합계")).length,
  );
  assert.equal(rrnErrors.length, 0, "RRN should not block preview");
  assert.equal(consentErrors.length, 0, "consent missing should not block preview");

  const wrongAssignments = preview.rows.filter(
    (r) => r.decision === "create" && !r.divisionId,
  );
  report.wrongAssignmentCount = String(wrongAssignments.length);

  if (skipBrowser) {
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await pool.end();
    return;
  }

  const password = String(app.DEMO_PASSWORD || "123456!!");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const quality = attachQuality(page);
  const appsBefore = await prisma.eventApplication.count({ where: { eventId: event.id } });

  try {
    await login(page, password);
    await page.goto(`${BASE}/organizer/events/${event.id}/applications`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    await openExcelDialog(page);
    await uploadAndWaitPreview(page, fileArg);
    const dialogText = await page.locator('[role="dialog"]').innerText();
    writeFileSync(join(OUT, "browser-preview.txt"), dialogText);
    assert.doesNotMatch(dialogText, /주민등록번호를 입력해 주세요/);
    assert.match(dialogText, /등록 가능/);

    if (preview.counts.create === 0) {
      report.browserCommit = "SKIP nothing to create";
    } else {
      const commitBtn = page.getByRole("button", { name: /명 등록/ });
      if (await commitBtn.isDisabled()) {
        report.browserCommit = "FAIL commit disabled";
      } else {
        await commitBtn.click();
        await page.getByText(/등록 완료|등록했습니다/).waitFor({ timeout: 180_000 });
        report.browserCommit = "PASS";
      }
    }

    const appsAfter = await prisma.eventApplication.count({ where: { eventId: event.id } });
    report.appsBefore = String(appsBefore);
    report.appsAfter = String(appsAfter);
    report.appsDelta = String(appsAfter - appsBefore);

    const nullPii = await prisma.eventApplication.count({
      where: {
        eventId: event.id,
        insuranceRrnCipher: null,
        insuranceConsentSnapshot: { equals: null },
      },
    });
    report.piiNullApplications = String(nullPii);

    const nullBirth = await prisma.fighter.count({
      where: {
        applications: { some: { eventId: event.id } },
        birthDate: null,
      },
    });
    report.nullBirthFighters = String(nullBirth);

    if (report.browserCommit === "PASS" && preview.counts.create > 0) {
      await prisma.eventApplication.updateMany({
        where: { eventId: event.id, status: { not: "cancelled" } },
        data: { status: "approved" },
      });
      await page.goto(`${BASE}/organizer/events/${event.id}/brackets?tab=generate`, {
        waitUntil: "domcontentloaded",
        timeout: 90_000,
      });
      await page.getByRole("tab", { name: "대진표 생성" }).click();
      await page.locator("[data-auto-match-panel]").waitFor({ timeout: 45_000 });
      await page.getByRole("button", { name: "적용" }).click();
      await page.getByText("자동 대진 생성 완료").waitFor({ timeout: 120_000 });
      const matches = await prisma.bracketMatch.count({
        where: { bracket: { eventId: event.id } },
      });
      report.autoMatchCount = String(matches);
      report.autoMatch = matches > 0 ? "PASS" : "FAIL zero matches";
    }

    await page.screenshot({ path: join(OUT, "final.png"), fullPage: true });
  } finally {
    await browser.close();
  }

  report.consoleErrors = String(quality.consoleErrors.length);
  report.pageErrors = String(quality.pageErrors.length);
  report.hydration = String(quality.hydration.length);
  report.status5xx = String(quality.status5xx.length);
  report.nativeDialogs = String(quality.nativeDialogs.length);
  if (quality.consoleErrors.length) {
    report.consoleErrorSample = quality.consoleErrors.slice(0, 5).join(" | ");
  }
  if (quality.hydration.length) {
    report.hydrationSample = quality.hydration.slice(0, 3).join(" | ");
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!keepQa) {
    await cleanupQa(prisma);
    report.cleanup = "PASS";
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  }
  await pool.end();

  assert.equal(quality.pageErrors.length, 0, quality.pageErrors.join("\n"));
  assert.equal(quality.status5xx.length, 0, quality.status5xx.join("\n"));
  assert.equal(quality.nativeDialogs.length, 0, quality.nativeDialogs.join("\n"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
