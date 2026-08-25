import { EventStatus } from "@/lib/enums";

/**
 * 공개 대회 공고(Event) 노출 SSOT.
 * Announcement 별도 모델 없음 — Event.status 가 공개 여부 SSOT.
 *
 * 공개 목록/상세에서 제외:
 * - draft (작성 중)
 * - cancelled (취소)
 *
 * E2E 잔여 fixture slug (`e2e-<ts>-slug`) 는 공개 공고로 취급하지 않는다.
 * sample-open-2026 등 시드 대회는 정상 Event row 로 유지한다.
 */
export const PUBLIC_EVENT_EXCLUDED_STATUSES: readonly EventStatus[] = [
  EventStatus.draft,
  EventStatus.cancelled,
] as const;

export function isEventStatusPubliclyListed(
  status: EventStatus | string,
): boolean {
  return !PUBLIC_EVENT_EXCLUDED_STATUSES.includes(status as EventStatus);
}

/** Judge/UI E2E 스크립트가 남긴 공개 오염 slug */
const E2E_PUBLIC_SLUG_RE = /^e2e-\d+-slug$/i;

export function isEphemeralPublicAnnouncementSlug(
  publicSlug: string | null | undefined,
): boolean {
  if (!publicSlug) return false;
  return E2E_PUBLIC_SLUG_RE.test(publicSlug.trim());
}

export function shouldListEventOnPublicAnnouncementBoard(input: {
  status: EventStatus | string;
  publicSlug: string | null | undefined;
}): boolean {
  if (!isEventStatusPubliclyListed(input.status)) return false;
  if (isEphemeralPublicAnnouncementSlug(input.publicSlug)) return false;
  return true;
}
