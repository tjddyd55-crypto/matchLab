import Link from "next/link";
import { OrganizerEventCard } from "@/components/domain/events/OrganizerEventCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

export function OrganizerEventList({
  rows,
  showOrganizerColumn,
}: {
  rows: OrganizerEventListItemVM[];
  showOrganizerColumn?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="등록된 대회가 없습니다"
        description="새 대회를 만들면 목록에 표시됩니다. 생성 직후 상태는 작성 중(draft)이며 공개 목록에는 나타나지 않습니다."
        action={
          <Link href="/organizer/events/new" className={cn(buttonVariants())}>
            대회 만들기
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rows.map((row) => (
        <OrganizerEventCard
          key={row.id}
          row={row}
          showOrganizer={showOrganizerColumn}
        />
      ))}
    </div>
  );
}
