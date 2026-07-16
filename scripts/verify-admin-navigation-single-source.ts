/**
 * 슈퍼어드민 글로벌 메뉴 SSOT 검증.
 * - admin-navigation.ts 단일 소스
 * - AdminNavStrip(상단 가로 메뉴) 렌더링/파일 없음
 * - Sidebar · MobileBottomNav · AdminMobileNavSheet가 SSOT를 사용
 * - organizer / gym nav SSOT와 분리
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  getAdminHomePaths,
  getAdminMobileBottomNavItems,
  getAdminNavItems,
  isAdminNavItemActive,
} from "../src/lib/navigation/admin-navigation";
import { getGymPortalNavItems } from "../src/lib/navigation/gym-portal-navigation";
import { getOrganizerGlobalNavGroups } from "../src/lib/navigation/organizer-global-navigation";

const ROOT = path.resolve(__dirname, "..");

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

function staticChecks() {
  assert.equal(
    existsSync(
      path.join(ROOT, "src/components/domain/admin/AdminNavStrip.tsx"),
    ),
    false,
    "AdminNavStrip.tsx must be removed",
  );

  const layout = readSrc("src/app/(dashboard)/admin/layout.tsx");
  assert.ok(
    !layout.includes("AdminNavStrip"),
    "admin layout must not render AdminNavStrip",
  );
  assert.ok(
    layout.includes("DashboardShell"),
    "admin layout keeps DashboardShell",
  );

  const sidebar = readSrc("src/components/layout/Sidebar.tsx");
  assert.ok(
    sidebar.includes("getAdminNavItems"),
    "Sidebar must use getAdminNavItems",
  );
  assert.ok(
    sidebar.includes("from \"@/lib/navigation/admin-navigation\""),
    "Sidebar must import admin-navigation SSOT",
  );

  const mobileBottom = readSrc("src/components/layout/MobileBottomNav.tsx");
  assert.ok(
    mobileBottom.includes("getAdminMobileBottomNavItems"),
    "MobileBottomNav must use getAdminMobileBottomNavItems",
  );

  const header = readSrc("src/components/layout/Header.tsx");
  assert.ok(
    header.includes("AdminMobileNavSheet"),
    "Header must mount AdminMobileNavSheet for admin",
  );

  const sheet = readSrc("src/components/layout/AdminMobileNavSheet.tsx");
  assert.ok(sheet.includes("getAdminNavItems"));
  assert.ok(sheet.includes('aria-label="관리자 메뉴 열기"'));

  const items = getAdminNavItems();
  assert.deepEqual(
    items.map((i) => i.label),
    [
      "홈",
      "대회",
      "주최자",
      "파트너 로고",
      "크레딧",
      "체육관",
      "선수",
      "신청",
      "신청서 템플릿",
      "결과",
      "감사",
      "알림",
    ],
  );
  assert.deepEqual(getAdminHomePaths(), ["/admin"]);

  assert.equal(isAdminNavItemActive("/admin", "/admin"), true);
  assert.equal(isAdminNavItemActive("/admin", "/admin/events"), false);
  assert.equal(isAdminNavItemActive("/admin/events", "/admin/events"), true);
  assert.equal(
    isAdminNavItemActive("/admin/events", "/admin/events/abc"),
    true,
  );
  assert.equal(isAdminNavItemActive("/admin/gyms", "/admin/gyms/x"), true);
  assert.equal(
    isAdminNavItemActive("/admin/audit-logs", "/admin/audit-logs"),
    true,
  );

  const bottom = getAdminMobileBottomNavItems();
  assert.deepEqual(
    bottom.map((i) => i.href),
    ["/admin", "/admin/events", "/admin/applications", "/notifications"],
  );
  for (const b of bottom) {
    assert.ok(
      items.some((i) => i.href === b.href && i.label === b.label),
      `bottom nav item must come from SSOT: ${b.href}`,
    );
  }

  // organizer / gym 분리
  const org = getOrganizerGlobalNavGroups({ organizerType: "individual" });
  assert.ok(org.length > 0);
  assert.ok(!items.some((i) => i.href.startsWith("/organizer")));
  const gym = getGymPortalNavItems();
  assert.ok(!gym.some((i) => i.href.startsWith("/admin")));
  assert.ok(!items.some((i) => i.href.startsWith("/gym")));

  // 라우트 페이지 존재 (삭제 금지)
  for (const href of [
    "/admin",
    "/admin/events",
    "/admin/organizers",
    "/admin/public-partners",
    "/admin/credits",
    "/admin/gyms",
    "/admin/fighters",
    "/admin/applications",
    "/admin/application-form-templates",
    "/admin/results",
    "/admin/audit-logs",
  ]) {
    const pageRel =
      href === "/admin"
        ? "src/app/(dashboard)/admin/page.tsx"
        : `src/app/(dashboard)${href}/page.tsx`;
    assert.ok(existsSync(path.join(ROOT, pageRel)), `route page missing: ${href}`);
  }

  console.log("ADMIN_NAV_SINGLE_SOURCE=PASS");
}

staticChecks();
