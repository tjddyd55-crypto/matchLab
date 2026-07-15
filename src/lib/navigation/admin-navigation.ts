/**
 * 슈퍼어드민 글로벌 메뉴 SSOT.
 * PC 사이드바 · 모바일 Sheet · (선택) bottom nav 공통.
 * 주최자/회원사 navigation과 분리한다.
 */

export type AdminNavItem = {
  href: string;
  label: string;
};

export const ADMIN_HOME_PATHS = ["/admin"] as const;

/**
 * 전체 관리자 메뉴 (좌측 사이드바 · 모바일 drawer).
 * 크레딧·신청서 템플릿은 운영 페이지가 존재하므로 사이드바에 정식 포함.
 */
export function getAdminNavItems(): AdminNavItem[] {
  return [
    { href: "/admin", label: "홈" },
    { href: "/admin/events", label: "대회" },
    { href: "/admin/organizers", label: "주최자" },
    { href: "/admin/credits", label: "크레딧" },
    { href: "/admin/gyms", label: "체육관" },
    { href: "/admin/fighters", label: "선수" },
    { href: "/admin/applications", label: "신청" },
    { href: "/admin/application-form-templates", label: "신청서 템플릿" },
    { href: "/admin/results", label: "결과" },
    { href: "/admin/audit-logs", label: "감사" },
    { href: "/notifications", label: "알림" },
  ];
}

/** 모바일 하단 고정 바로 — 전체 메뉴의 핵심 단축키만 */
export function getAdminMobileBottomNavItems(): AdminNavItem[] {
  const all = getAdminNavItems();
  const hrefs = new Set([
    "/admin",
    "/admin/events",
    "/admin/applications",
    "/notifications",
  ]);
  return all.filter((item) => hrefs.has(item.href));
}

export function getAdminHomePaths(): string[] {
  return [...ADMIN_HOME_PATHS];
}

export function isAdminNavItemActive(
  href: string,
  pathname: string,
  homePaths: string[] = getAdminHomePaths(),
): boolean {
  if (homePaths.includes(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
