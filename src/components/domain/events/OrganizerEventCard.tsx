import Link from "next/link";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { RegistrationStatusPill } from "@/components/domain/events/RegistrationStatusPill";
import { buttonVariants } from "@/components/ui/button";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";
import { cn } from "@/lib/utils";

function formatRange(start: string, end: string): string {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  return `${a.toLocaleDateString("ko-KR")} ~ ${b.toLocaleDateString("ko-KR")}`;
}

export function OrganizerEventCard({
  row,
  showOrganizer,
}: {
  row: OrganizerEventListItemVM;
  showOrganizer?: boolean;
}) {
  return (
    <article className="ring-foreground/10 flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-lg font-semibold leading-tight">{row.title}</h2>
          {showOrganizer && row.organizerName ? (
            <p className="text-muted-foreground text-xs">주최: {row.organizerName}</p>
          ) : null}
          <p className="text-muted-foreground text-sm">
            {row.location ?? "—"} ·{" "}
            {new Date(row.eventDate).toLocaleString("ko-KR", {
              dateStyle: "medium",
            })}
          </p>
          <p className="text-muted-foreground text-xs">
            신청: {formatRange(row.registrationStartDate, row.registrationEndDate)}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <EventStatusPill status={row.status} />
          <RegistrationStatusPill
            status={row.status}
            registrationStartDate={row.registrationStartDate}
            registrationEndDate={row.registrationEndDate}
          />
        </div>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>신청 {row.applicationCount}건</span>
        <Link
          href={`/organizer/events/${row.id}`}
          className={cn(buttonVariants({ size: "sm" }))}
        >
          상세 관리
        </Link>
      </div>
    </article>
  );
}
