import type { AssociationScheduleType } from "@/generated/prisma";
import { parseSeoulDateOnlyString } from "@/lib/gym-attendance/seoul-date";
import { createSeoulDateTime } from "@/lib/gym-schedule/seoul-schedule";

export function parseAssociationScheduleDateTime(
  dateKey: string,
  hm?: string | null,
  allDay?: boolean,
): Date | null {
  if (!parseSeoulDateOnlyString(dateKey)) return null;
  if (allDay || !hm?.trim()) {
    return createSeoulDateTime(dateKey, "00:00");
  }
  const parts = hm.trim().split(":");
  if (parts.length < 2) return null;
  const normalized = `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  return createSeoulDateTime(dateKey, normalized);
}

/** multi-day 일정이 dateKey(Seoul)에 포함되는지 */
export function associationScheduleIncludesDateKey(
  schedule: {
    startsAt: Date;
    endsAt: Date | null;
    allDay: boolean;
  },
  dateKey: string,
): boolean {
  const dayStart = createSeoulDateTime(dateKey, "00:00");
  const dayEnd = createSeoulDateTime(dateKey, "23:59");
  const start = schedule.startsAt;
  const end = schedule.endsAt ?? schedule.startsAt;
  return start <= dayEnd && end >= dayStart;
}

export function sortAssociationSchedulesForDay<
  T extends {
    allDay: boolean;
    startsAt: Date;
    title: string;
    id: string;
  },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    const tA = a.startsAt.getTime();
    const tB = b.startsAt.getTime();
    if (tA !== tB) return tA - tB;
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}

export type AssociationScheduleCalendarItem = {
  id: string;
  title: string;
  type: AssociationScheduleType;
  startsAt: Date;
  endsAt: Date | null;
  allDay: boolean;
  location: string | null;
  visibility: string;
  relatedForm?: { id: string; title: string; publicToken: string } | null;
  relatedNotice?: { id: string; title: string } | null;
  relatedEvent?: { id: string; title: string } | null;
  relatedUrl?: string | null;
};

export function groupSchedulesByDateKey(
  schedules: AssociationScheduleCalendarItem[],
  dateKeys: string[],
): Record<string, AssociationScheduleCalendarItem[]> {
  const map: Record<string, AssociationScheduleCalendarItem[]> = {};
  for (const key of dateKeys) {
    map[key] = sortAssociationSchedulesForDay(
      schedules.filter((s) =>
        associationScheduleIncludesDateKey(s, key),
      ),
    );
  }
  return map;
}
