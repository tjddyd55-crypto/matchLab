import { OrganizerEventListClient } from "@/components/domain/events/OrganizerEventListClient";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";

export function OrganizerEventList({
  rows,
  showOrganizerColumn,
}: {
  rows: OrganizerEventListItemVM[];
  showOrganizerColumn?: boolean;
}) {
  return (
    <OrganizerEventListClient
      rows={rows}
      showOrganizerColumn={showOrganizerColumn}
    />
  );
}
