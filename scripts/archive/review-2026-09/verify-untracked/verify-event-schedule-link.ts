/**
 * Event ↔ AssociationSchedule link safety checks
 *   npx tsx scripts/verify-event-schedule-link.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildEventSchedulePrefill,
  extractSeoulTimeFromEventDate,
} from "../src/lib/association-schedule/event-prefill";
import { createSeoulDateTime } from "../src/lib/gym-schedule/seoul-schedule";

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

const midnight = createSeoulDateTime("2026-09-05", "00:00");
assert.equal(extractSeoulTimeFromEventDate(midnight), null);
const withTime = createSeoulDateTime("2026-09-05", "08:00");
assert.equal(extractSeoulTimeFromEventDate(withTime), "08:00");

const prefill = buildEventSchedulePrefill({
  id: "evt1",
  title: "QA 대회",
  eventDate: withTime,
  location: "장소A",
  locationName: "체육관",
});
assert.equal(prefill.type, "TOURNAMENT");
assert.equal(prefill.startsAtDate, "2026-09-05");
assert.equal(prefill.startsAtHm, "08:00");
assert.equal(prefill.allDay, false);
assert.equal(prefill.location, "체육관");

const dateOnly = buildEventSchedulePrefill({
  id: "evt2",
  title: "날짜만",
  eventDate: midnight,
  location: null,
  locationName: null,
});
assert.equal(dateOnly.startsAtHm, null);
assert.equal(dateOnly.allDay, true);

console.log("verify-event-schedule-link: OK");
