import type { BracketStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

const LABELS: Record<BracketStatus, string> = {
  draft: "초안",
  published: "공개됨",
  ongoing: "진행중",
  finished: "종료",
};

const STYLE: Record<BracketStatus, string> = {
  draft: "bg-amber-500/15 text-amber-900 dark:text-amber-100",
  published: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100",
  ongoing: "bg-sky-500/15 text-sky-900 dark:text-sky-100",
  finished: "bg-muted text-muted-foreground",
};

export function BracketStatusBadge({
  status,
  className,
}: {
  status: BracketStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        STYLE[status],
        className,
      )}
    >
      {LABELS[status]}
    </span>
  );
}
