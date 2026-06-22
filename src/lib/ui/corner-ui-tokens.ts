/** 홍코너/청코너 슬롯·카드 색상 SSOT */

export type CornerUiKey = "redCorner" | "blueCorner" | "neutralCorner";

export type CornerUiToken = {
  label: string;
  slotBg: string;
  cardBg: string;
  cardBorder: string;
  labelClassName: string;
};

export const cornerUiTokens: Record<CornerUiKey, CornerUiToken> = {
  redCorner: {
    label: "홍코너",
    slotBg: "bg-red-500/5",
    cardBg: "bg-red-50/70 dark:bg-red-950/25",
    cardBorder: "border-red-100 dark:border-red-900/50",
    labelClassName: "text-red-700 dark:text-red-300",
  },
  blueCorner: {
    label: "청코너",
    slotBg: "bg-blue-500/5",
    cardBg: "bg-blue-50/70 dark:bg-blue-950/25",
    cardBorder: "border-blue-100 dark:border-blue-900/50",
    labelClassName: "text-blue-700 dark:text-blue-300",
  },
  neutralCorner: {
    label: "—",
    slotBg: "bg-card",
    cardBg: "bg-card",
    cardBorder: "border-border",
    labelClassName: "text-muted-foreground",
  },
};

export type CornerLabel = "홍코너" | "청코너";

export function cornerLabelToUiKey(label: CornerLabel): CornerUiKey {
  return label === "홍코너" ? "redCorner" : "blueCorner";
}

export function getCornerSlotBg(label: CornerLabel): string {
  return cornerUiTokens[cornerLabelToUiKey(label)].slotBg;
}

export function getCornerLabelClassName(label: CornerLabel): string {
  return cornerUiTokens[cornerLabelToUiKey(label)].labelClassName;
}

export function getCornerCardClassName(label: CornerLabel): string {
  const t = cornerUiTokens[cornerLabelToUiKey(label)];
  return `${t.cardBg} ${t.cardBorder}`;
}
