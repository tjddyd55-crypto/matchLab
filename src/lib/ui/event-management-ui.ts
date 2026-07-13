import { matchonPageDescClass } from "@/lib/ui/matchon-layout";

/** Event management surface tokens — Figma-aligned chrome & content hierarchy */

export const eventManagementPageBackgroundClass = "bg-[#F8FAFC]";

export const eventManagementChromeSurfaceClass = "bg-white";

export const eventManagementSubNavSurfaceClass = "bg-[#F8FAFC]";

export const eventManagementContentSurfaceClass = "bg-white";

export const eventManagementMutedFilterSurfaceClass = "bg-[#F4F7FF]";

export const eventManagementSelectedSurfaceClass = "bg-[#EAF1FF]";

export const eventManagementBorderColorClass = "border-[#E2E8F0]";

/** Organizer container padding과 동일한 inset (좌우 정렬 SSOT) */
export const eventManagementContentInsetClass = "px-4 sm:px-6 lg:px-8";

/** Chrome를 container 전폭으로 확장 */
export const eventManagementChromeBleedClass = `-mx-4 sm:-mx-6 lg:-mx-8 border-b ${eventManagementBorderColorClass} ${eventManagementChromeSurfaceClass}`;

export const eventManagementContentClass =
  "min-w-0 w-full space-y-5 pt-5 md:space-y-7 md:pt-7";

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

export const eventManagementStatGridClass =
  "grid gap-3 sm:grid-cols-2 xl:grid-cols-5";

export const eventManagementStatCardClass = `rounded-[14px] border ${eventManagementBorderColorClass} ${eventManagementContentSurfaceClass} p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A47FF]/30`;

export const eventManagementStatCardInteractiveClass =
  "cursor-pointer hover:border-[#BFD0FF]/80";

export const eventManagementStatCardSelectedClass = `${eventManagementSelectedSurfaceClass} border-[#0A47FF]`;

export const eventManagementStatLabelClass = "text-xs text-[#64748B]";

export const eventManagementStatLabelSelectedClass = "text-xs text-[#0A47FF]";

export const eventManagementStatValueClass =
  "mt-1 text-2xl font-black tabular-nums text-[#0F172A]";

export const eventManagementCourtCardGridClass =
  "grid gap-3 md:grid-cols-2 xl:grid-cols-3";
