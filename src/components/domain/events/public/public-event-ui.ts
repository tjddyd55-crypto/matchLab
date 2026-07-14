import type { PublicEventDetailDTO, PublicEventListItemDTO } from "@/lib/dto/public";
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

/** Figma 포스터 중심 카드 */
export const publicEventCardClass =
  "group flex h-full flex-col gap-0 overflow-hidden rounded-[20px] border border-matchon-border bg-white py-0 shadow-sm transition-shadow hover:shadow-md";

export const publicEventCardPosterOverlayClass =
  "pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(10,10,30,0.85)] via-[rgba(10,10,30,0.3)] via-45% to-transparent to-70%";

export const publicEventCardSportPillClass =
  "absolute left-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800";

export const publicEventCardLivePillClass =
  "absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[10px] font-extrabold tracking-wide text-white";

export type PublicEventCardProps = {
  event: PublicEventListItemDTO;
  className?: string;
  priorityImage?: boolean;
};

export function publicEventHref(slug: string): string {
  return `/events/${slug}`;
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
