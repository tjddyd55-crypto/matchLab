import { resolveBoutFormatKind, boutFormatLabel, boutFormatBadgeClass } from "@/lib/bout-format";
import { bracketCardTypography } from "@/lib/bracket-card-typography";
import type { BracketType } from "@/lib/enums";
import { cn } from "@/lib/utils";

export function BoutFormatBadge({
  bracketType,
  bracketIsPublic,
  matchIsPublicSparring,
  resultMemo,
  className,
  prominent = false,
}: {
  bracketType: BracketType | string;
  bracketIsPublic?: boolean | null;
  matchIsPublicSparring?: boolean | null;
  resultMemo?: string | null;
  className?: string;
  prominent?: boolean;
}) {
  const kind = resolveBoutFormatKind({
    bracketType,
    bracketIsPublic,
    matchIsPublicSparring,
    resultMemo,
  });
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 font-medium",
        bracketCardTypography.formatBadge,
        boutFormatBadgeClass(kind),
        prominent && kind === "public_sparring" && "px-3 py-1",
        className,
      )}
    >
      {boutFormatLabel(kind)}
    </span>
  );
}

export function PublicSparringUnderVsBadge({
  bracketType,
  bracketIsPublic,
  matchIsPublicSparring,
  resultMemo,
}: {
  bracketType: BracketType | string;
  bracketIsPublic?: boolean | null;
  matchIsPublicSparring?: boolean | null;
  resultMemo?: string | null;
}) {
  const kind = resolveBoutFormatKind({
    bracketType,
    bracketIsPublic,
    matchIsPublicSparring,
    resultMemo,
  });
  if (kind !== "public_sparring") return null;
  return (
    <span
      className={cn(
        "bg-primary text-primary-foreground mt-1 inline-flex rounded-full px-3 py-1 font-bold tracking-wide",
        bracketCardTypography.formatBadge,
      )}
    >
      공개스파링
    </span>
  );
}
