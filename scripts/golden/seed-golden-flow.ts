/**
 * Golden Flow 결정론적 seed (idempotent).
 *
 *   npm run seed:golden
 *   npm run seed:golden -- --cleanup-only
 *   npm run seed:golden -- --ci
 *
 * 전제: dev(yamanote) 또는 CI postgres. production/yamabiko 금지.
 */
import "dotenv/config";

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import Module from "node:module";
import {
  ApplicationStatus,
  BracketMatchStatus,
  BracketStatus,
  BracketType,
  CheckInStatus,
  EventStatus,
  FighterStatus,
  GymStatus,
  OrganizerStatus,
  OrganizerType,
  PaymentStatus,
  UserRole,
  WeighInFailureResolution,
  WeighInStatus,
} from "../../src/generated/prisma";
import { buildFighterBracketSnapshot } from "../../src/lib/bracket-snapshot";
import { toUtcDateOnly } from "../../src/lib/date-only";
import { prisma } from "../../src/lib/prisma";
import * as goldenConstants from "./constants";
import {
  assertSafeForGoldenFlow,
  getDatabaseUrl,
  isProductionDatabaseUrl,
} from "./guard";

const {
  GOLDEN_BRACKET_TITLE,
  GOLDEN_CONTEXT_DIR,
  GOLDEN_CONTEXT_PATH,
  GOLDEN_EVENT_SLUG,
  GOLDEN_EVENT_TITLE,
  GOLDEN_FIGHTER_BLUE_CODE,
  GOLDEN_FIGHTER_BLUE_NAME,
  GOLDEN_FIGHTER_RED_CODE,
  GOLDEN_FIGHTER_RED_NAME,
  GOLDEN_FLOW_MARKER,
  GOLDEN_GYM_NAME,
} = goldenConstants;
import type { GoldenFlowContext } from "./constants";

const cleanupOnly = process.argv.includes("--cleanup-only");
const prepOnsite = process.argv.includes("--prep-onsite");
const ciMode =
  process.argv.includes("--ci") || process.env.GOLDEN_FLOW_CI === "1";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

function formatRecord(win: number, loss: number, draw: number): string {
  return `${win}승 ${loss}패 ${draw}무`;
}

function databaseFingerprint(url: string): string {
  if (/yamanote/i.test(url)) return "yamanote";
  if (/localhost|127\.0\.0\.1|matchon_ci/i.test(url)) return "local-ci";
  return "unknown";
}

async function cleanupGoldenData(): Promise<void> {
  const events = await prisma.event.findMany({
    where: {
      OR: [
        { publicSlug: GOLDEN_EVENT_SLUG },
        { title: { startsWith: GOLDEN_FLOW_MARKER } },
      ],
    },
    select: { id: true },
  });
  const eventIds = events.map((e) => e.id);
  if (!eventIds.length) {
    console.info("[seed:golden] cleanup — 대상 대회 없음");
    return;
  }

  const apps = await prisma.eventApplication.findMany({
    where: { eventId: { in: eventIds } },
    select: { fighterId: true },
  });
  const fighterIds = [...new Set(apps.map((a) => a.fighterId))];

  const matchIds = (
    await prisma.bracketMatch.findMany({
      where: { bracket: { eventId: { in: eventIds } } },
      select: { id: true },
    })
  ).map((m) => m.id);

  if (matchIds.length) {
    const resultIds = (
      await prisma.matchResult.findMany({
        where: { matchId: { in: matchIds } },
        select: { id: true },
      })
    ).map((r) => r.id);
    if (resultIds.length) {
      await prisma.matchResultChangeLog.deleteMany({
        where: { matchResultId: { in: resultIds } },
      });
      await prisma.matchResult.deleteMany({ where: { id: { in: resultIds } } });
    }
    await prisma.bracketChangeLog.deleteMany({
      where: { eventId: { in: eventIds } },
    });
    await prisma.bracketMatch.deleteMany({ where: { id: { in: matchIds } } });
  }

  await prisma.bracket.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.eventApplicationPayment.deleteMany({
    where: { eventApplication: { eventId: { in: eventIds } } },
  });
  await prisma.eventApplication.deleteMany({
    where: { eventId: { in: eventIds } },
  });
  await prisma.eventDivision.deleteMany({
    where: { eventId: { in: eventIds } },
  });
  await prisma.eventCourt.deleteMany({ where: { eventId: { in: eventIds } } });
  await prisma.event.deleteMany({ where: { id: { in: eventIds } } });

  if (fighterIds.length) {
    await prisma.fighter.deleteMany({
      where: {
        id: { in: fighterIds },
        fighterCode: { in: [GOLDEN_FIGHTER_RED_CODE, GOLDEN_FIGHTER_BLUE_CODE] },
      },
    });
  }

  console.info("[seed:golden] cleanup 완료", { events: eventIds.length });
}

