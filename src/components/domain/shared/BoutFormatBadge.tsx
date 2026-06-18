import { resolveBoutFormatKind, boutFormatLabel, boutFormatBadgeClass } from "@/lib/bout-format";
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
        "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
        boutFormatBadgeClass(kind),
        prominent && kind === "public_sparring" && "text-sm px-3 py-1",
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
    <span className="bg-primary text-primary-foreground mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide">
      공개스파링
    </span>
  );
}
