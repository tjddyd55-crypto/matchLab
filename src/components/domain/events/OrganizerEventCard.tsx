import Link from "next/link";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { RegistrationStatusPill } from "@/components/domain/events/RegistrationStatusPill";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/15 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="line-clamp-2 text-base leading-snug">
              {row.title}
            </CardTitle>
            {showOrganizer && row.organizerName ? (
              <CardDescription>주최: {row.organizerName}</CardDescription>
            ) : null}
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
      </CardHeader>

      <CardContent className="space-y-3 pt-4">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">대회일</dt>
            <dd className="text-right font-medium">
              {new Date(row.eventDate).toLocaleString("ko-KR", {
                dateStyle: "medium",
              })}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">장소</dt>
            <dd className="text-right">{row.location ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">신청 기간</dt>
            <dd className="text-right text-xs leading-snug">
              {formatRange(row.registrationStartDate, row.registrationEndDate)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">신청</dt>
            <dd className="font-medium tabular-nums">{row.applicationCount}건</dd>
          </div>
        </dl>
      </CardContent>

      <CardFooter className="border-t bg-muted/10 pt-4">
        <Link
          href={`/organizer/events/${row.id}`}
          className={cn(
            buttonVariants({ size: "field" }),
            "w-full sm:w-auto",
          )}
        >
          상세 관리
        </Link>
      </CardFooter>
    </Card>
  );
}
