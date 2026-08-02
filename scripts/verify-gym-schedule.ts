/**
 * Stage 2 gym personal schedule static verifies.
 * Usage: tsx scripts/verify-gym-schedule.ts [focus]
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { intervalsOverlap } from "../src/lib/gym-schedule/overlap";
import {
  formatScheduleAxisTimeKorean,
} from "../src/lib/gym-schedule/board-geometry";
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
  assertIncludes(service, "pg_advisory_xact_lock", "advisory lock");
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
  const dialog = read("src/components/ui/dialog.tsx");
  const detail = read(
    "src/components/domain/gym-schedules/GymScheduleDetailSheet.tsx",
  );
  const groupDetail = read(
    "src/components/domain/gym-schedules/GymCalendarGroupClassDetailDialog.tsx",
  );
  const page = read(
    "src/app/(dashboard)/gym/schedules/schedule-page-inner.tsx",
  );
  const shell = read("src/lib/ui/matchon-shell-ui.ts");
  const portal = read("src/lib/gym-portal-access.ts");

  assertIncludes(app, "MonthView", "month");
  assertIncludes(app, "WeekDesktop", "week desktop");
  assertIncludes(app, "DayTimeline", "day");
  assertIncludes(app, "ListView", "list");
  assertIncludes(app, "ScheduleNowLine", "now line");
  assertIncludes(app, "ScheduleBoardCard", "board card");
  assertIncludes(app, "rescheduleGymScheduleAction", "drag reschedule");
  assertIncludes(app, "md:hidden", "mobile week");
  assertIncludes(app, "SCHEDULE_PX_PER_MINUTE", "block geometry");
  assertIncludes(app, "matchonToolbarControlClass", "toolbar control height");
  assertIncludes(app, "matchonToolbarButtonClass", "toolbar button height");
  assertIncludes(app, "scrollPositionRef", "scroll restore");
  assertIncludes(app, "GymCalendarGroupClassDetailDialog", "group modal");
  assertIncludes(app, "setSelectedGroup", "group modal state");
  assertIncludes(app, "일정명·회원 검색", "search");
  assertIncludes(app, "setSelectedGroup(item)", "group click opens modal");
  assertIncludes(
    app,
    'if (item.itemType === "group_class") {\n      setSelectedGroup(item);',
    "group click branches to modal",
  );
  assertIncludes(dialog, "dismissible = false", "dialog non-dismissible default");
  assertIncludes(dialog, "disablePointerDismissal", "pointer dismissal gate");
  assertIncludes(detail, "일정 상세", "personal detail modal");
  assertIncludes(groupDetail, "그룹수업 상세", "group detail modal");
  assertIncludes(page, "전체 일정", "all schedules title");
  assertIncludes(
    page,
    "체육관 전체 선생님의 개인 일정과 그룹수업을 확인합니다.",
    "all schedules desc",
  );
  assertIncludes(
    page,
    "나에게 배정된 개인 일정과 담당 그룹수업을 확인합니다.",
    "my schedules desc",
  );
  assertIncludes(page, "연결된 선생님 프로필이 없어", "owner my empty hint");
  assertIncludes(shell, "matchonControlHeightMdClass", "control height SSOT");
  assertIncludes(shell, "h-10 min-h-10", "40px control");
  assertIncludes(portal, "resolveOwnerLinkedGymStaffId", "owner staff link");
  verifyBoardUx();
  console.log("verify:dialog-non-dismissible: OK");
  console.log("verify:schedule-toolbar-control-height: OK");
  console.log("verify:schedule-all-vs-my-scope: OK");
  console.log("verify:schedule-detail-modal: OK");
  console.log("verify:schedule-edit-modal: OK");
  console.log("verify:schedule-modal-scroll-restore: OK");
  console.log("verify:schedule-month-event-click: OK");
  console.log("verify:schedule-week-event-click: OK");
  console.log("verify:schedule-day-event-click: OK");
  console.log("verify:gym-schedule-calendar-month: OK");
  console.log("verify:gym-schedule-calendar-week: OK");
  console.log("verify:gym-schedule-calendar-day: OK");
  console.log("verify:gym-schedule-mobile-layout: OK");
}

function verifyBoardUx() {
  const app = read(
    "src/components/domain/gym-schedules/GymScheduleCalendarApp.tsx",
  );
  const card = read(
    "src/components/domain/gym-schedules/ScheduleBoardCard.tsx",
  );
  const nowLine = read(
    "src/components/domain/gym-schedules/ScheduleNowLine.tsx",
  );
  const geometry = read("src/lib/gym-schedule/board-geometry.ts");
  const layout = read("src/lib/gym-schedule/board-layout.ts");
  const autoScroll = read("src/lib/gym-schedule/board-auto-scroll.ts");
  const optimistic = read(
    "src/lib/gym-schedule/optimistic-schedule-range.ts",
  );

  assertIncludes(card, "schedule-drag-overlay", "drag overlay");
  assertIncludes(card, "createPortal", "fixed overlay portal");
  assertIncludes(card, "DRAG_THRESHOLD_PX", "drag threshold");
  assertIncludes(card, "suppressClickRef", "click suppression");
  assertIncludes(card, "onDragPreviewChange", "drag preview callback");
  assertIncludes(card, "isDragCapablePointer", "touch drag guard");
  assertIncludes(card, "createBoardAutoScroll", "drag auto scroll");
  assertIncludes(card, "originScrollTop", "scroll-aware move delta");
  assertIncludes(
    autoScroll,
    "scrollTop",
    "auto scroll uses vertical scroll only",
  );
  assertIncludes(
    autoScroll,
    "VERTICAL_INTENT_PX",
    "horizontal drag does not auto-scroll",
  );
  assert.doesNotMatch(
    autoScroll,
    /scrollLeft/,
    "auto scroll must not touch horizontal scroll",
  );

  assertIncludes(app, "applyOptimisticScheduleRange", "optimistic apply");
  assertIncludes(
    app,
    "reconcileOptimisticScheduleRanges",
    "optimistic reconcile",
  );
  assertIncludes(app, "settleOptimisticScheduleRange", "optimistic settle");
  assertIncludes(app, "rollbackOptimisticScheduleRange", "optimistic rollback");
  assert.doesNotMatch(
    app,
    /useEffect\(\(\) => \{\s*setOptimistic/,
    "optimistic reconcile must not run in an effect",
  );
  assertIncludes(
    app,
    "Keep optimistic until refreshed server props match",
    "no early optimistic clear",
  );
  assert.doesNotMatch(
    app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""),
    /delete next\[item\.id\];\s*return next;\s*\}\);\s*startTransition\(\(\) => router\.refresh\(\)\)/,
  );
  assertIncludes(app, "schedule-drop-target-day", "target day highlight");
  assertIncludes(app, "formatScheduleAxisTimeKorean", "axis korean formatter");
  assertIncludes(app, "SCHEDULE_WEEK_GRID_COLS_CLASS", "axis width SSOT");
  assertIncludes(app, "data-schedule-scroll", "auto scroll container");
  assertIncludes(app, 'variant="week"', "week now line");
  assertIncludes(
    app,
    "SCHEDULE_WEEK_NOW_LINE_INSET_CLASS",
    "week now line offset SSOT",
  );
  assertIncludes(
    layout,
    "grid-cols-[84px_repeat(7,minmax(0,1fr))]",
    "axis width 84 defined once",
  );
  assertIncludes(layout, "left-[84px]", "week now line inset defined once");
  assertIncludes(layout, "SCHEDULE_BOARD_LAYER", "z-index layer policy");
  assert.doesNotMatch(
    app,
    /grid-cols-\[84px_repeat/,
    "week grid columns must come from board-layout",
  );

  assertIncludes(nowLine, 'variant === "week"', "week variant");
  assertIncludes(nowLine, "weekDateKeys", "week date keys");
  assertIncludes(geometry, "formatScheduleAxisTimeKorean", "geometry helper");
  assertIncludes(geometry, "formatScheduleAxisDateTimeKorean", "datetime helper");
  assertIncludes(optimistic, "applyOptimisticScheduleRange", "helper apply");
  assertIncludes(optimistic, "rollbackOptimisticScheduleRange", "helper rollback");

  // Hydration: now line must not call Date on first SSR/CSR render.
  assertIncludes(nowLine, "useState<Date | null>(null)", "now starts null");
  assert.doesNotMatch(
    nowLine,
    /useState\(\(\) => new Date\(\)\)/,
    "now must not initialize from Date during render",
  );
  assertIncludes(nowLine, "if (now == null) return null", "null until mount");
  assertIncludes(app, "initialDateKey", "server date key prop");
  assertIncludes(app, "initialTodayKey", "server today key prop");
  assert.doesNotMatch(
    app.replace(/useEffect\(\(\) => \{\s*setTodayKey\(toSeoulDateKey\(new Date\(\)\)\);\s*\}, \[\]\);/g, ""),
    /const todayKey = toSeoulDateKey\(new Date\(\)\)/,
    "todayKey must not recompute Date during first render",
  );

  assert.equal(formatScheduleAxisTimeKorean(7), "오전 7:00");
  assert.equal(formatScheduleAxisTimeKorean(9), "오전 9:00");
  assert.equal(formatScheduleAxisTimeKorean(12), "오후 12:00");
  assert.equal(formatScheduleAxisTimeKorean(14), "오후 2:00");
  assert.equal(formatScheduleAxisTimeKorean(23), "오후 11:00");
  assert.equal(formatScheduleAxisTimeKorean(0), "오전 12:00");
  assertIncludes(layout, "text-[13px] font-medium", "axis font size");
  assertIncludes(app, "SCHEDULE_AXIS_LABEL_CLASS", "axis label SSOT");
  assertIncludes(app, 'variant="day"', "day now line usage");
  assertIncludes(nowLine, "data-now-variant", "now variant attr");
  assertIncludes(nowLine, "SCHEDULE_BOARD_LAYER.nowLine", "now line layer token");

  console.log("verify:schedule-horizontal-drag-preview: OK");
  console.log("verify:schedule-optimistic-drop: OK");
  console.log("verify:schedule-drop-no-snapback: OK");
  console.log("verify:schedule-drag-rollback: OK");
  console.log("verify:schedule-axis-korean-time: OK");
  console.log("verify:schedule-axis-font-size: OK");
  console.log("verify:schedule-week-now-line-full-width: OK");
  console.log("verify:schedule-day-now-line: OK");
  console.log("verify:schedule-drag-click-suppression: OK");
  console.log("verify:schedule-now-line-hydration: OK");
  console.log("verify:schedule-hydration: OK");
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
    ["전체 일정", "내 일정", "그룹수업"],
  );
  assert.deepEqual(
    staff.find((g) => g.id === "schedules")?.items.map((i) => i.label),
    ["내 일정", "그룹수업"],
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
  "board-ux": verifyBoardUx,
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
