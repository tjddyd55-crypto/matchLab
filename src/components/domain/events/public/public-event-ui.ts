import type { PublicEventDetailDTO, PublicEventListItemDTO } from "@/lib/dto/public";

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
