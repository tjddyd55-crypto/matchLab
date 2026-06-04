import type { PublicEventDetailDTO, PublicEventListItemDTO } from "@/lib/dto/public";
import {
  resolveOrganizerRegistrationStatus,
  type OrganizerRegistrationStatus,
} from "@/lib/event-organizer-status";

/** 공개 페이지 신청 기간 배지 문구 */
export const PUBLIC_REGISTRATION_STATUS_LABELS: Record<
  OrganizerRegistrationStatus,
  string
> = {
  before: "신청 전",
  open: "신청 가능",
  closed: "신청 마감",
  unavailable: "신청 불가",
  unknown: "신청 안내 확인",
};

export function resolvePublicRegistrationStatus(input: {
  status: PublicEventListItemDTO["status"];
  registrationStartDate: string;
  registrationEndDate: string;
  now?: Date;
}): OrganizerRegistrationStatus {
  return resolveOrganizerRegistrationStatus({
    status: input.status,
    registrationStartDate: input.registrationStartDate,
    registrationEndDate: input.registrationEndDate,
    now: input.now,
  });
}

/** 공개 표시용 URL만 허용 (http/https). storage path 원문은 사용하지 않음. */
export function isPublicDisplayImageUrl(url: string | null | undefined): url is string {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (!/^https?:\/\//i.test(u)) return false;
  if (u.includes("/object/sign/")) return false;
  return true;
}

export function resolveEventCoverImageUrl(input: {
  posterUrl: string | null;
  galleryImageUrl?: string | null;
}): string | null {
  if (isPublicDisplayImageUrl(input.posterUrl)) return input.posterUrl.trim();
  if (isPublicDisplayImageUrl(input.galleryImageUrl)) {
    return input.galleryImageUrl.trim();
  }
  return null;
}

export function resolveDetailCoverImageUrl(
  event: Pick<PublicEventDetailDTO, "posterUrl" | "galleryImages">,
): string | null {
  return resolveEventCoverImageUrl({
    posterUrl: event.posterUrl,
    galleryImageUrl: event.galleryImages[0]?.imageUrl ?? null,
  });
}

export function primarySportFromDivisions(
  divisions: { sportType: string }[],
): string | null {
  const first = divisions[0]?.sportType?.trim();
  return first || null;
}
