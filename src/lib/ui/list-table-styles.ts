import { cn } from "@/lib/utils";

/** 공통 리스트 테이블 thead row */
export const listTableHeaderRowClass = "bg-muted/50 border-b align-middle";

/** 헤더 셀 — 좌측 (체육관, 선수명, 경기구분/체급) */
export const listTableHeaderCellStartClass =
  "h-9 min-h-9 px-2 py-2 text-left align-middle text-xs font-semibold text-muted-foreground whitespace-nowrap";

/** 헤더 셀 — 중앙 (상태, 액션, 숫자 등) */
export const listTableHeaderCellCenterClass =
  "h-9 min-h-9 px-2 py-2 text-center align-middle text-xs font-semibold text-muted-foreground whitespace-nowrap";

/** 경기운영 — 결과 입력 패널이 열린 row summary tr */
export function operationExpandedSummaryRowClass(isExpanded: boolean): string {
  return cn(
    "align-middle transition-colors",
    isExpanded
      ? "border-x-2 border-t-2 border-primary/60 bg-primary/5 rounded-t-xl"
      : "border-b",
  );
}

/** 경기운영 — 결과 입력 패널 detail tr */
export const operationExpandedDetailRowClass =
  "border-x-2 border-b-2 border-t border-primary/30 border-t-primary/20 bg-primary/5 rounded-b-xl align-middle";

/** 경기운영 — 모바일 카드 선택 강조 */
export function operationExpandedMobileCardClass(isExpanded: boolean): string {
  return cn(
    "ring-foreground/10 space-y-3 rounded-xl border bg-card p-4 shadow-sm transition-[border-color,background-color,box-shadow]",
    isExpanded &&
      "border-2 border-primary/60 bg-primary/5 shadow-md ring-2 ring-primary/20",
  );
}
