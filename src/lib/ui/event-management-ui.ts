import { matchonPageDescClass } from "@/lib/ui/matchon-layout";

/** Event management surface tokens — Figma-aligned chrome & content hierarchy */

export const eventManagementPageBackgroundClass = "bg-[#F8FAFC]";

export const eventManagementLayoutGridClass =
  "grid min-h-[calc(100vh-var(--dashboard-header-height))] min-w-0 grid-cols-1 md:grid-cols-[var(--event-sidebar-width)_minmax(0,1fr)] desktop:min-w-[var(--desktop-main-min-width)] desktop:grid-cols-[var(--event-sidebar-width)_minmax(var(--desktop-content-min-width),1fr)]";

export const eventManagementSideNavAsideClass =
  "hidden h-[calc(100vh-var(--dashboard-header-height))] w-[var(--event-sidebar-width)] shrink-0 flex-col border-r border-[#E2E8F0] bg-white md:sticky md:top-0 md:flex desktop:relative desktop:top-auto desktop:h-auto desktop:min-h-full desktop:self-stretch desktop:flex";

export const eventManagementSideNavScrollClass =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#CBD5E1]";

export const eventManagementSideNavHeaderClass =
  "sticky top-0 z-10 shrink-0 border-b border-[#E2E8F0] bg-white p-4";

export const eventManagementSideNavBackLinkClass =
  "inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] transition-colors hover:text-[#0A47FF]";

export const eventManagementSideNavTitleClass =
  "mt-3 line-clamp-3 font-heading text-[15px] leading-snug font-bold text-[#0F172A]";

export const eventManagementSideNavMenuClass = "px-3 py-4";

export const eventManagementSideNavGroupLabelClass =
  "mb-1.5 mt-5 px-3 text-[11px] font-semibold text-[#94A3B8] first:mt-0";

export const eventManagementSideNavLinkBaseClass =
  "flex h-10 w-full items-center gap-2.5 rounded-[9px] border border-transparent px-3 text-[13px] font-medium transition-colors";

export const eventManagementSideNavLinkActiveClass =
  "border-[#7AA2FF] bg-[#EAF1FF] font-semibold text-[#0A47FF] [&_svg]:text-[#0A47FF]";

export const eventManagementSideNavLinkInactiveClass =
  "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] [&_svg]:text-[#94A3B8]";

export const eventManagementMainColumnClass =
  "min-w-0 bg-[#F8FAFC] desktop:min-w-[var(--desktop-content-min-width)]";

export const eventManagementMainContentClass =
  "min-w-0 w-full space-y-5 px-[var(--dashboard-content-padding-x)] py-5 md:space-y-7 md:py-7 desktop:min-w-[var(--desktop-content-min-width)] desktop:overflow-x-visible";

export const eventManagementMobileBarClass =
  "flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-white px-4 py-3 md:hidden desktop:hidden";

export const eventManagementChromeSurfaceClass = "bg-white";

export const eventManagementSubNavSurfaceClass = "bg-[#F8FAFC]";

export const eventManagementContentSurfaceClass = "bg-white";

export const eventManagementMutedFilterSurfaceClass = "bg-[#F4F7FF]";

export const eventManagementSelectedSurfaceClass = "bg-[#EAF1FF]";

export const eventManagementBorderColorClass = "border-[#E2E8F0]";

/** Organizer container padding과 동일한 inset (좌우 정렬 SSOT) */
export const eventManagementContentInsetClass =
  "px-[var(--dashboard-content-padding-x)]";

/** Chrome를 container 전폭으로 확장 */
export const eventManagementChromeBleedClass = `-mx-[var(--dashboard-content-padding-x)] border-b ${eventManagementBorderColorClass} ${eventManagementChromeSurfaceClass}`;

export const eventManagementContentClass =
  "min-w-0 w-full space-y-5 md:space-y-7";

export const eventManagementPageHeaderClass =
  "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4";

export const eventManagementPageHeaderMainClass = "min-w-0 flex-1 space-y-1.5";

export const eventManagementPageHeaderActionsClass =
  "flex shrink-0 flex-col gap-2 sm:items-end sm:pt-0.5";

