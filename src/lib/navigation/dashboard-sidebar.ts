/** 글로벌 다크 사이드바 메뉴 데이터 형태 SSOT */

export type DashboardSidebarNavItem = {
  href: string;
  label: string;
};

/** 3depth용 협회명 등 — 하위 items 만 링크 */
export type DashboardSidebarNavBranch = {
  id: string;
  label: string;
  items: DashboardSidebarNavItem[];
};

export type DashboardSidebarNavGroup = {
  id: string;
  /** null이면 홈 등 1차 독립 메뉴 (섹션 헤더 없음) */
  label: string | null;
  items: DashboardSidebarNavItem[];
  /** 있으면 items 대신(또는 함께) nested branch 렌더 */
  branches?: DashboardSidebarNavBranch[];
};

export function flattenDashboardSidebarNav(
  groups: DashboardSidebarNavGroup[],
): DashboardSidebarNavItem[] {
  return groups.flatMap((g) => [
    ...g.items,
    ...(g.branches?.flatMap((b) => b.items) ?? []),
  ]);
}
