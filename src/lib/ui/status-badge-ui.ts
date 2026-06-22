import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";

/** 전체 상태 배지 variant SSOT (경기·계체·신청·대전방식 등) */
export type StatusBadgeVariant = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>;

/** @deprecated StatusBadgeVariant 사용 */
export type MatchStatusBadgeVariant = StatusBadgeVariant;

/** 상태 pill 배지 공통 크기 */
export const statusBadgeSizeClasses = {
  sm: "h-auto min-h-5 shrink-0 px-2 py-0.5 text-[11px] font-semibold",
  md: "h-auto min-h-6 shrink-0 px-3 py-1 text-xs font-semibold sm:text-sm",
  lg: "h-auto min-h-7 shrink-0 px-3.5 py-1.5 text-sm font-semibold sm:text-base",
} as const;

/** @deprecated statusBadgeSizeClasses 사용 */
export const matchStatusBadgeSizeClasses = statusBadgeSizeClasses;

/** @deprecated statusBadgeSizeClasses.md 사용 */
export const matchStatusBadgeTypography = statusBadgeSizeClasses.md;
