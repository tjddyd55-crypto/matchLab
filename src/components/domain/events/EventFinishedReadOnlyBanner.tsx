import { MatchonStatusBadge } from "@/components/shared/MatchonStatusBadge";
import { cn } from "@/lib/utils";

export function EventFinishedReadOnlyBanner({
  className,
  message = "이 대회는 종료되어 조회만 가능합니다.",
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-950",
        className,
      )}
      role="status"
    >
      <MatchonStatusBadge status="completed" label="대회 종료" size="sm" />
      <span className="min-w-0 flex-1 leading-relaxed">{message}</span>
    </div>
  );
}
