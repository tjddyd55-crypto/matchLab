import type { BoutFormatKind } from "@/lib/bout-format";

export type BoutFormatUiToken = {
  label: string;
  badgeClassName: string;
  vsBadgeClassName: string;
};

/** 대전방식 배지 색상 SSOT */
export const boutFormatUiTokens: Record<BoutFormatKind, BoutFormatUiToken> = {
  tournament: {
    label: "토너먼트",
    badgeClassName:
      "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-100",
    vsBadgeClassName: "",
  },
  one_match: {
    label: "원매치",
    badgeClassName:
      "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100",
    vsBadgeClassName: "",
  },
  public_sparring: {
    label: "공개스파링",
    badgeClassName:
      "border-primary bg-primary/10 font-semibold text-primary dark:bg-primary/20",
    vsBadgeClassName:
      "bg-primary text-primary-foreground mt-1 inline-flex rounded-full px-3 py-1 font-bold tracking-wide",
  },
};

export function getBoutFormatBadgeClassName(kind: BoutFormatKind): string {
  return boutFormatUiTokens[kind].badgeClassName;
}

export function getPublicSparringVsBadgeClassName(): string {
  return boutFormatUiTokens.public_sparring.vsBadgeClassName;
}
