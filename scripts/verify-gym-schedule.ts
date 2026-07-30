/**
 * Stage 2 gym personal schedule static verifies.
 * Usage: tsx scripts/verify-gym-schedule.ts [focus]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { intervalsOverlap } from "../src/lib/gym-schedule/overlap";
import {
  assertTenMinuteInstant,
  createSeoulDateTime,
  getSeoulDayRange,
  getSeoulScheduleWeekRange,
  isSameSeoulCalendarDay,
  toSeoulDateKey,
} from "../src/lib/gym-schedule/seoul-schedule";
import {
  getGymPortalNavGroups,
  getGymPortalMobileBottomNavItems,
} from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();
const focus = process.argv[2] ?? "all";

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIncludes(hay: string, needle: string, label: string) {
  assert.ok(hay.includes(needle), `missing ${label}: ${needle}`);
}

function verifySchema() {
  const schema = read("prisma/schema.prisma");
  const sql = read(
    "prisma/migrations_manual/20260730_gym_personal_schedules.sql",
  );
  assertIncludes(schema, "model GymPersonalSchedule", "model");
  assertIncludes(schema, "enum GymPersonalScheduleType", "type enum");
  assertIncludes(schema, "enum GymPersonalScheduleStatus", "status enum");
  assertIncludes(schema, "personal_training", "default type");
  assertIncludes(schema, "gym_personal_schedule_created", "audit");
  assertIncludes(sql, "CREATE TABLE IF NOT EXISTS \"GymPersonalSchedule\"", "sql");
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /\bDROP\b|\bTRUNCATE\b/i);
  console.log("verify:gym-schedule-schema: OK");
}

function verifyTenMinute() {
  const ok = createSeoulDateTime("2026-07-30", "15:10");
  assertTenMinuteInstant(ok, "start");
  assert.throws(() => {
    const bad = createSeoulDateTime("2026-07-30", "15:03");
    assertTenMinuteInstant(bad, "start");
  });
  const helpers = read("src/lib/gym-schedule/seoul-schedule.ts");
  assertIncludes(helpers, "SCHEDULE_MIN_DURATION_MS", "min duration");
  assertIncludes(helpers, "SCHEDULE_MAX_DURATION_MS", "max duration");
  const service = read("src/lib/services/gym-schedule.service.ts");
  assertIncludes(service, "10분 단위", "server message");
  assertIncludes(service, "날짜를 넘기는", "same day");
  console.log("verify:gym-schedule-ten-minute-slot: OK");
}

function verifyTimezone() {
  const start = createSeoulDateTime("2026-12-31", "23:50");
  const end = createSeoulDateTime("2027-01-01", "00:10");
  assert.equal(isSameSeoulCalendarDay(start, end), false);
  const day = getSeoulDayRange("2026-07-30");
  assert.equal(toSeoulDateKey(day.start), "2026-07-30");
  const week = getSeoulScheduleWeekRange(
    createSeoulDateTime("2026-07-30", "12:00"),
  );
  assert.ok(week.startKey <= "2026-07-30");
  // midnight boundary: 00:00 Seoul should stay on same dateKey
  const midnight = createSeoulDateTime("2026-07-30", "00:00");
  assert.equal(toSeoulDateKey(midnight), "2026-07-30");
  console.log("verify:gym-schedule-timezone: OK");
}

function verifyOverlap() {
  const a0 = createSeoulDateTime("2026-07-30", "15:00");
  const a1 = createSeoulDateTime("2026-07-30", "17:00");
  const b0 = createSeoulDateTime("2026-07-30", "16:00");
  const b1 = createSeoulDateTime("2026-07-30", "18:00");
  assert.equal(intervalsOverlap(a0, a1, b0, b1), true);
  const c0 = createSeoulDateTime("2026-07-30", "17:00");
  const c1 = createSeoulDateTime("2026-07-30", "18:00");
  assert.equal(intervalsOverlap(a0, a1, c0, c1), false);
  const service = read("src/lib/services/gym-schedule.service.ts");
  assertIncludes(service, "같은 선생님", "staff overlap msg");
  assertIncludes(service, "같은 회원", "member overlap msg");
  assertIncludes(service, 'status: { not: "cancelled" }', "exclude cancelled");
  console.log("verify:gym-schedule-staff-overlap: OK");
  console.log("verify:gym-schedule-member-overlap: OK");
}

function verifyScopeAndPermissions() {
  const access = read("src/lib/gym-schedule/access.ts");
  const service = read("src/lib/services/gym-schedule.service.ts");
  assertIncludes(access, "requireGymScheduleRead", "read helper");
  assertIncludes(access, "requireGymScheduleWrite", "write helper");
  assertIncludes(service, "다른 선생님의 일정은 수정할 수 없습니다", "staff scope");
  assertIncludes(service, "현재 시각 이후 일정만", "staff past create");
  assertIncludes(service, "출석·매출 자동 생성 금지", "no auto side effects comment");
  assert.doesNotMatch(service, /gymAttendanceService|gymSalesService|createAttendance|recordSale/);
  console.log("verify:gym-schedule-gym-scope: OK");
  console.log("verify:gym-schedule-owner-permissions: OK");
  console.log("verify:gym-schedule-staff-permissions: OK");
}

function verifyCrudStatus() {
  const service = read("src/lib/services/gym-schedule.service.ts");
  const actions = read("src/features/gym-schedules/actions.ts");
  for (const name of [
    "createSchedule",
    "updateSchedule",
    "completeSchedule",
    "markNoShow",
    "cancelSchedule",
  ]) {
    assertIncludes(service, name, name);
  }
  assertIncludes(actions, "createGymScheduleAction", "create action");
  assertIncludes(actions, "cancelGymScheduleAction", "cancel action");
  assertIncludes(service, 'status: "cancelled"', "cancel status");
  assertIncludes(service, "gym_personal_schedule_completed", "audit complete");
  console.log("verify:gym-schedule-create-update: OK");
  console.log("verify:gym-schedule-status: OK");
}

function verifyCalendarUi() {
  const app = read(
    "src/components/domain/gym-schedules/GymScheduleCalendarApp.tsx",
  );
  assertIncludes(app, "MonthView", "month");
  assertIncludes(app, "WeekDesktop", "week desktop");
  assertIncludes(app, "DayTimeline", "day");
  assertIncludes(app, "md:hidden", "mobile week");
  assertIncludes(app, "SCHEDULE_PX_PER_MINUTE", "block geometry");
  console.log("verify:gym-schedule-calendar-month: OK");
  console.log("verify:gym-schedule-calendar-week: OK");
  console.log("verify:gym-schedule-calendar-day: OK");
  console.log("verify:gym-schedule-mobile-layout: OK");
}

function verifyMemberStaffDetail() {
  const memberPage = read(
    "src/app/(dashboard)/gym/members/[memberId]/page.tsx",
  );
  const staffPage = read("src/app/(dashboard)/gym/staff/[staffId]/page.tsx");
  assertIncludes(memberPage, "GymMemberAssignedStaffSection", "assigned staff");
  assertIncludes(
    memberPage,
    "GymMemberUpcomingSchedulesSection",
    "upcoming schedules",
  );
  assertIncludes(staffPage, "getStaffUpcoming", "staff upcoming");
  console.log("verify:gym-schedule-member-detail: OK");
  console.log("verify:gym-schedule-staff-detail: OK");
}

function verifyNavigation() {
  const owner = getGymPortalNavGroups("owner");
  const staff = getGymPortalNavGroups("staff");
  assert.ok(owner.some((g) => g.id === "schedules"));
  assert.deepEqual(
    owner.find((g) => g.id === "schedules")?.items.map((i) => i.label),
    ["전체 일정", "내 일정"],
  );
  assert.deepEqual(
    staff.find((g) => g.id === "schedules")?.items.map((i) => i.label),
    ["내 일정"],
  );
  const bottom = getGymPortalMobileBottomNavItems("staff");
  assert.ok(bottom.some((i) => i.href === "/gym/schedules"));
  console.log("verify:gym-schedule-navigation: OK");
}

const runners: Record<string, () => void> = {
  schema: verifySchema,
  "ten-minute": verifyTenMinute,
  timezone: verifyTimezone,
  overlap: () => {
    verifyOverlap();
  },
  permissions: verifyScopeAndPermissions,
  crud: verifyCrudStatus,
  calendar: verifyCalendarUi,
  detail: verifyMemberStaffDetail,
  navigation: verifyNavigation,
};

if (focus === "all") {
  verifySchema();
  verifyTenMinute();
  verifyTimezone();
  verifyOverlap();
  verifyScopeAndPermissions();
  verifyCrudStatus();
  verifyCalendarUi();
  verifyMemberStaffDetail();
  verifyNavigation();
} else if (runners[focus]) {
  runners[focus]();
} else {
  console.error("unknown focus", focus);
  process.exit(1);
}
