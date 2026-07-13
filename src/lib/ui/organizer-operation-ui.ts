import {
  matchonCompactTableWrapClass,
  matchonFieldInputClass,
  matchonFieldSelectClass,
  matchonFilterBarClass,
  matchonFilterPillActiveClass,
  matchonFilterPillBaseClass,
  matchonFilterPillInactiveClass,
  matchonStatCardClass,
  matchonStatLabelClass,
  matchonStatValueClass,
  matchonStatsGridClass,
  matchonVsCardClass,
} from "@/lib/ui/matchon-shell-ui";

export const organizerOperationFilterBarClass = matchonFilterBarClass;
export const organizerOperationFieldInputClass = matchonFieldInputClass;
export const organizerOperationFieldSelectClass = matchonFieldSelectClass;
export const organizerOperationCourtPillBaseClass = matchonFilterPillBaseClass;
export const organizerOperationCourtPillActiveClass = matchonFilterPillActiveClass;
export const organizerOperationCourtPillInactiveClass = matchonFilterPillInactiveClass;
export const organizerOperationStatsGridClass = matchonStatsGridClass;
export const organizerOperationStatCardClass = matchonStatCardClass;
export const organizerOperationStatValueClass = matchonStatValueClass;
export const organizerOperationStatLabelClass = matchonStatLabelClass;
export const organizerOperationTableWrapClass = matchonCompactTableWrapClass;
export const organizerOperationSpotlightPanelClass =
  "rounded-xl border border-matchon-border bg-white p-4 shadow-sm lg:sticky lg:top-6";
export const organizerOperationVsCardClass = matchonVsCardClass;

export const organizerOperationWorkspaceClass =
  "grid gap-5 lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:items-stretch xl:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]";

export const organizerOperationListPaneClass =
  "flex min-h-0 min-w-0 flex-col gap-4 lg:max-h-[calc(100vh-14rem)] lg:overflow-hidden";

export const organizerOperationListScrollClass =
  "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5";

export const organizerOperationDetailPaneClass =
  "min-w-0 lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto";

export const organizerOperationCompactSummaryClass =
  "flex flex-wrap items-center gap-2 overflow-x-auto rounded-xl border border-matchon-border bg-matchon-surface/60 px-3 py-2 text-xs";

export const organizerOperationSummaryPillBaseClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-matchon-border bg-white px-3 py-1 transition-colors";

export const organizerOperationSummaryPillActiveClass =
  "border-matchon-primary bg-matchon-primary-light text-matchon-primary";

export const organizerOperationMatchListItemClass =
  "flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-lg border border-matchon-border bg-white px-3 py-2.5 text-left transition-colors hover:border-matchon-primary/30 hover:bg-matchon-primary-light/20";

export const organizerOperationMatchListItemActiveClass =
  "border-l-[3px] border-l-[#0A47FF] bg-[#EAF1FF] hover:bg-[#EAF1FF]";
