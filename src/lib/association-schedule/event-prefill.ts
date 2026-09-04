import {
  extractEventDatetimeLocalDateKey,
  extractEventDatetimeLocalHm,
} from "@/lib/date-display";
import {
  formatSeoulScheduleTime,
  toSeoulDateKey,
} from "@/lib/gym-schedule/seoul-schedule";

/**
 * Event.eventDate에서 일정 prefill용 시각(HH:mm).
 * 대회 기본정보 datetime-local 표시와 동일한 wall-clock(UTC 필드) 기준.
 */
export function extractEventScheduleTimeHm(eventDate: Date): string | null {
  return extractEventDatetimeLocalHm(eventDate);
}

export type EventSchedulePrefill = {
  relatedEventId: string;
  title: string;
  type: "TOURNAMENT";
  startsAtDate: string;
  startsAtHm: string | null;
  allDay: boolean;
  location: string | null;
  description: string;
};

export function buildEventSchedulePrefill(event: {
  id: string;
  title: string;
  eventDate: Date;
  location: string | null;
  locationName: string | null;
}): EventSchedulePrefill {
  const startsAtDate = extractEventDatetimeLocalDateKey(event.eventDate);
  const startsAtHm = extractEventScheduleTimeHm(event.eventDate);
  const venue =
    event.locationName?.trim() ||
    event.location?.trim() ||
    null;
  return {
    relatedEventId: event.id,
    title: event.title,
    type: "TOURNAMENT",
    startsAtDate,
    startsAtHm,
    allDay: !startsAtHm,
    location: venue,
    description: "MATCHON 대회 일정",
  };
}

export function formatAssociationScheduleWhen(input: {
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
}): string {
  const dateLabel = toSeoulDateKey(input.startsAt).replace(/-/g, ".");
  if (input.allDay) {
    return dateLabel;
  }
  return `${dateLabel} ${formatSeoulScheduleTime(input.startsAt)}`;
}

export function formatAssociationScheduleRange(input: {
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
}): string {
  const start = formatAssociationScheduleWhen(input);
  if (!input.endsAt) return start;
  const endDate = toSeoulDateKey(input.endsAt).replace(/-/g, ".");
  if (input.allDay) {
    if (endDate === toSeoulDateKey(input.startsAt).replace(/-/g, ".")) {
      return start;
    }
    return `${start} ~ ${endDate}`;
  }
  const endTime = formatSeoulScheduleTime(input.endsAt);
  const startDate = toSeoulDateKey(input.startsAt).replace(/-/g, ".");
  if (endDate === startDate) {
    return `${startDate} ${formatSeoulScheduleTime(input.startsAt)}~${endTime}`;
  }
  return `${start} ~ ${endDate} ${endTime}`;
}
