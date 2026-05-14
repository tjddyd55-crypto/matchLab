import type { BracketType } from "@/lib/enums";
import { cn } from "@/lib/utils";

const LABELS: Record<BracketType, string> = {
  single_elimination: "토너먼트",
  match_list: "경기 목록",
};

export function BracketTypeBadge({
  type,
  className,
}: {
  type: BracketType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {LABELS[type]}
    </span>
  );
}
