/**
 * 슈퍼어드민 글로벌 메뉴 SSOT.
 * PC 사이드바 · 모바일 Sheet · (선택) bottom nav 공통.
 * 주최자/회원사 navigation과 분리한다.
 *
 * 그룹은 업무 IA 기준: 회원·조직 / 선수 / 대회 / 결제·구독 / 시스템
 */

import type { DashboardSidebarNavGroup } from "@/lib/navigation/dashboard-sidebar";
import { flattenDashboardSidebarNav } from "@/lib/navigation/dashboard-sidebar";

export type AdminNavItem = {
  href: string;
  label: string;
};

export const ADMIN_HOME_PATHS = ["/admin"] as const;

/**
 * 관리자 좌측 메뉴 — 업무 성격별 그룹.
 * 기존 메뉴 삭제 금지, 그룹만 재배치.
 */
export function getAdminNavGroups(): DashboardSidebarNavGroup[] {
  return [
    {
      id: "home",
      label: null,
      items: [{ href: "/admin", label: "홈" }],
    },
    {
      id: "orgs",
      label: "회원·조직",
      items: [
        { href: "/admin/associations", label: "협회" },
        { href: "/admin/gyms", label: "체육관" },
        { href: "/admin/organizers", label: "주최자" },
        { href: "/admin/association-applications", label: "협회 가입 신청" },
        { href: "/admin/gym-applications", label: "체육관 가입 신청" },
        { href: "/admin/member-sport-templates", label: "회원관리 템플릿" },
      ],
    },
    {
      id: "fighters",
      label: "선수",
      items: [{ href: "/admin/fighters", label: "선수" }],
    },
    {
      id: "events",
      label: "대회",
      items: [
        { href: "/admin/events", label: "대회" },
        { href: "/admin/applications", label: "신청" },
        { href: "/admin/application-form-templates", label: "신청서 템플릿" },
        { href: "/admin/results", label: "결과" },
      ],
    },
    {
      id: "billing",
      label: "결제·구독",
      items: [
        { href: "/admin/billing/plans", label: "요금제" },
        { href: "/admin/billing/subscriptions", label: "구독" },
        { href: "/admin/billing/payments", label: "결제 내역" },
        { href: "/admin/billing/coupons", label: "쿠폰" },
        { href: "/admin/billing/settings", label: "결제 설정" },
        { href: "/admin/credits", label: "크레딧 관리" },
      ],
    },
    {
      id: "system",
      label: "시스템",
      items: [
        { href: "/admin/audit-logs", label: "감사" },
        { href: "/admin/support-inquiries", label: "Manager 문의" },
        { href: "/admin/password-reset-links", label: "비밀번호 재설정 링크" },
        { href: "/admin/messaging/diagnostics", label: "메시징 진단" },
        { href: "/admin/messaging/test", label: "메시징 테스트" },
        { href: "/admin/messaging/history", label: "발송 이력" },
        { href: "/admin/public-partners", label: "메인 파트너 로고" },
        { href: "/notifications", label: "알림" },
      ],
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
