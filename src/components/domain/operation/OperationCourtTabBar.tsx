"use client";

import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={activeTab === "all" ? "default" : "outline"}
        onClick={() => onTabChange("all")}
      >
        전체
      </Button>
      {activeCourts.map((court, idx) => (
        <Button
          key={court.id}
          type="button"
          size="sm"
          variant={activeTab === court.id ? "default" : "outline"}
          onClick={() => onTabChange(court.id)}
        >
          {formatCourtTabLabel(court, idx)}
        </Button>
      ))}
    </div>
  );
}
