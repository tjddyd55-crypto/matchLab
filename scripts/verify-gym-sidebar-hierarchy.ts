/**
 * Gym portal sidebar hierarchy static verifies.
 *   npm run verify:gym-sidebar-hierarchy
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  getGymPortalNavGroups,
  isGymPortalNavItemActive,
} from "../src/lib/navigation/gym-portal-navigation";

const root = process.cwd();

function assertNavSsotUnchanged() {
  const groups = getGymPortalNavGroups("owner");
  assert.deepEqual(
    groups.map((g) => ({
      id: g.id,
      label: g.label,
      items: g.items.map((i) => ({ href: i.href, label: i.label })),
    })),
    [
      {
        id: "home",
        label: null,
        items: [{ href: "/gym", label: "홈" }],
      },
      {
        id: "schedules",
        label: "일정 관리",
        items: [
          { href: "/gym/schedules", label: "전체 일정" },
          { href: "/gym/schedules/my", label: "내 일정" },
          { href: "/gym/group-classes", label: "그룹수업" },
        ],
      },
      {
        id: "members",
        label: "회원 관리",
        items: [
          { href: "/gym/members", label: "전체 회원" },
          { href: "/gym/members/new", label: "회원 등록" },
          { href: "/gym/membership-plans", label: "이용권 관리" },
        ],
      },
      {
        id: "attendance",
        label: "출석 관리",
        items: [
          { href: "/gym/attendance", label: "출석 현황" },
          { href: "/gym/attendance/kiosks", label: "출석 키오스크" },
        ],
      },
      {
        id: "staff",
        label: "직원 관리",
        items: [
          { href: "/gym/staff", label: "선생님 목록" },
          { href: "/gym/staff/new", label: "선생님 등록" },
        ],
      },
      {
        id: "sales",
        label: "매출 관리",
        items: [
          { href: "/gym/sales", label: "매출 현황" },
          { href: "/gym/sales/receivables", label: "미수금" },
        ],
      },
      {
        id: "fighters",
        label: "선수 관리",
        items: [
          { href: "/gym/fighters", label: "선수 목록" },
          { href: "/gym/fighters/new", label: "선수 등록" },
        ],
      },
      {
        id: "events",
        label: "대회",
        items: [
          { href: "/gym/events", label: "대회 목록" },
          { href: "/gym/applications", label: "신청 내역" },
          { href: "/gym/brackets", label: "대진표 확인" },
        ],
      },
      {
        id: "profile",
        label: "체육관",
        items: [{ href: "/gym/profile", label: "체육관 정보" }],
      },
    ],
  );

  const staffGroups = getGymPortalNavGroups("staff");
  assert.deepEqual(
    staffGroups.map((g) => g.id),
    ["home", "schedules", "members"],
  );
  assert.equal(
    staffGroups.some((g) => g.id === "sales" || g.id === "staff"),
    false,
  );
}

function assertHierarchyMarkup() {
  const nav = readFileSync(
    join(root, "src/components/layout/GymPortalNavGroups.tsx"),
    "utf8",
  );

  // Section labels are <p>, not <Link>
  assert.match(nav, /group\.label \? \(\s*<p/);
  assert.doesNotMatch(nav, /<Link[^>]*>\{group\.label\}/);

  // No uppercase transform on section labels
  assert.doesNotMatch(nav, /uppercase/);

  // Indent hierarchy: section px-3, children with label use pl-7
  assert.match(nav, /px-3 pb-1\.5 text-\[11px\] font-semibold/);
  assert.match(nav, /group\.label \? "pl-7 pr-3" : "px-3"/);

  // Active only on Link items via isGymPortalNavItemActive
  assert.match(nav, /isGymPortalNavItemActive\(item\.href, pathname\)/);
  assert.match(nav, /aria-current=\{active \? "page" : undefined\}/);

  // Mobile tap target
  assert.match(nav, /min-h-11/);
}

function assertActiveLeafOnly() {
  assert.equal(isGymPortalNavItemActive("/gym/attendance/kiosks", "/gym/attendance/kiosks"), true);
  assert.equal(isGymPortalNavItemActive("/gym/attendance", "/gym/attendance/kiosks"), false);
  assert.equal(isGymPortalNavItemActive("/gym", "/gym"), true);
  assert.equal(isGymPortalNavItemActive("/gym", "/gym/members"), false);
  assert.equal(isGymPortalNavItemActive("/gym/members", "/gym/members/new"), false);
  assert.equal(isGymPortalNavItemActive("/gym/sales", "/gym/sales/receivables"), false);
  assert.equal(
    isGymPortalNavItemActive("/gym/sales/receivables", "/gym/sales/receivables"),
    true,
  );
}

function assertPcAndMobileShareSsot() {
  const sidebar = readFileSync(
    join(root, "src/components/layout/Sidebar.tsx"),
    "utf8",
  );
  const sheet = readFileSync(
    join(root, "src/components/layout/GymMobileNavSheet.tsx"),
    "utf8",
  );
  const nav = readFileSync(
    join(root, "src/components/layout/GymPortalNavGroups.tsx"),
    "utf8",
  );

  assert.match(sidebar, /GymPortalNavGroups/);
  assert.match(sidebar, /density="desktop"/);
  assert.match(sheet, /getGymPortalNavGroups/);
  assert.match(sheet, /GymPortalNavGroups/);
  assert.match(sheet, /density="mobile"/);
  assert.match(sheet, /overflow-y-auto/);
  assert.match(sheet, /overflow-x-hidden/);
  assert.match(nav, /getGymPortalNavGroups/);
  // Single shared render component — no duplicate menu arrays in sheet/sidebar
  assert.doesNotMatch(sheet, /회원 관리/);
  assert.doesNotMatch(sidebar, /회원 관리/);
}

function main() {
  assertNavSsotUnchanged();
  assertHierarchyMarkup();
  assertActiveLeafOnly();
  assertPcAndMobileShareSsot();
  console.log("verify:gym-sidebar-hierarchy: OK");
  console.log("verify:gym-sidebar-active-state: OK");
  console.log("verify:gym-sidebar-mobile: OK");
}

main();
