import { cn } from "@/lib/utils";

export function OrganizerAssignmentStatusBadge({
  isAssigned,
  className,
}: {
  isAssigned: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
        isAssigned
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-50 text-amber-900",
        className,
      )}
    >
      {isAssigned ? "대진완료" : "미배정"}
    </span>
  );
}
