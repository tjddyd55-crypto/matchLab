import { cn } from "@/lib/utils";
import { formControlFieldCompactClass } from "@/lib/ui/form-control-ui";

/** Desktop 필터 버튼 row — 1366에서 wrap 최소화 */
export const COMPACT_FILTER_ROW_CLASS =
  "flex min-w-0 flex-wrap items-center gap-1.5 md:flex-nowrap md:gap-1.5 max-[1365px]:gap-2";

/** workspace stack: 검색 1행 + 필터 1행 */
export const COMPACT_FILTER_STACK_CLASS = "min-w-0 space-y-1.5";

/** 좌측 matched workspace 검색 (별도 1행) */
export const COMPACT_FILTER_SEARCH_STACKED_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-full min-w-0 shrink-0 rounded-md px-2.5 text-xs",
  "md:w-[240px] md:max-w-[280px] lg:w-[220px] lg:max-w-[280px] xl:w-[230px] xl:max-w-[280px]",
);

/** 우측 unmatched workspace 검색 (별도 1행) */
export const COMPACT_FILTER_SEARCH_STACKED_NARROW_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-full min-w-0 shrink-0 rounded-md px-2.5 text-xs",
  "md:w-[220px] md:max-w-[260px] lg:w-[200px] lg:max-w-[260px] xl:w-[210px] xl:max-w-[260px]",
);

/** 넓은 pane 검색 */
export const COMPACT_FILTER_SEARCH_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-full min-w-0 shrink-0 rounded-md px-2.5 text-xs",
  "md:w-[220px] md:max-w-[220px] xl:w-[240px] xl:max-w-[240px]",
);

/** 좁은 pane / unmatched */
export const COMPACT_FILTER_SEARCH_NARROW_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-full min-w-0 shrink-0 rounded-md px-2.5 text-xs",
  "md:w-[180px] md:max-w-[180px] xl:w-[200px] xl:max-w-[200px]",
);

export const COMPACT_FILTER_BUTTON_CLASS =
  "h-9 shrink-0 gap-1 rounded-md px-2.5 text-xs font-medium";

export const COMPACT_FILTER_SELECT_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-auto min-w-0 shrink-0 rounded-md px-2.5 text-xs",
);

/** 유전 최대 총전 — spinner 없는 compact 숫자칸 */
export const COMPACT_NUMBER_INPUT_CLASS = cn(
  formControlFieldCompactClass,
  "h-9 w-12 shrink-0 appearance-none px-1 text-center tabular-nums",
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
);

export const COMPACT_FILTER_RESET_CLASS =
  "h-9 shrink-0 px-2.5 text-xs";

export function sanitizePositiveIntInput(raw: string): string | null {
  if (raw === "") return "";
  const n = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return String(n);
}
