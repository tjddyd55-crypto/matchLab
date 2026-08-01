/**
 * Stage 3 gym group class static verifies.
 * Usage: tsx scripts/verify-gym-group-class.ts [focus]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { intervalsOverlap } from "../src/lib/gym-schedule/overlap";
import {
  assertTenMinuteInstant,
  createSeoulDateTime,
  isSameSeoulCalendarDay,
} from "../src/lib/gym-schedule/seoul-schedule";
import {
  getGymPortalNavGroups,
  isGymPortalNavItemActive,
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
  const sql = read("prisma/migrations_manual/20260731_gym_group_classes.sql");
  assertIncludes(schema, "model GymGroupClass", "class model");
  assertIncludes(schema, "model GymGroupClassParticipation", "participation");
  assertIncludes(schema, "enum GymGroupClassStatus", "status enum");
  assertIncludes(schema, "enum GymGroupClassVisibility", "visibility enum");
  assertIncludes(
    schema,
    "enum GymGroupClassParticipationStatus",
    "participation status",
  );
  assertIncludes(schema, "members_only", "default visibility");
  assertIncludes(schema, "gym_group_class_created", "audit create");
  assertIncludes(schema, "gym_group_class_participant_promoted", "audit promote");
  assertIncludes(sql, 'CREATE TABLE IF NOT EXISTS "GymGroupClass"', "sql class");
  assertIncludes(
    sql,
    'CREATE TABLE IF NOT EXISTS "GymGroupClassParticipation"',
    "sql participation",
  );
  assertIncludes(
    sql,
    "GymGroupClassParticipation_gymGroupClassId_gymMemberId_key",
    "unique",
  );
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /\bDROP\b|\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /--accept-data-loss/);
  console.log("verify:gym-group-class-schema: OK");
}

function verifyTime() {
  const ok = createSeoulDateTime("2026-07-31", "19:10");
  assertTenMinuteInstant(ok, "start");
  assert.throws(() => {
    assertTenMinuteInstant(createSeoulDateTime("2026-07-31", "19:03"), "start");
  });
  const service = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(service, "10분 단위", "ten minute msg");
  assertIncludes(service, "날짜를 넘기는", "same day");
  assertIncludes(service, "SCHEDULE_MIN_DURATION_MS", "min duration reuse");
  assertIncludes(service, "SCHEDULE_MAX_DURATION_MS", "max duration reuse");
  assert.equal(
    isSameSeoulCalendarDay(
      createSeoulDateTime("2026-07-31", "19:00"),
      createSeoulDateTime("2026-07-31", "20:00"),
    ),
    true,
  );
  console.log("verify:gym-group-class-time: OK");
}

function verifyStaffOverlap() {
  const a0 = createSeoulDateTime("2026-07-31", "19:00");
  const a1 = createSeoulDateTime("2026-07-31", "20:00");
  const b0 = createSeoulDateTime("2026-07-31", "19:30");
  const b1 = createSeoulDateTime("2026-07-31", "20:30");
  assert.equal(intervalsOverlap(a0, a1, b0, b1), true);
  const c0 = createSeoulDateTime("2026-07-31", "20:00");
  const c1 = createSeoulDateTime("2026-07-31", "21:00");
  assert.equal(intervalsOverlap(a0, a1, c0, c1), false);
  const service = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(service, "assertStaffAvailability", "staff availability");
  assertIncludes(service, "같은 선생님의 그룹수업이 이미 같은 시간에", "group overlap msg");
  assertIncludes(service, "같은 선생님의 개인 일정이 이미 같은 시간에", "pt overlap msg");
  assertIncludes(service, "listOverlapping", "pt overlap query");
  console.log("verify:gym-group-class-staff-overlap: OK");
}

function verifyMemberOverlap() {
  const service = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(service, "assertMemberAvailability", "member availability");
  assertIncludes(service, 'status: "attending"', "attending only occupancy");
  assertIncludes(service, "waitlisted", "waitlist not occupancy context");
  console.log("verify:gym-group-class-member-overlap: OK");
}

function verifyCapacityWaitlist() {
  const service = read("src/lib/services/gym-group-class.service.ts");
  const labels = read("src/lib/gym-group-class/labels.ts");
  assertIncludes(labels, "GYM_GROUP_CLASS_CAPACITY_MAX", "capacity max");
  assertIncludes(service, "waitlistOrder", "waitlist order");
  assertIncludes(service, "promoteWhileSpace", "auto promote");
  assertIncludes(service, "findEarliestWaitlisted", "earliest waitlisted");
  assertIncludes(service, "pg_advisory_xact_lock", "advisory lock");
  assertIncludes(service, "ggc:", "lock key prefix");
  assertIncludes(service, "capacityExceeded", "over capacity display");
  assert.doesNotMatch(
    service,
    /forceDemote|강제.*강등|status:\s*"waitlisted".*capacity\s*</,
  );
  console.log("verify:gym-group-class-capacity: OK");
  console.log("verify:gym-group-class-waitlist: OK");
  console.log("verify:gym-group-class-auto-promotion: OK");
  console.log("verify:gym-group-class-concurrency: OK");
}

function verifyPermissions() {
  const access = read("src/lib/gym-group-class/access.ts");
  const service = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(access, "requireGymGroupClassRead", "read");
  assertIncludes(access, "requireGymGroupClassWrite", "write");
  assertIncludes(access, "requireGymGroupClassManageParticipants", "participants");
  assertIncludes(access, "canManageGymGroupClass", "can manage");
  assertIncludes(service, "다른 선생님의 그룹수업은 수정할 수 없습니다", "staff scope");
  assertIncludes(
    service,
    "자기 자신을 담당자로만 그룹수업을 등록할 수 있습니다",
    "staff create self",
  );
  console.log("verify:gym-group-class-owner-permissions: OK");
  console.log("verify:gym-group-class-staff-permissions: OK");
  console.log("verify:gym-group-class-gym-scope: OK");
}

function verifyStatus() {
  const service = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(service, "completeClass", "complete");
  assertIncludes(service, "cancelClass", "cancel");
  assertIncludes(service, "completedAt", "completedAt");
  assertIncludes(service, "cancelledAt", "cancelledAt");
  assert.doesNotMatch(
    service,
    /gymAttendanceService|createAttendance|recordSale|차감/,
  );
  assertIncludes(service, "출석·매출·이용권 자동 연동 금지", "no side effects");
  console.log("verify:gym-group-class-status: OK");
}

function verifyCalendar() {
  const calendarItem = read("src/lib/gym-schedule/calendar-item.ts");
  const scheduleService = read("src/lib/services/gym-schedule.service.ts");
  const calendarApp = read(
    "src/components/domain/gym-schedules/GymScheduleCalendarApp.tsx",
  );
  assertIncludes(calendarItem, 'itemType: GymCalendarItemType', "view model");
  assertIncludes(calendarItem, '"group_class"', "group type");
  assertIncludes(scheduleService, "itemKind", "kind filter");
  assertIncludes(scheduleService, "getCalendarItems", "merge group items");
  assertIncludes(calendarApp, "전체 종류", "kind filter UI");
  assertIncludes(calendarApp, "group_class", "group click");
  assertIncludes(calendarApp, "GymCalendarGroupClassDetailDialog", "group detail modal");
  const groupModal = read(
    "src/components/domain/gym-schedules/GymCalendarGroupClassDetailDialog.tsx",
  );
  assertIncludes(groupModal, "/gym/group-classes/", "detail manage link path");
  assertIncludes(
    calendarApp,
    'if (item.itemType === "group_class") {\n      setSelectedGroup(item);',
    "block click opens group modal",
  );
  console.log("verify:gym-group-class-calendar: OK");
}

function verifyDetailSurfaces() {
  const memberPage = read("src/app/(dashboard)/gym/members/[memberId]/page.tsx");
  const staffPage = read("src/app/(dashboard)/gym/staff/[staffId]/page.tsx");
  const home = read("src/app/(dashboard)/gym/page.tsx");
  const section = read(
    "src/components/domain/gym-group-classes/GymMemberGroupClassesSection.tsx",
  );
  assertIncludes(memberPage, "getMemberUpcoming", "member upcoming");
  assertIncludes(memberPage, "GymMemberGroupClassesSection", "member section");
  assertIncludes(section, "예정된 그룹수업", "section title");
  assertIncludes(staffPage, "getStaffUpcoming", "staff upcoming");
  assertIncludes(staffPage, "그룹수업 보기", "staff link");
  assertIncludes(home, "groupClassSummary", "home summary");
  assertIncludes(home, "그룹수업 관리", "home link");
  console.log("verify:gym-group-class-member-detail: OK");
  console.log("verify:gym-group-class-staff-detail: OK");
}

function verifyNavigation() {
  const owner = getGymPortalNavGroups("owner");
  const staff = getGymPortalNavGroups("staff");
  const ownerSchedules = owner.find((g) => g.id === "schedules");
  assert.deepEqual(
    ownerSchedules?.items.map((i) => i.href),
    ["/gym/schedules", "/gym/schedules/my", "/gym/group-classes"],
  );
  const staffSchedules = staff.find((g) => g.id === "schedules");
  assert.deepEqual(
    staffSchedules?.items.map((i) => i.href),
    ["/gym/schedules", "/gym/group-classes"],
  );
  assert.equal(
    isGymPortalNavItemActive("/gym/group-classes", "/gym/group-classes/abc"),
    true,
  );
  const listPage = read("src/app/(dashboard)/gym/group-classes/page.tsx");
  const detailPage = read(
    "src/app/(dashboard)/gym/group-classes/[classId]/page.tsx",
  );
  assertIncludes(listPage, "GymGroupClassListApp", "list app");
  assertIncludes(detailPage, "GymGroupClassDetailApp", "detail app");
  const listApp = read(
    "src/components/domain/gym-group-classes/GymGroupClassListApp.tsx",
  );
  assertIncludes(listApp, "flex-wrap", "mobile wrap");
  assertIncludes(listApp, "truncate", "long title wrap/truncate");
  const detailApp = read(
    "src/components/domain/gym-group-classes/GymGroupClassDetailApp.tsx",
  );
  assertIncludes(detailApp, "min-w-0", "detail mobile layout");
  console.log("verify:gym-group-class-navigation: OK");
  console.log("verify:gym-group-class-mobile-layout: OK");
}

const runners: Record<string, () => void> = {
  schema: verifySchema,
  time: verifyTime,
  "staff-overlap": verifyStaffOverlap,
  "member-overlap": verifyMemberOverlap,
  capacity: verifyCapacityWaitlist,
  waitlist: verifyCapacityWaitlist,
  "auto-promotion": verifyCapacityWaitlist,
  concurrency: verifyCapacityWaitlist,
  permissions: verifyPermissions,
  "owner-permissions": verifyPermissions,
  "staff-permissions": verifyPermissions,
  "gym-scope": verifyPermissions,
  status: verifyStatus,
  calendar: verifyCalendar,
  "member-detail": verifyDetailSurfaces,
  "staff-detail": verifyDetailSurfaces,
  navigation: verifyNavigation,
  "mobile-layout": verifyNavigation,
  all() {
    verifySchema();
    verifyTime();
    verifyStaffOverlap();
    verifyMemberOverlap();
    verifyCapacityWaitlist();
    verifyPermissions();
    verifyStatus();
    verifyCalendar();
    verifyDetailSurfaces();
    verifyNavigation();
  },
};

const run = runners[focus] ?? runners.all;
run();
console.log(`verify:gym-group-class (${focus}): DONE`);
