import type { EventStatus } from "@/lib/enums";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const EVENT_STATUS_LABELS = {
  draft: "작성 중",
  open: "모집 중",
  closed: "신청 마감",
  bracket_ready: "대진 준비",
  ongoing: "진행 중",
  finished: "종료",
  cancelled: "취소",
} satisfies Record<EventStatus, string>;

const VARIANT: Partial<
  Record<EventStatus, "default" | "secondary" | "outline" | "destructive">
> = {
  open: "outline",
  closed: "secondary",
  bracket_ready: "default",
  ongoing: "default",
  finished: "secondary",
};

export function EventStatusPill({
  status,
  className,
}: {
  status: EventStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      variant={VARIANT[status] ?? "secondary"}
      label={EVENT_STATUS_LABELS[status]}
      className={cn("shrink-0", className)}
    />
  );
}
