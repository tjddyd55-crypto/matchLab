/**
 * DEV(yamanote) only — template apply Application SSOT QA.
 * Fresh QA event (PREFIX). NEVER touches production event ids.
 * NEVER uses yamabiko.
 *
 * Cases:
 *   A — same semantic KEEP (divisionId preserved)
 *   B — add NEW division
 *   C — remove used division → BLOCK (no EA mutation)
 *   D — remove unused division → delete OK
 *   E — successful apply resets brackets; apps/snapshots unchanged
 *
 *   npx tsx scripts/e2e-event-division-rebuild-preview-qa.mts
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import Module from "node:module";
import { randomBytes } from "node:crypto";

const PREFIX = "DIV_TPL_SSOT_QA_";
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

type Item = {
  sportType: string;
  gender: string;
  ageGroup: string;
  weightClassName: string;
  weightLimitText: string;
  weightClass: string;
  isActive: boolean;
};

function item(
  name: string,
  limit: string,
): Item {
  return {
    sportType: "킥복싱",
    gender: "male",
    ageGroup: "일반부",
    weightClassName: name,
    weightLimitText: limit,
    weightClass: `${name} ${limit}`,
    isActive: true,
  };
}

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

    const bantam = item("밴텀급", "-60kg");
    const light = item("라이트급", "-65kg");
    const welter = item("웰터급", "-70kg");

    async function createTemplate(title: string, items: Item[]) {
      return prisma.divisionTemplate.create({
        data: {
          organizerId: organizer!.id,
          title: `${PREFIX}${title}`,
          sportType: "킥복싱",
          isActive: true,
          items,
        },
      });
    }

    const eventDate = new Date("2030-06-01T00:00:00.000Z");
    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: `${PREFIX}event`,
        status: "draft",
        eventDate,
        registrationStartDate: new Date("2030-01-01T00:00:00.000Z"),
        registrationEndDate: new Date("2030-05-01T00:00:00.000Z"),
        publicSlug: `div-tpl-ssot-qa-${stamp}`,
        locationName: "QA",
      },
    });

    const keepDiv = await prisma.eventDivision.create({
      data: {
        eventId: event.id,
        sportType: "킥복싱",
        gender: "male",
        ageGroup: "일반부",
        weightClass: bantam.weightClass,
        weightClassName: bantam.weightClassName,
        weightLimitText: bantam.weightLimitText,
      },
    });
    const unusedDiv = await prisma.eventDivision.create({
      data: {
        eventId: event.id,
        sportType: "킥복싱",
        gender: "male",
        ageGroup: "일반부",
        weightClass: welter.weightClass,
        weightClassName: welter.weightClassName,
        weightLimitText: welter.weightLimitText,
      },
    });

    async function createFighter(name: string) {
      return prisma.fighter.create({
        data: {
          name,
          gender: "male",
          phone: `010${randomBytes(4).toString("hex").slice(0, 8)}`,
          fighterCode: `${PREFIX}${randomBytes(4).toString("hex")}`,
          currentGymId: gym!.id,
        },
      });
    }

    const fighterA = await createFighter(`${PREFIX}A`);
    const fighterB = await createFighter(`${PREFIX}B`);
    const snap = (name: string, kg: number) => ({
      name,
      gymName: gym!.name,
      applicationWeightKg: kg,
    });

    const appA = await prisma.eventApplication.create({
      data: {
        eventId: event.id,
        fighterId: fighterA.id,
        gymId: gym.id,
        divisionId: keepDiv.id,
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
        divisionId: keepDiv.id,
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

    const bracket = await prisma.bracket.create({
      data: {
        eventId: event.id,
        divisionId: keepDiv.id,
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

    // ---- Case C: remove used division → BLOCK ----
    const tplRemoveUsed = await createTemplate("remove-used", [light, welter]);
    const previewC = await eventDivisionRebuildService.previewRebuild(actor, {
      eventId: event.id,
      templateId: tplRemoveUsed.id,
    });
    assert.equal(previewC.blockedByRemovedApplicants, true);
    assert.equal(previewC.blocked, true);
    assert.ok(previewC.removedApplicantTotal >= 2);

    let blockedC = false;
    try {
      await eventDivisionRebuildService.rebuild(actor, {
        eventId: event.id,
        templateId: tplRemoveUsed.id,
      });
    } catch (e) {
      blockedC = true;
      const msg = e instanceof Error ? e.message : String(e);
      assert.match(msg, /신청자가 있어 적용할 수 없습니다/);
    }
    assert.equal(blockedC, true);
    assert.equal(
      await prisma.bracketMatch.count({
        where: { bracket: { eventId: event.id } },
      }),
      1,
      "blocked apply must not reset matches",
    );
    const appsAfterC = await prisma.eventApplication.findMany({
      where: { eventId: event.id },
      orderBy: { id: "asc" },
    });
    assert.equal(appsAfterC.length, 2);
    assert.equal(appsAfterC.every((a) => a.divisionId === keepDiv.id), true);
    console.log("Case C PASS (remove used → block, EA/matches untouched)");

    // ---- Cases A/B/D/E: KEEP + NEW + remove unused ----
    const tplSafe = await createTemplate("safe-keep-add", [bantam, light]);
    const previewSafe = await eventDivisionRebuildService.previewRebuild(actor, {
      eventId: event.id,
      templateId: tplSafe.id,
    });
    assert.equal(previewSafe.blocked, false);
    assert.equal(previewSafe.keepDivisions, 1);
    assert.equal(previewSafe.newDivisions, 1);
    assert.equal(previewSafe.removedDivisions, 1);
    assert.equal(previewSafe.removedApplicantTotal, 0);
    assert.equal(previewSafe.autoReassign, 0);

    const beforeAppIds = {
      aDiv: appA.divisionId,
      bDiv: appB.divisionId,
      aSnap: appA.fighterSnapshot,
      bSnap: appB.fighterSnapshot,
      aMemo: appA.memo,
      aPay: appA.paymentStatus,
      aWeigh: appA.weighInWeightKg,
      aRecord: appA.recordText,
    };

    const result = await eventDivisionRebuildService.rebuild(actor, {
      eventId: event.id,
      templateId: tplSafe.id,
    });

    assert.equal(result.applicationMutations, 0);
    assert.equal(result.keptDivisions, 1);
    assert.equal(result.createdDivisions, 1);
    assert.equal(result.deletedUnusedDivisions, 1);
    assert.equal(result.deletedMatches, 1);
    assert.equal(result.autoReassign, 0);

    const afterApps = await prisma.eventApplication.findMany({
      where: { eventId: event.id },
    });
    assert.equal(afterApps.length, 2);
    const afterA = afterApps.find((a) => a.id === appA.id)!;
    const afterB = afterApps.find((a) => a.id === appB.id)!;
    assert.equal(afterA.divisionId, beforeAppIds.aDiv);
    assert.equal(afterB.divisionId, beforeAppIds.bDiv);
    assert.equal(afterA.divisionId, keepDiv.id);
    assert.deepEqual(afterA.fighterSnapshot, beforeAppIds.aSnap);
    assert.deepEqual(afterB.fighterSnapshot, beforeAppIds.bSnap);
    assert.equal(afterA.memo, beforeAppIds.aMemo);
    assert.equal(afterA.paymentStatus, beforeAppIds.aPay);
    assert.equal(afterA.weighInWeightKg, beforeAppIds.aWeigh);
    assert.equal(afterA.recordText, beforeAppIds.aRecord);
    assert.equal(afterA.divisionSelectionType, "REGISTERED");

    assert.ok(
      await prisma.eventDivision.findUnique({ where: { id: keepDiv.id } }),
      "KEEP division row must still exist",
    );
    assert.equal(
      await prisma.eventDivision.findUnique({ where: { id: unusedDiv.id } }),
      null,
      "unused REMOVED division deleted",
    );
    assert.equal(
      await prisma.eventDivision.count({ where: { eventId: event.id } }),
      2,
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

    console.log("Case A PASS (same division KEEP, EA divisionId preserved)");
    console.log("Case B PASS (NEW division created)");
    console.log("Case D PASS (unused REMOVED deleted)");
    console.log("Case E PASS (bracket reset; apps/snapshots unchanged)");

    // MatchResult blocker still works
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

    let blockedResults = false;
    try {
      await eventDivisionRebuildService.rebuild(actor, {
        eventId: event.id,
        templateId: tplSafe.id,
      });
    } catch (e) {
      blockedResults = true;
      const msg = e instanceof Error ? e.message : String(e);
      assert.match(msg, /경기 결과가 등록된 대진/);
    }
    assert.equal(blockedResults, true);
    console.log("MatchResult blocker PASS");

    console.log(
      JSON.stringify(
        {
          dbFingerprint: "yamanote:45288",
          qaPrefix: PREFIX,
          productionEventTouched: "NONE",
          applicationMutations: 0,
          autoReassign: 0,
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
