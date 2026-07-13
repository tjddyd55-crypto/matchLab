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

export const organizerDashboardContainerClass =
  "mx-auto w-full max-w-[min(100%,96rem)] px-4 py-6 sm:px-6 md:py-8 lg:px-8";

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
