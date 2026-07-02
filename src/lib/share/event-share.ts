import type { PublicEventDetailDTO } from "@/lib/dto/public";
import { formatPublicDate } from "@/lib/date-display";
import {
  isPublicDisplayImageUrl,
  PUBLIC_REGISTRATION_STATUS_LABELS,
} from "@/lib/event-public-display";
import { getAppBaseUrl } from "@/lib/app-url";

import { BRAND_NAME } from "@/lib/brand";

const SITE_NAME = BRAND_NAME;

export function buildEventPublicUrl(
  event: Pick<PublicEventDetailDTO, "publicSlug">,
): string {
  return `${getAppBaseUrl()}/events/${event.publicSlug}`;
}

export function buildEventShareTitle(
  event: Pick<PublicEventDetailDTO, "title">,
): string {
  return `${event.title} | ${SITE_NAME}`;
}

export function buildEventShareDescription(
  event: Pick<
    PublicEventDetailDTO,
    "eventDate" | "location" | "registrationStatus" | "primarySport"
  >,
): string {
  const parts = [
    formatPublicDate(event.eventDate),
    event.location?.trim() || "장소 추후 안내",
    PUBLIC_REGISTRATION_STATUS_LABELS[event.registrationStatus],
  ];
  if (event.primarySport?.trim()) {
    parts.push(event.primarySport.trim());
  }
  return parts.join(" · ");
}

/** 공유 채널용 요약 한 줄 — 향후 카카오/인스타 등 연동 시 재사용 */
export function buildEventShareText(
  event: Pick<
    PublicEventDetailDTO,
    | "eventDate"
    | "location"
    | "registrationStatus"
    | "primarySport"
  >,
): string {
  return buildEventShareDescription(event);
}

/**
 * OG 이미지 우선순위: coverImageUrl → posterUrl → gallery[0] → 기본 fallback
 * 공개 https URL만 허용 (signed URL·storage path 제외).
 */
export function resolveEventOgImageUrl(
  event: Pick<
    PublicEventDetailDTO,
    "coverImageUrl" | "posterUrl" | "galleryImages"
  >,
): string | null {
  if (isPublicDisplayImageUrl(event.coverImageUrl)) {
    return event.coverImageUrl.trim();
  }
  if (isPublicDisplayImageUrl(event.posterUrl)) {
    return event.posterUrl.trim();
  }
  const galleryUrl = event.galleryImages[0]?.imageUrl;
  if (isPublicDisplayImageUrl(galleryUrl)) {
    return galleryUrl.trim();
  }
  return null;
}

function truncateOgParam(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function getDefaultEventOgImageUrl(
  event?: Pick<PublicEventDetailDTO, "title" | "eventDate" | "location">,
): string {
  const base = `${getAppBaseUrl()}/og-event-default`;
  if (!event) return base;

  const params = new URLSearchParams();
  if (event.title?.trim()) {
    params.set("title", truncateOgParam(event.title, 80));
  }
  params.set("date", formatPublicDate(event.eventDate));
  const location = event.location?.trim();
  if (location) {
    params.set("location", truncateOgParam(location, 60));
  }

  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export function resolveEventOgImageForMetadata(
  event: Pick<
    PublicEventDetailDTO,
    "coverImageUrl" | "posterUrl" | "galleryImages" | "title" | "eventDate" | "location"
  >,
): string {
  return resolveEventOgImageUrl(event) ?? getDefaultEventOgImageUrl(event);
}

export function buildFacebookShareUrl(pageUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
}
