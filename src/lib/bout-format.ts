import { BracketType } from "@/lib/enums";
import { resolveMatchIsPublicSparring } from "@/lib/match-bout-settings";

export type BoutFormatKind = "tournament" | "one_match" | "public_sparring";

export function resolveBoutFormatKind(input: {
  bracketType: BracketType | string;
  bracketIsPublic?: boolean | null;
  matchIsPublicSparring?: boolean | null;
  resultMemo?: string | null;
}): BoutFormatKind {
  if (input.bracketType === BracketType.single_elimination) {
    return "tournament";
  }
  const isPublic =
    input.matchIsPublicSparring ??
    resolveMatchIsPublicSparring({
      bracketType: input.bracketType,
      bracketIsPublic: input.bracketIsPublic,
      resultMemo: input.resultMemo,
    });
  if (isPublic) return "public_sparring";
  return "one_match";
}

export function boutFormatLabel(kind: BoutFormatKind): string {
  switch (kind) {
    case "tournament":
      return "토너먼트";
    case "one_match":
      return "원매치";
    case "public_sparring":
      return "공개스파링";
  }
}

/** @deprecated BoutFormatBadge + getBoutFormatBadgeVariant 사용 */
export function boutFormatBadgeClass(): string {
  return "";
}
