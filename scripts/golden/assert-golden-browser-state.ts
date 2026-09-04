/**
 * Golden Flow browser mutation 후 read-only DB assertion.
 * DB write 금지 — browser UI mutation 결과만 검증한다.
 *
 *   npx tsx scripts/golden/assert-golden-browser-state.ts weighin
 *   npx tsx scripts/golden/assert-golden-browser-state.ts result
 */
import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import { WeighInStatus } from "../../src/generated/prisma";
import { prisma } from "../../src/lib/prisma";
import {
  GOLDEN_CONTEXT_PATH,
  type GoldenFlowContext,
} from "./constants";
import { assertSafeForGoldenFlow } from "./guard";

const phase = process.argv[2];

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

async function assertWeighIn(ctx: GoldenFlowContext): Promise<void> {
  for (const fighter of [ctx.fighterRed, ctx.fighterBlue]) {
    const app = await prisma.eventApplication.findUniqueOrThrow({
      where: { id: fighter.applicationId },
      select: {
        weighInStatus: true,
        weighInWeightKg: true,
      },
    });
    assert.equal(app.weighInStatus, WeighInStatus.pass, fighter.name);
    assert.ok(app.weighInWeightKg != null, `${fighter.name} weight`);
  }
  console.info("[assert:golden-browser-state] weighin PASS");
}

async function assertResult(ctx: GoldenFlowContext): Promise<void> {
  const match = await prisma.bracketMatch.findUniqueOrThrow({
    where: { id: ctx.matchId },
    select: {
      winnerId: true,
      fighterRedId: true,
      resultType: true,
    },
  });
  assert.equal(match.winnerId, ctx.fighterRed.id);
  assert.equal(match.fighterRedId, ctx.fighterRed.id);
  assert.ok(match.resultType, "resultType set");

  const results = await prisma.matchResult.findMany({
    where: { matchId: ctx.matchId },
    select: { id: true, status: true },
  });
  assert.ok(results.length >= 1, "match results exist");
  assert.ok(
    results.some((r) => r.status === "confirmed"),
    "confirmed result exists",
  );
  console.info("[assert:golden-browser-state] result PASS");
}

async function main(): Promise<void> {
  assertSafeForGoldenFlow();
  const ctx = loadContext();

  if (phase === "weighin") {
    await assertWeighIn(ctx);
    return;
  }
  if (phase === "result") {
    await assertWeighIn(ctx);
    await assertResult(ctx);
    return;
  }

  throw new Error(
    "usage: assert-golden-browser-state.ts <weighin|result>",
  );
}

main()
  .catch((err) => {
    console.error(
      "[assert:golden-browser-state] FAIL:",
      err instanceof Error ? err.message : err,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