async function ensureCiOrganizer(): Promise<{
  userId: string;
  organizerId: string;
  loginId: string;
}> {
  const loginId = "golden-organizer";
  const user = await prisma.user.upsert({
    where: { loginId },
    create: {
      loginId,
      email: "golden-organizer@ci.local",
      name: `${GOLDEN_FLOW_MARKER} 주최자`,
      role: UserRole.organizer,
    },
    update: {
      name: `${GOLDEN_FLOW_MARKER} 주최자`,
      role: UserRole.organizer,
    },
  });
  const organizer = await prisma.organizer.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      name: `${GOLDEN_FLOW_MARKER} 주최`,
      type: OrganizerType.individual,
      status: OrganizerStatus.active,
    },
    update: {
      status: OrganizerStatus.active,
      name: `${GOLDEN_FLOW_MARKER} 주최`,
    },
  });
  return { userId: user.id, organizerId: organizer.id, loginId };
}

async function resolveOrganizer(): Promise<{
  userId: string;
  organizerId: string;
  loginId: string;
}> {
  if (ciMode) return ensureCiOrganizer();

  const user = await prisma.user.findFirst({
    where: { loginId: "organizer", organizer: { isNot: null } },
    include: { organizer: true },
  });
  if (!user?.organizer) {
    throw new Error(
      "organizer 계정이 없습니다. 먼저 npm run setup:demo-users를 실행하세요.",
    );
  }
  return {
    userId: user.id,
    organizerId: user.organizer.id,
    loginId: user.loginId ?? "organizer",
  };
}

async function resolveGymId(): Promise<string> {
  if (ciMode) {
    const loginId = "golden-gym";
    const user = await prisma.user.upsert({
      where: { loginId },
      create: {
        loginId,
        email: "golden-gym@ci.local",
        name: GOLDEN_GYM_NAME,
        role: UserRole.gym,
      },
      update: { name: GOLDEN_GYM_NAME, role: UserRole.gym },
    });
    const gym = await prisma.gym.upsert({
      where: { ownerUserId: user.id },
      create: {
        ownerUserId: user.id,
        name: GOLDEN_GYM_NAME,
        phone: "01090000001",
        address: "Golden Flow CI",
        status: GymStatus.active,
      },
      update: { name: GOLDEN_GYM_NAME, status: GymStatus.active },
    });
    return gym.id;
  }

  const gymUser = await prisma.user.findFirst({
    where: { loginId: "gym" },
    include: { ownedGym: true },
  });
  if (!gymUser?.ownedGym) {
    throw new Error(
      "gym 계정이 없습니다. 먼저 npm run setup:demo-users를 실행하세요.",
    );
  }
  return gymUser.ownedGym.id;
}

async function resetOperationalState(eventId: string): Promise<void> {
  await prisma.eventApplication.updateMany({
    where: { eventId },
    data: {
      checkInStatus: CheckInStatus.pending,
      weighInStatus: WeighInStatus.pending,
      weighInWeightKg: null,
      weighInFailureResolution: WeighInFailureResolution.pending,
      fieldMemo: null,
    },
  });

  const matches = await prisma.bracketMatch.findMany({
    where: { bracket: { eventId } },
    select: { id: true },
  });
  for (const match of matches) {
    const resultIds = (
      await prisma.matchResult.findMany({
        where: { matchId: match.id },
        select: { id: true },
      })
    ).map((r) => r.id);
    if (resultIds.length) {
      await prisma.matchResultChangeLog.deleteMany({
        where: { matchResultId: { in: resultIds } },
      });
      await prisma.matchResult.deleteMany({ where: { id: { in: resultIds } } });
    }
    await prisma.bracketMatch.update({
      where: { id: match.id },
      data: {
        winnerId: null,
        loserId: null,
        status: BracketMatchStatus.waiting,
        resultType: null,
        resultMemo: null,
        startedAt: null,
        endedAt: null,
      },
    });
  }
}

