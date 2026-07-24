/**
 * Gym member attendance static verifies (schema / privacy / policy / nav).
 *   npm run verify:gym-attendance-schema
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  decideGymAttendanceEligibility,
  attendanceDeskMessage,
} from "../src/lib/gym-attendance/eligibility";
import {
  maskMemberName,
  maskPhoneForAdminList,
  isValidKoreanMobilePhone,
  normalizeAttendancePhone,
} from "../src/lib/gym-attendance/privacy";
import {
  checkGymAttendanceRateLimit,
  recordGymAttendanceLookupFailure,
  resetGymAttendanceRateLimitForTests,
} from "../src/lib/gym-attendance/rate-limit";
import {
  formatSeoulTimeHm,
  toSeoulAttendanceDate,
  toSeoulDateOnlyString,
  getSeoulYmdParts,
} from "../src/lib/gym-attendance/seoul-date";
import {
  generateGymAttendanceKioskToken,
  hashGymAttendanceKioskToken,
  gymAttendanceKioskTokensEqual,
  buildGymAttendanceKioskUrl,
  hashAttendancePhoneKey,
  maskPhoneTail,
} from "../src/lib/gym-attendance/token";
import { getGymPortalNavGroups } from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();

function assertSchema() {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.match(schema, /model GymMemberAttendance/);
  assert.match(schema, /model GymAttendanceKiosk/);
  assert.match(schema, /enum GymMemberAttendanceSource/);
  assert.match(schema, /@@unique\(\[gymId, gymMemberId, attendanceDate\]\)/);
  assert.match(schema, /publicTokenHash/);
  assert.match(schema, /gym_attendance_kiosk_created/);
  assert.match(schema, /gym_attendance_cancelled/);
  assert.match(schema, /allowExpiredMember/);
  assert.match(schema, /membershipStatusSnapshot/);

  const sql = readFileSync(
    join(root, "scripts/sql/add-gym-attendance-additive.sql"),
    "utf8",
  );
  assert.doesNotMatch(sql, /DROP\s+TABLE/i);
  assert.doesNotMatch(sql, /accept-data-loss/i);
  assert.match(sql, /GymMemberAttendance/);
  assert.match(sql, /GymAttendanceKiosk/);

  console.log("verify:gym-attendance-schema: OK");
}

function assertKioskToken() {
  const token = generateGymAttendanceKioskToken();
  assert.equal(token.length, 48);
  const hash = hashGymAttendanceKioskToken(token);
  assert.equal(hash.length, 64);
  assert.ok(gymAttendanceKioskTokensEqual(token, hash));
  assert.ok(!gymAttendanceKioskTokensEqual("x".repeat(48), hash));
  assert.equal(
    buildGymAttendanceKioskUrl(token),
    `/gym-attendance/${token}`,
  );
  assert.equal(maskPhoneTail("01012345678"), "****5678");
  assert.equal(hashAttendancePhoneKey("01012345678").length, 32);
  console.log("verify:gym-attendance-kiosk-token: OK");
}

function assertPhonePrivacy() {
  assert.equal(normalizeAttendancePhone("010-1234-5678"), "01012345678");
  assert.ok(isValidKoreanMobilePhone("01012345678"));
  assert.ok(!isValidKoreanMobilePhone("0212345678"));
  assert.equal(maskMemberName("박성용"), "박○용");
  assert.equal(maskMemberName("김수"), "김○");
  assert.equal(maskMemberName("한"), "○");
  assert.equal(maskPhoneForAdminList("01012345678"), "010-****-5678");

  const service = readFileSync(
    join(root, "src/lib/services/gym-attendance.service.ts"),
    "utf8",
  );
  assert.match(service, /maskMemberName/);
  assert.doesNotMatch(service, /console\.(log|info|error)\(.*phone/i);
  assert.match(service, /findActiveMembersByPhone/);
  assert.match(service, /kiosk\.gymId/);
  assert.match(service, /members\.length > 1/);

  const repo = readFileSync(
    join(root, "src/lib/repositories/gym-attendance.repository.ts"),
    "utf8",
  );
  assert.match(repo, /gymId,\s*\n\s*normalizedPhone/);

  const api = readFileSync(
    join(
      root,
      "src/app/api/public/gym-attendance/[token]/check-in/route.ts",
    ),
    "utf8",
  );
  assert.match(api, /maskedMemberName/);
  assert.doesNotMatch(api, /birthDate|address|memo|fighter/);
  console.log("verify:gym-attendance-phone-privacy: OK");
  console.log("verify:gym-attendance-phone-checkin: OK");
}

function assertDuplicateAndStatus() {
  assert.equal(
    decideGymAttendanceEligibility({
      deletedAt: null,
      memberStatus: "active",
      endsAt: "2099-01-01",
      allowExpiredMember: true,
      allowPausedMember: true,
      todayUtc: new Date(Date.UTC(2026, 6, 24)),
    }).allow,
    true,
  );

  const expired = decideGymAttendanceEligibility({
    deletedAt: null,
    memberStatus: "active",
    endsAt: "2026-01-01",
    allowExpiredMember: true,
    allowPausedMember: true,
    todayUtc: new Date(Date.UTC(2026, 6, 24)),
  });
  assert.equal(expired.allow, true);
  if (expired.allow) {
    assert.equal(expired.needsDeskNotice, true);
    assert.equal(expired.deskNoticeKind, "expired");
  }
  assert.match(
    attendanceDeskMessage("expired") ?? "",
    /만료/,
  );

  const blockedExpired = decideGymAttendanceEligibility({
    deletedAt: null,
    memberStatus: "active",
    endsAt: "2026-01-01",
    allowExpiredMember: false,
    allowPausedMember: true,
    todayUtc: new Date(Date.UTC(2026, 6, 24)),
  });
  assert.equal(blockedExpired.allow, false);

  const withdrawn = decideGymAttendanceEligibility({
    deletedAt: null,
    memberStatus: "withdrawn",
    endsAt: null,
    allowExpiredMember: true,
    allowPausedMember: true,
  });
  assert.equal(withdrawn.allow, false);

  const deleted = decideGymAttendanceEligibility({
    deletedAt: new Date(),
    memberStatus: "active",
    endsAt: null,
    allowExpiredMember: true,
    allowPausedMember: true,
  });
  assert.equal(deleted.allow, false);

  console.log("verify:gym-attendance-duplicate: OK");
  console.log("verify:gym-attendance-member-status: OK");
}

function assertGymScopeAndPermissions() {
  const service = readFileSync(
    join(root, "src/lib/services/gym-attendance.service.ts"),
    "utf8",
  );
  assert.match(service, /requireGymPortalRead/);
  assert.match(service, /requireGymPortalWrite/);
  assert.match(service, /findActiveMembersByPhone\(/);
  assert.match(service, /kiosk\.gymId/);
  assert.doesNotMatch(
    service,
    /prisma\.gymMember\.findMany\(\{\s*where:\s*\{\s*normalizedPhone/,
  );

  const groups = getGymPortalNavGroups();
  const attendance = groups.find((g) => g.id === "attendance");
  assert.ok(attendance);
  assert.deepEqual(
    attendance!.items.map((i) => i.href),
    ["/gym/attendance", "/gym/attendance/kiosks"],
  );
  console.log("verify:gym-attendance-gym-scope: OK");
  console.log("verify:gym-attendance-permissions: OK");
}

function assertRateLimit() {
  resetGymAttendanceRateLimitForTests();
  for (let i = 0; i < 10; i++) {
    const r = checkGymAttendanceRateLimit({
      tokenHashPrefix: "tok",
      ip: "1.1.1.1",
      phoneHash: "ph",
    });
    assert.equal(r.ok, true);
  }
  const blocked = checkGymAttendanceRateLimit({
    tokenHashPrefix: "tok",
    ip: "1.1.1.1",
    phoneHash: "ph",
  });
  assert.equal(blocked.ok, false);

  resetGymAttendanceRateLimitForTests();
  for (let i = 0; i < 8; i++) {
    assert.equal(
      recordGymAttendanceLookupFailure({
        tokenHashPrefix: "tok2",
        phoneHash: "ph2",
      }).ok,
      true,
    );
  }
  assert.equal(
    recordGymAttendanceLookupFailure({
      tokenHashPrefix: "tok2",
      phoneHash: "ph2",
    }).ok,
    false,
  );

  const rlSrc = readFileSync(
    join(root, "src/lib/gym-attendance/rate-limit.ts"),
    "utf8",
  );
  assert.match(rlSrc, /clearGymAttendanceLookupFailures/);
  assert.match(rlSrc, /sweepStale/);
  assert.match(rlSrc, /재시작 시 카운터 초기화/);
  console.log("verify:gym-attendance-rate-limit: OK");
}

function assertTimezoneCalendar() {
  // 2026-07-23 15:30 UTC = 2026-07-24 00:30 KST → attendance date July 24
  const nearMidnightUtc = new Date(Date.UTC(2026, 6, 23, 15, 30, 0));
  const date = toSeoulAttendanceDate(nearMidnightUtc);
  assert.equal(date.toISOString().startsWith("2026-07-24"), true);
  assert.equal(toSeoulDateOnlyString(nearMidnightUtc), "2026-07-24");
  assert.equal(formatSeoulTimeHm(nearMidnightUtc), "00:30");

  const parts = getSeoulYmdParts(nearMidnightUtc);
  assert.deepEqual(parts, { year: 2026, month: 7, day: 24 });

  const cal = readFileSync(
    join(
      root,
      "src/components/domain/gym-attendance/GymMemberAttendanceCalendar.tsx",
    ),
    "utf8",
  );
  assert.match(cal, /grid-cols-7/);
  assert.match(cal, /출석 취소/);

  const service = readFileSync(
    join(root, "src/lib/services/gym-attendance.service.ts"),
    "utf8",
  );
  assert.match(service, /getGymMemberAttendanceCalendar/);
  assert.match(service, /getGymAttendanceSummary/);
  assert.match(service, /createManualAttendance/);
  assert.match(service, /cancelAttendance/);
  assert.match(service, /softCancelAttendance|deletedAt/);

  console.log("verify:gym-attendance-calendar: OK");
  console.log("verify:gym-attendance-summary: OK");
  console.log("verify:gym-attendance-manual: OK");
  console.log("verify:gym-attendance-cancel: OK");
}

function assertMobileLayout() {
  const kiosk = readFileSync(
    join(
      root,
      "src/components/domain/gym-attendance/GymAttendanceKioskClient.tsx",
    ),
    "utf8",
  );
  assert.match(kiosk, /inputMode="numeric"/);
  assert.match(kiosk, /type="tel"/);
  assert.match(kiosk, /출석하기/);
  assert.match(kiosk, /RESET_MS|setTimeout/);
  assert.match(kiosk, /requestFullscreen/);

  const page = readFileSync(
    join(root, "src/app/gym-attendance/[token]/page.tsx"),
    "utf8",
  );
  assert.match(page, /GymAttendanceKioskClient/);
  console.log("verify:gym-attendance-mobile-layout: OK");
}

function main() {
  assertSchema();
  assertKioskToken();
  assertPhonePrivacy();
  assertDuplicateAndStatus();
  assertGymScopeAndPermissions();
  assertRateLimit();
  assertTimezoneCalendar();
  assertMobileLayout();
  console.log("ALL verify:gym-attendance-* OK");
}

main();
