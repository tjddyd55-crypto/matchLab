import Link from "next/link";
import type { ReactNode } from "react";
import { EventPosterImage } from "@/components/domain/events/EventPosterImage";
import {
  eventAnnouncementCardLivePillClass,
  eventAnnouncementCardPosterOverlayClass,
  eventAnnouncementCardSportPillClass,
} from "@/components/domain/events/announcement/event-announcement-card-ui";
import type { EventStatus } from "@/lib/enums";

export function EventAnnouncementCardPoster({
  coverImageUrl,
  title,
  primarySport,
  status,
  href,
  sizes,
  priority,
}: {
  coverImageUrl: string | null;
  title: string;
  primarySport: string | null;
  status: EventStatus;
  /** 포스터 클릭 대상. 없으면 링크 없이 포스터만 표시 */
  href?: string;
  sizes: string;
  priority?: boolean;
}) {
  const overlay: ReactNode = (
    <>
      <div className={eventAnnouncementCardPosterOverlayClass} aria-hidden />
      {primarySport ? (
        <span className={eventAnnouncementCardSportPillClass}>{primarySport}</span>
      ) : null}
      {status === "ongoing" ? (
        <span className={eventAnnouncementCardLivePillClass}>
          <span
            className="size-1.5 animate-pulse rounded-full bg-white"
            aria-hidden
          />
          LIVE
        </span>
      ) : null}
    </>
  );

  const poster = (
    <EventPosterImage
      variant="card"
      src={coverImageUrl}
      alt={`${title} 포스터`}
      boxClassName="rounded-none"
      imageClassName="object-cover"
      sizes={sizes}
      priority={priority}
      overlay={overlay}
    />
  );

  if (!href) {
    return <div className="relative block">{poster}</div>;
  }

  return (
    <Link href={href} className="relative block">
      {poster}
    </Link>
  );
}
