import Link from "next/link";
import { EventStatus } from "@/lib/enums";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventArchiveAccessBanner({
  eventId,
  status,
  hasActiveArchive,
}: {
  eventId: string;
  status: EventStatus;
  hasActiveArchive: boolean;
}) {
  if (status !== EventStatus.finished) return null;

  if (hasActiveArchive) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <p className="text-sm font-medium">대회가 종료되었습니다</p>
        <p className="text-muted-foreground mt-1 text-xs">
          종료 시점의 신청자·대진표·경기 결과가 기록으로 보관되었습니다.
        </p>
        <Link
          href={`/organizer/events/${eventId}/archive`}
          className={cn(
            buttonVariants({ size: "sm", variant: "default" }),
            "mt-3",
          )}
        >
          대회 기록 보기
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="text-sm font-medium">종료된 대회</p>
      <p className="text-muted-foreground mt-1 text-xs">
        이 대회는 기록 보관 기능 도입 이전에 종료되었습니다. 과거 기록은
        저장되어 있지 않으며, 현재 운영 데이터를 기록으로 대체하지 않습니다.
      </p>
    </div>
  );
}
