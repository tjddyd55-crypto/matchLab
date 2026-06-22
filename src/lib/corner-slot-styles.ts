import {
  cornerLabelToUiKey,
  cornerUiTokens,
  type CornerLabel,
} from "@/lib/ui/corner-ui-tokens";

export type { CornerLabel } from "@/lib/ui/corner-ui-tokens";

/** 홍코너/청코너 슬롯 공통 시각 규칙 — corner-ui-tokens SSOT */
export const CORNER_SLOT_STYLES: Record<
  CornerLabel,
  { label: CornerLabel; bg: string; accent: string }
> = {
  홍코너: {
    label: "홍코너",
    bg: cornerUiTokens.redCorner.slotBg,
    accent: cornerUiTokens.redCorner.labelClassName,
  },
  청코너: {
    label: "청코너",
    bg: cornerUiTokens.blueCorner.slotBg,
    accent: cornerUiTokens.blueCorner.labelClassName,
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

export { cornerLabelToUiKey, cornerUiTokens };
