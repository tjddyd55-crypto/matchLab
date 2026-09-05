/** QR 출력 페이지 섹션 앵커 — Server/Client 공용 순수 helper */

export const EVENT_QR_SECTION_IDS = {
  public: "public-qr",
  judge: "judge-qr",
  onsiteOps: "onsite-ops",
} as const;

export type EventQrSectionKey = keyof typeof EVENT_QR_SECTION_IDS;

export function eventQrSectionHref(
  eventId: string,
  section: EventQrSectionKey,
): string {
  return `/organizer/events/${eventId}/qr#${EVENT_QR_SECTION_IDS[section]}`;
}
