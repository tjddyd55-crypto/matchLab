"use client";

import { OrganizerGlobalNavGroups } from "@/components/layout/OrganizerGlobalNavGroups";
import type { OrganizerGlobalNavGroup } from "@/lib/navigation/organizer-global-navigation";

export function OrganizerSidebarNav({
  groups,
}: {
  groups: OrganizerGlobalNavGroup[];
}) {
  return (
    <OrganizerGlobalNavGroups groups={groups} density="desktop" />
  );
}
