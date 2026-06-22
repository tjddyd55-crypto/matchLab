import { cornerUiTokens } from "@/lib/ui/corner-ui-tokens";

/** 카드 shell variant SSOT */
export const cardUiTokens = {
  default: "rounded-xl border bg-card shadow-sm",
  interactive:
    "rounded-xl border bg-card shadow-sm transition-colors hover:bg-muted/20",
  selected: "rounded-xl border-2 border-primary bg-primary/5 shadow-sm",
  warning:
    "rounded-xl border border-amber-300 bg-amber-50/80 shadow-sm dark:border-amber-800 dark:bg-amber-950/30",
  danger:
    "rounded-xl border border-rose-300 bg-rose-50/80 shadow-sm dark:border-rose-800 dark:bg-rose-950/30",
  success:
    "rounded-xl border border-emerald-300 bg-emerald-50/80 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30",
  muted: "rounded-xl border bg-muted/30 shadow-sm",
  redCorner: `rounded-xl border ${cornerUiTokens.redCorner.cardBg} ${cornerUiTokens.redCorner.cardBorder}`,
  blueCorner: `rounded-xl border ${cornerUiTokens.blueCorner.cardBg} ${cornerUiTokens.blueCorner.cardBorder}`,
  spectator: "overflow-hidden rounded-2xl border bg-card shadow-sm",
} as const;

export type CardUiVariant = keyof typeof cardUiTokens;

export function getCardClassName(variant: CardUiVariant = "default"): string {
  return cardUiTokens[variant];
}
