/**
 * Gym affiliation separation Preview E2E (yamanote)
 *   npx tsx scripts/e2e-gym-affiliation-preview-qa.mts
 *   npx tsx scripts/e2e-gym-affiliation-preview-qa.mts --cleanup-only
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const PREFIX = "GYM_AFFIL_QA_";
const OUT = join(process.cwd(), "test-results", "gym-affiliation-preview-qa");
const cleanupOnly = process.argv.includes("--cleanup-only");

mkdirSync(OUT, { recursive: true });

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

const report: Record<string, unknown> = {
  ok: false,
  flows: {} as Record<string, unknown>,
};
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

async function main() {
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  assertYamanote(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  for (const key of [
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "MATCHON_PII_ENCRYPTION_KEY",
    "EXTERNAL_REGISTRATION_URL_SECRET",
    "REGISTRATION_URL_SECRET",
    "CREDIT_LEDGER_HMAC_SECRET",
  ]) {
    if (app[key]) process.env[key] = app[key];
  }
  if (app.EXTERNAL_REGISTRATION_URL_SECRET) {
    process.env.EXTERNAL_REGISTRATION_URL_SECRET =
      app.EXTERNAL_REGISTRATION_URL_SECRET;
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("../src/generated/prisma");
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
        select: { fighterId: true },
      });
      await prisma.eventApplicationPayment.deleteMany({
        where: { eventApplication: { eventId: { in: eventIds } } },
      });
      await prisma.eventExternalRegistrationSubmission.deleteMany({
        where: { link: { eventId: { in: eventIds } } },
      });
      await prisma.eventExternalRegistrationLink.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventApplication.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventDivision.deleteMany({
        where: { eventId: { in: eventIds } },
      });
      await prisma.eventCourt.deleteMany({ where: { eventId: { in: eventIds } } });
      await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
      const fighterIds = [...new Set(apps.map((a) => a.fighterId))];
      if (fighterIds.length) {
        await prisma.fighter.deleteMany({
          where: { id: { in: fighterIds }, name: { startsWith: PREFIX } },
        });
      }
    }
    console.log("cleanup OK", { events: eventIds.length });
  }

  await cleanupQa();
  if (cleanupOnly) {
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const gymBefore = await prisma.gym.count();
  const userBefore = await prisma.user.count({
    where: { loginId: { startsWith: "ext-reg-" } },
  });

  const { applicationService } = await import(
    "../src/lib/services/application.service"
  );
  const { externalRegistrationLinkService } = await import(
    "../src/lib/services/external-registration-link.service"
  );
  const {
    resolveApplicationGymDisplayName,
    excludeExternalRegistrationPlaceholderGymWhere,
  } = await import("../src/lib/gym/external-registration-placeholder-gym");

  const organizerUser = await prisma.user.findFirst({
    where: {
      OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }],
    },
    include: { organizer: true },
  });
  assert.ok(organizerUser?.organizer);
  const actor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "organizer@demo.local",
    loginId: organizerUser.loginId ?? "organizer",
    organizerId: organizerUser.organizer.id,
  };

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
      publicSlug: `gym-affil-qa-${stamp}`,
      courts: { create: [{ name: "QA코트", sortOrder: 0 }] },
      divisions: {
        create: [
          {
            sportType: "kickboxing",
            gender: "male",
            ageGroup: "성인",
            weightClass: "-70kg",
          },
        ],
      },
    },
    include: { divisions: true },
  });
  const division = event.divisions[0]!;
  const competitionCategory = division.ageGroup || "성인";

  await externalRegistrationLinkService.getOrCreateLink(actor, event.id);
  const link = await prisma.eventExternalRegistrationLink.findUniqueOrThrow({
    where: { eventId: event.id },
  });
  const { buildExternalRegistrationPublicUrl } = await import(
    "../src/lib/external-registration/token"
  );
  const token = buildExternalRegistrationPublicUrl(link.id, link.tokenHash)
    .split("/")
    .pop()!;

  const batch = await applicationService.createExternalLinkBatchApplications({
    token,
    clientSubmissionId: randomUUID(),
    gymInfo: { gymName: "QA FIGHT GYM" },
    athletes: [
      {
        fighterName: `${PREFIX}Adult`,
        gender: "male",
        birthDate: "1995-01-01",
        phone: "01090001111",
        competitionCategory,
        divisionSelection: {
          selectionType: "REGISTERED",
          divisionId: division.id,
        },
        structuredRecord: { totalBouts: 0, wins: 0, draws: 0, losses: 0 },
        applicationWeightKg: "",
        careerText: "",
        memo: "",
      },
    ],
  });
  const appId = batch.results[0]!.applicationId;
  const appRow = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: appId },
    include: { gym: true, fighter: true },
  });
  assert.equal(appRow.gymId, null);
  assert.equal(appRow.gymNameSnapshot, "QA FIGHT GYM");
  assert.equal(appRow.fighter.currentGymId, null);
  const display = resolveApplicationGymDisplayName({
    gymNameSnapshot: appRow.gymNameSnapshot,
    gymSnapshot: appRow.gymSnapshot,
    gymRelationName: appRow.gym?.name,
  });
  assert.equal(display, "QA FIGHT GYM");
  pass("externalNoGymCreate", {
    gymId: appRow.gymId,
    gymNameSnapshot: appRow.gymNameSnapshot,
    display,
  });

  const gymAfter = await prisma.gym.count();
  const userAfter = await prisma.user.count({
    where: { loginId: { startsWith: "ext-reg-" } },
  });
  assert.equal(gymAfter, gymBefore);
  assert.equal(userAfter, userBefore);
  pass("noGymOrExtRegUserGrowth", {
    gymBefore,
    gymAfter,
    userBefore,
    userAfter,
  });

  const registeredGyms = await prisma.gym.findMany({
    where: excludeExternalRegistrationPlaceholderGymWhere,
    select: { name: true },
  });
  assert.ok(!registeredGyms.some((g) => g.name === "QA FIGHT GYM"));
  assert.ok(
    !registeredGyms.some((g) => g.name.startsWith("MATCHON 외부등록")),
  );
  pass("registeredGymListExcludesAffiliation", {
    sampleCount: registeredGyms.length,
  });

  const ExcelJS = (await import("exceljs")).default;
  const { APPLICANT_EXCEL_HEADERS, APPLICANT_EXCEL_SHEET_DATA } = await import(
    "../src/lib/applicant-excel/columns"
  );
  const gymMid = await prisma.gym.count();
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet(APPLICANT_EXCEL_SHEET_DATA);
  sheet.addRow([...APPLICANT_EXCEL_HEADERS]);
  const weightLabel =
    [division.ageGroup, division.weightClass].filter(Boolean).join(" ") ||
    "-70kg";
  for (const [i, name, phone, birth] of [
    [1, `${PREFIX}Excel1`, "01090002222", "1994-02-02"],
    [2, `${PREFIX}Excel2`, "01090003333", "1993-03-03"],
  ] as const) {
    const values: Record<(typeof APPLICANT_EXCEL_HEADERS)[number], string> = {
      번호: String(i),
      체육관명: "QA FIGHT GYM",
      선수명: name,
      성별: "남",
      생년월일: birth,
      연락처: phone,
      경기구분: competitionCategory,
      체급: weightLabel,
      총전: "0",
      승: "0",
      무: "0",
      패: "0",
      신청체중: "70",
      운동경력: "",
      보호자이름: "",
      보호자연락처: "",
      기타내용: "",
      메모: "",
    };
    sheet.addRow(APPLICANT_EXCEL_HEADERS.map((h) => values[h]));
  }
  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const excel = await applicationService.commitOrganizerApplicantExcel(actor, {
    eventId: event.id,
    fileName: "qa-affil.xlsx",
    buffer,
  });
  assert.equal(excel.created, 2);
  const excelApps = await prisma.eventApplication.findMany({
    where: {
      eventId: event.id,
      gymNameSnapshot: "QA FIGHT GYM",
      fighter: { name: { startsWith: `${PREFIX}Excel` } },
    },
  });
  assert.equal(excelApps.length, 2);
  assert.ok(excelApps.every((a) => a.gymId == null));
  assert.equal(await prisma.gym.count(), gymMid);
  pass("excelNoGymCreate", { created: excel.created });

  if (!process.argv.includes("--keep")) {
    await cleanupQa();
  }

  report.ok = true;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { ok: true, flows: Object.keys(report.flows as object) },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  report.ok = false;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
