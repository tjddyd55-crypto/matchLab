"use client";

import { MatchonTabs } from "@/components/shared/MatchonTabs";
import {
  type CourtTabId,
  formatCourtTabLabel,
} from "@/lib/court-tab-label";
import type { EventCourtVM } from "@/lib/services/event-court.service";

export function OperationCourtTabBar({
  courts,
  activeTab,
  onTabChange,
}: {
  courts: EventCourtVM[];
  activeTab: CourtTabId;
  onTabChange: (tab: CourtTabId) => void;
}) {
  const activeCourts = courts.filter((c) => c.isActive);

  if (activeCourts.length === 0) {
    return null;
  }

  const items: { id: CourtTabId; label: string }[] = [
    { id: "all", label: "전체" },
    ...activeCourts.map((court, idx) => ({
      id: court.id,
      label: formatCourtTabLabel(court, idx),
    })),
  ];

  return (
    <MatchonTabs
      items={items}
      activeId={activeTab}
      onChange={onTabChange}
    />
  );
}
