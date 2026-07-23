import Link from "next/link";
import type { ReactNode } from "react";
import { EventAnnouncementCardBadges } from "@/components/domain/events/announcement/EventAnnouncementCardBadges";
import type { EventAnnouncementBadgeFields } from "@/components/domain/events/announcement/EventAnnouncementCardBadges";
import { EventAnnouncementCardPoster } from "@/components/domain/events/announcement/EventAnnouncementCardPoster";
import { eventAnnouncementCardClass } from "@/components/domain/events/announcement/event-announcement-card-ui";
import { PUBLIC_EVENT_CARD_BODY_PADDING_CLASS } from "@/components/domain/events/public/public-event-layout";
import type { EventStatus } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type EventAnnouncementCardContent = EventAnnouncementBadgeFields & {
  title: string;
  organizerName: string;
  coverImageUrl: string | null;
  primarySport: string | null;
  status: EventStatus;
};

/**
 * 공개·체육관 대회 공고 카드 SSOT.
 * 화면별 차이는 meta / actions / extraSummary 슬롯으로만 주입한다.
 */
export function EventAnnouncementCard({
  event,
  posterHref,
  titleHref,
  meta,
  actions,
  extraSummary,
  className,
  priorityImage,
  posterSizes,
  titleSize = "lg",
  showOrganizerUnderTitle = true,
  visibilityClassName,
}: {
  event: EventAnnouncementCardContent;
  posterHref?: string;
  titleHref?: string;
  meta: ReactNode;
  actions?: ReactNode;
  extraSummary?: ReactNode;
  className?: string;
  priorityImage?: boolean;
  posterSizes: string;
  titleSize?: "base" | "lg";
  showOrganizerUnderTitle?: boolean;
  /** 예: hidden md:flex / md:hidden */
  visibilityClassName?: string;
}) {
  const titleNode = (
    <>
      <h3
        className={cn(
          "line-clamp-2 font-black leading-snug text-matchon-text-primary",
          titleSize === "lg" ? "text-lg" : "text-base",
        )}
      >
        {event.title}
      </h3>
      {showOrganizerUnderTitle ? (
        <p className="mt-1 line-clamp-1 text-xs text-matchon-text-secondary">
          {event.organizerName}
        </p>
      ) : null}
    </>
  );

  return (
    <article
      className={cn(
        eventAnnouncementCardClass,
        visibilityClassName,
        className,
      )}
    >
      <EventAnnouncementCardPoster
        coverImageUrl={event.coverImageUrl}
        title={event.title}
        primarySport={event.primarySport}
        status={event.status}
        href={posterHref}
        sizes={posterSizes}
        priority={priorityImage}
      />

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-2.5 text-left",
          PUBLIC_EVENT_CARD_BODY_PADDING_CLASS,
          "pt-4",
        )}
      >
        <EventAnnouncementCardBadges event={event} />

        {titleHref ? (
          <Link
            href={titleHref}
            className="min-w-0 shrink-0 hover:underline"
          >
            {titleNode}
          </Link>
        ) : (
          <div className="min-w-0 shrink-0">{titleNode}</div>
        )}

        <div className="min-h-0 flex-1">{meta}</div>

        {extraSummary}

        {actions ? (
          <div className="mt-auto shrink-0 space-y-2 pt-2">{actions}</div>
        ) : null}
      </div>
    </article>
  );
}
