/**
 * Stage 4 gym member portal static verifies.
 * Usage: tsx scripts/verify-gym-member-portal.ts [focus]
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  __resetGymMemberPortalRateLimitForTests,
  checkGymMemberPortalRateLimit,
  recordGymMemberPortalVerifyFailure,
} from "../src/lib/gym-member-portal/rate-limit";
import {
  gymMemberPortalNamesEqual,
  normalizeGymMemberPortalName,
} from "../src/lib/gym-member-portal/identity";
import {
  buildGymMemberPortalUrl,
  generateGymMemberPortalToken,
  hashGymMemberPortalToken,
  hashPortalPhoneKey,
  maskPortalPhoneDisplay,
} from "../src/lib/gym-member-portal/token";
import { getGymPortalNavGroups } from "../src/lib/navigation/gym-portal-navigation";
import { normalizePhoneDigits } from "../src/lib/phone";
import {
  buildPortalMonthCells,
  parsePortalYearMonth,
  resolvePortalSelectedDateKey,
} from "../src/lib/gym-member-portal/portal-month-calendar";

const root = process.cwd();
const focus = process.argv[2] ?? "all";

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

function assertIncludes(hay: string, needle: string, label: string) {
  assert.ok(hay.includes(needle), `missing ${label}: ${needle}`);
}

function assertNotIncludes(hay: string, needle: string, label: string) {
  assert.ok(!hay.includes(needle), `unexpected ${label}: ${needle}`);
}

function verifySchema() {
  const schema = read("prisma/schema.prisma");
  const sql = read("prisma/migrations_manual/20260731_gym_member_portal.sql");
  assertIncludes(schema, "model GymMemberPortal", "portal model");
  assertIncludes(schema, "model GymMemberPortalSession", "session model");
  assertIncludes(schema, "publicTokenHash", "token hash");
  assertIncludes(schema, "sessionTokenHash", "session hash");
  assertIncludes(schema, "gym_member_portal_created", "audit create");
  assertIncludes(schema, "gym_member_portal_token_rotated", "audit rotate");
  assertIncludes(schema, "gym_member_portal_revoked", "audit revoke");
  assertIncludes(sql, 'CREATE TABLE IF NOT EXISTS "GymMemberPortal"', "sql portal");
  assertIncludes(
    sql,
    'CREATE TABLE IF NOT EXISTS "GymMemberPortalSession"',
    "sql session",
  );
  assertIncludes(sql, "GymMemberPortal_gymId_active_uidx", "active unique");
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /\bDROP\b|\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /--accept-data-loss/);
  console.log("verify:gym-member-portal-schema: OK");
}

function verifyToken() {
  const a = generateGymMemberPortalToken();
  const b = generateGymMemberPortalToken();
  assert.notEqual(a, b);
  assert.equal(a.length, 48);
  const hash = hashGymMemberPortalToken(a);
  assert.equal(hash.length, 64);
  assert.equal(
    hash,
    createHash("sha256").update(a, "utf8").digest("hex"),
  );
  assert.equal(buildGymMemberPortalUrl(a), `/member-portal/${a}`);
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "publicTokenHash", "hash store");
  assertIncludes(service, "hashGymMemberPortalToken(rawToken)", "hash before store");
  assertNotIncludes(
    read("prisma/schema.prisma"),
    "rawToken",
    "schema has no rawToken column",
  );
  console.log("verify:gym-member-portal-token: OK");
}

function verifyTokenRotation() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "rotatePortalToken", "rotate");
  assertIncludes(service, "gym_member_portal_token_rotated", "audit");
  assertIncludes(service, 'revokedAt: now', "revoke sessions");
  assertIncludes(service, "isActive: false", "deactivate old");
  console.log("verify:gym-member-portal-token-rotation: OK");
}

function verifyIdentity() {
  assert.equal(normalizeGymMemberPortalName("  박  성용 "), "박 성용");
  assert.equal(
    gymMemberPortalNamesEqual("박 성용", "  박  성용 "),
    true,
  );
  assert.equal(gymMemberPortalNamesEqual("박성용", "박 성용"), false);
  assert.equal(normalizePhoneDigits("010-1234-5678"), "01012345678");
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "normalizedPhone", "phone ssot");
  assertIncludes(service, "gymMemberPortalNamesEqual", "name match");
  assertIncludes(service, "GymMemberStatus.active", "active only");
  assertIncludes(service, "gymId: portal.gymId", "gym scope");
  console.log("verify:gym-member-portal-identity: OK");
}

function verifyAmbiguous() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "matched.length !== 1", "ambiguous guard");
  assertIncludes(
    service,
    "GYM_MEMBER_PORTAL_GENERIC_VERIFY_ERROR",
    "generic error",
  );
  console.log("verify:gym-member-portal-ambiguous-member: OK");
}

function verifySession() {
  const cookie = read("src/lib/gym-member-portal/session-cookie.ts");
  assertIncludes(cookie, "httpOnly: true", "httpOnly");
  assertIncludes(cookie, 'sameSite: "lax"', "sameSite");
  assertIncludes(cookie, "GYM_MEMBER_PORTAL_SESSION_TTL_MS", "ttl");
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "sessionTokenHash", "session hash");
  assertIncludes(service, "requireSession", "require");
  assertIncludes(service, "destroySession", "logout");
  assertIncludes(service, "gymMemberPortalId: resolved.portal.portalId", "portal bind");
  console.log("verify:gym-member-portal-session: OK");
}

function verifySessionGymScope() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "gymId: resolved.portal.gymId", "session gym");
  assertIncludes(service, "joinAsMember", "reuse stage3 join");
  assertIncludes(service, "cancelAsMember", "reuse stage3 cancel");
  assertIncludes(service, "gymMemberId: session.gymMemberId", "session member");
  console.log("verify:gym-member-portal-session-gym-scope: OK");
}

function verifyRateLimit() {
  __resetGymMemberPortalRateLimitForTests();
  const phoneHash = hashPortalPhoneKey("01012345678");
  for (let i = 0; i < 10; i++) {
    const r = checkGymMemberPortalRateLimit({
      portalHashPrefix: "abc",
      ip: "1.2.3.4",
      phoneHash,
    });
    if (i < 5) assert.equal(r.ok, true);
  }
  const blocked = checkGymMemberPortalRateLimit({
    portalHashPrefix: "abc",
    ip: "1.2.3.4",
    phoneHash,
  });
  assert.equal(blocked.ok, false);
  __resetGymMemberPortalRateLimitForTests();
  for (let i = 0; i < 8; i++) {
    recordGymMemberPortalVerifyFailure({
      portalHashPrefix: "xyz",
      phoneHash: "ph",
    });
  }
  const failBlocked = recordGymMemberPortalVerifyFailure({
    portalHashPrefix: "xyz",
    phoneHash: "ph",
  });
  assert.equal(failBlocked.ok, false);
  console.log("verify:gym-member-portal-rate-limit: OK");
}

function verifyPrivacy() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  const me = read("src/app/member-portal/[token]/me/page.tsx");
  const classes = read("src/app/member-portal/[token]/classes/page.tsx");
  assertNotIncludes(service, "receivable", "no receivable");
  assertNotIncludes(service, "memo:", "no memo select");
  assertNotIncludes(me, "address", "no address ui");
  assertNotIncludes(me, "birthDate", "no birth");
  assertNotIncludes(classes, "gymMember.name", "no roster names");
  assertIncludes(service, "maskPortalPhoneDisplay", "phone mask");
  assert.equal(maskPortalPhoneDisplay("01012345678").includes("1234"), false);
  console.log("verify:gym-member-portal-privacy: OK");
}

function verifyProfileImage() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(
    service,
    "createGymMemberImageSignedReadUrlForPath",
    "signed url",
  );
  assertIncludes(service, "profileImagePath", "path ssot");
  const me = read("src/app/member-portal/[token]/me/page.tsx");
  assertIncludes(me, "nameInitial", "placeholder");
  console.log("verify:gym-member-portal-profile-image: OK");
}

function verifyPersonalSchedules() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  assertIncludes(service, "listPersonalSchedules", "list");
  assertIncludes(service, "gymMemberId: session.gymMemberId", "own only");
  assertNotIncludes(
    read("src/app/member-portal/[token]/schedule/page.tsx"),
    "memo",
    "no memo ui",
  );
  console.log("verify:gym-member-portal-personal-schedules: OK");
}

function verifyGroupClasses() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  const page = read("src/app/member-portal/[token]/classes/page.tsx");
  const calendar = read(
    "src/components/domain/gym-member-portal/MemberPortalClassesCalendarApp.tsx",
  );
  assertIncludes(service, "listGroupClasses", "list");
  assertIncludes(service, "listGroupClassesByMonth", "month list");
  assertIncludes(service, "members_only", "visibility");
  assertIncludes(service, "myWaitlistOrder", "own wait order");
  assertIncludes(page, "MemberPortalClassesCalendarApp", "calendar page");
  assertIncludes(calendar, "portal-cal-grid", "calendar grid");
  assertNotIncludes(page, "이번 주 프로그램", "old week list title");
  console.log("verify:gym-member-portal-group-classes: OK");
}

function verifyGroupCalendar() {
  const calendarLib = read("src/lib/gym-member-portal/portal-month-calendar.ts");
  const display = read("src/lib/gym-member-portal/class-display.ts");
  const calendar = read(
    "src/components/domain/gym-member-portal/MemberPortalClassesCalendarApp.tsx",
  );
  assertIncludes(calendarLib, "buildPortalMonthCells", "month cells");
  assertIncludes(calendarLib, "일요일", "sun start comment or label");
  assertIncludes(display, "신청 가능", "status available");
  assertIncludes(display, "참석 예정", "status attending");
  assertIncludes(display, "대기 중", "status waitlisted");
  assertIncludes(display, "신청 마감", "status closed");
  assertIncludes(display, "수업 완료", "status completed");
  assertIncludes(display, "수업 취소", "status cancelled");
  assertIncludes(calendar, "+{extra}개", "overflow +N");
  assertIncludes(calendar, "이전 달", "prev month");
  assertIncludes(calendar, "다음 달", "next month");
  assertIncludes(calendar, "오늘", "today");
  console.log("verify:gym-member-portal-group-calendar: OK");
}

function verifyCalendarMonth() {
  const cells = buildPortalMonthCells(2026, 8);
  assert.equal(cells.length, 42, "42 cells");
  assert.equal(
    cells[0]?.dateKey,
    "2026-07-26",
    "aug 2026 starts sunday week from jul 26",
  );
  const inMonth = cells.filter((c) => c.inMonth);
  assert.equal(inMonth.length, 31, "31 days in aug");
  const ym = parsePortalYearMonth("2026", "8");
  assert.deepEqual(ym, { year: 2026, month: 8 });
  const selected = resolvePortalSelectedDateKey({
    dateRaw: "2026-08-03",
    year: 2026,
    month: 8,
    todayKey: "2026-08-01",
  });
  assert.equal(selected, "2026-08-03");
  console.log("verify:gym-member-portal-calendar-month: OK");
}

function verifyCalendarDaySelection() {
  const page = read("src/app/member-portal/[token]/classes/page.tsx");
  const calendar = read(
    "src/components/domain/gym-member-portal/MemberPortalClassesCalendarApp.tsx",
  );
  assertIncludes(page, "searchParams", "query");
  assertIncludes(page, "selectedDateKey", "selected");
  assertIncludes(calendar, "pushCalendarQuery", "url sync");
  assertIncludes(calendar, "portal-cal-day-list", "day list");
  console.log("verify:gym-member-portal-calendar-day-selection: OK");
}

function verifyCalendarParticipation() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  const dialog = read(
    "src/components/domain/gym-member-portal/MemberPortalClassDetailDialog.tsx",
  );
  assertIncludes(service, "joinAsMember", "join ssot");
  assertIncludes(service, "cancelAsMember", "cancel ssot");
  assertIncludes(service, "참석 신청이 완료되었습니다.", "join attending msg");
  assertIncludes(
    service,
    "정원이 마감되어 대기 신청되었습니다.",
    "join waitlist msg",
  );
  assertIncludes(dialog, "joinGymMemberPortalClassAction", "join action");
  assertIncludes(dialog, "cancelGymMemberPortalClassAction", "cancel action");
  console.log("verify:gym-member-portal-calendar-participation: OK");
}

function verifyCalendarPrivacy() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  const types = read("src/lib/gym-member-portal/portal-class-types.ts");
  const dialog = read(
    "src/components/domain/gym-member-portal/MemberPortalClassDetailDialog.tsx",
  );
  assertIncludes(service, "gymMemberId: true", "member id for mine only");
  assertNotIncludes(types, "phone", "no phone in portal class type");
  assertNotIncludes(types, "profileImage", "no profile image in type");
  assertNotIncludes(dialog, "참석자 명단", "no roster label");
  assertNotIncludes(service, "participations: true", "no full participation dump");
  console.log("verify:gym-member-portal-calendar-privacy: OK");
}

function verifyCalendarMobile() {
  const calendar = read(
    "src/components/domain/gym-member-portal/MemberPortalClassesCalendarApp.tsx",
  );
  const shell = read(
    "src/components/domain/gym-member-portal/MemberPortalAppShell.tsx",
  );
  assertIncludes(calendar, "grid-cols-7", "7 col");
  assertIncludes(calendar, "min-h-[4.25rem]", "cell height");
  assertIncludes(calendar, "truncate", "truncate titles");
  assertIncludes(shell, "pb-24", "nav padding");
  console.log("verify:gym-member-portal-calendar-mobile: OK");
}

function verifyClassModal() {
  const dialog = read(
    "src/components/domain/gym-member-portal/MemberPortalClassDetailDialog.tsx",
  );
  assertIncludes(dialog, "MemberPortalClassDetailDialog", "detail dialog");
  assertIncludes(dialog, "member-portal-class-detail-dialog", "testid");
  assertIncludes(dialog, "description", "shows description field");
  assertIncludes(dialog, "닫기", "close button");
  console.log("verify:gym-member-portal-class-modal: OK");
}

function verifyClassModalNonDismissible() {
  const dialogUi = read("src/components/ui/dialog.tsx");
  const detail = read(
    "src/components/domain/gym-member-portal/MemberPortalClassDetailDialog.tsx",
  );
  assertIncludes(dialogUi, "dismissible = false", "ssot default");
  assertIncludes(detail, "<Dialog", "uses Dialog");
  assertNotIncludes(detail, "dismissible", "keeps default non-dismissible");
  assertIncludes(detail, "member-portal-class-cancel-dialog", "cancel dialog");
  console.log("verify:gym-member-portal-class-modal-non-dismissible: OK");
}

function verifyParticipation() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  const group = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(service, "async joinClass", "join method");
  assertIncludes(service, "async cancelClass", "cancel method");
  assertIncludes(group, "async joinAsMember", "stage3 join");
  assertIncludes(group, "async cancelAsMember", "stage3 cancel");
  assertIncludes(group, "lockGroupClass", "advisory lock");
  assertIncludes(group, "requireNotStarted", "started guard");
  console.log("verify:gym-member-portal-participation: OK");
}

function verifyWaitlist() {
  const group = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(group, "waitlisted", "waitlist status");
  assertIncludes(group, "nextWaitlistOrder", "order");
  console.log("verify:gym-member-portal-waitlist: OK");
}

function verifyAutoPromotion() {
  const group = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(group, "findEarliestWaitlisted", "earliest");
  assertIncludes(group, "gym_group_class_participant_promoted", "promote audit");
  console.log("verify:gym-member-portal-auto-promotion: OK");
}

function verifyConcurrency() {
  const group = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(
    group,
    "pg_advisory_xact_lock(hashtext(${`ggc:${gymGroupClassId}`}))",
    "lock",
  );
  assertIncludes(group, "GROUP_CLASS_TX", "tx options");
  console.log("verify:gym-member-portal-concurrency: OK");
}

function verifyStartedClass() {
  const service = read("src/lib/services/gym-member-portal.service.ts");
  const group = read("src/lib/services/gym-group-class.service.ts");
  assertIncludes(service, "requireNotStarted: true", "portal guard");
  assertIncludes(group, "이미 시작된 수업은 변경할 수 없습니다.", "msg");
  console.log("verify:gym-member-portal-started-class: OK");
}

function verifyNavigation() {
  const owner = getGymPortalNavGroups("owner");
  const staff = getGymPortalNavGroups("staff");
  const profile = owner.find((g) => g.id === "profile");
  assert.ok(profile);
  assert.ok(
    profile!.items.some((i) => i.href === "/gym/member-portal"),
    "owner has member-portal",
  );
  assert.ok(
    !staff.some((g) =>
      g.items.some((i) => i.href === "/gym/member-portal"),
    ),
    "staff no member-portal",
  );
  const nav = read(
    "src/components/domain/gym-member-portal/MemberPortalBottomNav.tsx",
  );
  assertIncludes(nav, "/home", "home");
  assertIncludes(nav, "/classes", "classes");
  assertIncludes(nav, "/schedule", "schedule");
  assertIncludes(nav, "/me", "me");
  console.log("verify:gym-member-portal-navigation: OK");
}

function verifyMobileLayout() {
  const shell = read(
    "src/components/domain/gym-member-portal/MemberPortalAppShell.tsx",
  );
  const bottom = read(
    "src/components/domain/gym-member-portal/MemberPortalBottomNav.tsx",
  );
  assertIncludes(shell, "safe-area-inset-top", "safe top");
  assertIncludes(bottom, "safe-area-inset-bottom", "safe bottom");
  assertIncludes(bottom, "min-h-12", "touch");
  assertIncludes(shell, "max-w-lg", "mobile width");
  console.log("verify:gym-member-portal-mobile-layout: OK");
}

const runners: Record<string, () => void> = {
  schema: verifySchema,
  token: verifyToken,
  "token-rotation": verifyTokenRotation,
  identity: verifyIdentity,
  "ambiguous-member": verifyAmbiguous,
  session: verifySession,
  "session-gym-scope": verifySessionGymScope,
  "rate-limit": verifyRateLimit,
  privacy: verifyPrivacy,
  "profile-image": verifyProfileImage,
  "personal-schedules": verifyPersonalSchedules,
  "group-classes": verifyGroupClasses,
  "group-calendar": verifyGroupCalendar,
  "calendar-month": verifyCalendarMonth,
  "calendar-day-selection": verifyCalendarDaySelection,
  "calendar-participation": verifyCalendarParticipation,
  "calendar-privacy": verifyCalendarPrivacy,
  "calendar-mobile": verifyCalendarMobile,
  "class-modal": verifyClassModal,
  "class-modal-non-dismissible": verifyClassModalNonDismissible,
  participation: verifyParticipation,
  waitlist: verifyWaitlist,
  "auto-promotion": verifyAutoPromotion,
  concurrency: verifyConcurrency,
  "started-class": verifyStartedClass,
  navigation: verifyNavigation,
  "mobile-layout": verifyMobileLayout,
};

if (focus === "all") {
  for (const fn of Object.values(runners)) fn();
  console.log("verify:gym-member-portal: ALL OK");
} else {
  const fn = runners[focus];
  if (!fn) {
    console.error(`Unknown focus: ${focus}`);
    process.exit(1);
  }
  fn();
}
