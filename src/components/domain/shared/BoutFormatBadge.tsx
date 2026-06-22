import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import { Badge } from "@/components/ui/badge";
import { bracketCardTextTokens } from "@/lib/ui/bracket-card-tokens";
import {
  getBoutFormatBadgeVariant,
  getPublicSparringVsBadgeVariant,
} from "@/lib/ui/bout-format-ui";
import { statusBadgeSizeClasses } from "@/lib/ui/status-badge-ui";
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
    <Badge
      variant={getBoutFormatBadgeVariant(kind)}
      className={cn(
        statusBadgeSizeClasses.sm,
        bracketCardTextTokens.formatBadge,
        prominent && kind === "public_sparring" && "px-3 py-1",
        className,
      )}
    >
      {boutFormatLabel(kind)}
    </Badge>
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
    <Badge
      variant={getPublicSparringVsBadgeVariant()}
      className={cn(
        "mt-1 font-bold tracking-wide",
        statusBadgeSizeClasses.sm,
        bracketCardTextTokens.formatBadge,
      )}
    >
      공개스파링
    </Badge>
  );
}
