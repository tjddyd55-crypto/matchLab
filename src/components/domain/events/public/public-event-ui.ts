import type { PublicEventDetailDTO, PublicEventListItemDTO } from "@/lib/dto/public";
import {
  eventAnnouncementCardClass,
  eventAnnouncementCardLivePillClass,
  eventAnnouncementCardPosterOverlayClass,
  eventAnnouncementCardSportPillClass,
  eventAnnouncementPublicHref,
} from "@/components/domain/events/announcement/event-announcement-card-ui";
import {
  matchonFilterPillActiveClass,
  matchonFilterPillBaseClass,
  matchonFilterPillInactiveClass,
  matchonFieldInputClass,
  matchonFieldSelectClass,
  matchonPageEyebrowClass,
  matchonUnderlineTabActiveClass,
  matchonUnderlineTabBaseClass,
  matchonUnderlineTabInactiveClass,
  matchonUnderlineTabsNavClass,
} from "@/lib/ui/matchon-shell-ui";
import { matchonPageTitleClass } from "@/lib/ui/matchon-layout";
import { cn } from "@/lib/utils";

export const publicEventPageEyebrowClass = matchonPageEyebrowClass;
export const publicEventPageTitleClass = matchonPageTitleClass;

/** /events 필터 Card — compact padding, no shadow */
export const publicEventFilterBarClass =
  "rounded-xl border border-matchon-border bg-matchon-primary-light/35 p-3.5 shadow-none md:p-4";

export const publicEventFilterPillBaseClass = matchonFilterPillBaseClass;
export const publicEventFilterPillActiveClass = matchonFilterPillActiveClass;
export const publicEventFilterPillInactiveClass = matchonFilterPillInactiveClass;
export const publicEventUnderlineTabsNavClass = matchonUnderlineTabsNavClass;
export const publicEventUnderlineTabBaseClass = matchonUnderlineTabBaseClass;
export const publicEventUnderlineTabActiveClass = matchonUnderlineTabActiveClass;
export const publicEventUnderlineTabInactiveClass = matchonUnderlineTabInactiveClass;

export const publicEventFilterControlLabelClass =
  "mb-1.5 block text-xs font-semibold text-matchon-text-primary";

export const publicEventFilterSportSelectClass = cn(
  matchonFieldSelectClass,
  "w-full shrink-0",
);

export const publicEventFilterRegionInputClass = cn(
  matchonFieldInputClass,
  "w-full max-w-none",
);

/** @deprecated Prefer eventAnnouncementCardClass — 공개 카드는 announcement SSOT 재사용 */
export const publicEventCardClass = eventAnnouncementCardClass;
export const publicEventCardPosterOverlayClass =
  eventAnnouncementCardPosterOverlayClass;
export const publicEventCardSportPillClass = eventAnnouncementCardSportPillClass;
export const publicEventCardLivePillClass = eventAnnouncementCardLivePillClass;

export type PublicEventCardProps = {
  event: PublicEventListItemDTO;
  className?: string;
  priorityImage?: boolean;
};

export function publicEventHref(slug: string): string {
  return eventAnnouncementPublicHref(slug);
}

export function publicEventCtaLabel(event: PublicEventListItemDTO): string {
  return event.registrationStatus === "open" ? "신청하기" : "자세히 보기";
}

export function publicEventDivisionSummary(
  event: Pick<PublicEventDetailDTO, "divisions" | "primarySport">,
): string | undefined {
  if (event.divisions.length === 0) return undefined;
  const sport =
    event.primarySport ?? event.divisions[0]?.sportType ?? "";
  return `${event.divisions.length}개 경기구분${sport ? ` · ${sport}` : ""}`;
}
