import { cn } from "@/lib/utils";

/** 공개·체육관 대회 공고 카드 공통 셸 클래스 (SSOT) */
export const eventAnnouncementCardClass =
  "group flex h-full flex-col gap-0 overflow-hidden rounded-[20px] border border-matchon-border bg-white py-0 shadow-sm transition-shadow hover:shadow-md";

export const eventAnnouncementCardPosterOverlayClass =
  "pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(10,10,30,0.85)] via-[rgba(10,10,30,0.3)] via-45% to-transparent to-70%";

export const eventAnnouncementCardSportPillClass =
  "absolute left-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800";

export const eventAnnouncementCardLivePillClass =
  "absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-1 text-[10px] font-extrabold tracking-wide text-white";

/** 공개·체육관 목록 그리드 (1 → 2 → 3열) */
export const eventAnnouncementCardGridClass =
  "grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3";

export function eventAnnouncementPublicHref(slug: string): string {
  return `/events/${slug}`;
}

export function cnAnnouncementCard(...parts: Array<string | false | null | undefined>) {
  return cn(...parts);
}