export const eventManagementPageTitleClass =
  "font-heading text-xl font-bold tracking-tight text-[#0F172A] md:text-2xl";

export const eventManagementPageDescClass = `${matchonPageDescClass} text-[#64748B]`;

export const eventManagementChromeClass = `${eventManagementChromeBleedClass} mb-0`;

export const eventManagementContextHeaderClass =
  "flex min-w-0 items-center justify-between gap-3 py-3.5 sm:gap-4";

export const eventManagementPrimaryNavClass = `flex h-11 min-w-0 items-stretch gap-6 overflow-x-auto sm:gap-7 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`;

export const eventManagementPrimaryNavLinkBaseClass =
  "inline-flex h-full shrink-0 items-center border-b-2 border-transparent text-[13px] font-semibold transition-colors sm:text-sm";

export const eventManagementPrimaryNavLinkActiveClass =
  "border-[#0A47FF] text-[#0A47FF]";

export const eventManagementPrimaryNavLinkInactiveClass =
  "text-[#64748B] hover:text-[#0F172A]";

export const eventManagementSecondaryNavClass = `flex min-h-12 min-w-0 gap-2 overflow-x-auto py-2 ${eventManagementSubNavSurfaceClass} [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`;

export const eventManagementSecondaryNavLinkBaseClass =
  "min-h-8 shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors md:text-sm";

export const eventManagementSecondaryNavLinkActiveClass =
  `${eventManagementSelectedSurfaceClass} border-[#BFD0FF] text-[#0A47FF]`;

export const eventManagementSecondaryNavLinkInactiveClass =
  `border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#BFD0FF]/60 hover:text-[#0F172A]`;

export const eventManagementSectionStackClass = "flex flex-col gap-4 md:gap-5";

export const eventManagementSectionHeaderClass =
  "flex min-w-0 items-center justify-between gap-3";

export const eventManagementSectionTitleClass =
  "text-sm font-semibold text-[#0F172A]";

/** 운영 현황/KPI strip — 신청자 compact 56px SSOT */
export const eventManagementStatGridClass =
  "grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8";

export const eventManagementStatGrid4Class =
  "grid grid-cols-2 gap-2 lg:grid-cols-4";

export const eventManagementStatGrid5Class =
  "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5";

export const eventManagementStatGrid6Class =
  "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6";

/** 관리자 개요 등 다수 KPI — 카드 높이는 56px, 열만 4~5로 조절 */
export const eventManagementStatGridAdminClass =
  "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export const eventManagementStatCardClass = `flex h-[56px] w-full flex-col justify-center overflow-hidden rounded-[10px] border ${eventManagementBorderColorClass} ${eventManagementContentSurfaceClass} px-3 py-2 text-left shadow-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A47FF]/30`;

export const eventManagementStatCardInteractiveClass =
  "cursor-pointer hover:border-[#BFD0FF]/80";

export const eventManagementStatCardSelectedClass = `${eventManagementSelectedSurfaceClass} border-[#0A47FF]`;

export const eventManagementStatLabelClass =
  "line-clamp-2 text-[11px] leading-none text-[#64748B]";

export const eventManagementStatLabelSelectedClass =
  "line-clamp-2 text-[11px] leading-none text-[#0A47FF]";

export const eventManagementStatValueClass =
  "mt-0.5 text-lg font-bold tabular-nums leading-none text-[#0F172A]";

/** 바로가기/히어로 등 운영 KPI가 아닌 카드 */
export const eventManagementStatCardRelaxedClass = `rounded-[14px] border ${eventManagementBorderColorClass} ${eventManagementContentSurfaceClass} p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A47FF]/30`;

export const eventManagementStatLabelRelaxedClass = "text-xs text-[#64748B]";

export const eventManagementStatLabelRelaxedSelectedClass =
  "text-xs text-[#0A47FF]";

export const eventManagementStatValueRelaxedClass =
  "mt-1 text-2xl font-black tabular-nums text-[#0F172A]";

export const eventManagementCourtCardGridClass =
  "grid gap-3 md:grid-cols-2 xl:grid-cols-3";
