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
  const byId = Object.fromEntries(groups.map((g) => [g.id, g]));

  assert.equal(byId.home?.label, null);
  assert.deepEqual(byId.home?.items.map((i) => i.label), ["홈"]);

  assert.equal(byId.revenue?.label, "매출 관리");
  assert.deepEqual(
    byId.revenue?.items.map((i) => ({ href: i.href, label: i.label })),
    [
      { href: "/gym/sales", label: "매출 관리" },
      { href: "/gym/sales/receivables", label: "매출 등록" },
      { href: "/gym/products", label: "상품 관리" },
    ],
  );

  assert.equal(byId.matchon?.label, "MATCHON");
  assert.deepEqual(
    byId.matchon?.items.map((i) => ({ href: i.href, label: i.label })),
    [{ href: "/gym/billing/account", label: "MATCHON 구독" }],
  );

  assert.ok(!byId.billing);
  assert.ok(
    byId.members?.items.some((i) => i.label === "회원 추가 항목"),
  );

  const staffGroups = getGymPortalNavGroups("staff");
  assert.deepEqual(
    staffGroups.map((g) => g.id),
    ["home", "schedules", "members"],
  );
  assert.equal(
    staffGroups.some(
      (g) =>
        g.id === "billing" ||
        g.id === "revenue" ||
        g.id === "matchon" ||
        g.id === "operations" ||
        g.id === "fighters" ||
        g.id === "events",
    ),
    false,
  );
}

function assertHierarchyMarkup() {
  const nav = readFileSync(
    join(root, "src/components/layout/GymPortalNavGroups.tsx"),
    "utf8",
  );
  const shared = readFileSync(
    join(root, "src/components/layout/dashboard-sidebar/DashboardSidebarNav.tsx"),
    "utf8",
  );
  const tokens = readFileSync(
    join(root, "src/lib/ui/dashboard-sidebar-ui.ts"),
    "utf8",
  );

  assert.match(nav, /DashboardSidebarNav/);
  assert.match(nav, /isGymPortalNavItemActive/);
  assert.doesNotMatch(nav, /uppercase/);
  assert.doesNotMatch(nav, /bg-matchon-primary-light/);

  // Section labels are not Links
  assert.match(shared, /data-nav-level="section"/);
  assert.doesNotMatch(shared, /<Link[^>]*>\{group\.label\}/);
  assert.match(shared, /aria-current=\{active \? "page" : undefined\}/);
  assert.match(shared, /dashboardSidebarItemTouchClass/);
  assert.match(shared, /data-nav-accordion/);
  assert.doesNotMatch(shared, /uppercase/);

  assert.match(tokens, /min-h-11/);
  assert.match(tokens, /bg-white\/14/);
  assert.match(tokens, /ml-\[18px\] space-y-0\.5 border-l border-white\/10 pl-2/);
  assert.match(tokens, /text-\[11px\] font-bold/);
  assert.match(tokens, /fixed top-0 left-0/);
  assert.match(tokens, /h-dvh/);
  assert.match(tokens, /dashboardSidebarAsideClass =\s*"fixed/);
  assert.doesNotMatch(tokens, /dashboardSidebarAsideClass =\s*"[^"]*sticky/);
  assert.doesNotMatch(tokens, /bg-matchon-primary/);

  const eventUi = readFileSync(
    join(root, "src/lib/ui/event-management-ui.ts"),
    "utf8",
  );
  assert.match(eventUi, /md:sticky md:top-0 md:flex/);
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
