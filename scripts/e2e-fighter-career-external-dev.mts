/**
 * Development E2E: Fighter Career + External Record (yamanote only)
 *   npx tsx scripts/e2e-fighter-career-external-dev.mts
 *   npx tsx scripts/e2e-fighter-career-external-dev.mts --skip-browser
 *   QA_BASE_URL=http://127.0.0.1:3000 npx tsx scripts/e2e-fighter-career-external-dev.mts
 */
import "dotenv/config";

import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Module from "node:module";
import { join } from "node:path";

const PREFIX = "E2E_FIGHTER_EXT_";
const STAMP = process.env.E2E_STAMP ?? "20260901";
const EVENT_TITLE = `${PREFIX}${STAMP}`;
const OUT = join(process.cwd(), "test-results", "fighter-career-external-dev");
const skipBrowser = process.argv.includes("--skip-browser");

mkdirSync(OUT, { recursive: true });

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

type QACtx = {
  fighterAId: string;
  fighterBId: string;
  fighterCode: string;
  gym1Id: string;
  gym2Id: string;
  memberGymId: string;
  snapshotAppId: string;
  snapshotEventId: string;
  matchEventId: string;
  confirmMatchId: string;
  ncMatchId: string;
  bracketMatchSnapshot: Record<string, unknown>;
  publicSlug: string | null;
  associationLoginId: string;
};

type Report = {
  verdict: "FIGHTER_CAREER_EXTERNAL_E2E_PASS" | "FIGHTER_CAREER_EXTERNAL_E2E_BLOCKED";
  blockedReason?: string;
  checks: Record<string, unknown>;
  errors: string[];
  ctx?: Partial<QACtx>;
  productionUntouched: boolean;
  currentEventMutation: boolean;
};

const report: Report = {
  verdict: "FIGHTER_CAREER_EXTERNAL_E2E_PASS",
  checks: {},
  errors: [],
  productionUntouched: true,
  currentEventMutation: false,
};

function pass(name: string, detail?: unknown) {
  report.checks[name] = detail ?? "PASS";
  console.log(`PASS ${name}`, detail ?? "");
}

function fail(msg: string): never {
  report.errors.push(msg);
  report.verdict = "FIGHTER_CAREER_EXTERNAL_E2E_BLOCKED";
  report.blockedReason = msg;
  throw new Error(msg);
}

function assertYamanote(url: string) {
  if (!/yamanote/i.test(url) || /yamabiko/i.test(url)) {
    fail(`REFUSING: DATABASE_URL is not yamanote dev (${url.slice(0, 48)}...)`);
  }
}

function assertNotProduction(url: string) {
  if (/yamabiko|production|prod-db/i.test(url)) {
    fail(`REFUSING: production DB detected (${url.slice(0, 48)}...)`);
  }
}

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function setupYamanoteEnv() {
  const pg = railwayJson("Postgres");
  const app = railwayJson("app");
  const dbUrl = String(pg.DATABASE_PUBLIC_URL || pg.DATABASE_URL || "");
  assert.ok(dbUrl, "Railway Postgres URL missing");
  assertYamanote(dbUrl);
  assertNotProduction(dbUrl);
  process.env.DATABASE_URL = dbUrl;
  for (const key of [
    "AUTH_SECRET",
    "NEXTAUTH_SECRET",
    "MATCHON_PII_ENCRYPTION_KEY",
    "NEXT_PUBLIC_APP_URL",
  ]) {
    if (app[key]) process.env[key] = app[key];
  }
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  }
}

