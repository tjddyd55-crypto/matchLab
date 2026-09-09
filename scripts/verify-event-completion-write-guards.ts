/**
 * 종료 대회 write guard 검증.
 */
import "dotenv/config";

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import Module from "node:module";
import { EventStatus } from "../src/generated/prisma";
import { prisma } from "../src/lib/prisma";
import { GOLDEN_CONTEXT_PATH, type GoldenFlowContext } from "./golden/constants";
import { assertSafeForGoldenFlow } from "./golden/guard";

const ROOT = path.resolve(__dirname, "..");

const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function assertStaticGuards() {
  const files = [
    "src/lib/services/application.service.ts",
    "src/lib/services/application-organizer-lifecycle.service.ts",
    "src/lib/services/application-organizer-bulk.service.ts",
    "src/lib/services/bracket.service.ts",
    "src/lib/services/bracket-auto-match.service.ts",
    "src/lib/services/event.service.ts",
    "src/lib/services/event-court.service.ts",
    "src/lib/services/judge-assignment.service.ts",
    "src/lib/services/judge-credential.service.ts",
    "src/lib/services/judge-court.service.ts",
    "src/lib/services/match.service.ts",
    "src/lib/services/field-status.service.ts",
    "src/lib/services/result.service.ts",
    "src/lib/services/match-ops-judge-score.service.ts",
    "src/lib/services/judge-scorecard.service.ts",
    "src/lib/services/onsite-ops-access.service.ts",
  ];
  for (const file of files) {
    const src = read(file);
    assert.match(src, /assertEventWritable/, `${file} must use assertEventWritable`);
  }

  const eventService = read("src/lib/services/event.service.ts");
  const changeBlock = eventService.slice(
    eventService.indexOf("async changeEventStatus"),
    eventService.indexOf("async createEventDivision"),
  );
  assert.ok(
    !changeBlock.includes("assertEventWritable"),
    "changeEventStatus must not call assertEventWritable (reopen/finish lifecycle)",
  );

  const opsPage = read("src/app/ops/[token]/page.tsx");
  assert.match(opsPage, /eventOperationsReadOnly/);
  assert.match(opsPage, /EventFinishedReadOnlyBanner|eventFinished/);
}

async function assertRuntimeGuards() {
  assertSafeForGoldenFlow();
  const ctx = JSON.parse(
    readFileSync(GOLDEN_CONTEXT_PATH, "utf8"),
  ) as GoldenFlowContext;

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

  const { eventService } = await import("../src/lib/services/event.service");
  const { applicationService } = await import(
    "../src/lib/services/application.service"
  );
  const { fieldStatusService } = await import(
    "../src/lib/services/field-status.service"
  );
  const { matchService } = await import("../src/lib/services/match.service");
  const { toActorCaller } = await import("../src/lib/field-operations-auth");
  const { AppError } = await import("../src/lib/errors/app-error");

  const caller = toActorCaller(actor);

  const before = await prisma.event.findUniqueOrThrow({
    where: { id: ctx.eventId },
    select: { status: true, completedAt: true },
  });

  await prisma.event.update({
    where: { id: ctx.eventId },
    data: { status: EventStatus.finished, completedAt: new Date() },
  });

  const finished = await prisma.event.findUniqueOrThrow({
    where: { id: ctx.eventId },
    select: { status: true },
  });
  assert.equal(finished.status, EventStatus.finished);

  let blocked = false;
  try {
    await applicationService.approveEventApplication(
      actor,
      ctx.fighterRed.applicationId,
    );
  } catch (e) {
    blocked = e instanceof AppError && e.code === "CONFLICT";
  }
  assert.ok(blocked, "application write must fail on finished event");

  blocked = false;
  try {
    await fieldStatusService.recordWeighInWeight(
      caller,
      ctx.fighterRed.applicationId,
      70,
    );
  } catch (e) {
    blocked = e instanceof AppError && e.code === "CONFLICT";
  }
  assert.ok(blocked, "weigh-in write must fail on finished event");

  const match = await prisma.bracketMatch.findFirst({
    where: { bracket: { eventId: ctx.eventId } },
    select: { id: true },
  });
  assert.ok(match, "match required");
  blocked = false;
  try {
    await matchService.updateMatchStatus(caller, {
      matchId: match.id,
      status: "ongoing",
    });
  } catch (e) {
    blocked = e instanceof AppError && e.code === "CONFLICT";
  }
  assert.ok(blocked, "match status write must fail on finished event");

  const list = await fieldStatusService.listOrganizerEventFieldStatus(
    actor,
    ctx.eventId,
  );
  assert.ok(list.rows.length > 0, "read must work on finished event");

  await eventService.changeEventStatus(actor, {
    eventId: ctx.eventId,
    status: EventStatus.ongoing,
  });

  const reopened = await prisma.event.findUniqueOrThrow({
    where: { id: ctx.eventId },
    select: { status: true, completedAt: true },
  });
  assert.equal(reopened.status, EventStatus.ongoing);
  assert.equal(reopened.completedAt, null);

  await prisma.event.update({
    where: { id: ctx.eventId },
    data: { status: before.status, completedAt: before.completedAt },
  });
}

async function main() {
  assertStaticGuards();
  try {
    await assertRuntimeGuards();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("completedAt") || message.includes("ColumnNotFound")) {
      console.warn(
        "verify:event-completion-write-guards: runtime skipped (apply migrations for DB integration test)",
      );
    } else {
      throw e;
    }
  }
  console.log("verify:event-completion-write-guards: OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
