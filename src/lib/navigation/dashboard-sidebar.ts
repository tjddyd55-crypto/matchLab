/** 글로벌 다크 사이드바 메뉴 데이터 형태 SSOT */

export type DashboardSidebarNavItem = {
  href: string;
  label: string;
};

export type DashboardSidebarNavGroup = {
  id: string;
  /** null이면 홈 등 1차 독립 메뉴 (섹션 헤더 없음) */
  label: string | null;
  items: DashboardSidebarNavItem[];
};

export function flattenDashboardSidebarNav(
  groups: DashboardSidebarNavGroup[],
): DashboardSidebarNavItem[] {
  return groups.flatMap((g) => g.items);
}