const BASE = (
  process.env.QA_BASE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "123456!!";

type AppSnap = {
  winsSnapshot: number | null;
  lossesSnapshot: number | null;
  drawsSnapshot: number | null;
  totalBoutsSnapshot: number | null;
  fighterSnapshot: unknown;
};

async function readAppSnap(
  prisma: import("../src/generated/prisma").PrismaClient,
  appId: string,
): Promise<AppSnap> {
  const row = await prisma.eventApplication.findUniqueOrThrow({
    where: { id: appId },
    select: {
      winsSnapshot: true,
      lossesSnapshot: true,
      drawsSnapshot: true,
      totalBoutsSnapshot: true,
      fighterSnapshot: true,
    },
  });
  return row;
}

function assertSnapEqual(label: string, before: AppSnap, after: AppSnap) {
  assert.deepEqual(
    {
      wins: after.winsSnapshot,
      losses: after.lossesSnapshot,
      draws: after.drawsSnapshot,
      total: after.totalBoutsSnapshot,
      fighterSnapshot: after.fighterSnapshot,
    },
    {
      wins: before.winsSnapshot,
      losses: before.lossesSnapshot,
      draws: before.drawsSnapshot,
      total: before.totalBoutsSnapshot,
      fighterSnapshot: before.fighterSnapshot,
    },
    `${label}: EventApplication snapshot changed`,
  );
}

async function readExternal(
  prisma: import("../src/generated/prisma").PrismaClient,
  fighterId: string,
) {
  return prisma.fighter.findUniqueOrThrow({
    where: { id: fighterId },
    select: {
      externalRecordWin: true,
      externalRecordLoss: true,
      externalRecordDraw: true,
      externalRecordNoContest: true,
      recordWin: true,
      recordLoss: true,
      recordDraw: true,
      recordTotalBouts: true,
      recordText: true,
      careerText: true,
    },
  });
}

async function runServiceE2E(): Promise<QACtx> {
  setupYamanoteEnv();

  const migrationSql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260901170000_fighter_external_record/migration.sql",
    ),
    "utf8",
  );
  assert.doesNotMatch(migrationSql, /UPDATE\s+"Fighter"/i);
  assert.doesNotMatch(migrationSql, /UPDATE\s+"EventApplication"/i);
  assert.doesNotMatch(migrationSql, /UPDATE\s+"BracketMatch"/i);
  pass("migration_sql_no_data_mutation");

  execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
  pass("migrate_deploy_yamanote");

  const { prisma } = await import("../src/lib/prisma");
  const { computeCombinedRecord, buildExternalRecordFromFighter } = await import(
    "../src/lib/fighter-unified-profile/record-utils"
  );
  const { computeOfficialRecordFromResults } = await import(
    "../src/lib/fighter-unified-profile/official-record"
  );
  const { resultRepository } = await import("../src/lib/repositories/result.repository");
  const { fighterExternalRecordUpdateSchema } = await import(
    "../src/lib/validators/fighter-external-record.validator"
  );

  const appCountBefore = await prisma.eventApplication.count();
  const bracketCountBefore = await prisma.bracketMatch.count();

  const cols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Fighter'
      AND column_name LIKE 'externalRecord%'
    ORDER BY column_name
  `;
  assert.equal(cols.length, 4);
  pass("external_columns_exist", cols.map((c) => c.column_name));

  const legacySample = await prisma.fighter.findMany({
    where: {
      OR: [{ recordWin: { gt: 0 } }, { recordText: { not: null } }],
      fighterCode: { not: { startsWith: PREFIX } },
    },
    take: 5,
    select: {
      id: true,
      fighterCode: true,
      recordWin: true,
      recordLoss: true,
      recordDraw: true,
      recordText: true,
      careerText: true,
      externalRecordWin: true,
      externalRecordLoss: true,
      externalRecordDraw: true,
      externalRecordNoContest: true,
    },
  });
  for (const f of legacySample) {
    assert.equal(f.externalRecordWin, 0);
    assert.equal(f.externalRecordLoss, 0);
    assert.equal(f.externalRecordDraw, 0);
    assert.equal(f.externalRecordNoContest, 0);
  }
  pass("legacy_fighters_external_zero", { sampled: legacySample.length });

  const appCountAfter = await prisma.eventApplication.count();
  const bracketCountAfter = await prisma.bracketMatch.count();
  assert.equal(appCountAfter, appCountBefore);
  assert.equal(bracketCountAfter, bracketCountBefore);
  pass("event_application_bracket_row_counts_unchanged", {
    applications: appCountAfter,
    bracketMatches: bracketCountAfter,
  });

  const organizerUser = await prisma.user.findFirst({
    where: { OR: [{ loginId: "organizer" }, { email: "organizer@demo.local" }] },
    include: { organizer: true },
  });
  assert.ok(organizerUser?.organizer, "demo organizer missing");
  const organizerActor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "organizer@demo.local",
    loginId: organizerUser.loginId ?? "organizer",
    organizerId: organizerUser.organizer.id,
  };

  async function findDemoGym(loginId: string) {
    const user = await prisma.user.findFirst({
      where: { loginId },
      include: { ownedGym: true },
    });
    assert.ok(user?.ownedGym, `demo gym ${loginId} missing`);
    return { user, gym: user.ownedGym };
  }

  const gym1 = await findDemoGym("gym1");
  const gym2 = await findDemoGym("gym2");
  const gym1Actor = {
    userId: gym1.user.id,
    role: "gym" as const,
    email: gym1.user.email ?? "gym1@demo.local",
    loginId: gym1.user.loginId ?? "gym1",
    gymId: gym1.gym.id,
  };
  const gym2Actor = {
    userId: gym2.user.id,
    role: "gym" as const,
    email: gym2.user.email ?? "gym2@demo.local",
    loginId: gym2.user.loginId ?? "gym2",
    gymId: gym2.gym.id,
  };

  const memberGymRow = await prisma.associationMemberGym.findFirst({
    where: { gymId: gym1.gym.id, status: "active" },
    select: { id: true, organizerId: true },
  });
  assert.ok(memberGymRow, "association member gym for gym1 missing");
  const memberGymId = memberGymRow.id;
  const assocOrganizer = await prisma.organizer.findUnique({
    where: { id: memberGymRow.organizerId },
    include: { user: true },
  });
  assert.ok(assocOrganizer?.user?.loginId, "association organizer login missing");
  const associationLoginId = assocOrganizer.user!.loginId!;
  pass("member_gym_resolved", { memberGymId, associationLoginId });

  let event = await prisma.event.findFirst({ where: { title: EVENT_TITLE } });
  if (event) {
    await prisma.matchResult.deleteMany({ where: { eventId: event.id } });
    await prisma.bracketMatch.deleteMany({ where: { bracket: { eventId: event.id } } });
    await prisma.bracket.deleteMany({ where: { eventId: event.id } });
    await prisma.eventApplication.deleteMany({ where: { eventId: event.id } });
    await prisma.eventDivision.deleteMany({ where: { eventId: event.id } });
    await prisma.eventCourt.deleteMany({ where: { eventId: event.id } });
    await prisma.eventPaymentSetting.deleteMany({ where: { eventId: event.id } });
    await prisma.event.delete({ where: { id: event.id } });
  }

  const fighterCode = `${PREFIX}A_${STAMP}`;
  let fighterA = await prisma.fighter.findFirst({ where: { fighterCode } });
  if (fighterA) {
    await prisma.fighterGymHistory.deleteMany({ where: { fighterId: fighterA.id } });
    await prisma.eventApplication.deleteMany({ where: { fighterId: fighterA.id } });
    await prisma.matchResult.deleteMany({
      where: { OR: [{ fighterId: fighterA.id }, { opponentFighterId: fighterA.id }] },
    });
    await prisma.fighterProfile.deleteMany({ where: { fighterId: fighterA.id } });
    await prisma.fighter.delete({ where: { id: fighterA.id } });
  }

  const fighterBCode = `${PREFIX}B_${STAMP}`;
  let fighterB = await prisma.fighter.findFirst({ where: { fighterCode: fighterBCode } });
  if (fighterB) {
    await prisma.matchResult.deleteMany({
      where: { OR: [{ fighterId: fighterB.id }, { opponentFighterId: fighterB.id }] },
    });
    await prisma.fighter.delete({ where: { id: fighterB.id } });
  }

  fighterA = await prisma.fighter.create({
    data: {
      fighterCode,
      name: `${PREFIX}A 선수`,
      gender: "male",
      birthDate: new Date("2010-03-15T00:00:00.000Z"),
      phone: "01091001001",
      currentGymId: gym1.gym.id,
      externalRecordWin: 4,
      externalRecordLoss: 3,
      externalRecordDraw: 0,
      externalRecordNoContest: 0,
    },
  });
  await prisma.fighterGymHistory.create({
    data: { fighterId: fighterA.id, gymId: gym1.gym.id, status: "active" },
  });

  fighterB = await prisma.fighter.create({
    data: {
      fighterCode: fighterBCode,
      name: `${PREFIX}B 선수`,
      gender: "male",
      birthDate: new Date("2010-06-20T00:00:00.000Z"),
      phone: "01091001002",
      currentGymId: gym1.gym.id,
    },
  });
  pass("qa_fighters_created", { fighterA: fighterA.id, fighterB: fighterB.id });

  event = await prisma.event.create({
    data: {
      organizerId: organizerUser.organizer.id,
      title: EVENT_TITLE,
      location: "E2E Career QA",
      locationName: "E2E Career QA",
      roadAddress: "서울 E2E로 1",
      eventDate: new Date("2026-10-15T00:00:00.000Z"),
      registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-10-01T00:00:00.000Z"),
      status: "draft",
      publicSlug: `e2e-fighter-ext-${STAMP}`,
      paymentSetting: {
        create: {
          feeAmount: 50000,
          bankName: "E2E",
          accountNumber: "000",
          accountHolder: "E2E",
        },
      },
      courts: { create: [{ name: "E2E 코트", sortOrder: 0 }] },
      divisions: {
        create: [{
          sportType: "kickboxing",
          gender: "male",
          ageGroup: "중등부",
          weightClass: "-60kg",
          weightClassName: "웰터",
          weightLimitText: "-60kg",
        }],
      },
    },
    include: { divisions: true, courts: true },
  });

  const division = event.divisions[0]!;
  const court = event.courts[0]!;

  const snapshotApp = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: division.id,
      divisionSelectionType: "REGISTERED",
      gymId: gym1.gym.id,
      fighterId: fighterA.id,
      status: "approved",
      paymentStatus: "paid",
      winsSnapshot: 6,
      lossesSnapshot: 4,
      drawsSnapshot: 0,
      totalBoutsSnapshot: 10,
      fighterSnapshot: { name: fighterA.name, recordText: "10전 6승 4패" },
      gymSnapshot: { gymId: gym1.gym.id, name: gym1.gym.name },
      gymNameSnapshot: gym1.gym.name,
    },
  });
  await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: division.id,
      divisionSelectionType: "REGISTERED",
      gymId: gym1.gym.id,
      fighterId: fighterB.id,
      status: "approved",
      paymentStatus: "paid",
      fighterSnapshot: { name: fighterB.name },
      gymSnapshot: { gymId: gym1.gym.id, name: gym1.gym.name },
      gymNameSnapshot: gym1.gym.name,
    },
  });
  const initialSnap = await readAppSnap(prisma, snapshotApp.id);
  pass("snapshot_application_created", initialSnap);

  const { eventService } = await import("../src/lib/services/event.service");
  for (const status of ["open", "closed", "bracket_ready", "ongoing"] as const) {
    await eventService.changeEventStatus(organizerActor, {
      eventId: event.id,
      status,
    });
  }

  const { bracketService } = await import("../src/lib/services/bracket.service");
  const { resultService } = await import("../src/lib/services/result.service");
  const { BracketMatchOutcomeStyle } = await import("../src/generated/prisma");

  const { bracketId } = await bracketService.ensureBracketShellForDivision(
    organizerActor,
    { eventId: event.id, divisionId: division.id },
  );

  const m1 = await bracketService.createManualMatchWithPair(organizerActor, {
    bracketId,
    redFighterId: fighterA.id,
    blueFighterId: fighterB.id,
    defaultCourtId: court.id,
  });
  const m2 = await bracketService.createManualMatchWithPair(organizerActor, {
    bracketId,
    redFighterId: fighterA.id,
    blueFighterId: fighterB.id,
    defaultCourtId: court.id,
    allowDuplicateAssignment: true,
  });

  const bracketBefore = await prisma.bracketMatch.findMany({
    where: { bracketId },
    orderBy: { matchOrder: "asc" },
    select: {
      id: true,
      matchNumber: true,
      matchOrder: true,
      courtOrder: true,
      fighterRedId: true,
      fighterBlueId: true,
      fighterRedSnapshot: true,
      fighterBlueSnapshot: true,
    },
  });
  const bracketSnapBefore = JSON.stringify(bracketBefore);

  async function assertExternalUnchanged(step: string) {
    const ext = await readExternal(prisma, fighterA.id);
    assert.equal(ext.externalRecordWin, 4);
    assert.equal(ext.externalRecordLoss, 3);
    assert.equal(ext.externalRecordDraw, 0);
    assert.equal(ext.externalRecordNoContest, 0);
    pass(`${step}_external_unchanged`);
  }

  async function assertSnapshotUnchanged(step: string) {
    const snap = await readAppSnap(prisma, snapshotApp.id);
    assertSnapEqual(step, initialSnap, snap);
    pass(`${step}_application_snapshot_unchanged`);
  }

  async function assertBracketUnchanged(step: string) {
    const bracketAfter = await prisma.bracketMatch.findMany({
      where: { bracketId },
      orderBy: { matchOrder: "asc" },
      select: {
        id: true,
        matchNumber: true,
        matchOrder: true,
        courtOrder: true,
        fighterRedId: true,
        fighterBlueId: true,
        fighterRedSnapshot: true,
        fighterBlueSnapshot: true,
      },
    });
    assert.equal(JSON.stringify(bracketAfter), bracketSnapBefore, `${step}: bracket changed`);
    pass(`${step}_bracket_unchanged`);
  }

  async function careerBreakdown() {
    const rows = await resultRepository.listResultsByFighter(fighterA.id);
    const official = computeOfficialRecordFromResults(rows);
    const ext = buildExternalRecordFromFighter(await readExternal(prisma, fighterA.id));
    return { official, external: ext, combined: computeCombinedRecord(official, ext) };
  }

  let breakdown = await careerBreakdown();
  assert.equal(breakdown.external.wins, 4);
  assert.equal(breakdown.external.losses, 3);
  assert.equal(breakdown.official.wins, 0);
  assert.equal(breakdown.combined.wins, 4);
  assert.equal(breakdown.combined.losses, 3);
  pass("initial_career_breakdown", breakdown);

  const { fighterExternalRecordService } = await import(
    "../src/lib/services/fighter-external-record.service"
  );
  await fighterExternalRecordService.updateFighterExternalRecord(gym1Actor, {
    fighterId: fighterA.id,
    wins: 4,
    losses: 3,
    draws: 0,
    noContests: 0,
  });
  await assertExternalUnchanged("after_external_update");
  await assertSnapshotUnchanged("after_external_update");
  await assertBracketUnchanged("after_external_update");

  let denied = false;
  try {
    await fighterExternalRecordService.updateFighterExternalRecord(gym2Actor, {
      fighterId: fighterA.id,
      wins: 99,
      losses: 0,
      draws: 0,
      noContests: 0,
    });
  } catch {
    denied = true;
  }
  assert.ok(denied, "gym2 must not update gym1 fighter external record");
  pass("permission_gym2_denied");

  const audit = await prisma.auditLog.findFirst({
    where: {
      action: "fighter_external_record_updated",
      targetType: "Fighter",
      targetId: fighterA.id,
    },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(audit);
  pass("audit_external_record_updated", {
    actorUserId: audit!.actorUserId,
    before: audit!.beforeData,
    after: audit!.afterData,
  });

  for (const bad of [
    { wins: -1, losses: 0, draws: 0, noContests: 0 },
    { wins: "x", losses: 0, draws: 0, noContests: 0 },
    { wins: 10000, losses: 0, draws: 0, noContests: 0 },
  ]) {
    const parsed = fighterExternalRecordUpdateSchema.safeParse({
      fighterId: fighterA.id,
      ...bad,
    });
    assert.ok(!parsed.success, `expected validation fail for ${JSON.stringify(bad)}`);
  }
  const truncated = fighterExternalRecordUpdateSchema.safeParse({
    fighterId: fighterA.id,
    wins: 1.7,
    losses: 0,
    draws: 0,
    noContests: 0,
  });
  assert.ok(truncated.success && truncated.data.wins === 1);
  assert.ok(
    fighterExternalRecordUpdateSchema.safeParse({
      fighterId: fighterA.id,
      wins: 9999,
      losses: 0,
      draws: 0,
      noContests: 0,
    }).success,
  );
  pass("validation_schema");

  await resultService.confirmMatchResults(
    { kind: "organizer", actor: organizerActor },
    {
      matchId: m1.matchId,
      outcomeMode: "win_loss",
      winnerId: fighterA.id,
      resultType: BracketMatchOutcomeStyle.decision,
    },
  );
  await assertExternalUnchanged("after_confirm");
  await assertSnapshotUnchanged("after_confirm");
  await assertBracketUnchanged("after_confirm");

  breakdown = await careerBreakdown();
  assert.equal(breakdown.external.wins, 4);
  assert.equal(breakdown.external.losses, 3);
  assert.equal(breakdown.official.wins, 1);
  assert.equal(breakdown.official.losses, 0);
  assert.equal(breakdown.combined.wins, 5);
  assert.equal(breakdown.combined.losses, 3);
  pass("after_confirm_career", breakdown);

  await resultService.correctMatchResult(organizerActor, {
    matchId: m1.matchId,
    outcomeMode: "win_loss",
    winnerId: fighterB.id,
    resultType: BracketMatchOutcomeStyle.decision,
    reason: "E2E QA correction",
  });
  await assertExternalUnchanged("after_correct");
  await assertSnapshotUnchanged("after_correct");
  await assertBracketUnchanged("after_correct");

  breakdown = await careerBreakdown();
  assert.equal(breakdown.external.wins, 4);
  assert.equal(breakdown.external.losses, 3);
  assert.equal(breakdown.official.wins, 0);
  assert.equal(breakdown.official.losses, 1);
  assert.equal(breakdown.combined.wins, 4);
  assert.equal(breakdown.combined.losses, 4);
  pass("after_correct_career", breakdown);

  await resultService.voidMatchResults(organizerActor, {
    matchId: m1.matchId,
    reason: "E2E QA void",
  });
  await assertExternalUnchanged("after_void");
  await assertSnapshotUnchanged("after_void");
  await assertBracketUnchanged("after_void");

  breakdown = await careerBreakdown();
  assert.equal(breakdown.external.wins, 4);
  assert.equal(breakdown.official.totalMatches, 0);
  assert.equal(breakdown.combined.wins, 4);
  assert.equal(breakdown.combined.losses, 3);
  pass("after_void_career", breakdown);

  await resultService.confirmMatchResults(
    { kind: "organizer", actor: organizerActor },
    {
      matchId: m2.matchId,
      outcomeMode: "no_contest",
      resultType: BracketMatchOutcomeStyle.no_contest,
    },
  );
  await assertExternalUnchanged("after_no_contest");
  await assertSnapshotUnchanged("after_no_contest");

  breakdown = await careerBreakdown();
  assert.equal(breakdown.official.noContests, 1);
  assert.equal(breakdown.official.bouts, 0);
  assert.equal(breakdown.official.totalMatches, 1);
  assert.equal(breakdown.combined.noContests, 1);
  assert.equal(breakdown.combined.totalMatches, 8);
  pass("after_no_contest_career", breakdown);

  const { fighterService } = await import("../src/lib/services/fighter.service");
  const regCode = `${PREFIX}REG_${STAMP}`;
  const regPhone = "01091001999";
  const existingRegs = await prisma.fighter.findMany({
    where: {
      OR: [{ fighterCode: regCode }, { phone: regPhone, name: `${PREFIX}등록 선수` }],
    },
    select: { id: true, gymMemberId: true },
  });
  for (const f of existingRegs) {
    if (f.gymMemberId) {
      await prisma.gymMember.deleteMany({ where: { id: f.gymMemberId } }).catch(() => {});
    }
    await prisma.fighterGymHistory.deleteMany({ where: { fighterId: f.id } });
    await prisma.fighter.delete({ where: { id: f.id } });
  }

  const created = await fighterService.createFighterDirectlyForGym(gym1Actor, {
    name: `${PREFIX}등록 선수`,
    birthDate: new Date("2011-01-01T00:00:00.000Z"),
    gender: "male",
    phone: "01091001999",
    structuredRecord: { totalBouts: 9, wins: 6, draws: 1, losses: 2 },
    createLoginAccount: false,
    confirmDuplicateLink: false,
  });
  const regFighter = await prisma.fighter.findUniqueOrThrow({
    where: { id: created.fighterId },
    select: {
      externalRecordWin: true,
      externalRecordLoss: true,
      externalRecordDraw: true,
      recordWin: true,
      recordLoss: true,
      recordDraw: true,
    },
  });
  assert.equal(regFighter.externalRecordWin, 6);
  assert.equal(regFighter.externalRecordLoss, 2);
  assert.equal(regFighter.externalRecordDraw, 1);
  assert.equal(regFighter.recordWin, 0);
  assert.equal(regFighter.recordLoss, 0);
  assert.equal(regFighter.recordDraw, 0);
  pass("registration_external_only", regFighter);

  const appSvc = readFileSync(
    join(process.cwd(), "src/lib/services/application.service.ts"),
    "utf8",
  );
  assert.doesNotMatch(appSvc, /fighter-unified-profile/);
  assert.doesNotMatch(appSvc, /externalRecord/);
  pass("application_service_unchanged_policy");

  const ctx: QACtx = {
    fighterAId: fighterA.id,
    fighterBId: fighterB.id,
    fighterCode: fighterA.fighterCode,
    gym1Id: gym1.gym.id,
    gym2Id: gym2.gym.id,
    memberGymId,
    snapshotAppId: snapshotApp.id,
    snapshotEventId: event.id,
    matchEventId: event.id,
    confirmMatchId: m1.matchId,
    ncMatchId: m2.matchId,
    bracketMatchSnapshot: JSON.parse(bracketSnapBefore),
    publicSlug: null,
    associationLoginId,
  };

  writeFileSync(join(OUT, "context.json"), JSON.stringify(ctx, null, 2));
  return ctx;
}

async function login(page: import("playwright-core").Page, loginId: string, password: string) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel("아이디").fill(loginId);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: /로그인/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 90000 });
}

async function runBrowserE2E(ctx: QACtx) {
  const { chromium } = await import("@playwright/test");
  const consoleErrors: string[] = [];
  const browser = await chromium.launch({ headless: true });

  async function withPage(
    viewport: { width: number; height: number },
    fn: (page: import("playwright-core").Page) => Promise<void>,
  ) {
    const page = await browser.newPage({ viewport });
    page.on("pageerror", (e) => consoleErrors.push(String(e)));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    await fn(page);
    await page.close();
  }

  await withPage({ width: 1440, height: 900 }, async (page) => {
    await login(page, "gym1", DEMO_PASSWORD);
    await page.goto(`${BASE}/gym/fighters/${ctx.fighterAId}/edit`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    const body = await page.locator("body").innerText();
    assert.ok(body.includes("기존/외부 전적"));
    assert.ok(body.includes("MATCHON 공식") || body.includes("전체"));
    assert.ok(body.includes("4") && body.includes("3"));
    await page.screenshot({ path: join(OUT, "gym-edit-1440.png"), fullPage: true });

    const extForm = page.locator("form").filter({ hasText: "기존/외부 전적" });
    await extForm.locator('input[name="wins"]').fill("5");
    await extForm.locator('input[name="losses"]').fill("3");
    await extForm.getByRole("button", { name: "저장" }).click();
    await page.waitForTimeout(2000);
    await page.reload({ waitUntil: "networkidle" });
    const afterSave = await extForm.locator('input[name="wins"]').inputValue();
    assert.equal(afterSave, "5");
    pass("browser_gym_external_edit_persist");

    await extForm.locator('input[name="wins"]').fill("4");
    await extForm.getByRole("button", { name: "저장" }).click();
    await page.waitForTimeout(1500);
    pass("browser_gym_external_edit_restore");
  });

  await withPage({ width: 390, height: 844 }, async (page) => {
    await login(page, "gym1", DEMO_PASSWORD);
    await page.goto(`${BASE}/gym/fighters/${ctx.fighterAId}/edit`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.screenshot({ path: join(OUT, "gym-edit-390.png"), fullPage: true });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    assert.ok(!overflow, "horizontal overflow on mobile gym edit");
    pass("browser_mobile_gym_edit");
  });

  await withPage({ width: 1440, height: 900 }, async (page) => {
    await login(page, ctx.associationLoginId, DEMO_PASSWORD);
    await page.goto(
      `${BASE}/organizer/member-gyms/${ctx.memberGymId}/fighters/${ctx.fighterAId}`,
      { waitUntil: "networkidle", timeout: 90000 },
    );
    const html = await page.content();
    const body = await page.locator("body").innerText();
    assert.ok(
      body.includes("전적") ||
        body.includes("전체") ||
        body.includes("MATCHON") ||
        body.includes("기존/외부"),
      `association body missing career labels: ${body.slice(0, 200)}`,
    );
    assert.doesNotMatch(html, /01091001001/);
    assert.doesNotMatch(body, /@/);
    pass("browser_association_readonly_privacy");
    await page.screenshot({ path: join(OUT, "association-1440.png"), fullPage: true });
  });

  await withPage({ width: 1440, height: 900 }, async (page) => {
    await login(page, "admin", DEMO_PASSWORD);
    await page.goto(`${BASE}/admin/fighters/${ctx.fighterAId}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    const body = await page.locator("body").innerText();
    assert.ok(body.includes("전적") || body.includes("MATCHON"));
    await page.screenshot({ path: join(OUT, "admin-1440.png"), fullPage: true });
    pass("browser_admin_career");
  });

  await browser.close();

  const ignorable = consoleErrors.filter(
    (e) => !/favicon|404|hydration/i.test(e),
  );
  if (ignorable.length > 0) {
    report.checks.browser_console_errors = ignorable.slice(0, 5);
    console.warn("browser console errors:", ignorable.slice(0, 5));
  } else {
    pass("browser_no_console_errors");
  }
}

async function main() {
  console.log("BASE", BASE);
  let ctx: QACtx;
  try {
    ctx = await runServiceE2E();
    report.ctx = ctx;
    if (!skipBrowser) {
      await runBrowserE2E(ctx);
    } else {
      pass("browser_skipped");
    }
  } catch (e) {
    report.verdict = "FIGHTER_CAREER_EXTERNAL_E2E_BLOCKED";
    report.blockedReason = e instanceof Error ? e.message : String(e);
    report.errors.push(report.blockedReason);
    console.error("BLOCKED", report.blockedReason);
  }

  writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ verdict: report.verdict, out: OUT }, null, 2));
  if (report.verdict !== "FIGHTER_CAREER_EXTERNAL_E2E_PASS") process.exit(1);
}

main();
