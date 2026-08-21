/**
 * Preview DB — 체급표 재구성 보존/detach/MatchResult blocker 스모크.
 * Development yamanote:45288 only. Production/yamabiko write 금지.
 *
 *   npx tsx scripts/e2e-event-division-rebuild-preview-qa.mts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import Module from "node:module";
import { randomBytes } from "node:crypto";

const PREFIX = "DIV_REBUILD_QA_";
const stamp = Date.now().toString(36);

function railwayJson(service: string): Record<string, string> {
  const raw = execSync(
    `railway variable list -e development -s ${service} --json`,
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

function assertPreviewDb(databaseUrl: string) {
  const hostMatch = databaseUrl.match(/@([^/]+)\//);
  const host = hostMatch?.[1] ?? "";
  if (
    !/yamanote/i.test(databaseUrl) ||
    !/:45288\b/.test(databaseUrl) ||
    /yamabiko/i.test(databaseUrl)
  ) {
    throw new Error(
      `REFUSING DB write: expected yamanote:45288, got ${host || "unknown"}`,
    );
  }
  console.log(`DB fingerprint OK: ${host}`);
}

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

async function main() {
  const vars = railwayJson("Postgres");
  const databaseUrl = vars.DATABASE_PUBLIC_URL ?? "";
  assert.ok(databaseUrl, "DATABASE_PUBLIC_URL missing");
  assertPreviewDb(databaseUrl);
  process.env.DATABASE_URL = databaseUrl;

  const { Pool } = await import("pg");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../src/generated/prisma");
  const pool = new Pool({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  // service의 @/lib/prisma 도 동일 URL을 쓰도록 env 설정 후 import
  const { eventDivisionRebuildService } = await import(
    "../src/lib/services/event-division-rebuild.service"
  );

  const actor = {
    role: "admin" as const,
    userId: "qa-admin",
    email: "qa-admin@example.com",
    organizerId: undefined as string | undefined,
  };

  try {
    await prisma.event.deleteMany({
      where: { title: { startsWith: PREFIX } },
    });
    await prisma.divisionTemplate.deleteMany({
      where: { title: { startsWith: PREFIX } },
    });
    await prisma.fighter.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });

    const organizer = await prisma.organizer.findFirst({
      orderBy: { createdAt: "asc" },
    });
    assert.ok(organizer, "organizer required");
    actor.organizerId = organizer.id;

    const gym = await prisma.gym.findFirst({ orderBy: { createdAt: "asc" } });
    assert.ok(gym, "gym required");

    const template = await prisma.divisionTemplate.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX}template`,
        sportType: "킥복싱",
        isActive: true,
        items: [
          {
            sportType: "킥복싱",
            gender: "male",
            ageGroup: "일반부",
            weightClassName: "밴텀급",
            weightLimitText: "-60kg",
            weightClass: "밴텀급 -60kg",
            isActive: true,
          },
          {
            sportType: "킥복싱",
            gender: "male",
            ageGroup: "일반부",
            weightClassName: "라이트급",
            weightLimitText: "-65kg",
            weightClass: "라이트급 -65kg",
            isActive: true,
          },
          {
            sportType: "킥복싱",
            gender: "male",
            ageGroup: "일반부",
            weightClassName: "웰터급",
            weightLimitText: "-70kg",
            weightClass: "웰터급 -70kg",
            isActive: true,
          },
        ],
      },
    });

    const eventDate = new Date("2030-06-01T00:00:00.000Z");
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX}event`,
        status: "draft",
        eventDate,
        registrationStartDate: new Date("2030-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2030-05-01T00:00:00.000Z"),
        publicSlug: `div-rebuild-qa-${stamp}`,
        locationName: "QA",
      },
    });

    const oldDiv = await prisma.eventDivision.create({
      data: {
        eventId: event.id,
        sportType: "킥복싱",
        gender: "male",
        ageGroup: "일반부",
        weightClass: "웰터급 -67kg",
        weightClassName: "웰터급",
        weightLimitText: "-67kg",
      },
    });

    async function createFighter(name: string) {
      return prisma.fighter.create({
        data: {
          name,
          gender: "male",
          phone: `010${randomBytes(4).toString("hex").slice(0, 8)}`,
          fighterCode: `${PREFIX}${randomBytes(4).toString("hex")}`,
          currentGymId: gym.id,
        },
      });
    }

    const fighterA = await createFighter(`${PREFIX}A`);
    const fighterB = await createFighter(`${PREFIX}B`);
    const fighterC = await createFighter(`${PREFIX}C`);

    const snap = (name: string, kg: number) => ({
      name,
      gymName: gym.name,
      applicationWeightKg: kg,
    });

    const appA = await prisma.eventApplication.create({
      data: {
        eventId: event.id,
        fighterId: fighterA.id,
        gymId: gym.id,
        divisionId: oldDiv.id,
        divisionSelectionType: "REGISTERED",
        status: "approved",
        paymentStatus: "paid",
        weighInStatus: "pass",
        weighInWeightKg: 58.5,
        fighterSnapshot: snap(`${PREFIX}A`, 58),
        gymSnapshot: { name: gym.name },
        gymNameSnapshot: gym.name,
        recordText: "3전 2승 1패",
        careerText: "3년",
        memo: "preserve-me",
      },
    });
    const appB = await prisma.eventApplication.create({
      data: {
        eventId: event.id,
        fighterId: fighterB.id,
        gymId: gym.id,
        divisionId: oldDiv.id,
        divisionSelectionType: "REGISTERED",
        status: "approved",
        paymentStatus: "unpaid",
        weighInStatus: "pending",
        fighterSnapshot: snap(`${PREFIX}B`, 64),
        gymSnapshot: { name: gym.name },
        gymNameSnapshot: gym.name,
        memo: "preserve-b",
      },
    });
    const appC = await prisma.eventApplication.create({
      data: {
        eventId: event.id,
        fighterId: fighterC.id,
        gymId: gym.id,
        divisionId: oldDiv.id,
        divisionSelectionType: "REGISTERED",
        status: "approved",
        paymentStatus: "paid",
        fighterSnapshot: snap(`${PREFIX}C`, 90),
        gymSnapshot: { name: gym.name },
        gymNameSnapshot: gym.name,
        memo: "preserve-c",
      },
    });

    const bracket = await prisma.bracket.create({
      data: {
        eventId: event.id,
        divisionId: oldDiv.id,
        title: `${PREFIX}bracket`,
        type: "match_list",
        isPublic: true,
      },
    });
    await prisma.bracketMatch.create({
      data: {
        bracketId: bracket.id,
        matchOrder: 0,
        fighterRedId: fighterA.id,
        fighterBlueId: fighterB.id,
      },
    });

    assert.equal(
      await prisma.eventApplication.count({ where: { eventId: event.id } }),
      3,
    );

    // Scenario A — 대진만 초기화
    await prisma.bracketMatch.deleteMany({
      where: { bracket: { eventId: event.id } },
    });
    const afterReset = await prisma.eventApplication.findMany({
      where: { eventId: event.id },
    });
    assert.equal(afterReset.length, 3);
    assert.equal(afterReset.every((a) => a.divisionId === oldDiv.id), true);
    assert.equal(
      await prisma.bracketMatch.count({
        where: { bracket: { eventId: event.id } },
      }),
      0,
    );
    console.log("Scenario A PASS");

    await prisma.bracketMatch.create({
      data: {
        bracketId: bracket.id,
        matchOrder: 0,
        fighterRedId: fighterA.id,
        fighterBlueId: fighterB.id,
      },
    });

    const result = await eventDivisionRebuildService.rebuild(actor, {
      eventId: event.id,
      templateId: template.id,
    });

    const afterApps = await prisma.eventApplication.findMany({
      where: { eventId: event.id },
    });
    assert.equal(afterApps.length, 3);
    assert.equal(
      await prisma.fighter.count({ where: { name: { startsWith: PREFIX } } }),
      3,
    );
    assert.equal(
      await prisma.bracketMatch.count({
        where: { bracket: { eventId: event.id } },
      }),
      0,
    );
    assert.equal(
      await prisma.bracket.count({ where: { eventId: event.id } }),
      0,
    );
    assert.equal(
      await prisma.eventDivision.count({ where: { eventId: event.id } }),
      3,
    );
    assert.equal(result.autoReassign, 2);
    assert.ok(result.unassigned >= 1);

    const afterA = afterApps.find((a) => a.id === appA.id)!;
    const afterB = afterApps.find((a) => a.id === appB.id)!;
    const afterC = afterApps.find((a) => a.id === appC.id)!;
    assert.notEqual(afterA.divisionId, null);
    assert.notEqual(afterB.divisionId, null);
    assert.equal(afterC.divisionId, null);
    assert.deepEqual(afterA.fighterSnapshot, snap(`${PREFIX}A`, 58));
    assert.deepEqual(afterB.fighterSnapshot, snap(`${PREFIX}B`, 64));
    assert.deepEqual(afterC.fighterSnapshot, snap(`${PREFIX}C`, 90));
    assert.equal(afterA.paymentStatus, "paid");
    assert.equal(afterB.paymentStatus, "unpaid");
    assert.equal(afterA.status, "approved");
    assert.equal(afterA.weighInWeightKg, 58.5);
    assert.equal(afterA.weighInStatus, "pass");
    assert.equal(afterA.memo, "preserve-me");
    assert.equal(afterA.recordText, "3전 2승 1패");
    assert.equal(afterA.careerText, "3년");
    console.log("Scenario B/C PASS");

    // Scenario D
    const newDiv = await prisma.eventDivision.findFirst({
      where: { eventId: event.id, weightLimitText: "-70kg" },
    });
    assert.ok(newDiv);
    await prisma.eventApplication.update({
      where: { id: appC.id },
      data: { divisionId: newDiv.id, divisionSelectionType: "REGISTERED" },
    });
    const resolvedC = await prisma.eventApplication.findUniqueOrThrow({
      where: { id: appC.id },
    });
    assert.equal(resolvedC.divisionId, newDiv.id);
    assert.deepEqual(resolvedC.fighterSnapshot, snap(`${PREFIX}C`, 90));
    console.log("Scenario D PASS");

    // Scenario E — MatchResult blocker
    const divForBlock = await prisma.eventDivision.findFirst({
      where: { eventId: event.id },
    });
    assert.ok(divForBlock);
    const br2 = await prisma.bracket.create({
      data: {
        eventId: event.id,
        divisionId: divForBlock.id,
        title: `${PREFIX}block`,
        type: "match_list",
        isPublic: false,
      },
    });
    const m2 = await prisma.bracketMatch.create({
      data: {
        bracketId: br2.id,
        matchOrder: 0,
        fighterRedId: fighterA.id,
        fighterBlueId: fighterB.id,
      },
    });
    await prisma.matchResult.createMany({
      data: [
        {
          eventId: event.id,
          bracketId: br2.id,
          matchId: m2.id,
          fighterId: fighterA.id,
          result: "win",
          status: "confirmed",
          eventTitleSnapshot: event.title,
          fighterSnapshot: { name: fighterA.name },
          matchDate: eventDate,
        },
        {
          eventId: event.id,
          bracketId: br2.id,
          matchId: m2.id,
          fighterId: fighterB.id,
          result: "loss",
          status: "confirmed",
          eventTitleSnapshot: event.title,
          fighterSnapshot: { name: fighterB.name },
          matchDate: eventDate,
        },
      ],
    });

    const appsBeforeBlock = await prisma.eventApplication.count({
      where: { eventId: event.id },
    });
    let blocked = false;
    try {
      await eventDivisionRebuildService.rebuild(actor, {
        eventId: event.id,
        templateId: template.id,
      });
    } catch (e) {
      blocked = true;
      const msg = e instanceof Error ? e.message : String(e);
      assert.match(msg, /경기 결과가 등록된 대진/);
    }
    assert.equal(blocked, true);
    assert.equal(
      await prisma.eventApplication.count({ where: { eventId: event.id } }),
      appsBeforeBlock,
    );
    assert.equal(
      await prisma.bracketMatch.count({
        where: { bracket: { eventId: event.id } },
      }),
      1,
    );
    console.log("Scenario E PASS");

    console.log(
      JSON.stringify(
        {
          dbFingerprint: "yamanote:45288",
          applicationDelta: 0,
          fighterDelta: 0,
          autoReassign: result.autoReassign,
          unassigned: result.unassigned,
          newDivisions: result.newDivisions,
          weighInPreserved: true,
          paymentPreserved: true,
          productionDbWrite: "NONE",
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.event.deleteMany({
      where: { title: { startsWith: PREFIX } },
    });
    await prisma.divisionTemplate.deleteMany({
      where: { title: { startsWith: PREFIX } },
    });
    await prisma.fighter.deleteMany({
      where: { name: { startsWith: PREFIX } },
    });
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
