/**
 * Development QA: schedule simplification + event link (yamanote only)
 *   npx tsx scripts/e2e-schedule-event-link-preview-qa.mts
 */
import Module from "node:module";
const mod = Module as typeof Module & {
  _load: (request: string, parent: NodeModule | null, isMain: boolean) => unknown;
};
const originalLoad = mod._load;
mod._load = function (request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad(request, parent, isMain);
};

import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const OUT = join(process.cwd(), "test-results", "schedule-event-link-preview-qa");
mkdirSync(OUT, { recursive: true });

function railwayDevPgVars(): Record<string, string> {
  const raw = execSync(
    "railway variables --project 1a6aa80d-0580-4777-9dad-e3f7b1002d21 --environment 0a52e3d5-efac-4265-9b0c-c878ebf39b8f --service 9133eb46-6e18-4596-a374-babb4311f75a --json",
    { encoding: "utf8" },
  ).replace(/^\uFEFF/, "");
  return JSON.parse(raw) as Record<string, string>;
}

const pgVars = railwayDevPgVars();
const dbUrl = String(pgVars.DATABASE_PUBLIC_URL || "");
if (!/yamanote/i.test(dbUrl) || /yamabiko/i.test(dbUrl)) {
  throw new Error("REFUSING: expected yamanote dev DB");
}
process.env.DATABASE_URL = dbUrl;

const { associationScheduleService } = await import(
  "../src/lib/services/association-schedule.service"
);
const { buildEventSchedulePrefill } = await import(
  "../src/lib/association-schedule/event-prefill"
);
const { prisma } = await import("../src/lib/prisma");

const steps: Array<{ name: string; status: "PASS" | "FAIL"; detail?: string }> = [];

const orgUser = await prisma.user.findFirst({
  where: { loginId: "organizer", role: "organizer" },
  include: { organizer: true },
});
if (!orgUser?.organizer) throw new Error("organizer missing");
const actor = {
  role: "organizer" as const,
  userId: orgUser.id,
  email: orgUser.email,
  organizerId: orgUser.organizer.id,
  organizerType: "association" as const,
};

const qaEvent = await prisma.event.findFirst({
  where: {
    organizerId: orgUser.organizer.id,
  },
  orderBy: { createdAt: "desc" },
});
if (!qaEvent) throw new Error("organizer2 event not found");

const appBefore = await prisma.eventApplication.count({ where: { eventId: qaEvent.id } });
const bracketBefore = await prisma.bracketMatch.count({
  where: { bracket: { eventId: qaEvent.id } },
});
const eventSnapshot = {
  title: qaEvent.title,
  eventDate: qaEvent.eventDate.toISOString(),
  location: qaEvent.location,
};

await prisma.associationSchedule.updateMany({
  where: { relatedEventId: qaEvent.id, deletedAt: null },
  data: { deletedAt: new Date() },
});

const a = await associationScheduleService.create(actor, {
  title: "QA start+time",
  type: "OTHER",
  startsAtDate: "2026-09-05",
  startsAtHm: "08:00",
  allDay: false,
});
steps.push({ name: "A date+time", status: a.endsAt === null ? "PASS" : "FAIL" });

const b = await associationScheduleService.create(actor, {
  title: "QA date only",
  type: "OTHER",
  startsAtDate: "2026-09-05",
  startsAtHm: null,
  allDay: false,
});
steps.push({
  name: "B date only",
  status: b.endsAt === null && b.allDay ? "PASS" : "FAIL",
});

const c = await associationScheduleService.create(actor, {
  title: "QA allDay",
  type: "OTHER",
  startsAtDate: "2026-09-05",
  allDay: true,
});
steps.push({ name: "C allDay", status: c.allDay && c.endsAt === null ? "PASS" : "FAIL" });

const prefill = buildEventSchedulePrefill(qaEvent);
const linked = await associationScheduleService.create(actor, {
  ...prefill,
  description: prefill.description,
});
steps.push({
  name: "Event prefill create",
  status: linked.relatedEventId === qaEvent.id ? "PASS" : "FAIL",
});

let dupBlocked = false;
try {
  await associationScheduleService.create(actor, {
    ...prefill,
    title: prefill.title + " dup",
  });
} catch (e) {
  dupBlocked = String(e).includes("이미 협회 일정");
}
steps.push({ name: "duplicate blocked", status: dupBlocked ? "PASS" : "FAIL" });

const eventAfter = await prisma.event.findUniqueOrThrow({ where: { id: qaEvent.id } });
const appAfter = await prisma.eventApplication.count({ where: { eventId: qaEvent.id } });
const bracketAfter = await prisma.bracketMatch.count({
  where: { bracket: { eventId: qaEvent.id } },
});
steps.push({
  name: "Event immutability",
  status:
    eventAfter.title === eventSnapshot.title &&
    eventAfter.eventDate.toISOString() === eventSnapshot.eventDate &&
    eventAfter.location === eventSnapshot.location &&
    appAfter === appBefore &&
    bracketAfter === bracketBefore
      ? "PASS"
      : "FAIL",
});

for (const id of [a.id, b.id, c.id, linked.id]) {
  await associationScheduleService.delete(actor, id);
}
steps.push({ name: "cleanup", status: "PASS" });

await prisma.$disconnect();

const report = {
  steps,
  pass: steps.every((s) => s.status === "PASS"),
  finishedAt: new Date().toISOString(),
};
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log(report.pass ? "schedule-event-link-preview-qa: ALL PASS" : "FAIL");
for (const s of steps) console.log(`- ${s.status} ${s.name}`);
if (!report.pass) process.exit(1);
