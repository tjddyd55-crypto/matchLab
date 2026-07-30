import Link from "next/link";
import { GymMemberAvatar } from "@/components/domain/gym-members/GymMemberAvatar";
import { buttonVariants } from "@/components/ui/button";
import { matchonSectionTitleClass } from "@/lib/ui/matchon-layout";
import type { GymScheduleVM } from "@/lib/services/gym-schedule.service";
import { cn } from "@/lib/utils";

export function GymMemberUpcomingSchedulesSection({
  items,
  memberId,
  canCreate,
}: {
  items: GymScheduleVM[];
  memberId: string;
  canCreate: boolean;
}) {
  return (
    <section className="rounded-xl border border-matchon-border bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={matchonSectionTitleClass}>예정된 일정</h2>
        <div className="flex flex-wrap gap-2">
          {canCreate ? (
            <Link
              href={`/gym/schedules?view=day&memberId=${memberId}`}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              일정 등록
            </Link>
          ) : null}
          <Link
            href="/gym/schedules"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            전체 일정 보기
          </Link>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-matchon-text-secondary">
          향후 30일 내 예정된 일정이 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-matchon-border px-3 py-2 text-sm"
            >
              <GymMemberAvatar
                name={item.memberName}
                src={item.memberProfileImageUrl}
                className="size-9"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {item.dateKey} · {item.timeRangeLabel}
                </p>
                <p className="truncate text-matchon-text-secondary">
                  {item.staffName} · {item.scheduleTypeLabel} ·{" "}
                  {item.statusLabel}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
