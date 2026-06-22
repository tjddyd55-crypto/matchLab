import type { BoutFormatKind } from "@/lib/bout-format";
import type { StatusBadgeVariant } from "@/lib/ui/status-badge-ui";

export type BoutFormatUiToken = {
  label: string;
  badgeVariant: StatusBadgeVariant;
  vsBadgeVariant: StatusBadgeVariant;
};

/** 대전방식 pill 배지 SSOT */
export const boutFormatUiTokens: Record<BoutFormatKind, BoutFormatUiToken> = {
  tournament: {
    label: "토너먼트",
    badgeVariant: "boutTournament",
    vsBadgeVariant: "boutTournament",
  },
  one_match: {
    label: "원매치",
    badgeVariant: "boutOneMatch",
    vsBadgeVariant: "boutOneMatch",
  },
  public_sparring: {
    label: "공개스파링",
    badgeVariant: "boutPublicSparring",
    vsBadgeVariant: "boutPublicSparring",
  },
};

export function getBoutFormatBadgeVariant(kind: BoutFormatKind): StatusBadgeVariant {
  return boutFormatUiTokens[kind].badgeVariant;
}

export function getPublicSparringVsBadgeVariant(): StatusBadgeVariant {
  return boutFormatUiTokens.public_sparring.vsBadgeVariant;
}

/** @deprecated getBoutFormatBadgeVariant 사용 */
export function getBoutFormatBadgeClassName(): string {
  return "";
}

/** @deprecated Badge variant 사용 — getPublicSparringVsBadgeVariant */
export function getPublicSparringVsBadgeClassName(): string {
  return "mt-1 inline-flex font-bold tracking-wide";
}
