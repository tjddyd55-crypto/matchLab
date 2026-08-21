/**
 * Preview E2E: organizer application edit / restore / permanent delete
 *   npx tsx scripts/e2e-application-lifecycle-preview-qa.mts
 *   npx tsx scripts/e2e-application-lifecycle-preview-qa.mts --cleanup-only
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";

const PREFIX = "APPLICATION_EDIT_QA_";
const OUT = join(process.cwd(), "test-results", "application-lifecycle-preview-qa");
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

const report: Record<string, unknown> = { ok: false, flows: {} };
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

async function main() {
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || "");
  if (!/yamanote/i.test(dbUrl) || /yamabiko/i.test(dbUrl)) {
    throw new Error("REFUSE: not yamanote");
  }
  process.env.DATABASE_URL = dbUrl;
  for (const k of [
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "MATCHON_PII_ENCRYPTION_KEY",
    "CREDIT_LEDGER_HMAC_SECRET",
  ]) {
    if (app[k]) process.env[k] = app[k];
  }

  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { Pool } = await import("pg");
  const { PrismaClient, ApplicationStatus, PaymentStatus } = await import(
    "../src/generated/prisma"
  );
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  async function cleanup() {
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
      await prisma.bracketMatch.deleteMany({
        where: { bracket: { eventId: { in: eventIds } } },
      });
      await prisma.bracket.deleteMany({ where: { eventId: { in: eventIds } } });
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
          where: {
            id: { in: fighterIds },
            name: { startsWith: PREFIX },
            gymMemberId: null,
            userId: null,
          },
        });
      }
    }
    pass("cleanup", { events: eventIds.length });
  }

  await cleanup();
  if (cleanupOnly) {
    report.ok = true;
    writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const { applicationService } = await import(
    "../src/lib/services/application.service"
  );
  const { applicationOrganizerBulkService } = await import(
    "../src/lib/services/application-organizer-bulk.service"
  );
  const { applicationOrganizerLifecycleService } = await import(
    "../src/lib/services/application-organizer-lifecycle.service"
  );

  const organizerUser = await prisma.user.findFirst({
    where: { organizer: { isNot: null } },
    include: { organizer: true },
    orderBy: { createdAt: "asc" },
  });
  assert.ok(organizerUser?.organizer);
  const actor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "org@qa.local",
    loginId: organizerUser.loginId ?? "organizer",
    organizerId: organizerUser.organizer.id,
  };

  const stamp = Date.now().toString(36);
  const event = await prisma.event.create({
    data: {
      organizerId: organizerUser.organizer.id,
      title: `${PREFIX}Event ${stamp}`,
      location: "QA",
      eventDate: new Date("2026-12-20T00:00:00.000Z"),
      registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
      status: "open",
      publicSlug: `app-edit-qa-${stamp}`,
      courts: { create: [{ name: "QA코트", sortOrder: 0 }] },
      divisions: {
        create: [
          {
            sportType: "kickboxing",
            gender: "male",
            ageGroup: "성인",
            weightClass: "-60kg",
            weightLimitText: "-60kg",
          },
          {
            sportType: "kickboxing",
            gender: "male",
            ageGroup: "성인",
            weightClass: "-65kg",
            weightLimitText: "-65kg",
          },
        ],
      },
    },
    include: { divisions: true },
  });
  const d60 = event.divisions.find((d) => d.weightClass === "-60kg")!;
  const d65 = event.divisions.find((d) => d.weightClass === "-65kg")!;

  const created = await applicationService.createOrganizerManualApplication(
    actor,
    {
      eventId: event.id,
      applicationWeightKg: 58,
      competitionCategory: "성인",
      discipline: "kickboxing",
      manualDivisionOverride: true,
      divisionId: d60.id,
      gymMode: "manual",
      gymName: `${PREFIX}Gym`,
      fighterName: `${PREFIX}김도윤`,
      gender: "male",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      phone: "01011112222",
      applicationStatus: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.unpaid,
      memo: "원본메모",
      recordText: "3전 2승 1패",
      careerText: "2년",
      confirmDuplicate: false,
    },
  );

  // edit name + content
  await applicationOrganizerLifecycleService.updateOrganizerEventApplication(
    actor,
    {
      applicationId: created.applicationId,
      eventId: event.id,
      applicationWeightKg: 58,
      competitionCategory: "성인",
      discipline: "kickboxing",
      manualDivisionOverride: true,
      divisionId: d60.id,
      gymMode: "manual",
      gymName: `${PREFIX}Gym`,
      fighterName: `${PREFIX}김도운`,
      gender: "male",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      phone: "01099998888",
      applicationStatus: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.unpaid,
      memo: "수정메모",
      recordText: "4전 3승 1패",
      careerText: "3년",
      confirmDuplicate: false,
    },
  );
  const edited = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: created.applicationId },
    include: { fighter: true },
  });
  assert.equal(edited.fighter.name, `${PREFIX}김도운`);
  assert.equal(edited.memo, "수정메모");
  assert.equal(edited.recordText, "4전 3승 1패");
  assert.equal(edited.status, ApplicationStatus.approved);
  pass("editNameContent", { id: edited.id });

  // division change (unassigned)
  await applicationOrganizerLifecycleService.updateOrganizerEventApplication(
    actor,
    {
      applicationId: created.applicationId,
      eventId: event.id,
      applicationWeightKg: 63,
      competitionCategory: "성인",
      discipline: "kickboxing",
      manualDivisionOverride: true,
      divisionId: d65.id,
      gymMode: "manual",
      gymName: `${PREFIX}Gym`,
      fighterName: `${PREFIX}김도운`,
      gender: "male",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      phone: "01099998888",
      applicationStatus: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.unpaid,
      memo: "수정메모",
      recordText: "4전 3승 1패",
      careerText: "3년",
      confirmDuplicate: false,
    },
  );
  const moved = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: created.applicationId },
  });
  assert.equal(moved.divisionId, d65.id);
  pass("divisionChange", { divisionId: moved.divisionId });

  // cancel + restore
  const ctx =
    await (await import("../src/lib/repositories/application.repository")).applicationRepository.findApplicationOwnershipContext(
      created.applicationId,
    );
  assert.ok(ctx);
  await applicationOrganizerBulkService.organizerCancel(
    actor,
    created.applicationId,
    ctx,
  );
  const cancelled = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: created.applicationId },
  });
  assert.equal(cancelled.status, ApplicationStatus.rejected);
  const restored =
    await applicationOrganizerLifecycleService.restoreOrganizerCancelledApplication(
      actor,
      created.applicationId,
    );
  assert.equal(restored.applicationId, created.applicationId);
  const afterRestore = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: created.applicationId },
  });
  assert.equal(afterRestore.cancellationSource, null);
  assert.ok(
    afterRestore.status === ApplicationStatus.approved ||
      afterRestore.status === ApplicationStatus.pending,
  );
  pass("cancelRestore", { status: afterRestore.status });

  // permanent delete + re-register
  await applicationOrganizerLifecycleService.permanentlyDeleteOrganizerApplication(
    actor,
    created.applicationId,
  );
  const gone = await prisma.eventApplication.findUnique({
    where: { id: created.applicationId },
  });
  assert.equal(gone, null);
  pass("permanentDelete", true);

  const recreated = await applicationService.createOrganizerManualApplication(
    actor,
    {
      eventId: event.id,
      applicationWeightKg: 63,
      competitionCategory: "성인",
      discipline: "kickboxing",
      manualDivisionOverride: true,
      divisionId: d65.id,
      gymMode: "manual",
      gymName: `${PREFIX}Gym`,
      fighterName: `${PREFIX}김도윤`,
      gender: "male",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      phone: "01011112222",
      applicationStatus: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.unpaid,
      confirmDuplicate: true,
    },
  );
  assert.ok(recreated.applicationId);
  assert.notEqual(recreated.applicationId, created.applicationId);
  pass("reregisterAfterDelete", { id: recreated.applicationId });

  // assigned structural block
  const bracket = await prisma.bracket.create({
    data: {
      eventId: event.id,
      title: `${PREFIX}Bracket`,
      type: "single_elimination",
      divisionId: d65.id,
    },
  });
  await prisma.bracketMatch.create({
    data: {
      bracketId: bracket.id,
      round: 1,
      matchOrder: 1,
      fighterRedId: recreated.fighterId,
      status: "waiting",
    },
  });

  let blocked = false;
  try {
    await applicationOrganizerLifecycleService.updateOrganizerEventApplication(
      actor,
      {
        applicationId: recreated.applicationId,
        eventId: event.id,
        applicationWeightKg: 58,
        competitionCategory: "성인",
        discipline: "kickboxing",
        manualDivisionOverride: true,
        divisionId: d60.id,
        gymMode: "manual",
        gymName: `${PREFIX}Gym`,
        fighterName: `${PREFIX}김도윤`,
        gender: "male",
        birthDate: new Date("1998-01-01T00:00:00.000Z"),
        phone: "01011112222",
        applicationStatus: ApplicationStatus.approved,
        paymentStatus: PaymentStatus.unpaid,
        confirmDuplicate: false,
      },
    );
  } catch {
    blocked = true;
  }
  assert.equal(blocked, true);
  pass("assignedStructuralBlock", true);

  // name typo still allowed when assigned
  await applicationOrganizerLifecycleService.updateOrganizerEventApplication(
    actor,
    {
      applicationId: recreated.applicationId,
      eventId: event.id,
      applicationWeightKg: 63,
      competitionCategory: "성인",
      discipline: "kickboxing",
      manualDivisionOverride: true,
      divisionId: d65.id,
      gymMode: "manual",
      gymName: `${PREFIX}Gym`,
      fighterName: `${PREFIX}김도운`,
      gender: "male",
      birthDate: new Date("1998-01-01T00:00:00.000Z"),
      phone: "01011112222",
      applicationStatus: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.unpaid,
      memo: "오타수정",
      confirmDuplicate: false,
    },
  );
  const typoFixed = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: recreated.applicationId },
    include: { fighter: true },
  });
  assert.equal(typoFixed.fighter.name, `${PREFIX}김도운`);
  pass("assignedNameEditAllowed", true);

  // delete blocked when assigned
  let deleteBlocked = false;
  try {
    await applicationOrganizerLifecycleService.permanentlyDeleteOrganizerApplication(
      actor,
      recreated.applicationId,
    );
  } catch {
    deleteBlocked = true;
  }
  assert.equal(deleteBlocked, true);
  const stillThere = await prisma.eventApplication.findUnique({
    where: { id: recreated.applicationId },
  });
  assert.ok(stillThere);
  pass("assignedDeleteBlock", true);

  await cleanup();
  report.ok = true;
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (e) => {
  report.ok = false;
  (report as { error?: string }).error = String(e);
  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.error(e);
  process.exit(1);
});
