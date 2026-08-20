/**
 * 슈퍼어드민 글로벌 메뉴 SSOT.
 * PC 사이드바 · 모바일 Sheet · (선택) bottom nav 공통.
 * 주최자/회원사 navigation과 분리한다.
 */

import type { DashboardSidebarNavGroup } from "@/lib/navigation/dashboard-sidebar";
import { flattenDashboardSidebarNav } from "@/lib/navigation/dashboard-sidebar";

export type AdminNavItem = {
  href: string;
  label: string;
};

export const ADMIN_HOME_PATHS = ["/admin"] as const;

/**
 * 관리자 좌측 메뉴 계층 — 항목 순서·href는 기존 flat 목록과 동일.
 */
export function getAdminNavGroups(): DashboardSidebarNavGroup[] {
  return [
    {
      id: "home",
      label: null,
      items: [{ href: "/admin", label: "홈" }],
    },
    {
      id: "events",
      label: "대회·주최자",
      items: [
        { href: "/admin/events", label: "대회" },
        { href: "/admin/organizers", label: "주최자" },
      ],
    },
    {
      id: "join",
      label: "가입 신청",
      items: [
        { href: "/admin/association-applications", label: "협회 가입 신청" },
        { href: "/admin/gym-applications", label: "체육관 가입 신청" },
      ],
    },
    {
      id: "public",
      label: "공개",
      items: [{ href: "/admin/public-partners", label: "메인 파트너 로고" }],
    },
    {
      id: "ops",
      label: "운영",
      items: [
        { href: "/admin/credits", label: "크레딧" },
        { href: "/admin/gyms", label: "체육관" },
        { href: "/admin/fighters", label: "선수" },
        { href: "/admin/applications", label: "신청" },
        { href: "/admin/application-form-templates", label: "신청서 템플릿" },
        { href: "/admin/results", label: "결과" },
      ],
    },
    {
      id: "support",
      label: "감사·지원",
      items: [
        { href: "/admin/audit-logs", label: "감사" },
        { href: "/admin/support-inquiries", label: "Manager 문의" },
        { href: "/admin/password-reset-links", label: "비밀번호 재설정 링크" },
      ],
    },
    {
      id: "messaging",
      label: "메시징",
      items: [
        { href: "/admin/messaging/diagnostics", label: "메시징 진단" },
        { href: "/admin/messaging/test", label: "메시징 테스트" },
        { href: "/admin/messaging/history", label: "발송 이력" },
      ],
    },
    {
      id: "common",
      label: "공통",
      items: [{ href: "/notifications", label: "알림" }],
    },
  ];
}

export function getAdminNavItems(): AdminNavItem[] {
  return flattenDashboardSidebarNav(getAdminNavGroups());
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
