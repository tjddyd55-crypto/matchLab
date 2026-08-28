import Link from "next/link";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { RegistrationStatusPill } from "@/components/domain/events/RegistrationStatusPill";
import { buttonVariants } from "@/components/ui/button";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";
import { EventStatus } from "@/lib/enums";
import { formatOrganizerEventListDate } from "@/lib/ui/event-list-ui";
import { cn } from "@/lib/utils";

export function OrganizerEventCompactCard({
  row,
  showOrganizer,
}: {
  row: OrganizerEventListItemVM;
  showOrganizer?: boolean;
}) {
  return (
    <article className="rounded-xl border border-matchon-border bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/organizer/events/${row.id}`}
          className="min-w-0 flex-1"
        >
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-matchon-text-primary">
            {row.title}
          </h3>
          {showOrganizer && row.organizerName ? (
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              주최: {row.organizerName}
            </p>
          ) : null}
        </Link>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <EventStatusPill status={row.status} />
          <RegistrationStatusPill
            status={row.status}
            registrationStartDate={row.registrationStartDate}
            registrationEndDate={row.registrationEndDate}
          />
        </div>
      </div>

      <dl className="text-muted-foreground mt-2 space-y-1 text-xs">
        <div className="flex flex-wrap gap-x-2 gap-y-0.5">
          <dt className="sr-only">대회일</dt>
          <dd>{formatOrganizerEventListDate(row.eventDate)}</dd>
          <span aria-hidden>·</span>
          <dt className="sr-only">장소</dt>
          <dd className="min-w-0 flex-1 truncate" title={row.location ?? undefined}>
            {row.location ?? "장소 미정"}
          </dd>
        </div>
        <div>
          <dt className="sr-only">신청</dt>
          <dd>
            신청{" "}
            <span className="font-semibold tabular-nums text-matchon-text-primary">
              {row.applicationCount}
            </span>
            건
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-matchon-border pt-3">
        <Link
          href={`/organizer/events/${row.id}`}
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "h-8 text-xs sm:w-auto",
          )}
        >
          상세 관리
        </Link>
        {row.status === EventStatus.finished && row.hasActiveArchive ? (
          <Link
            href={`/organizer/events/${row.id}/archive`}
            className={cn(
              buttonVariants({ size: "sm", variant: "ghost" }),
              "h-8 text-xs",
            )}
          >
            기록 보기
          </Link>
        ) : null}
      </div>
    </article>
  );
}
