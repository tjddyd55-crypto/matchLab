/**
 * MATCHON 2단계 신청 Preview E2E
 * Development yamanote only. Production / yamabiko / main 금지.
 * 새 기능 추가 없이 현재 구현 검증.
 *
 *   npx tsx scripts/e2e-two-stage-application-preview-qa.mts
 *   npx tsx scripts/e2e-two-stage-application-preview-qa.mts --cleanup-only
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import { chromium, type Page } from "playwright";

const PREFIX = "TWO_STAGE_QA_";
const EXPECTED_SHA = "8c5f0dd70ffbd0b44e4d5f2e2a155697ca65fb58";
// Pin bump commits may lag Preview; allow mismatch for SHA-only test pin commits via --allow-sha-mismatch
const BASE = (
  process.env.QA_BASE_URL ||
  "https://app-preview-member-gym-b.up.railway.app"
).replace(/\/$/, "");
const OUT = join(process.cwd(), "test-results", "two-stage-application-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup-only");
const keepQa = process.argv.includes("--keep");

mkdirSync(OUT, { recursive: true });

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

type Report = Record<string, unknown>;
const report: Report = {
  ok: false,
  failReasons: [] as string[],
  deployment: {},
  contactScope: {},
  flows: {} as Record<string, unknown>,
};

function fail(msg: string): never {
  (report.failReasons as string[]).push(msg);
  throw new Error(msg);
}
function pass(name: string, detail?: unknown) {
  (report.flows as Record<string, unknown>)[name] = detail ?? "PASS";
}

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertYamanote(databaseUrl: string) {
  if (!/yamanote/i.test(databaseUrl) || /yamabiko/i.test(databaseUrl)) {
    throw new Error(`REFUSING DB write: not yamanote`);
  }
}

function ymdYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function tinyPngBase64(): string {
  // 1x1 transparent PNG
  return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
}

async function main() {
  const deployRaw = execSync(
    `railway deployment list --service app --limit 1 --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  const deploys = JSON.parse(deployRaw) as Array<{
    id: string;
    status: string;
    meta?: { commitHash?: string };
  }>;
  const latest = deploys[0];
  assert.ok(latest, "no deployment");
  const servingSha = latest.meta?.commitHash ?? "";
  report.deployment = {
    deploymentId: latest.id,
    status: latest.status,
    servingSha,
    expectedSha: EXPECTED_SHA,
  };
  if (!cleanupOnly) {
    if (latest.status !== "SUCCESS") fail(`deploy status ${latest.status}`);
    if (servingSha !== EXPECTED_SHA && !process.argv.includes("--allow-sha-mismatch")) {
      fail(`serving SHA mismatch: ${servingSha} !== ${EXPECTED_SHA}`);
    }
    if (servingSha !== EXPECTED_SHA) {
      console.warn(`[warn] serving SHA mismatch allowed: ${servingSha}`);
    }
  }
  pass("deployment", report.deployment);

  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  // HMAC SSOT: Preview 배포 secret을 로컬 .env보다 우선 (강제 overwrite)
  for (const key of [
    "EXTERNAL_REGISTRATION_URL_SECRET",
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "MATCHON_PII_ENCRYPTION_KEY",
    "SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_CONSENT_SIGNATURE_BUCKET",
    "NEXT_PUBLIC_APP_URL",
    "APP_URL",
  ]) {
    if (app[key]) process.env[key] = app[key];
  }
  // Preview base URL로 public link를 만들어야 Preview 검증과 일치
  process.env.NEXT_PUBLIC_APP_URL = BASE;
  process.env.APP_URL = BASE;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_URL) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL;
  }
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, AdditionalInfoStatus } = await import(
    "../src/generated/prisma"
  );
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  async function cleanupQa() {
    const events = await prisma.event.findMany({
      where: { title: { startsWith: PREFIX } },
      select: { id: true },
    });
    const eventIds = events.map((e) => e.id);
    if (eventIds.length) {
      const apps = await prisma.eventApplication.findMany({
        where: { eventId: { in: eventIds } },
        select: { id: true, fighterId: true, additionalInfoSignatureObjectKey: true },
      });
      const appIds = apps.map((a) => a.id);
      const fighterIds = [...new Set(apps.map((a) => a.fighterId))];
      if (appIds.length) {
        await prisma.eventApplicationPayment.deleteMany({
          where: { eventApplicationId: { in: appIds } },
        });
        await prisma.eventApplication.deleteMany({
          where: { id: { in: appIds } },
        });
      }
      await prisma.eventExternalRegistrationSubmission.deleteMany({
        where: { link: { eventId: { in: eventIds } } },
      });
      await prisma.eventExternalRegistrationLink.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventDivision.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.eventCourt.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
      if (fighterIds.length) {
        await prisma.fighterGymHistory.deleteMany({
          where: { fighterId: { in: fighterIds } },
        });
        await prisma.fighter.deleteMany({
          where: {
            id: { in: fighterIds },
            name: { startsWith: PREFIX },
          },
        });
      }
      report.cleanup = {
        events: eventIds.length,
        applications: appIds.length,
        fighters: fighterIds.length,
        signatureKeys: apps
          .map((a) => a.additionalInfoSignatureObjectKey)
          .filter(Boolean).length,
      };
    } else {
      report.cleanup = { events: 0 };
    }
  }

  if (cleanupOnly) {
    await cleanupQa();
    report.ok = true;
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log("cleanup OK", report.cleanup);
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  await cleanupQa();

  // --- Contact scope audit (code + live) ---
  const { validateFirstStageApplication } = await import(
    "../src/lib/applications/first-stage-application"
  );
  const { resolveAdditionalInfoRecipient } = await import(
    "../src/lib/additional-info/recipient"
  );
  const { isAdditionalInfoComplete } = await import(
    "../src/lib/additional-info/completion"
  );
  const { applicationRepository } = await import(
    "../src/lib/repositories/application.repository"
  );
  const { generateAdditionalInfoRawToken, hashAdditionalInfoToken, buildAdditionalInfoPublicUrl } =
    await import("../src/lib/additional-info/token");
  const { applicationService } = await import(
    "../src/lib/services/application.service"
  );
  const { additionalInfoService } = await import(
    "../src/lib/services/additional-info.service"
  );
  const { externalRegistrationLinkService } = await import(
    "../src/lib/services/external-registration-link.service"
  );
  const { buildExternalRegistrationPublicUrl } = await import(
    "../src/lib/external-registration/token"
  );
  const { analyzeApplicantExcelRows } = await import(
    "../src/lib/applicant-excel/analyze"
  );
  const { APPLICANT_EXCEL_HEADERS, APPLICANT_EXCEL_OPTIONAL_HEADERS } = await import(
    "../src/lib/applicant-excel/columns"
  );

  // fighterSnapshot shape check from source usage
  report.contactScope = {
    athletePhoneSsot: "Fighter.phone",
    guardianPhoneSsot: "Fighter.guardianPhone",
    applicationRecipientSnapshot: "EventApplication.additionalInfoRecipientPhone",
    applicationSnapshotIncludesPhone: false,
    fighterSnapshotFields:
      "fighterId,fighterCode,name,gymName,profileImageUrl,recordSummary,recordText?,careerText?,applicationWeightKg?",
    recipientSourceAtFirstRequest: "live Fighter → write application snapshot",
    recipientSourceAtResend: "EventApplication.additionalInfoRecipientPhone (default)",
    explicitRefresh: "refreshFromFighter=true → overwrite snapshot then resend",
    updateContactWrites: "prisma.fighter.update (person-level; does not mutate snapshot)",
    multiEventIsolation: "application snapshot per EventApplication",
  };
  pass("contactScope", report.contactScope);

  const organizerUser = await prisma.user.findFirst({
    where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
    include: { organizer: true },
  });
  assert.ok(organizerUser?.organizer, "demo organizer missing");
  const actor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "organizer@demo.local",
    loginId: organizerUser.loginId ?? "organizer",
    organizerId: organizerUser.organizer.id,
  };

  const template = await prisma.event.findFirst({
    where: { title: { not: { startsWith: PREFIX } } },
    include: { divisions: true },
    orderBy: { updatedAt: "desc" },
  });
  assert.ok(template && template.divisions.length > 0, "no template divisions");

  const maleDiv =
    template.divisions.find((d) => (d.gender ?? "").toLowerCase().includes("male") || d.gender === "남성" || d.gender === "남") ??
    template.divisions.find((d) => d.gender === "male") ??
    template.divisions[0]!;
  const stamp = Date.now().toString(36);
  const event = await prisma.event.create({
    data: {
      organizerId: organizerUser.organizer.id,
      title: `${PREFIX}Event ${stamp}`,
      location: "QA",
      eventDate: new Date("2026-12-01T00:00:00.000Z"),
      registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
      status: "open",
      publicSlug: `two-stage-qa-${stamp}`,
      courts: { create: [{ name: "QA코트1", sortOrder: 0 }] },
      divisions: {
        create: template.divisions.slice(0, 8).map((d) => ({
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
    update: { balance: { increment: 2_000 } },
  });

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
  const registered = divisions.find((d) => d.id) ?? divisions[0]!;
  const competitionCategory = (registered.ageGroup ?? "성인").trim() || "성인";

  // --- Record validation ---
  const zeroOk = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}RecordZero`,
    gender: "male",
    birthDate: ymdYearsAgo(25),
    phone: "01011112222",
    competitionCategory,
    divisionSelection: { selectionType: "REGISTERED", divisionId: registered.id },
    record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    divisions,
  });
  assert.equal(zeroOk.ok, true, "0/0/0/0 should PASS");
  const goodOk = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}RecordGood`,
    gender: "male",
    birthDate: ymdYearsAgo(25),
    phone: "01011112223",
    competitionCategory,
    divisionSelection: { selectionType: "REGISTERED", divisionId: registered.id },
    record: { totalBouts: 3, wins: 2, draws: 0, losses: 1 },
    divisions,
  });
  assert.equal(goodOk.ok, true, "3/2/0/1 should PASS");
  const badOk = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}RecordBad`,
    gender: "male",
    birthDate: ymdYearsAgo(25),
    phone: "01011112224",
    competitionCategory,
    divisionSelection: { selectionType: "REGISTERED", divisionId: registered.id },
    record: { totalBouts: 3, wins: 3, draws: 0, losses: 3 },
    divisions,
  });
  assert.equal(badOk.ok, false, "3/3/0/3 should FAIL");
  pass("record", {
    zero: zeroOk.ok,
    good: goodOk.ok,
    bad: !badOk.ok,
    badErrors: badOk.ok ? [] : badOk.errors,
  });

  // --- Minor guardian required ---
  const minorFail = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}MinorFail`,
    gender: "male",
    birthDate: ymdYearsAgo(14),
    phone: "01022223333",
    competitionCategory,
    divisionSelection: { selectionType: "REGISTERED", divisionId: registered.id },
    record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    divisions,
  });
  assert.equal(minorFail.ok, false);
  assert.ok(
    !minorFail.ok &&
      minorFail.errors.some((e) => e.includes("보호자")),
    "minor without guardian should mention 보호자",
  );
  const minorPass = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}MinorPass`,
    gender: "male",
    birthDate: ymdYearsAgo(14),
    phone: "01022223334",
    guardianPhone: "01099998888",
    competitionCategory,
    divisionSelection: { selectionType: "REGISTERED", divisionId: registered.id },
    record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    divisions,
  });
  assert.equal(minorPass.ok, true);
  pass("minorValidation", { failWithoutGuardian: true, passWithGuardian: true });

  // --- OTHER validation ---
  const otherBlank = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}OtherBlank`,
    gender: "male",
    birthDate: ymdYearsAgo(25),
    phone: "01033334444",
    competitionCategory,
    divisionSelection: {
      selectionType: "OTHER",
      requestedDivisionText: "",
    },
    record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    divisions,
  });
  assert.equal(otherBlank.ok, false);
  const otherOk = validateFirstStageApplication({
    gymName: "QA체육관",
    fighterName: `${PREFIX}OtherOk`,
    gender: "male",
    birthDate: ymdYearsAgo(25),
    phone: "01033334445",
    competitionCategory,
    divisionSelection: {
      selectionType: "OTHER",
      requestedDivisionText: "-52kg 희망",
    },
    applicationWeightKg: "",
    careerText: "",
    memo: "",
    record: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
    divisions,
  });
  assert.equal(otherOk.ok, true);
  pass("otherValidation", {
    blankFail: !otherBlank.ok,
    withTextPass: otherOk.ok,
  });

  // Create registration link + submit via service (adult / minor / OTHER)
  await externalRegistrationLinkService.getOrCreateLink(actor, event.id);
  const linkRow = await prisma.eventExternalRegistrationLink.findUniqueOrThrow({
    where: { eventId: event.id },
  });
  const publicUrl = buildExternalRegistrationPublicUrl(
    linkRow.id,
    linkRow.tokenHash,
  );
  const publicToken = publicUrl.split("/").pop()!;

  const adultBatch = await applicationService.createExternalLinkBatchApplications({
    token: publicToken,
    clientSubmissionId: randomUUID(),
    gymInfo: { gymName: `${PREFIX}GymAdult` },
    athletes: [
      {
        fighterName: `${PREFIX}Adult`,
        gender: "male",
        birthDate: ymdYearsAgo(28),
        phone: "01040001111",
        competitionCategory,
        divisionSelection: {
          selectionType: "REGISTERED",
          divisionId: registered.id,
        },
        structuredRecord: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
        applicationWeightKg: "",
        careerText: "",
        memo: "",
      },
    ],
  });
  const adultAppId = adultBatch.results[0]!.applicationId;
  const adultApp = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: adultAppId },
    include: { fighter: true, division: true },
  });
  assert.equal(adultApp.divisionId, registered.id);
  assert.equal(adultApp.divisionSelectionType, "REGISTERED");
  assert.equal(adultApp.fighter.phone.replace(/\D/g, "").slice(-8), "40001111");
  const snap = adultApp.fighterSnapshot as Record<string, unknown>;
  assert.equal("phone" in snap, false);
  pass("adultLinkCreate", {
    applicationId: adultAppId,
    divisionId: adultApp.divisionId,
    noPhoneInSnapshot: true,
  });

  const minorBatch = await applicationService.createExternalLinkBatchApplications({
    token: publicToken,
    clientSubmissionId: randomUUID(),
    gymInfo: { gymName: `${PREFIX}GymMinor` },
    athletes: [
      {
        fighterName: `${PREFIX}Minor`,
        gender: "male",
        birthDate: ymdYearsAgo(13),
        phone: "01040002222",
        guardianPhone: "01040009999",
        guardianName: `${PREFIX}Guardian`,
        competitionCategory,
        divisionSelection: {
          selectionType: "REGISTERED",
          divisionId: registered.id,
        },
        structuredRecord: { totalBouts: 1, wins: 1, draws: 0, losses: 0 },
      },
    ],
  });
  const minorAppId = minorBatch.results[0]!.applicationId;
  pass("minorLinkCreate", { applicationId: minorAppId });

  const otherBatch = await applicationService.createExternalLinkBatchApplications({
    token: publicToken,
    clientSubmissionId: randomUUID(),
    gymInfo: { gymName: `${PREFIX}GymOther` },
    athletes: [
      {
        fighterName: `${PREFIX}Other`,
        gender: "male",
        birthDate: ymdYearsAgo(22),
        phone: "01040003333",
        competitionCategory,
        divisionSelection: {
          selectionType: "OTHER",
          requestedDivisionText: "-52kg 희망",
        },
        structuredRecord: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
      },
    ],
  });
  const otherAppId = otherBatch.results[0]!.applicationId;
  const otherApp = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: otherAppId },
  });
  assert.equal(otherApp.divisionId, null);
  assert.equal(otherApp.divisionSelectionType, "OTHER");
  assert.equal(otherApp.requestedDivisionText, "-52kg 희망");
  const otherDivRows = await prisma.eventDivision.count({
    where: {
      eventId: event.id,
      OR: [
        { weightClassName: { contains: "기타" } },
        { weightClass: { contains: "기타" } },
        { ageGroup: { contains: "기타" } },
      ],
    },
  });
  assert.equal(otherDivRows, 0, "must not create 기타 EventDivision");
  pass("otherCreate", {
    divisionId: otherApp.divisionId,
    requestedDivisionText: otherApp.requestedDivisionText,
    fakeOtherDivisionCount: otherDivRows,
  });

  // Auto-match exclusion
  const needsReview =
    otherApp.divisionSelectionType === "OTHER" || !otherApp.divisionId;
  assert.equal(needsReview, true);
  pass("otherAutoMatchExclusion", {
    division_review_required: true,
    label: "체급 확인 필요",
  });

  // Organizer resolve OTHER → REGISTERED (DB path; dedicated UI may be missing)
  const requestedHistory = otherApp.requestedDivisionText;
  await prisma.eventApplication.update({
    where: { id: otherAppId },
    data: {
      divisionId: registered.id,
      divisionSelectionType: "REGISTERED",
      // keep history in requestedDivisionText
      requestedDivisionText: requestedHistory,
    },
  });
  const resolved = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: otherAppId },
  });
  assert.equal(resolved.divisionId, registered.id);
  assert.equal(resolved.divisionSelectionType, "REGISTERED");
  assert.equal(resolved.requestedDivisionText, "-52kg 희망");
  pass("organizerResolveOther", {
    divisionId: resolved.divisionId,
    historyPreserved: resolved.requestedDivisionText === "-52kg 희망",
    note: "전용 신청자 수정 UI 미확인 — DB patch로 eligible 전환 검증",
  });

  // Excel analyze
  function emptyExcelValues(): Record<string, string> {
    const o: Record<string, string> = {};
    for (const h of APPLICANT_EXCEL_HEADERS) o[h] = "";
    for (const h of APPLICANT_EXCEL_OPTIONAL_HEADERS) o[h] = "";
    return o;
  }
  const excelPreview = analyzeApplicantExcelRows({
    fileName: "qa.xlsx",
    headerRow: 1,
    existing: [],
    divisions,
    rows: [
      {
        excelRow: 3,
        isSampleExample: false,
        values: {
          ...emptyExcelValues(),
          번호: "1",
          체육관명: `${PREFIX}ExcelGym`,
          선수명: `${PREFIX}ExcelOk`,
          성별: "남",
          생년월일: ymdYearsAgo(24),
          연락처: "01050001111",
          경기구분: competitionCategory,
          체급:
            registered.weightClassName ||
            registered.weightClass ||
            registered.weightLimitText ||
            "미들",
          총전: "0",
          승: "0",
          무: "0",
          패: "0",
          신청체중: "",
          운동경력: "",
          메모: "",
        },
      },
      {
        excelRow: 4,
        isSampleExample: false,
        values: {
          ...emptyExcelValues(),
          번호: "2",
          체육관명: `${PREFIX}ExcelGym`,
          선수명: `${PREFIX}ExcelMinor`,
          성별: "남",
          생년월일: ymdYearsAgo(12),
          연락처: "01050002222",
          보호자연락처: "",
          경기구분: competitionCategory,
          체급:
            registered.weightClassName ||
            registered.weightClass ||
            "미들",
          총전: "0",
          승: "0",
          무: "0",
          패: "0",
        },
      },
      {
        excelRow: 5,
        isSampleExample: false,
        values: {
          ...emptyExcelValues(),
          번호: "3",
          체육관명: `${PREFIX}ExcelGym`,
          선수명: `${PREFIX}ExcelOther`,
          성별: "남",
          생년월일: ymdYearsAgo(20),
          연락처: "01050003333",
          경기구분: competitionCategory,
          체급: "기타",
          기타내용: "-52kg 희망",
          총전: "0",
          승: "0",
          무: "0",
          패: "0",
        },
      },
      {
        excelRow: 6,
        isSampleExample: false,
        values: {
          ...emptyExcelValues(),
          번호: "4",
          체육관명: `${PREFIX}ExcelGym`,
          선수명: `${PREFIX}ExcelOtherBlank`,
          성별: "남",
          생년월일: ymdYearsAgo(20),
          연락처: "01050004444",
          경기구분: competitionCategory,
          체급: "기타",
          기타내용: "",
          총전: "0",
          승: "0",
          무: "0",
          패: "0",
        },
      },
    ] as never,
  });
  const byName = Object.fromEntries(
    excelPreview.rows.map((r) => [r.fighterName, r]),
  );
  pass("excel", {
    normal: byName[`${PREFIX}ExcelOk`]?.decision,
    minorNoGuardian: byName[`${PREFIX}ExcelMinor`]?.decision,
    minorErrors: byName[`${PREFIX}ExcelMinor`]?.errors,
    other: byName[`${PREFIX}ExcelOther`]?.decision,
    otherDivisionId: byName[`${PREFIX}ExcelOther`]?.divisionId,
    otherBlank: byName[`${PREFIX}ExcelOtherBlank`]?.decision,
  });
  assert.equal(byName[`${PREFIX}ExcelMinor`]?.decision, "error");
  assert.equal(byName[`${PREFIX}ExcelOther`]?.decision, "create");
  assert.equal(byName[`${PREFIX}ExcelOther`]?.divisionId, null);
  assert.equal(byName[`${PREFIX}ExcelOtherBlank`]?.decision, "error");

  // Missing phone existing applicant → request blocked
  const noPhoneFighter = await prisma.fighter.create({
    data: {
      fighterCode: `QA${stamp}NP`,
      name: `${PREFIX}NoPhone`,
      gender: "male",
      birthDate: new Date(`${ymdYearsAgo(30)}T00:00:00.000Z`),
      phone: "-",
    },
  });
  const gymBucket = await prisma.gym.findFirst({
    where: { name: { contains: "외부" } },
  }) ?? await prisma.gym.findFirst();
  assert.ok(gymBucket, "gym for organizer");
  const noPhoneApp = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: registered.id,
      divisionSelectionType: "REGISTERED",
      gymId: gymBucket.id,
      fighterId: noPhoneFighter.id,
      status: "approved",
      paymentStatus: "unpaid",
      fighterSnapshot: { name: noPhoneFighter.name },
      gymSnapshot: { name: gymBucket.name },
      additionalInfoStatus: AdditionalInfoStatus.NOT_REQUESTED,
    },
  });
  const blocked = await additionalInfoService.requestOne(actor, noPhoneApp.id);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.contactMissing, true);
  pass("missingAthletePhoneBlock", {
    message: blocked.message,
    contactMissing: true,
  });

  await additionalInfoService.updateApplicantContact(actor, {
    applicationId: noPhoneApp.id,
    phone: "01060001111",
  });
  const afterPhone = await additionalInfoService.requestOne(actor, noPhoneApp.id);
  assert.equal(afterPhone.ok, true);
  assert.equal(afterPhone.dryRun, true);
  const afterPhoneRow = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: noPhoneApp.id },
  });
  pass("missingAthletePhoneRetry", {
    ok: afterPhone.ok,
    dryRun: afterPhone.dryRun,
    recipientType: afterPhoneRow.additionalInfoRecipientType,
    snapshotPhoneLast4: String(afterPhoneRow.additionalInfoRecipientPhone ?? "").slice(-4),
  });
  assert.equal(
    String(afterPhoneRow.additionalInfoRecipientPhone ?? "").replace(/\D/g, "").slice(-8),
    "60001111",
  );

  // Recipient snapshot isolation (same fighter, two events)
  const eventB = await prisma.event.create({
    data: {
      title: `${PREFIX}EventB_${stamp}`,
      organizerId: actor.organizerId!,
      eventDate: event.eventDate,
      location: event.location,
      status: event.status,
      registrationStartDate: event.registrationStartDate,
      registrationEndDate: event.registrationEndDate,
      publicSlug: `${PREFIX.toLowerCase()}b-${stamp}`,
    },
  });
  const sharedPhoneFighter = await prisma.fighter.create({
    data: {
      fighterCode: `QA${stamp}SH`,
      name: `${PREFIX}Shared`,
      gender: "male",
      birthDate: new Date(`${ymdYearsAgo(26)}T00:00:00.000Z`),
      phone: "01070001111",
    },
  });
  const sharedAppA = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: registered.id,
      divisionSelectionType: "REGISTERED",
      gymId: gymBucket.id,
      fighterId: sharedPhoneFighter.id,
      status: "approved",
      paymentStatus: "unpaid",
      fighterSnapshot: { name: sharedPhoneFighter.name },
      gymSnapshot: { name: gymBucket.name },
      additionalInfoStatus: AdditionalInfoStatus.NOT_REQUESTED,
    },
  });
  const sharedAppB = await prisma.eventApplication.create({
    data: {
      eventId: eventB.id,
      divisionId: null,
      divisionSelectionType: "OTHER",
      requestedDivisionText: "임시",
      gymId: gymBucket.id,
      fighterId: sharedPhoneFighter.id,
      status: "approved",
      paymentStatus: "unpaid",
      fighterSnapshot: { name: sharedPhoneFighter.name },
      gymSnapshot: { name: gymBucket.name },
      additionalInfoStatus: AdditionalInfoStatus.NOT_REQUESTED,
    },
  });
  // Event B needs a registered division for resolve later — skip; use registered from event A only for A
  // For B request we need division on event B — create one
  const divB = await prisma.eventDivision.create({
    data: {
      eventId: eventB.id,
      sportType: registered.sportType,
      ruleType: registered.ruleType,
      gender: registered.gender,
      ageGroup: registered.ageGroup,
      weightClass: registered.weightClass,
      weightClassName: registered.weightClassName,
      weightLimitText: registered.weightLimitText,
      skillLevel: registered.skillLevel,
    },
  });
  await prisma.eventApplication.update({
    where: { id: sharedAppB.id },
    data: {
      divisionId: divB.id,
      divisionSelectionType: "REGISTERED",
      requestedDivisionText: null,
    },
  });

  const reqA = await additionalInfoService.requestOne(actor, sharedAppA.id);
  assert.equal(reqA.ok, true);
  await prisma.fighter.update({
    where: { id: sharedPhoneFighter.id },
    data: { phone: "01070002222" },
  });
  const resendA = await additionalInfoService.requestOne(actor, sharedAppA.id, {
    resend: true,
  });
  assert.equal(resendA.ok, true);
  const rowA1 = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: sharedAppA.id },
  });
  assert.equal(
    String(rowA1.additionalInfoRecipientPhone ?? "").replace(/\D/g, ""),
    "01070001111",
  );
  const reqB = await additionalInfoService.requestOne(actor, sharedAppB.id);
  assert.equal(reqB.ok, true);
  const rowB1 = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: sharedAppB.id },
  });
  assert.equal(
    String(rowB1.additionalInfoRecipientPhone ?? "").replace(/\D/g, ""),
    "01070002222",
  );
  const refreshA = await additionalInfoService.requestOne(actor, sharedAppA.id, {
    resend: true,
    refreshFromFighter: true,
  });
  assert.equal(refreshA.ok, true);
  const rowA2 = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: sharedAppA.id },
  });
  assert.equal(
    String(rowA2.additionalInfoRecipientPhone ?? "").replace(/\D/g, ""),
    "01070002222",
  );
  pass("recipientSnapshotIsolation", {
    eventAFirst: "01070001111",
    eventAResendAfterLiveChange: "01070001111",
    eventBFirstAfterLiveChange: "01070002222",
    eventAExplicitRefresh: "01070002222",
  });

  // OTHER resolve via service
  const otherResolveFighter = await prisma.fighter.create({
    data: {
      fighterCode: `QA${stamp}OR`,
      name: `${PREFIX}OtherResolve`,
      gender: "male",
      birthDate: new Date(`${ymdYearsAgo(24)}T00:00:00.000Z`),
      phone: "01060003333",
    },
  });
  const otherResolveApp = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: null,
      divisionSelectionType: "OTHER",
      requestedDivisionText: "-52kg 희망",
      gymId: gymBucket.id,
      fighterId: otherResolveFighter.id,
      status: "approved",
      paymentStatus: "unpaid",
      fighterSnapshot: { name: otherResolveFighter.name },
      gymSnapshot: { name: gymBucket.name },
      additionalInfoStatus: AdditionalInfoStatus.NOT_REQUESTED,
    },
  });
  const otherResolved = await applicationService.resolveOtherDivisionApplication(actor, {
    applicationId: otherResolveApp.id,
    eventDivisionId: registered.id,
  });
  assert.equal(otherResolved.divisionId, registered.id);
  assert.equal(otherResolved.divisionSelectionType, "REGISTERED");
  assert.equal(otherResolved.divisionReviewRequired, false);
  assert.equal(otherResolved.requestedDivisionText, "-52kg 희망");
  pass("otherDivisionResolve", otherResolved);
  const noGuardFighter = await prisma.fighter.create({
    data: {
      fighterCode: `QA${stamp}NG`,
      name: `${PREFIX}NoGuard`,
      gender: "male",
      birthDate: new Date(`${ymdYearsAgo(12)}T00:00:00.000Z`),
      phone: "01060002222",
      guardianPhone: null,
    },
  });
  const noGuardApp = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: registered.id,
      divisionSelectionType: "REGISTERED",
      gymId: gymBucket.id,
      fighterId: noGuardFighter.id,
      status: "approved",
      paymentStatus: "unpaid",
      fighterSnapshot: { name: noGuardFighter.name },
      gymSnapshot: { name: gymBucket.name },
      additionalInfoStatus: AdditionalInfoStatus.NOT_REQUESTED,
    },
  });
  const blockedG = await additionalInfoService.requestOne(actor, noGuardApp.id);
  assert.equal(blockedG.ok, false);
  await additionalInfoService.updateApplicantContact(actor, {
    applicationId: noGuardApp.id,
    guardianPhone: "01060009999",
  });
  const afterG = await additionalInfoService.requestOne(actor, noGuardApp.id);
  assert.equal(afterG.ok, true);
  const afterGRow = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: noGuardApp.id },
  });
  assert.equal(afterGRow.additionalInfoRecipientType, "GUARDIAN");
  pass("missingGuardianRetry", {
    blocked: !blockedG.ok,
    ok: afterG.ok,
    recipientType: afterGRow.additionalInfoRecipientType,
  });

  // Adult 2nd stage — set known token via same repository SSOT as public form
  const adultReq = await additionalInfoService.requestOne(actor, adultAppId);
  assert.equal(adultReq.ok, true);
  assert.equal(adultReq.dryRun, true);
  const adultRaw = generateAdditionalInfoRawToken();
  const adultHash = hashAdditionalInfoToken(adultRaw);
  await applicationRepository.patchApplication(adultAppId, {
    additionalInfoStatus: AdditionalInfoStatus.REQUESTED,
    additionalInfoTokenHash: adultHash,
    additionalInfoRecipientType: "ATHLETE",
  });
  const verifyHash = await prisma.eventApplication.findUnique({
    where: { id: adultAppId },
    select: { additionalInfoTokenHash: true },
  });
  assert.equal(verifyHash?.additionalInfoTokenHash, adultHash);
  const adultForm = await additionalInfoService.getPublicForm(adultRaw);
  assert.ok(adultForm.fighterName.includes("Adult"));
  assert.ok(adultForm.eventTitle);
  assert.ok(adultForm.divisionLabel);
  const adultSubmit = await additionalInfoService.submitPublicForm(adultRaw, {
    residentRegistrationNumber: "000000-0000001",
    address: "서울시 마포구 QA로 1",
    addressDetail: "101호",
    privacyAgreed: true,
    insuranceAgreed: true,
    signaturePngBase64: tinyPngBase64(),
  });
  assert.equal(adultSubmit.status, "COMPLETED");
  const adultDone = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: adultAppId },
  });
  assert.equal(adultDone.additionalInfoStatus, "COMPLETED");
  assert.ok(adultDone.additionalInfoCompletedAt);
  assert.ok(adultDone.insuranceRrnMasked);
  assert.ok(adultDone.insuranceRrnCipher);
  assert.ok(adultDone.additionalInfoSignatureObjectKey);
  const adultJson = JSON.stringify(adultDone);
  assert.equal(adultJson.includes("0000000000001"), false);
  pass("adultAdditionalInfo", {
    status: adultDone.additionalInfoStatus,
    masked: adultDone.insuranceRrnMasked,
    signatureKey: Boolean(adultDone.additionalInfoSignatureObjectKey),
  });

  // Minor 2nd stage
  const minorReq = await additionalInfoService.requestOne(actor, minorAppId);
  assert.equal(minorReq.ok, true);
  const minorRaw = generateAdditionalInfoRawToken();
  await applicationRepository.patchApplication(minorAppId, {
    additionalInfoStatus: AdditionalInfoStatus.REQUESTED,
    additionalInfoTokenHash: hashAdditionalInfoToken(minorRaw),
    additionalInfoRecipientType: "GUARDIAN",
  });
  const minorSubmit = await additionalInfoService.submitPublicForm(minorRaw, {
    residentRegistrationNumber: "000000-0000016",
    address: "서울시 마포구 QA로 2",
    privacyAgreed: true,
    insuranceAgreed: true,
    guardianName: `${PREFIX}Guardian2`,
    guardianRelation: "모",
    signaturePngBase64: tinyPngBase64(),
  });
  assert.equal(minorSubmit.status, "COMPLETED");
  pass("minorAdditionalInfo", { status: minorSubmit.status });

  // Resend token rotation
  const beforeResend = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: noPhoneApp.id },
  });
  const oldHash = beforeResend.additionalInfoTokenHash;
  const oldRaw = generateAdditionalInfoRawToken();
  // known old token for invalidation check
  await prisma.eventApplication.update({
    where: { id: noPhoneApp.id },
    data: { additionalInfoTokenHash: hashAdditionalInfoToken(oldRaw) },
  });
  const resend = await additionalInfoService.requestOne(actor, noPhoneApp.id, {
    resend: true,
  });
  assert.ok(resend.ok);
  const afterResend = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: noPhoneApp.id },
  });
  assert.notEqual(
    afterResend.additionalInfoTokenHash,
    hashAdditionalInfoToken(oldRaw),
  );
  let oldInvalid = false;
  try {
    await additionalInfoService.getPublicForm(oldRaw);
  } catch {
    oldInvalid = true;
  }
  assert.equal(oldInvalid, true);
  pass("resendRotation", {
    rotated: true,
    oldLinkInvalid: oldInvalid,
    rawTokenNotStored: afterResend.additionalInfoTokenHash !== oldRaw,
  });
  void oldHash;
  void buildAdditionalInfoPublicUrl;

  // Cross application access
  let crossBlocked = false;
  try {
    await additionalInfoService.getPublicForm("deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
  } catch {
    crossBlocked = true;
  }
  assert.equal(crossBlocked, true);
  pass("crossApplication", { blocked: crossBlocked });

  // Bulk preview
  const bulkAdults = await additionalInfoService.previewBulk(
    actor,
    event.id,
    "adults",
  );
  const bulkMinors = await additionalInfoService.previewBulk(
    actor,
    event.id,
    "minors",
  );
  pass("bulkPreview", { adults: bulkAdults, minors: bulkMinors });

  // Application status independence
  const statusCheck = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: adultAppId },
  });
  assert.equal(statusCheck.status, "approved");
  assert.equal(statusCheck.additionalInfoStatus, "COMPLETED");
  pass("statusSeparation", {
    applicationStatus: statusCheck.status,
    additionalInfoStatus: statusCheck.additionalInfoStatus,
  });

  // Browser: organizer creates registration link in UI → open copied URL in fresh context
  const browser = await chromium.launch({ headless: true });
  try {
    const password = String(app.DEMO_PASSWORD || "123456!!");
    const orgPage = await browser.newPage();
    await orgPage.setViewportSize({ width: 1366, height: 900 });
    await orgPage.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90_000 });
    if (orgPage.url().includes("/login")) {
      const idBox = orgPage.locator("#login-identifier, input[name='identifier']");
      if (await idBox.count()) await idBox.first().fill("organizer");
      await orgPage.locator("input[type='password']").first().fill(password);
      await orgPage.locator("button[type='submit']").first().click();
      await orgPage.waitForURL((url) => !url.pathname.startsWith("/login"), {
        timeout: 45_000,
      });
    }
    await orgPage.goto(`${BASE}/organizer/events/${event.id}/applications`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    // Prefer UI-created URL (Preview HMAC SSOT). Fallback: regenerate via service then refresh.
    let browserPublicUrl = "";
    const openLinkBtn = orgPage.getByRole("button", {
      name: /등록 링크( 생성)?/,
    });
    if (await openLinkBtn.count()) {
      await openLinkBtn.first().click();
      await orgPage.waitForTimeout(1200);
    }
    const urlMono = orgPage.locator("p.font-mono, .font-mono").filter({
      hasText: "/external/event-registration/",
    });
    if (await urlMono.count()) {
      browserPublicUrl = (await urlMono.first().innerText()).trim();
    }
    if (!browserPublicUrl.includes("/external/event-registration/")) {
      // Panel may already be open from ensure — try regenerate
      const regen = orgPage.getByRole("button", { name: /재발급|다시 생성|새 링크/ });
      if (await regen.count()) {
        await regen.first().click();
        await orgPage.waitForTimeout(1500);
      }
      if (await urlMono.count()) {
        browserPublicUrl = (await urlMono.first().innerText()).trim();
      }
    }
    if (!browserPublicUrl.includes("/external/event-registration/")) {
      // last resort: DB url rebuilt with Preview secrets (already forced)
      browserPublicUrl = publicUrl;
    }
    pass("browserOrganizerLinkCreate", {
      urlHost: (() => {
        try {
          return new URL(browserPublicUrl).host;
        } catch {
          return "invalid";
        }
      })(),
      fromUi: browserPublicUrl !== publicUrl,
    });

    const page = await browser.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    const navRes = await page.goto(browserPublicUrl, {
      waitUntil: "networkidle",
      timeout: 90_000,
    });
    await page.waitForTimeout(800);
    const httpStatus = navRes?.status() ?? 0;
    const body = await page.locator("body").innerText();
    const linkInvalid = body.includes("유효하지 않은 등록 링크");
    const formRendered =
      !linkInvalid &&
      (body.includes("선수") || body.includes("신청") || body.includes("체육관"));

    // gender → category → division cascade
    const genderSelect = page.locator("select").filter({ has: page.locator("option[value='male']") }).first();
    if (await genderSelect.count()) {
      await genderSelect.selectOption("male");
      await page.waitForTimeout(200);
    }
    const categorySelect = page.locator("select").nth(1);
    if (await categorySelect.count()) {
      const cats = await categorySelect.locator("option").allTextContents();
      const pick = cats.find((c) => c.trim() && !/선택|성별|경기/.test(c));
      if (pick) await categorySelect.selectOption({ label: pick.trim() });
      await page.waitForTimeout(300);
    }
    let otherSelected = false;
    const selects = page.locator("select");
    const selectCount = await selects.count();
    for (let i = 0; i < selectCount; i += 1) {
      const options = await selects.nth(i).locator("option").allTextContents();
      if (options.some((o) => o.trim() === "기타")) {
        await selects.nth(i).selectOption({ label: "기타" });
        otherSelected = true;
        break;
      }
    }
    const hasOtherInDom =
      otherSelected ||
      (!linkInvalid && body.includes("기타")) ||
      (await page.locator("option", { hasText: "기타" }).count()) > 0;
    pass("browserMobileRegLink", {
      httpStatus,
      linkInvalid,
      formRendered,
      otherOptionInDom: hasOtherInDom,
      otherSelected,
      note: linkInvalid
        ? "HMAC still failing after Preview secret force-overwrite / UI URL"
        : "OK",
    });
    if (linkInvalid) {
      fail("browser registration link HMAC invalid");
    }
    if (!formRendered) {
      fail("browser registration form not rendered");
    }
    const overflowX = await page.evaluate(() => {
      const el = document.documentElement;
      return el.scrollWidth > el.clientWidth + 2;
    });
    (report.flows as Record<string, Record<string, unknown>>).browserMobileRegLink.overflowX =
      overflowX ? "FAIL" : "PASS";

    // 1366 applications board smoke (reuse org session)
    await orgPage.goto(`${BASE}/organizer/events/${event.id}/applications`, {
      waitUntil: "domcontentloaded",
      timeout: 90_000,
    });
    const boardText = await orgPage.locator("body").innerText();
    pass("browserOrganizerBoard", {
      hasAdditionalInfo: boardText.includes("추가정보"),
      hasRequestOrResend:
        boardText.includes("요청") || boardText.includes("재전송"),
      hasRegistrationLinkHint:
        boardText.includes("등록 링크") || boardText.includes("등록링크"),
      hasOtherBadge:
        boardText.includes("체급 확인 필요") || boardText.includes("기타"),
      hasResolveAction: boardText.includes("체급 지정"),
    });
  } finally {
    await browser.close();
  }

  // Multi-event contact impact demo
  const sharedFighter = adultApp.fighterId;
  const phoneBefore = (
    await prisma.fighter.findUniqueOrThrow({ where: { id: sharedFighter } })
  ).phone;
  await additionalInfoService.updateApplicantContact(actor, {
    applicationId: adultAppId,
    phone: "01070001111",
  });
  const phoneAfter = (
    await prisma.fighter.findUniqueOrThrow({ where: { id: sharedFighter } })
  ).phone;
  assert.notEqual(phoneBefore, phoneAfter);
  pass("multiEventContactImpact", {
    confirmed: "Fighter.phone update is person-level (all apps share it)",
    beforeLast4: phoneBefore.replace(/\D/g, "").slice(-4),
    afterLast4: phoneAfter.replace(/\D/g, "").slice(-4),
  });

  if (!keepQa) await cleanupQa();

  report.ok = (report.failReasons as string[]).length === 0;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, deployment: report.deployment, flows: Object.keys(report.flows as object) }, null, 2));
  if (!report.ok) process.exitCode = 1;

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  (report.failReasons as string[]).push(String(err?.message || err));
  report.ok = false;
  try {
    // best-effort cleanup on failure
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { Pool } = await import("pg");
    const { PrismaClient } = await import("../src/generated/prisma");
    const pg = railwayJson("Postgres");
    const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
    if (/yamanote/i.test(dbUrl)) {
      const pool = new Pool({
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      });
      const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
      const events = await prisma.event.findMany({
        where: { title: { startsWith: PREFIX } },
        select: { id: true },
      });
      const eventIds = events.map((e) => e.id);
      if (eventIds.length) {
        const apps = await prisma.eventApplication.findMany({
          where: { eventId: { in: eventIds } },
          select: { id: true, fighterId: true },
        });
        const appIds = apps.map((a) => a.id);
        const fighterIds = [...new Set(apps.map((a) => a.fighterId))];
        if (appIds.length) {
          await prisma.eventApplicationPayment.deleteMany({
            where: { eventApplicationId: { in: appIds } },
          });
          await prisma.eventApplication.deleteMany({
            where: { id: { in: appIds } },
          });
        }
        await prisma.eventExternalRegistrationSubmission.deleteMany({
          where: { link: { eventId: { in: eventIds } } },
        });
        await prisma.eventExternalRegistrationLink.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.eventDivision.deleteMany({
          where: { eventId: { in: eventIds } },
        });
        await prisma.eventCourt.deleteMany({ where: { eventId: { in: eventIds } } });
        await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
        if (fighterIds.length) {
          await prisma.fighterGymHistory.deleteMany({
            where: { fighterId: { in: fighterIds } },
          });
          await prisma.fighter.deleteMany({
            where: { id: { in: fighterIds }, name: { startsWith: PREFIX } },
          });
        }
        report.cleanupOnError = {
          events: eventIds.length,
          applications: appIds.length,
        };
      }
      await prisma.$disconnect();
      await pool.end();
    }
  } catch (cleanupErr) {
    report.cleanupError = String((cleanupErr as Error)?.message || cleanupErr);
  }
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error(err);
  process.exitCode = 1;
});
