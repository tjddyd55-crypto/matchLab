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

/** 경기장 필터 — operation 전용 compact (전역 pill 높이 유지) */
export const organizerOperationCourtPillBaseClass = cn(
  matchonFilterPillBaseClass,
  "min-h-8 px-3 py-1 text-[13px] md:min-h-[32px]",
);
export const organizerOperationCourtPillActiveClass = matchonFilterPillActiveClass;
export const organizerOperationCourtPillInactiveClass =
  matchonFilterPillInactiveClass;

export const organizerOperationStatsGridClass = matchonStatsGridClass;
export const organizerOperationStatCardClass = matchonStatCardClass;
export const organizerOperationStatValueClass = matchonStatValueClass;
export const organizerOperationStatLabelClass = matchonStatLabelClass;
export const organizerOperationTableWrapClass = matchonCompactTableWrapClass;

/**
 * 우측 detail outer panel SSOT — 현장 계체 rhythm 기준.
 * 경기 운영 spotlight도 동일 family (padding/border); major section gap은 spotlight에서 gap-0 + divider로 관리.
 */
export const organizerOperationDetailPanelClass =
  "flex flex-col gap-3.5 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm md:gap-4 md:p-4";

export const organizerOperationSpotlightPanelClass = cn(
  organizerOperationDetailPanelClass,
  "gap-0 lg:sticky lg:top-4",
);

/** RIGHT detail section divider — border #E2E8F0, 위아래 16px rhythm (mt-4 + pt-4 한 세트) */
export const organizerOperationDetailDividerClass =
  "border-t border-[#E2E8F0]";

export const organizerOperationDetailMajorSectionClass = cn(
  organizerOperationDetailDividerClass,
  "mt-3 pt-3",
);

/** inner content — horizontal padding owner는 outer panel only */
export const organizerOperationDetailInnerClass =
  "flex w-full min-w-0 flex-col px-0";

/** section title → first control */
export const organizerOperationDetailSectionContentClass = cn(
  organizerOperationDetailInnerClass,
  "mt-3",
);

/** label → control (6px) */
export const organizerOperationDetailFieldLabelClass =
  "text-[12px] font-medium text-[#64748B]";

export const organizerOperationDetailLabelControlClass = "flex flex-col gap-1.5";

/** field → field (12px) */
export const organizerOperationDetailFieldStackClass = "flex flex-col gap-3";

/** 결과/상태 action row — button gap 8px, height 36px */
export const organizerOperationDetailActionRowClass =
  "mt-3 flex flex-wrap gap-2";

export const organizerOperationDetailActionButtonClass = "h-9";

/** 경기 상태 title → buttons (10px) */
export const organizerOperationDetailStatusStackClass = "flex flex-col gap-2.5";

/** 상태 buttons → bottom note (12px) */
export const organizerOperationDetailFootnoteClass =
  "mt-3 text-[12px] leading-snug text-[#64748B]";

export const organizerOperationVsCardClass = matchonVsCardClass;

/** PC split shell SSOT — 경기 운영 / 현장 계체 공통 */
export const organizerOperationWorkspaceClass =
  "grid gap-3 lg:grid-cols-[308px_minmax(0,1fr)] lg:items-start";

export const organizerOperationListPaneClass =
  "flex min-h-0 min-w-0 flex-col gap-2 lg:max-h-[calc(100vh-11rem)] lg:overflow-hidden";

export const organizerOperationListHeaderClass =
  "flex min-h-[44px] shrink-0 items-center justify-between gap-3 rounded-xl border border-matchon-border bg-white px-3 py-2";

export const organizerOperationListScrollClass =
  "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain [scrollbar-width:thin] pr-1.5";

export const organizerOperationDetailPaneClass =
  "min-w-0 lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto [scrollbar-width:thin]";

/** 좌측 list card compact density SSOT (경기 운영 기준) */
export const organizerOperationListCardDensityClass =
  "gap-0.5 rounded-[10px] px-2.5 py-2.5 min-h-[86px]";

export const organizerOperationSectionTitleClass =
  "text-[15px] font-bold leading-snug text-matchon-text-primary";

export const organizerOperationDetailHeaderMetaClass = "space-y-1";

export const organizerOperationDetailVsSectionClass = "pt-4";

export const organizerOperationSectionClass = "flex flex-col gap-2.5";

export const organizerOperationDetailHeaderClass =
  "flex flex-wrap items-start justify-between gap-3 border-b border-[#E2E8F0] pb-4";

export const organizerOperationStatusBadgeClass =
  "inline-flex h-6 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold";

/** KPI strip — height ~42–44px */
export const organizerOperationCompactSummaryClass =
  "flex min-h-[42px] flex-wrap items-center gap-1.5 overflow-x-auto rounded-xl border border-matchon-border bg-matchon-surface/60 px-2.5 py-1.5 text-xs";

export const organizerOperationSummaryPillBaseClass =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-matchon-border bg-white px-2.5 py-0.5 transition-colors";

export const organizerOperationSummaryPillActiveClass =
  "border-matchon-primary bg-matchon-primary-light text-matchon-primary";

export const organizerOperationMatchListItemClass =
  "flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-[10px] border border-matchon-border bg-white px-2.5 py-2.5 text-left transition-colors hover:border-matchon-primary/30 hover:bg-matchon-primary-light/20";

export const organizerOperationMatchListItemActiveClass =
  "border-matchon-primary border-2 bg-[#EAF1FF] hover:bg-[#EAF1FF]";

export const organizerOperationStatusButtonBaseClass =
  "min-h-9 min-w-[4.25rem] border px-3.5 font-medium transition-colors";

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
