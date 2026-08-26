/**
 * Bracket menu → 전체 경기 편집 direct entry SSOT.
 *   npm run verify:bracket-menu-direct-workspace
 */
import assert from "node:assert/strict";
import {
  getEventManagementNavItems,
  isEventManagementNavItemActive,
} from "../src/lib/ui/event-management-navigation.ts";

const EVENT_ID = "evt-test";

function main() {
  const items = getEventManagementNavItems(EVENT_ID, "sample-open-2026");
  const bracketItem = items.find((i) => i.label === "대진표");
  const sequenceItem = items.find((i) => i.label === "전체순서");
  assert.ok(bracketItem, "대진표 nav item");
  assert.ok(sequenceItem, "전체순서 nav item");

  const base = `/organizer/events/${EVENT_ID}`;

  assert.equal(
    bracketItem!.href,
    `${base}/brackets?tab=view&view=workspace`,
    "대진표 menu must open 전체 경기 편집 directly",
  );

  assert.equal(
    isEventManagementNavItemActive(
      `${base}/brackets`,
      "",
      EVENT_ID,
      bracketItem!,
      "?tab=view&view=workspace",
    ),
    true,
    "workspace view highlights 대진표",
  );

  assert.equal(
    isEventManagementNavItemActive(
      `${base}/brackets`,
      "",
      EVENT_ID,
      sequenceItem!,
      "?tab=view&view=workspace",
    ),
    false,
    "workspace view must not highlight 전체순서",
  );

  assert.equal(
    isEventManagementNavItemActive(
      `${base}/brackets`,
      "",
      EVENT_ID,
      sequenceItem!,
      "?tab=view",
    ),
    true,
    "board view highlights 전체순서",
  );

  assert.equal(
    isEventManagementNavItemActive(
      `${base}/brackets`,
      "",
      EVENT_ID,
      bracketItem!,
      "?tab=view",
    ),
    false,
    "board view must not highlight 대진표",
  );

  assert.equal(
    isEventManagementNavItemActive(
      `${base}/brackets`,
      "",
      EVENT_ID,
      bracketItem!,
      "?tab=settings",
    ),
    true,
    "bracket settings tab still under 대진표 group item",
  );

  console.log("verify:bracket-menu-direct-workspace OK");
}

main();
