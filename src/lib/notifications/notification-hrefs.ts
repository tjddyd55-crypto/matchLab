/** 인앱 알림 href — 내부·공개 라우트만 허용 */

export function gymEventStatusHref(eventId: string): string {
  return `/gym/events/${eventId}/status`;
}

export function fighterEventsHref(): string {
  return "/fighter/events";
}

export function organizerApplicationsHref(eventId: string): string {
  return `/organizer/events/${eventId}/applications`;
}

export function organizerCheckInHref(eventId: string): string {
  return `/organizer/events/${eventId}/check-in`;
}

export function organizerBracketsHref(eventId: string): string {
  return `/organizer/events/${eventId}/brackets`;
}

export function publicBracketsHref(publicSlug: string): string {
  return `/events/${publicSlug}/brackets`;
}

export function publicResultsHref(publicSlug: string): string {
  return `/events/${publicSlug}/results`;
}
