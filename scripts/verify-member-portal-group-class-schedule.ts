/**
 * 회원 포털 그룹수업 주간·월간 일정 정적 검증.
 * Usage: tsx scripts/verify-member-portal-group-class-schedule.ts [focus]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MEMBER_PORTAL_CLASS_MAX_RANGE_DAYS,
  addSeoulDateKeyDays,
  assertClassRangeWithinLimit,
  buildSeoulMonthCalendarCells,
  formatSeoulDateKeyLongKo,
  formatSeoulMonthLabel,
  formatSeoulWeekRangeLabel,
  getMonthCalendarFetchRange,
  getWeekRangeForDateKey,
  listSeoulWeekDateKeys,
  parseMemberPortalClassView,
  parseMemberPortalDateKey,
  seoulDateKeyParts,
  seoulDateKeyWeekdayIndexSun0,
  shiftSeoulMonth,
} from "../src/lib/gym-member-portal/class-calendar";
import { createSeoulDateTime } from "../src/lib/gym-schedule/seoul-schedule";

const root = process.cwd();
const focus = process.argv[2] ?? "all";

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIncludes(hay: string, needle: string, label: string) {
  assert.ok(hay.includes(needle), `missing ${label}: ${needle}`);
}

function verifyWeekView() {
  const keys = listSeoulWeekDateKeys("2026-08-05");
  assert.equal(keys.length, 7);
  assert.equal(keys[0], "2026-08-03"); // Mon
  assert.equal(keys[6], "2026-08-09"); // Sun
  assert.equal(seoulDateKeyWeekdayIndexSun0(keys[0]!), 1);
  assert.equal(seoulDateKeyWeekdayIndexSun0(keys[6]!), 0);

  const week = getWeekRangeForDateKey("2026-08-05");
  assert.equal(week.startKey, "2026-08-03");
  assert.equal(week.endInclusiveKey, "2026-08-09");
  assert.equal(
    formatSeoulWeekRangeLabel(week.startKey, week.endInclusiveKey),
    "8월 3일 – 8월 9일",
  );

  // 월 경계 주
  const boundary = listSeoulWeekDateKeys("2026-08-01");
  assert.equal(boundary[0], "2026-07-27");
  assert.equal(boundary[6], "2026-08-02");

  const page = read("src/app/member-portal/[token]/classes/page.tsx");
  assertIncludes(page, "parseMemberPortalClassView", "view parse");
  assertIncludes(page, 'view === "week"', "week range");
  assertIncludes(
    read("src/components/domain/gym-member-portal/MemberPortalClassesSchedule.tsx"),
    "주간",
    "week ui",
  );
  console.log("verify:member-portal-group-class-week-view: OK");
}

function verifyMonthView() {
  const cells = buildSeoulMonthCalendarCells(2026, 8);
  assert.ok(cells.length === 35 || cells.length === 42);
  assert.equal(cells[0]!.dateKey, "2026-07-26"); // Sunday before Aug 1 (Sat)
  // Aug 1 2026 is Saturday
  assert.equal(seoulDateKeyWeekdayIndexSun0("2026-08-01"), 6);
  const aug1 = cells.find((c) => c.dateKey === "2026-08-01");
  assert.ok(aug1?.inMonth);

  const feb = buildSeoulMonthCalendarCells(2026, 2);
  assert.ok(feb.length === 35 || feb.length === 42);

  assert.equal(formatSeoulMonthLabel(2026, 8), "2026년 8월");
  const shifted = shiftSeoulMonth(2026, 1, -1);
  assert.equal(shifted.year, 2025);
  assert.equal(shifted.month, 12);

  const ui = read(
    "src/components/domain/gym-member-portal/MemberPortalClassesSchedule.tsx",
  );
  assertIncludes(ui, "월간", "month ui");
  assertIncludes(ui, "MONTH_GRID_LABELS_SUN", "sun start");
  console.log("verify:member-portal-group-class-month-view: OK");
}

function verifyRange() {
  const week = getWeekRangeForDateKey("2026-08-05");
  assertClassRangeWithinLimit(week.start, week.endExclusive);

  const month = getMonthCalendarFetchRange(2026, 8);
  assertClassRangeWithinLimit(month.start, month.endExclusive);
  const days =
    (month.endExclusive.getTime() - month.start.getTime()) /
    (24 * 60 * 60 * 1000);
  assert.ok(days <= MEMBER_PORTAL_CLASS_MAX_RANGE_DAYS);

  assert.throws(() => {
    assertClassRangeWithinLimit(
      createSeoulDateTime("2026-01-01", "00:00"),
      createSeoulDateTime("2026-03-01", "00:00"),
    );
  });

  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "assertClassRangeWithinLimit", "range guard");
  assertIncludes(service, "from: Date; toExclusive: Date", "range arg");
  assertIncludes(service, "async getGroupClass", "single fetch");
  console.log("verify:member-portal-group-class-range: OK");
}

function verifyApplicationStatus() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, '"신청 가능"', "available");
  assertIncludes(service, '"신청 완료"', "applied");
  assertIncludes(service, '"정원 마감"', "full");
  assertIncludes(service, '"신청 마감"', "deadline");
  assertIncludes(service, '"취소됨"', "cancelled");
  assertIncludes(service, '"종료됨"', "ended");
  assertIncludes(service, "canApply", "canApply");
  assertIncludes(service, "canCancel", "canCancel");
  assertIncludes(service, "joinAsMember", "reuse join");
  assertIncludes(service, "cancelAsMember", "reuse cancel");
  console.log("verify:member-portal-group-class-application-status: OK");
}

function verifyGymScope() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "gymId: session.gymId", "gym scope list");
  assertIncludes(service, 'visibility: { in: ["members_only", "public"] }', "vis");
  assertIncludes(service, "deletedAt: null", "soft delete");
  const page = read("src/app/member-portal/[token]/classes/page.tsx");
  assertIncludes(page, "requireMemberPortalPageSession", "token session");
  console.log("verify:member-portal-group-class-gym-scope: OK");
}

function verifyKst() {
  assert.equal(parseMemberPortalClassView("month"), "month");
  assert.equal(parseMemberPortalClassView("week"), "week");
  assert.equal(parseMemberPortalClassView("nope"), "week");
  assert.equal(parseMemberPortalDateKey("2026-08-05"), "2026-08-05");
  assert.equal(
    parseMemberPortalDateKey("bad", createSeoulDateTime("2026-08-05", "12:00")),
    "2026-08-05",
  );
  assert.equal(formatSeoulDateKeyLongKo("2026-08-07"), "8월 7일 금요일");
  assert.equal(addSeoulDateKeyDays("2026-08-31", 1), "2026-09-01");
  assert.deepEqual(seoulDateKeyParts("2026-08-05"), {
    year: 2026,
    month: 8,
    day: 5,
  });

  const cal = read("src/lib/gym-member-portal/class-calendar.ts");
  assertIncludes(cal, "Asia/Seoul", "kst comment");
  assertIncludes(cal, "parseSeoulDateOnlyString", "parse ssot");
  console.log("verify:member-portal-group-class-kst: OK");
}

function verifyHomeSummary() {
  const home = read("src/app/member-portal/[token]/home/page.tsx");
  assertIncludes(home, "MemberPortalHomeGroupClassCard", "summary card");
  assertIncludes(home, "weekClassSummaryItems", "summary items");
  const card = read(
    "src/components/domain/gym-member-portal/MemberPortalHomeGroupClassCard.tsx",
  );
  assertIncludes(card, "전체 보기", "see all");
  assertIncludes(card, "view=week", "week link");
  assertIncludes(card, "view=month", "month link");
  assertIncludes(card, "이번 주 남은 그룹수업", "remaining title");
  assertIncludes(card, "이번 주 예정된 그룹수업이 없습니다.", "empty");
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "weekClassSummaryItems", "service summary");
  assertIncludes(service, "remainingWeekClasses", "remaining count");
  console.log("verify:member-portal-home-group-class-summary: OK");
}

const runners: Record<string, () => void> = {
  "week-view": verifyWeekView,
  "month-view": verifyMonthView,
  range: verifyRange,
  "application-status": verifyApplicationStatus,
  "gym-scope": verifyGymScope,
  kst: verifyKst,
  "home-summary": verifyHomeSummary,
};

if (focus === "all") {
  for (const fn of Object.values(runners)) fn();
  console.log("verify:member-portal-group-class-schedule: ALL OK");
} else {
  const fn = runners[focus];
  if (!fn) {
    console.error(`Unknown focus: ${focus}`);
    process.exit(1);
  }
  fn();
}
