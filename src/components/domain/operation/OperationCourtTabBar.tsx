"use client";

import {
  type CourtTabId,
  formatCourtTabLabel,
} from "@/lib/court-tab-label";
import type { EventCourtVM } from "@/lib/services/event-court.service";
import {
  matchonScrollablePillItemClass,
  matchonScrollablePillsClass,
} from "@/lib/ui/matchon-layout";
import {
  organizerOperationCourtPillActiveClass,
  organizerOperationCourtPillBaseClass,
  organizerOperationCourtPillInactiveClass,
} from "@/lib/ui/organizer-operation-ui";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(matchonScrollablePillsClass, "-mx-1 px-1")}
      role="tablist"
      aria-label="경기장 선택"
    >
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onTabChange(item.id)}
            className={cn(
              matchonScrollablePillItemClass,
              organizerOperationCourtPillBaseClass,
              active
                ? organizerOperationCourtPillActiveClass
                : organizerOperationCourtPillInactiveClass,
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
