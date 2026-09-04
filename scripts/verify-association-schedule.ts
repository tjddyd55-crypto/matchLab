/**
 * Association schedule static checks
 *   npx tsx scripts/verify-association-schedule.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  associationScheduleIncludesDateKey,
  sortAssociationSchedulesForDay,
} from "../src/lib/association-schedule/calendar";
import { createSeoulDateTime } from "../src/lib/gym-schedule/seoul-schedule";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const multiStart = createSeoulDateTime("2026-09-20", "09:00");
const multiEnd = createSeoulDateTime("2026-09-22", "18:00");
assert.equal(
  associationScheduleIncludesDateKey(
    { startsAt: multiStart, endsAt: multiEnd, allDay: false },
    "2026-09-21",
  ),
  true,
);
assert.equal(
  associationScheduleIncludesDateKey(
    { startsAt: multiStart, endsAt: multiEnd, allDay: false },
    "2026-09-19",
  ),
  false,
);

const sorted = sortAssociationSchedulesForDay([
  {
    id: "b",
    title: "B",
    allDay: false,
    startsAt: createSeoulDateTime("2026-09-20", "14:00"),
  },
  {
    id: "a",
    title: "A",
    allDay: true,
    startsAt: createSeoulDateTime("2026-09-20", "00:00"),
  },
  {
    id: "c",
    title: "C",
    allDay: false,
    startsAt: createSeoulDateTime("2026-09-20", "09:00"),
  },
]);
assert.equal(sorted[0].allDay, true);
assert.equal(sorted[1].id, "c");
assert.equal(sorted[2].id, "b");

const schema = read("prisma/schema.prisma");
assert.match(schema, /relatedFormId\s+String\?/);
assert.match(schema, /relatedNoticeId\s+String\?/);
assert.match(schema, /relatedEventId\s+String\?/);

const formDialog = read("src/components/domain/association-schedules/AssociationScheduleFormDialog.tsx");
assert.doesNotMatch(formDialog, /종료일/);
assert.doesNotMatch(formDialog, /endsAtDate/);

console.log("verify-association-schedule: OK");