async function main(): Promise<void> {
  const dbUrl = getDatabaseUrl();
  assertSafeForGoldenFlow(dbUrl);
  if (isProductionDatabaseUrl(dbUrl)) {
    throw new Error("REFUSE_GOLDEN_FLOW_ON_PRODUCTION");
  }

  await cleanupGoldenData();
  if (cleanupOnly) {
    console.info("[seed:golden] --cleanup-only 완료");
    return;
  }

  const organizer = await resolveOrganizer();
  const gymId = await resolveGymId();
  const gym = await prisma.gym.findUniqueOrThrow({
    where: { id: gymId },
    select: { id: true, name: true },
  });

  const event = await prisma.event.create({
    data: {
      organizerId: organizer.organizerId,
      title: GOLDEN_EVENT_TITLE,
      location: "Golden Flow QA",
      eventDate: new Date("2026-12-20T00:00:00.000Z"),
      registrationStartDate: new Date("2026-01-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-12-31T00:00:00.000Z"),
      status: EventStatus.open,
      publicSlug: GOLDEN_EVENT_SLUG,
      courts: {
        create: [{ name: `${GOLDEN_FLOW_MARKER} 코트`, sortOrder: 0 }],
      },
      divisions: {
        create: [
          {
            sportType: "kickboxing",
            gender: "male",
            ageGroup: "성인",
            weightClass: "-60kg",
            weightLimitText: "-60kg",
            skillLevel: "open",
          },
        ],
      },
    },
    include: { divisions: true, courts: true },
  });
  const division = event.divisions[0]!;
  const court = event.courts[0]!;

  const fighterRed = await prisma.fighter.upsert({
    where: { fighterCode: GOLDEN_FIGHTER_RED_CODE },
    create: {
      fighterCode: GOLDEN_FIGHTER_RED_CODE,
      currentGymId: gym.id,
      name: GOLDEN_FIGHTER_RED_NAME,
      birthDate: toUtcDateOnly(new Date("1998-03-15")),
      gender: "male",
      phone: "01090001001",
      status: FighterStatus.active,
      recordWin: 2,
      recordLoss: 1,
      recordDraw: 0,
    },
    update: {
      currentGymId: gym.id,
      name: GOLDEN_FIGHTER_RED_NAME,
      status: FighterStatus.active,
    },
  });

  const fighterBlue = await prisma.fighter.upsert({
    where: { fighterCode: GOLDEN_FIGHTER_BLUE_CODE },
    create: {
      fighterCode: GOLDEN_FIGHTER_BLUE_CODE,
      currentGymId: gym.id,
      name: GOLDEN_FIGHTER_BLUE_NAME,
      birthDate: toUtcDateOnly(new Date("1999-07-20")),
      gender: "male",
      phone: "01090001002",
      status: FighterStatus.active,
      recordWin: 1,
      recordLoss: 2,
      recordDraw: 0,
    },
    update: {
      currentGymId: gym.id,
      name: GOLDEN_FIGHTER_BLUE_NAME,
      status: FighterStatus.active,
    },
  });

  const gymSnapshot = { gymId: gym.id, name: gym.name };
  const redSnapshot = {
    fighterId: fighterRed.id,
    fighterCode: fighterRed.fighterCode,
    name: fighterRed.name,
    gymName: gym.name,
    profileImageUrl: fighterRed.profileImageUrl,
    recordSummary: formatRecord(
      fighterRed.recordWin,
      fighterRed.recordLoss,
      fighterRed.recordDraw,
    ),
  };
  const blueSnapshot = {
    fighterId: fighterBlue.id,
    fighterCode: fighterBlue.fighterCode,
    name: fighterBlue.name,
    gymName: gym.name,
    profileImageUrl: fighterBlue.profileImageUrl,
    recordSummary: formatRecord(
      fighterBlue.recordWin,
      fighterBlue.recordLoss,
      fighterBlue.recordDraw,
    ),
  };

  const appRed = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: division.id,
      gymId: gym.id,
      fighterId: fighterRed.id,
      status: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.paid,
      fighterSnapshot: redSnapshot,
      gymSnapshot,
      appliedAt: new Date(),
    },
  });

  const appBlue = await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      divisionId: division.id,
      gymId: gym.id,
      fighterId: fighterBlue.id,
      status: ApplicationStatus.approved,
      paymentStatus: PaymentStatus.paid,
      fighterSnapshot: blueSnapshot,
      gymSnapshot,
      appliedAt: new Date(),
    },
  });

  const bracket = await prisma.bracket.create({
    data: {
      eventId: event.id,
      divisionId: division.id,
      title: GOLDEN_BRACKET_TITLE,
      type: BracketType.match_list,
      status: BracketStatus.published,
      isPublic: true,
    },
  });

  const divisionInput = {
    sportType: division.sportType,
    ruleType: division.ruleType,
    gender: division.gender,
    ageGroup: division.ageGroup,
    weightClass: division.weightClass,
    weightClassName: division.weightClassName,
    weightLimitText: division.weightLimitText,
    skillLevel: division.skillLevel,
  };

  const redBracketSnap = buildFighterBracketSnapshot({
    fighter: fighterRed,
    division: divisionInput,
    gym,
    gymSnapshot,
  });
  const blueBracketSnap = buildFighterBracketSnapshot({
    fighter: fighterBlue,
    division: divisionInput,
    gym,
    gymSnapshot,
  });

  const match = await prisma.bracketMatch.create({
    data: {
      bracketId: bracket.id,
      matchOrder: 1,
      matchNumber: 1,
      globalMatchOrder: 1,
      courtId: court.id,
      courtOrder: 1,
      fighterRedId: fighterRed.id,
      fighterBlueId: fighterBlue.id,
      fighterRedSnapshot: redBracketSnap,
      fighterBlueSnapshot: blueBracketSnap,
      status: BracketMatchStatus.waiting,
    },
  });

  await resetOperationalState(event.id);

  const context: GoldenFlowContext = {
    marker: GOLDEN_FLOW_MARKER,
    seededAt: new Date().toISOString(),
    databaseFingerprint: databaseFingerprint(dbUrl),
    organizerLoginId: organizer.loginId,
    eventId: event.id,
    eventSlug: GOLDEN_EVENT_SLUG,
    eventTitle: GOLDEN_EVENT_TITLE,
    divisionId: division.id,
    courtId: court.id,
    bracketId: bracket.id,
    matchId: match.id,
    fighterRed: {
      id: fighterRed.id,
      name: GOLDEN_FIGHTER_RED_NAME,
      applicationId: appRed.id,
      targetWeightKg: 58,
    },
    fighterBlue: {
      id: fighterBlue.id,
      name: GOLDEN_FIGHTER_BLUE_NAME,
      applicationId: appBlue.id,
      targetWeightKg: 59,
    },
  };

  mkdirSync(GOLDEN_CONTEXT_DIR, { recursive: true });
  writeFileSync(GOLDEN_CONTEXT_PATH, JSON.stringify(context, null, 2));

  if (prepOnsite) {
    await prisma.eventApplication.update({
      where: { id: context.fighterRed.applicationId },
      data: {
        weighInStatus: WeighInStatus.pass,
        weighInWeightKg: context.fighterRed.targetWeightKg,
      },
    });
    await prisma.eventApplication.update({
      where: { id: context.fighterBlue.applicationId },
      data: {
        weighInStatus: WeighInStatus.pass,
        weighInWeightKg: context.fighterBlue.targetWeightKg,
      },
    });
    console.info("[seed:golden] --prep-onsite: weigh-in pass applied");
  }

  console.info("[seed:golden] 완료");
  console.info(JSON.stringify(context, null, 2));
  assert.ok(context.eventId);
  assert.ok(context.matchId);
}

main()
  .catch((err) => {
    console.error("[seed:golden] FAIL:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
