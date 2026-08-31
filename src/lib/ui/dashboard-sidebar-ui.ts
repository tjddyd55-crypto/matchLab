/**
 * 주최자 글로벌 사이드바 스타일 SSOT — 체육관/관리자/선수도 동일 토큰 사용
 *
 * Web(md+): AppShell(`overflow-x-clip`)이 sticky containing block이 되어
 * document scroll 대비 sticky가 동작하지 않는다.
 * 글로벌 메뉴만 viewport에 고정하려면 fixed + in-flow spacer가 필요하다.
 *
 * Desktop Manager: shell이 viewport 높이를 채우고 본문만 세로 스크롤하므로
 * in-flow sidebar를 shell 높이에 맞춘다 (primary nav는 본문과 함께 올라가지 않음).
 *
 * z-20: 본문보다 위, Dialog(z-50)보다 아래.
 */

export const dashboardSidebarSpacerClass =
  "hidden w-[var(--global-sidebar-width)] shrink-0 md:block";

export const dashboardSidebarAsideClass =
  "fixed top-0 left-0 z-20 hidden h-dvh max-h-dvh w-[var(--global-sidebar-width)] flex-col overflow-hidden border-r border-white/8 bg-matchon-sidebar px-2.5 py-3 md:flex";

/**
 * Desktop Manager shell — in-flow primary nav filling shell height.
 * Outer viewport scrolls horizontally only; this aside stays put.
 */
export const dashboardSidebarAsideCanvasClass =
  "relative z-20 flex h-full max-h-full w-[var(--global-sidebar-width)] shrink-0 flex-col self-stretch overflow-hidden border-r border-white/8 bg-matchon-sidebar px-2.5 py-3";

export const dashboardSidebarBrandClass = "mb-3 shrink-0 px-2";

export const dashboardSidebarNavClass =
  "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden";

export const dashboardSidebarHomeWrapClass = "space-y-0.5";

export const dashboardSidebarDividerClass = "mt-4 border-t border-white/8";

export const dashboardSidebarFirstSectionClass = "mt-2.5";

export const dashboardSidebarSectionClass = "mt-4";

export const dashboardSidebarSectionLabelClass =
  "flex cursor-default items-center gap-1.5 px-3 pb-1.5 pt-1 text-[11px] font-bold tracking-[0.03em] text-slate-400";

/** Desktop accordion 대메뉴 토글 — touch(모바일 Sheet)는 기존 section label 유지 */
export const dashboardSidebarAccordionTriggerClass =
  "flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-left text-[12px] font-bold tracking-[0.02em] text-slate-300 transition-colors duration-150 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35";

export const dashboardSidebarAccordionTriggerOpenClass = "text-white";

export const dashboardSidebarAccordionChevronClass =
  "ml-auto shrink-0 text-[10px] text-slate-400 transition-transform duration-150";

export const dashboardSidebarSectionBulletClass =
  "inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400/80";

export const dashboardSidebarSectionItemsClass =
  "ml-[18px] space-y-0.5 border-l border-white/10 pl-2";

export const dashboardSidebarItemBaseClass =
  "flex items-center rounded-lg px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35";

export const dashboardSidebarItemDesktopClass = "h-9";

export const dashboardSidebarItemTouchClass = "h-11 min-h-11";

export const dashboardSidebarItemActiveClass =
  "bg-white/14 font-bold text-white";

export const dashboardSidebarItemInactiveClass =
  "text-slate-300 hover:bg-white/8 hover:text-white";
