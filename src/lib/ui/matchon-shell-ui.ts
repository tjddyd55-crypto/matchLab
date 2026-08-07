import {
  matchonPageDescClass,
  matchonPageTitleClass,
  matchonSectionTitleClass,
} from "@/lib/ui/matchon-layout";

/** MATCHON Figma Shell·목록·필터·탭·테이블 공통 SSOT */

export const matchonPageEyebrowClass =
  "text-sm font-extrabold uppercase tracking-[0.96px] text-matchon-primary";

export const matchonPageHeaderStackClass = "space-y-1";

export { matchonPageTitleClass, matchonPageDescClass, matchonSectionTitleClass };

export const matchonFilterBarClass =
  "rounded-xl border border-matchon-border bg-matchon-primary-light/35 p-4";

export const matchonFilterPillBaseClass =
  "min-h-10 shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors";

export const matchonFilterPillActiveClass =
  "border-matchon-primary bg-matchon-primary text-white";

export const matchonFilterPillInactiveClass =
  "border-matchon-border bg-white text-matchon-text-secondary hover:border-matchon-primary/30 hover:text-matchon-text-primary";

export const matchonSecondarySidebarClass =
  "rounded-xl border border-matchon-border bg-white p-3 shadow-sm";

export const matchonSecondarySidebarSectionLabelClass =
  "mb-2 px-2 text-xs font-bold uppercase tracking-wide text-matchon-text-secondary";

export const matchonSecondarySidebarLinkBaseClass =
  "block rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors";

export const matchonSecondarySidebarLinkActiveClass =
  "bg-matchon-primary-light text-matchon-primary";

export const matchonSecondarySidebarLinkInactiveClass =
  "text-matchon-text-primary hover:bg-matchon-surface";

export const matchonUnderlineTabsNavClass =
  "flex gap-6 overflow-x-auto border-b border-matchon-border [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const matchonUnderlineTabBaseClass =
  "shrink-0 border-b-2 border-transparent pb-3 text-[15px] font-semibold transition-colors";

export const matchonUnderlineTabActiveClass =
  "border-matchon-primary text-matchon-primary";

export const matchonUnderlineTabInactiveClass =
  "text-matchon-text-secondary hover:text-matchon-text-primary";

export const matchonCompactTableWrapClass =
  "hidden overflow-x-auto rounded-xl border border-matchon-border bg-white lg:block";

export const matchonMobileCardListClass = "flex flex-col gap-3 lg:hidden";

/** 회원관리 V2 지표 — 최대 5열, 카드 과대 금지 */
export const matchonMemberMetricsGridClass =
  "grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5";

export const matchonStatsGridClass = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4";

export const matchonStatCardClass =
  "rounded-xl border border-matchon-border bg-white p-4 shadow-sm";

export const matchonStatValueClass =
  "font-black text-2xl tracking-tight text-matchon-text-primary";

export const matchonStatLabelClass = "text-sm text-matchon-text-secondary";

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
  "rounded-xl border border-matchon-border bg-matchon-primary-light/30 px-4 py-3 text-base text-matchon-text-primary";

/**
 * 툴바·필터 컨트롤 공통 높이 SSOT (40px).
 * Button / native select / input / segmented control 에 동일 적용.
 */
export const matchonControlHeightMdClass =
  "box-border h-10 min-h-10 text-sm leading-none";

/** 일정·그룹수업 상단 툴바용 input/select */
export const matchonToolbarControlClass =
  `${matchonControlHeightMdClass} w-auto min-w-0 rounded-lg border border-matchon-border bg-white px-3 shadow-sm placeholder:text-matchon-text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30`;

/** 툴바 버튼 — Button size default(h-10)와 맞춤 */
export const matchonToolbarButtonClass = matchonControlHeightMdClass;

/** 월/주/일 segmented 컨테이너 — 내부 항목도 h-10으로 맞춤 */
export const matchonToolbarSegmentClass =
  "box-border flex h-10 min-h-10 items-center overflow-hidden rounded-lg border border-matchon-border";

export const matchonToolbarSegmentItemClass =
  "box-border flex h-10 min-h-10 items-center rounded-none px-3 text-sm first:rounded-l-[calc(0.5rem-1px)] last:rounded-r-[calc(0.5rem-1px)]";

export const matchonFieldInputClass =
  "box-border h-10 min-h-10 w-full rounded-lg border border-matchon-border bg-white px-3.5 text-sm shadow-sm placeholder:text-matchon-text-secondary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matchon-primary/30";

export const matchonFieldSelectClass = matchonFieldInputClass;
