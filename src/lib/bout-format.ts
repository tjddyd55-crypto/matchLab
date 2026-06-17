import { BracketType } from "@/lib/enums";

export type BoutFormatKind = "tournament" | "one_match" | "public_sparring";

export function resolveBoutFormatKind(input: {
  bracketType: BracketType | string;
  bracketIsPublic?: boolean | null;
}): BoutFormatKind {
  if (input.bracketType === BracketType.single_elimination) {
    return "tournament";
  }
  if (input.bracketIsPublic) return "public_sparring";
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

export function boutFormatBadgeClass(kind: BoutFormatKind): string {
  switch (kind) {
    case "tournament":
      return "border-border bg-muted/50 text-foreground";
    case "one_match":
      return "border-primary/30 bg-primary/5 text-primary";
    case "public_sparring":
      return "border-primary bg-primary/10 text-primary font-semibold";
  }
}
