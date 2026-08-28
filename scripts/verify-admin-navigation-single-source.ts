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

  const sidebar = readSrc("src/components/layout/SidebarNav.tsx");
  assert.ok(
    sidebar.includes("getAdminNavGroups"),
    "SidebarNav must use getAdminNavGroups",
  );
  assert.ok(
    sidebar.includes("from \"@/lib/navigation/admin-navigation\""),
    "SidebarNav must import admin-navigation SSOT",
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
      "협회",
      "체육관",
      "선수",
      "협회 가입 신청",
      "체육관 가입 신청",
      "대회",
      "주최자",
      "크레딧 관리",
      "요금제",
      "쿠폰",
      "구독",
      "결제 내역",
      "신청",
      "신청서 템플릿",
      "결과",
      "감사",
      "Manager 문의",
      "비밀번호 재설정 링크",
      "메시징 진단",
      "메시징 테스트",
      "발송 이력",
      "메인 파트너 로고",
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
    isAdminNavItemActive("/admin/associations", "/admin/associations/x"),
    true,
  );
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
    "/admin/associations",
    "/admin/association-applications",
    "/admin/gym-applications",
    "/admin/public-partners",
    "/admin/credits",
    "/admin/billing/plans",
    "/admin/billing/coupons",
    "/admin/billing/subscriptions",
    "/admin/billing/payments",
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
