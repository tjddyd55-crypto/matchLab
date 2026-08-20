import type { DashboardSidebarNavGroup } from "@/lib/navigation/dashboard-sidebar";
import { flattenDashboardSidebarNav } from "@/lib/navigation/dashboard-sidebar";

/** 선수 글로벌 메뉴 — 항목·href는 기존 Sidebar 평탄 목록과 동일하다. */
export function getFighterNavGroups(): DashboardSidebarNavGroup[] {
  return [
    {
      id: "home",
      label: null,
      items: [{ href: "/fighter", label: "홈" }],
    },
    {
      id: "me",
      label: "내 정보",
      items: [
        { href: "/fighter/profile", label: "내 프로필" },
        { href: "/fighter/events", label: "내 대회·경기" },
        { href: "/fighter/records", label: "전적" },
      ],
    },
    {
      id: "common",
      label: "공통",
      items: [{ href: "/notifications", label: "알림" }],
    },
  ];
}

export function getFighterNavItems() {
  return flattenDashboardSidebarNav(getFighterNavGroups());
}

export function getFighterHomePaths(): string[] {
  return ["/fighter"];
}

export function isFighterNavItemActive(href: string, pathname: string): boolean {
  if (getFighterHomePaths().includes(href)) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
