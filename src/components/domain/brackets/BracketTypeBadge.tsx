import type { BracketType } from "@/lib/enums";
import { resolveBoutFormatKind, boutFormatLabel } from "@/lib/bout-format";
import { cn } from "@/lib/utils";

export function BracketTypeBadge({
  type,
  isPublic,
  className,
}: {
  type: BracketType;
  isPublic?: boolean;
  className?: string;
}) {
  const label = boutFormatLabel(resolveBoutFormatKind({ bracketType: type, bracketIsPublic: isPublic }));
  return (
    <span
      className={cn(
        "inline-flex rounded-md border border-primary/25 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary",
        className,
      )}
    >
      {label}
    </span>
  );
}
