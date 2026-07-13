import {
  matchonPageDescClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";

/** MATCHON Figma Shell·목록·필터·탭·테이블 공통 SSOT */

export const matchonPageEyebrowClass =
  "text-xs font-extrabold uppercase tracking-[0.96px] text-matchon-primary";

export const matchonPageHeaderStackClass = "space-y-1";

export { matchonPageTitleClass, matchonPageDescClass, matchonSectionTitleClass };

export const matchonFilterBarClass =
  "rounded-xl border border-matchon-border bg-matchon-primary-light/35 p-4";

export const matchonFilterPillBaseClass =
  "min-h-9 shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors";

export const matchonFilterPillActiveClass =
  "border-matchon-primary bg-matchon-primary text-white";

export const matchonFilterPillInactiveClass =
  "border-matchon-border bg-white text-matchon-text-secondary hover:border-matchon-primary/30 hover:text-matchon-text-primary";

export const matchonSecondarySidebarClass =
  "rounded-xl border border-matchon-border bg-white p-3 shadow-sm";

export const matchonSecondarySidebarSectionLabelClass =
  "mb-2 px-2 text-[11px] font-bold uppercase tracking-wide text-matchon-text-secondary";

export const matchonSecondarySidebarLinkBaseClass =
  "block rounded-lg px-3 py-2 text-sm font-medium transition-colors";

export const matchonSecondarySidebarLinkActiveClass =
  "bg-matchon-primary-light text-matchon-primary";

export const matchonSecondarySidebarLinkInactiveClass =
  "text-matchon-text-primary hover:bg-matchon-surface";

export const matchonUnderlineTabsNavClass =
  "flex gap-6 overflow-x-auto border-b border-matchon-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const matchonUnderlineTabBaseClass =
  "shrink-0 border-b-2 border-transparent pb-3 text-sm font-semibold transition-colors";

export const matchonUnderlineTabActiveClass =
  "border-matchon-primary text-matchon-primary";

export const matchonUnderlineTabInactiveClass =
  "text-matchon-text-secondary hover:text-matchon-text-primary";

export const matchonCompactTableWrapClass =
  "hidden overflow-x-auto rounded-xl border border-matchon-border bg-white md:block";

export const matchonMobileCardListClass = "flex flex-col gap-3 md:hidden";

export const matchonStatsGridClass = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

export const matchonStatCardClass =
  "rounded-xl border border-matchon-border bg-white p-4 shadow-sm";

export const matchonStatValueClass =
  "font-black text-2xl tracking-tight text-matchon-text-primary";

export const matchonStatLabelClass = "text-xs text-matchon-text-secondary";

export const matchonVsCardClass =
  "rounded-xl border border-matchon-border bg-white p-4 shadow-sm";

export const matchonRedCornerPanelClass =
  "rounded-lg border border-red-200 bg-red-50/90 p-3 text-red-800";

export const matchonBlueCornerPanelClass =
  "rounded-lg border border-blue-200 bg-blue-50/90 p-3 text-blue-800";

export const matchonRedCornerTextClass = "font-bold text-red-600";

export const matchonBlueCornerTextClass = "font-bold text-blue-600";

export const matchonCompactActionBarClass =
  "flex flex-wrap items-center gap-2 rounded-xl border border-matchon-border bg-white p-3";

export const matchonInfoBannerClass =
  "rounded-xl border border-matchon-border bg-matchon-primary-light/30 px-4 py-3 text-sm text-matchon-text-primary";

export const matchonFieldInputClass =
  "h-10 w-full rounded-lg border border-matchon-border bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30";

export const matchonFieldSelectClass = matchonFieldInputClass;
