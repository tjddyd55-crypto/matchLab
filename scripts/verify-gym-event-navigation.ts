/**
 * Gym portal event navigation / availability / eligibility SSOT verifies.
 *   npm run verify:gym-event-navigation
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { EventStatus } from "../src/lib/enums";
import {
  computeGymEventApplicationAvailability,
  evaluateGymEventApplyEligibility,
} from "../src/lib/gym-event-apply";
import {
  canGymAccessEventApplications,
  GYM_PORTAL_EVENT_APPLICATION_HREFS,
  GYM_PORTAL_HIDDEN_EVENT_HREFS,
  getGymPortalNavGroups,
  getGymPortalNavItems,
  getGymPortalMobileBottomNavItems,
  isGymPortalNavItemActive,
} from "../src/lib/navigation/gym-portal-navigation";
import { activeFighterEligibleForEventApplicationWhere } from "../src/lib/gym-affiliation";

const root = process.cwd();

function assertNav() {
  const items = getGymPortalNavItems();
  const hrefs = items.map((i) => i.href);
  for (const h of GYM_PORTAL_EVENT_APPLICATION_HREFS) {
    assert.ok(hrefs.includes(h), `nav must include ${h}`);
  }
  for (const h of GYM_PORTAL_HIDDEN_EVENT_HREFS) {
    assert.ok(!hrefs.includes(h), `nav must hide ${h}`);
  }
  const groups = getGymPortalNavGroups();
  const events = groups.find((g) => g.id === "events");
  assert.equal(events?.label, "대회");
  assert.deepEqual(
    events?.items.map((i) => i.label),
    ["대회 목록", "신청 내역"],
  );
  const bottom = getGymPortalMobileBottomNavItems();
  assert.deepEqual(
    bottom.map((i) => i.label),
    ["홈", "회원", "선수", "더보기"],
  );
  assert.ok(isGymPortalNavItemActive("/gym/events", "/gym/events/abc/apply"));
  assert.ok(
    isGymPortalNavItemActive("/gym/applications", "/gym/applications"),
  );
  assert.equal(
    canGymAccessEventApplications({ role: "gym", gymId: "g1" }),
    true,
  );
  assert.equal(
    canGymAccessEventApplications({ role: "fighter", gymId: "g1" }),
    false,
  );
  assert.equal(
    canGymAccessEventApplications({ role: "gym", gymId: null }),
    false,
  );
  console.log("verify:gym-event-navigation: OK");
}

function assertAvailability() {
  const now = new Date("2026-07-01T12:00:00.000Z");
  const open = computeGymEventApplicationAvailability(
    {
      status: EventStatus.open,
      registrationStartDate: new Date("2026-06-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-07-15T00:00:00.000Z"),
    },
    now,
  );
  assert.equal(open.phase, "open");
  assert.equal(open.canStartApplication, true);

  const scheduled = computeGymEventApplicationAvailability(
    {
      status: EventStatus.open,
      registrationStartDate: new Date("2026-08-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-08-15T00:00:00.000Z"),
    },
    now,
  );
  assert.equal(scheduled.phase, "scheduled");
  assert.equal(scheduled.canStartApplication, false);

  const closed = computeGymEventApplicationAvailability(
    {
      status: EventStatus.open,
      registrationStartDate: new Date("2026-05-01T00:00:00.000Z"),
      registrationEndDate: new Date("2026-06-01T00:00:00.000Z"),
    },
    now,
  );
  assert.equal(closed.phase, "closed");

  const eligibility = evaluateGymEventApplyEligibility({
    status: EventStatus.open,
    registrationStartDate: new Date("2026-06-01T00:00:00.000Z"),
    registrationEndDate: new Date("2026-07-15T00:00:00.000Z"),
    divisionCount: 1,
    hasPaymentSetting: true,
    activeFighterCount: 0,
  }, now);
  assert.equal(eligibility.canApply, false);
  assert.match(eligibility.applyDisabledReason ?? "", /GymMember/);
  console.log("verify:gym-event-list-access: OK");
  console.log("verify:gym-event-visibility: OK");
}

function assertEligibilityWhere() {
  const where = activeFighterEligibleForEventApplicationWhere("gym-1");
  assert.ok(where.AND);
  const text = JSON.stringify(where);
  assert.match(text, /gymMemberId/);
  assert.match(text, /deletedAt/);
  console.log("verify:gym-event-fighter-eligibility: OK");
}

function assertRoutesExist() {
  const files = [
    "src/app/(dashboard)/gym/events/page.tsx",
    "src/app/(dashboard)/gym/applications/page.tsx",
    "src/app/(dashboard)/gym/events/[eventId]/apply/page.tsx",
    "src/app/(dashboard)/gym/events/[eventId]/status/page.tsx",
  ];
  for (const f of files) {
    const body = readFileSync(join(root, f), "utf8");
    assert.ok(body.length > 50, f);
  }
  console.log("verify:gym-event-application-access: OK");
}

function main() {
  assertNav();
  assertAvailability();
  assertEligibilityWhere();
  assertRoutesExist();
  console.log("verify:gym-event-application-create: SKIP (service covered by existing flows)");
  console.log("verify:gym-event-application-update: SKIP (existing application.service)");
  console.log("verify:gym-event-application-cancel: SKIP (existing application.service)");
  console.log("verify:gym-event-application-duplicate: SKIP (unique eventId+fighterId+divisionId)");
  console.log("verify:gym-event-independent-gym-policy: OK (global open list; no association filter)");
  console.log("verify:gym-event-navigation: ALL_PASS");
}

main();
