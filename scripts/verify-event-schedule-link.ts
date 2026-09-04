/**
 * Event ↔ AssociationSchedule link safety checks
 *   npx tsx scripts/verify-event-schedule-link.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildEventSchedulePrefill,
  extractEventScheduleTimeHm,
} from "../src/lib/association-schedule/event-prefill";
import {
  extractEventDatetimeLocalDateKey,
  extractEventDatetimeLocalHm,
} from "../src/lib/date-display";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

const serviceSrc = read("src/lib/services/association-schedule.service.ts");
const schemaSrc = read("prisma/schema.prisma");
const migrationSrc = read(
  "prisma/migrations/20260902120000_association_schedule_related_event/migration.sql",
);

assert.doesNotMatch(serviceSrc, /event\.update\b/);
assert.doesNotMatch(serviceSrc, /eventApplication\.update\b/);
assert.doesNotMatch(serviceSrc, /bracketMatch\.update\b/);
assert.match(serviceSrc, /relatedEventId/);
assert.match(serviceSrc, /assertNoDuplicateEventSchedule/);
assert.match(serviceSrc, /endsAt: null/);
assert.doesNotMatch(serviceSrc, /endsAtDate/);

assert.match(schemaSrc, /relatedEventId\s+String\?/);
assert.match(schemaSrc, /ScheduleRelatedEvent/);

assert.doesNotMatch(migrationSrc, /^\s*UPDATE\s+/im);
assert.doesNotMatch(migrationSrc, /^\s*DELETE\s+/im);
assert.doesNotMatch(migrationSrc, /DROP COLUMN/i);
assert.match(migrationSrc, /relatedEventId/);

const midnight = new Date("2026-09-05T00:00:00.000Z");
assert.equal(extractEventDatetimeLocalHm(midnight), null);
assert.equal(extractEventScheduleTimeHm(midnight), null);

const at11 = new Date("2026-09-05T11:00:00.000Z");
assert.equal(extractEventDatetimeLocalHm(at11), "11:00");
assert.equal(extractEventScheduleTimeHm(at11), "11:00");
assert.equal(extractEventDatetimeLocalDateKey(at11), "2026-09-05");

const prefill = buildEventSchedulePrefill({
  id: "evt1",
  title: "QA 대회",
  eventDate: at11,
  location: "장소A",
  locationName: "체육관",
});
assert.equal(prefill.type, "TOURNAMENT");
assert.equal(prefill.startsAtDate, "2026-09-05");
assert.equal(prefill.startsAtHm, "11:00");
assert.equal(prefill.allDay, false);
assert.equal(prefill.location, "체육관");

const at1430 = new Date("2026-09-05T14:30:00.000Z");
const prefill1430 = buildEventSchedulePrefill({
  id: "evt2",
  title: "오후 대회",
  eventDate: at1430,
  location: null,
  locationName: null,
});
assert.equal(prefill1430.startsAtHm, "14:30");
assert.equal(prefill1430.startsAtDate, "2026-09-05");

const dateOnly = buildEventSchedulePrefill({
  id: "evt3",
  title: "날짜만",
  eventDate: midnight,
  location: null,
  locationName: null,
});
assert.equal(dateOnly.startsAtHm, null);
assert.equal(dateOnly.allDay, true);

console.log("verify-event-schedule-link: OK");
