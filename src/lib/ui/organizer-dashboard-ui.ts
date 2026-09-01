import {
  matchonPageDescClass,
  matchonPageStackClass,
  matchonPageTitleClass,
  matchonSectionStackClass,
} from "@/lib/ui/matchon-layout";
import {
  matchonFilterBarClass,
  matchonPageEyebrowClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatsGridClass,
  matchonStatValueClass,
} from "@/lib/ui/matchon-shell-ui";

/** left-aligned — mx-auto/max-w 중앙 고립 제거 (sidebar 직후 inset만) */
export const organizerDashboardContainerClass =
  "w-full max-w-none px-[var(--dashboard-content-padding-x)] py-4 md:py-5";

export const organizerDashboardPageClass = matchonPageStackClass;

export const organizerDashboardHeaderClass = "space-y-1";

export const organizerDashboardTitleClass = matchonPageTitleClass;

export const organizerDashboardDescClass = matchonPageDescClass;

export const organizerDashboardSectionClass = matchonSectionStackClass;

export {
  matchonPageEyebrowClass as organizerPageEyebrowClass,
  matchonFilterBarClass as organizerFilterBarClass,
  matchonStatsGridClass as organizerStatsGridClass,
  matchonStatCardClass as organizerStatCardClass,
  matchonStatValueClass as organizerStatValueClass,
  matchonStatLabelClass as organizerStatLabelClass,
};
