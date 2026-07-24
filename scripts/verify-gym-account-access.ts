/**
 * Stage B: 회원사 owner 계정·포털 접근 정책 정적 검증.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AssociationMemberGymStatus, AuditAction } from "../src/lib/enums";
import {
  decideGymPortalAccessFromMembership,
} from "../src/lib/gym-portal-access";
import {
  isPlaceholderGymOwnerUser,
  resolveMemberGymOwnerAccountStatus,
} from "../src/lib/member-gym/owner-account";
import {
  GYM_PORTAL_HIDDEN_EVENT_HREFS,
  getGymPortalNavGroups,
  getGymPortalNavItems,
} from "../src/lib/navigation/gym-portal-navigation";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assertSchemaOwnerNotNull() {
  const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
  assert.match(schema, /ownerUserId\s+String\s+@unique/);
  assert.doesNotMatch(
    schema,
    /model\s+GymUser\b/,
    "GymUser 모델이 도입되면 안 됩니다.",
  );
  for (const action of [
    "gym_owner_connected",
    "gym_owner_replaced",
    "gym_owner_access_suspended",
    "gym_owner_invited",
    "gym_owner_invite_cancelled",
  ]) {
    assert.match(schema, new RegExp(action));
    assert.equal(
      AuditAction[action as keyof typeof AuditAction],
      action,
    );
  }
  assert.match(schema, /ownerAccessSuspendedAt/);
  assert.match(schema, /ownerInviteTokenHash/);
}

function assertPortalModes() {
  const normal = decideGymPortalAccessFromMembership(null);
  assert.equal(normal.accessMode, "normal_gym");
  assert.equal(normal.canCreateFighter, true);
  assert.equal(normal.canUpdateFighter, true);

  const active = decideGymPortalAccessFromMembership({
    status: AssociationMemberGymStatus.active,
    ownerAccessSuspendedAt: null,
  });
  assert.equal(active.accessMode, "association_active");
  assert.equal(active.canCreateFighter, true);

  const suspended = decideGymPortalAccessFromMembership({
    status: AssociationMemberGymStatus.suspended,
    ownerAccessSuspendedAt: null,
  });
  assert.equal(suspended.accessMode, "association_suspended");
  assert.equal(suspended.canRead, true);
  assert.equal(suspended.canCreateFighter, false);
  assert.equal(suspended.canUpdateFighter, false);
  assert.equal(suspended.canReleaseFighter, false);
  assert.match(suspended.bannerMessage ?? "", /조회만/);

  const withdrawn = decideGymPortalAccessFromMembership({
    status: AssociationMemberGymStatus.withdrawn,
    ownerAccessSuspendedAt: null,
  });
  assert.equal(withdrawn.accessMode, "association_withdrawn");
  assert.equal(withdrawn.canEnterPortal, false);
  assert.equal(withdrawn.canRead, false);

  const ownerSuspended = decideGymPortalAccessFromMembership({
    status: AssociationMemberGymStatus.active,
    ownerAccessSuspendedAt: new Date(),
  });
  assert.equal(ownerSuspended.accessMode, "association_owner_suspended");
  assert.equal(ownerSuspended.canEnterPortal, false);
}

function assertOwnerStatus() {
  assert.equal(
    isPlaceholderGymOwnerUser({
      loginId: "manual-gym-abc",
      email: "x@example.com",
      authUserId: "au",
    }),
    true,
  );
  assert.equal(
    isPlaceholderGymOwnerUser({
      loginId: "owner1",
      email: "a@internal.invalid",
      authUserId: "au",
    }),
    true,
  );
  assert.equal(
    isPlaceholderGymOwnerUser({
      loginId: "owner1",
      email: "real@example.com",
      authUserId: null,
    }),
    true,
  );
  assert.equal(
    isPlaceholderGymOwnerUser({
      loginId: "owner1",
      email: "real@example.com",
      authUserId: "au-1",
    }),
    false,
  );

  assert.equal(
    resolveMemberGymOwnerAccountStatus({
      owner: {
        loginId: "owner1",
        email: "real@example.com",
        authUserId: "au",
      },
      ownerAccessSuspendedAt: null,
      ownerInviteTokenHash: null,
      ownerInviteExpiresAt: null,
    }),
    "connected",
  );
  assert.equal(
    resolveMemberGymOwnerAccountStatus({
      owner: {
        loginId: "manual-gym-x",
        email: "x@internal.invalid",
        authUserId: null,
      },
      ownerAccessSuspendedAt: null,
      ownerInviteTokenHash: null,
      ownerInviteExpiresAt: null,
    }),
    "placeholder",
  );
  assert.equal(
    resolveMemberGymOwnerAccountStatus({
      owner: {
        loginId: "manual-gym-x",
        email: "x@internal.invalid",
        authUserId: null,
      },
      ownerAccessSuspendedAt: null,
      ownerInviteTokenHash: "hash",
      ownerInviteExpiresAt: new Date(Date.now() + 60_000),
    }),
    "invite_pending",
  );
  assert.equal(
    resolveMemberGymOwnerAccountStatus({
      owner: {
        loginId: "owner1",
        email: "real@example.com",
        authUserId: "au",
      },
      ownerAccessSuspendedAt: new Date(),
      ownerInviteTokenHash: null,
      ownerInviteExpiresAt: null,
    }),
    "access_suspended",
  );
}

function assertGymPortalNav() {
  const items = getGymPortalNavItems();
  const labels = items.map((i) => i.label);
  const hrefs = items.map((i) => i.href);

  assert.deepEqual(labels, [
    "홈",
    "전체 회원",
    "회원 등록",
    "이용권 관리",
    "출석 현황",
    "출석 키오스크",
    "매출 현황",
    "미수금",
    "선수 목록",
    "선수 등록",
    "대회 목록",
    "신청 내역",
    "체육관 정보",
  ]);
  assert.deepEqual(hrefs, [
    "/gym",
    "/gym/members",
    "/gym/members/new",
    "/gym/membership-plans",
    "/gym/attendance",
    "/gym/attendance/kiosks",
    "/gym/sales",
    "/gym/sales/receivables",
    "/gym/fighters",
    "/gym/fighters/new",
    "/gym/events",
    "/gym/applications",
    "/gym/profile",
  ]);

  for (const hidden of GYM_PORTAL_HIDDEN_EVENT_HREFS) {
    assert.ok(!hrefs.includes(hidden), `hidden nav must not include ${hidden}`);
  }
  assert.ok(labels.some((l) => l === "대회 목록"));
  assert.ok(labels.some((l) => l === "신청 내역"));
  assert.ok(!labels.some((l) => l === "초대 링크" || l === "전적"));

  const groups = getGymPortalNavGroups();
  const memberGroup = groups.find((g) => g.id === "members");
  assert.equal(memberGroup?.label, "회원 관리");
  assert.deepEqual(
    memberGroup?.items.map((i) => i.label),
    ["전체 회원", "회원 등록", "이용권 관리"],
  );
  const fighterGroup = groups.find((g) => g.id === "fighters");
  assert.equal(fighterGroup?.label, "선수 관리");
  assert.deepEqual(
    fighterGroup?.items.map((i) => i.label),
    ["선수 목록", "선수 등록"],
  );
  const eventsGroup = groups.find((g) => g.id === "events");
  assert.equal(eventsGroup?.label, "대회");
  assert.deepEqual(
    eventsGroup?.items.map((i) => i.label),
    ["대회 목록", "신청 내역"],
  );

  // PC/mobile: Sidebar+Sheet use groups; bottom uses compact mobile items
  const sidebar = readFileSync(
    join(root, "src/components/layout/Sidebar.tsx"),
    "utf8",
  );
  const bottom = readFileSync(
    join(root, "src/components/layout/MobileBottomNav.tsx"),
    "utf8",
  );
  const sheet = readFileSync(
    join(root, "src/components/layout/GymMobileNavSheet.tsx"),
    "utf8",
  );
  const header = readFileSync(
    join(root, "src/components/layout/Header.tsx"),
    "utf8",
  );
  assert.match(sidebar, /GymPortalNavGroups/);
  assert.match(bottom, /getGymPortalMobileBottomNavItems/);
  assert.match(sheet, /getGymPortalNavGroups/);
  assert.match(header, /GymMobileNavSheet/);
  assert.doesNotMatch(sidebar, /\/gym\/events/);
  assert.doesNotMatch(bottom, /\/gym\/events/);
}

function assertServiceGuards() {
  const service = readFileSync(
    join(root, "src/lib/services/gym-owner-account.service.ts"),
    "utf8",
  );
  assert.match(service, /resolveAssociationOrganizerScope/);
  assert.match(service, /ownedGym\.id !== row\.gymId/);
  assert.match(service, /role:\s*UserRole\.gym/);
  assert.match(service, /disconnectOwnerToPlaceholder/);
  assert.doesNotMatch(service, /ownerUserId:\s*null/);

  const actions = readFileSync(
    join(root, "src/features/gym-owner-account/actions.ts"),
    "utf8",
  );
  assert.match(actions, /connectMemberGymOwnerAction/);
  assert.match(actions, /inviteMemberGymOwnerAction/);
}

function main() {
  assertSchemaOwnerNotNull();
  assertPortalModes();
  assertOwnerStatus();
  assertGymPortalNav();
  assertServiceGuards();
  console.log("verify:gym-account-access: ALL_PASS");
}

main();
