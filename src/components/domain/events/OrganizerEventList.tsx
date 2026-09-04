import { OrganizerEventListClient } from "@/components/domain/events/OrganizerEventListClient";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";

export function OrganizerEventList({
  rows,
  showOrganizerColumn,
  showScheduleActions,
  eventScheduleLinks,
  scheduleFormOptions,
  scheduleNoticeOptions,
}: {
  rows: OrganizerEventListItemVM[];
  showOrganizerColumn?: boolean;
  showScheduleActions?: boolean;
  eventScheduleLinks?: Record<string, { scheduleId: string; dateKey: string }>;
  scheduleFormOptions?: Array<{ id: string; title: string; status: string }>;
  scheduleNoticeOptions?: Array<{ id: string; title: string }>;
}) {
  return (
    <OrganizerEventListClient
      rows={rows}
      showOrganizerColumn={showOrganizerColumn}
      showScheduleActions={showScheduleActions}
      eventScheduleLinks={eventScheduleLinks ?? {}}
      scheduleFormOptions={scheduleFormOptions ?? []}
      scheduleNoticeOptions={scheduleNoticeOptions ?? []}
    />
  );
}
