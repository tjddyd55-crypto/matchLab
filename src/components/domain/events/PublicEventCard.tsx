import Link from "next/link";
import type { PublicEventListItemDTO } from "@/lib/dto/public";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import { EventStatusBadges } from "@/components/domain/events/EventStatusBadges";
import { EventMetaList } from "@/components/domain/events/EventMetaList";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PublicEventCard({
  event,
  className,
  priorityImage,
}: {
  event: PublicEventListItemDTO;
  className?: string;
  priorityImage?: boolean;
}) {
  const href = `/events/${event.publicSlug}`;

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <Link href={href} className="relative block">
        <EventPosterImage
          src={event.coverImageUrl}
          alt={`${event.title} 포스터`}
          className="aspect-[4/5] w-full"
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
          priority={priorityImage}
        />
        <div className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          <EventStatusBadges
            eventStatus={event.status}
            registrationStatus={event.registrationStatus}
            emphasizeRegistration={event.registrationStatus === "open"}
          />
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Link href={href} className="min-w-0 space-y-1 hover:underline">
          <h3 className="font-heading line-clamp-2 text-base font-semibold leading-snug">
            {event.title}
          </h3>
        </Link>

        <EventMetaList
          eventDate={event.eventDate}
          location={event.location}
          registrationStartDate={event.registrationStartDate}
          registrationEndDate={event.registrationEndDate}
          organizerName={event.organizerName}
          primarySport={event.primarySport}
          divisionSummary={event.divisionSummary}
          compact
        />

        {event.liveStreamingEnabled ? (
          <p className="text-primary text-xs font-medium">라이브 스트리밍 예정</p>
        ) : null}

        <div className="mt-auto pt-1">
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full sm:w-auto")}
          >
            {event.registrationStatus === "open" ? "신청하기" : "자세히 보기"}
          </Link>
        </div>
      </div>
    </article>
  );
}
