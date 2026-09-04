/**
 * Golden Flow — service-layer regression (browser 없이 핵심 운영 흐름 검증).
 *
 *   npm run seed:golden
 *   npm run verify:golden-flow-services
 */
import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import {
  ApplicationStatus,
  WeighInStatus,
} from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import {
  GOLDEN_CONTEXT_PATH,
  type GoldenFlowContext,
} from "./golden/constants";
import { assertSafeForGoldenFlow } from "./golden/guard";

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

function loadContext(): GoldenFlowContext {
  const raw = readFileSync(GOLDEN_CONTEXT_PATH, "utf8");
  return JSON.parse(raw) as GoldenFlowContext;
}

async function main(): Promise<void> {
  assertSafeForGoldenFlow();
  const ctx = loadContext();

  const organizerUser = await prisma.user.findFirst({
    where: { loginId: ctx.organizerLoginId },
    include: { organizer: true },
  });
  assert.ok(organizerUser?.organizer, "organizer user missing");

  const actor = {
    userId: organizerUser.id,
    role: "organizer" as const,
    email: organizerUser.email ?? "organizer@qa.local",
    loginId: organizerUser.loginId ?? ctx.organizerLoginId,
    organizerId: organizerUser.organizer.id,
  };

  const { fieldStatusService } = await import(
    "../src/lib/services/field-status.service"
  );
  const { resultService } = await import("../src/lib/services/result.service");

  const fieldStatus = await fieldStatusService.listOrganizerEventFieldStatus(
    actor,
    ctx.eventId,
  );
  assert.equal(fieldStatus.rows.length, 2, "approved applications");
  const redRow = fieldStatus.rows.find(
    (r) => r.applicationId === ctx.fighterRed.applicationId,
  );
  const blueRow = fieldStatus.rows.find(
    (r) => r.applicationId === ctx.fighterBlue.applicationId,
  );
  assert.ok(redRow && blueRow, "golden fighters in field status");

  for (const row of [redRow!, blueRow!]) {
    const targetKg =
      row.applicationId === ctx.fighterRed.applicationId
        ? ctx.fighterRed.targetWeightKg
        : ctx.fighterBlue.targetWeightKg;

    await fieldStatusService.recordWeighInWeight(
      actor,
      row.applicationId,
      targetKg,
    );
    const refreshed = await prisma.eventApplication.findUniqueOrThrow({
      where: { id: row.applicationId },
      select: { weighInStatus: true },
    });
    if (refreshed.weighInStatus !== WeighInStatus.pass) {
      await fieldStatusService.setWeighInStatus(
        actor,
        row.applicationId,
        WeighInStatus.pass,
      );
    }
  }

  const afterWeighIn = await prisma.eventApplication.findMany({
    where: { eventId: ctx.eventId },
    select: {
      id: true,
      weighInStatus: true,
      weighInWeightKg: true,
      checkInStatus: true,
    },
  });
  for (const app of afterWeighIn) {
    assert.equal(app.weighInStatus, WeighInStatus.pass);
    assert.ok(app.weighInWeightKg != null);
  }

  const matchBefore = await prisma.bracketMatch.findUniqueOrThrow({
    where: { id: ctx.matchId },
    select: {
      fighterRedId: true,
      fighterBlueId: true,
      winnerId: true,
    },
  });
  assert.equal(matchBefore.fighterRedId, ctx.fighterRed.id);
  assert.equal(matchBefore.fighterBlueId, ctx.fighterBlue.id);
  assert.equal(matchBefore.winnerId, null);

  await resultService.confirmMatchResults(
    { kind: "organizer", actor },
    {
      matchId: ctx.matchId,
      outcomeMode: "win_loss",
      winnerId: ctx.fighterRed.id,
      resultType: "decision",
      resultMemo: `${ctx.marker} service verify`,
    },
  );

  const official = await prisma.matchResult.findMany({
    where: { matchId: ctx.matchId },
  });
  assert.ok(official.length >= 2, "official match results persisted");

  const matchAfter = await prisma.bracketMatch.findUniqueOrThrow({
    where: { id: ctx.matchId },
    select: { winnerId: true, status: true },
  });
  assert.equal(matchAfter.winnerId, ctx.fighterRed.id);

  const apps = await prisma.eventApplication.findMany({
    where: { eventId: ctx.eventId },
    select: { status: true },
  });
  assert.ok(
    apps.every((a) => a.status === ApplicationStatus.approved),
    "applications remain approved",
  );

  console.log("verify:golden-flow-services OK", {
    eventId: ctx.eventId,
    matchId: ctx.matchId,
    winnerId: matchAfter.winnerId,
    officialResults: official.length,
  });
}

main()
  .catch((err) => {
    console.error(
      "verify:golden-flow-services FAIL:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
