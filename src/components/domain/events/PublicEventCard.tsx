import Link from "next/link";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import {
  formatPublicDate,
  formatPublicPeriod,
} from "@/lib/date-display";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventCard({
  event,
  className,
}: {
  event: PublicEventListItemDTO;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      className={cn("transition-shadow hover:shadow-md", className)}
    >
      <CardHeader className="flex-row items-start justify-between gap-2 border-b pb-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="line-clamp-2 leading-snug">{event.title}</CardTitle>
          <p className="text-muted-foreground text-xs">{event.organizerName}</p>
        </div>
        <EventStatusPill status={event.status} />
      </CardHeader>
      <CardContent className="space-y-2 pt-1">
        <p className="text-muted-foreground text-xs">
          대회일 · {formatPublicDate(event.eventDate)}
        </p>
        <p className="text-muted-foreground text-xs">
          신청 ·{" "}
          {formatPublicPeriod(
            event.registrationStartDate,
            event.registrationEndDate,
          )}
        </p>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          장소 · {event.location ?? "추후 안내"}
        </p>
        <p className="line-clamp-2 text-xs">{event.divisionSummary}</p>
        {event.liveStreamingEnabled ? (
          <p className="text-primary text-xs font-medium">라이브 스트리밍 예정</p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-end border-t pt-3">
        <Link
          href={`/events/${event.publicSlug}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          상세 보기
        </Link>
      </CardFooter>
    </Card>
  );
}
