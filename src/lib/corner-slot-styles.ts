/** 홍코너/청코너 슬롯 공통 시각 규칙 — 관리·공개 대진표 동일 적용 */

export type CornerLabel = "홍코너" | "청코너";

export const CORNER_SLOT_STYLES: Record<
  CornerLabel,
  { label: CornerLabel; bg: string; accent: string }
> = {
  홍코너: {
    label: "홍코너",
    bg: "bg-red-500/5",
    accent: "text-red-700 dark:text-red-300",
  },
  청코너: {
    label: "청코너",
    bg: "bg-blue-500/5",
    accent: "text-blue-700 dark:text-blue-300",
  },
};

/** 그리드 내부 슬롯 — 내부 세로 구분선 없이 배경색만으로 대칭 구분 */
export function cornerSlotInGridClass(
  corner: CornerLabel,
  className?: string,
): string {
  return [CORNER_SLOT_STYLES[corner].bg, "rounded-none border-0", className]
    .filter(Boolean)
    .join(" ");
}
