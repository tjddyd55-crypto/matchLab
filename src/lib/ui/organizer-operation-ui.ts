import type { BracketMatchStatus } from "@/lib/enums";
import { getMatchStatusButtonVisual } from "@/lib/ui/match-status-ui";
import { cn } from "@/lib/utils";
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
  "grid gap-4 lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] lg:items-start xl:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]";

export const organizerOperationListPaneClass =
  "flex min-h-0 min-w-0 flex-col gap-2 lg:max-h-[calc(100vh-12rem)] lg:overflow-hidden";

export const organizerOperationListHeaderClass =
  "flex min-h-[52px] shrink-0 items-center justify-between gap-3 rounded-xl border border-matchon-border bg-white px-3 py-2.5";

export const organizerOperationListScrollClass =
  "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5";

export const organizerOperationDetailPaneClass =
  "min-w-0 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto";

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

export const organizerOperationStatusButtonBaseClass =
  "min-w-[4.5rem] border font-medium transition-colors";

export const organizerOperationStatusButtonActiveClass =
  "border-[#0A47FF] bg-[#0A47FF] text-white font-semibold hover:bg-[#0A47FF] hover:text-white";

export const organizerOperationStatusButtonInactiveClass =
  "border-[#CBD5E1] bg-white text-[#475569] hover:border-matchon-primary/30 hover:bg-matchon-primary-light/30 hover:text-matchon-text-primary";

export const organizerOperationStatusButtonActiveFinishedClass =
  "border-emerald-600 bg-emerald-600 text-white font-semibold hover:bg-emerald-600 hover:text-white";

export const organizerOperationStatusButtonActiveCancelledClass =
  "border-destructive bg-destructive text-white font-semibold hover:bg-destructive hover:text-white";

export const organizerOperationStatusButtonPendingClass = "opacity-70";

export function organizerMatchStatusButtonClassName(
  currentStatus: BracketMatchStatus,
  optionValue: BracketMatchStatus,
  options?: { pendingTarget?: boolean },
): string {
  const visual = getMatchStatusButtonVisual(currentStatus, optionValue);
  const visualClass =
    visual === "active"
      ? organizerOperationStatusButtonActiveClass
      : visual === "active-finished"
        ? organizerOperationStatusButtonActiveFinishedClass
        : visual === "active-cancelled"
          ? organizerOperationStatusButtonActiveCancelledClass
          : organizerOperationStatusButtonInactiveClass;

  return cn(
    organizerOperationStatusButtonBaseClass,
    visualClass,
    options?.pendingTarget && organizerOperationStatusButtonPendingClass,
  );
}
