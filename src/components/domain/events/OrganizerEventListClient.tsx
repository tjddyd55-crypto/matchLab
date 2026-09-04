"use client";

import { useMemo, useState } from "react";
import { OrganizerEventCompactCard } from "@/components/domain/events/OrganizerEventCompactCard";
import { OrganizerEventListTable } from "@/components/domain/events/OrganizerEventListTable";
import { EventListEmptyState } from "@/components/domain/events/EventListEmptyState";
import { buttonVariants } from "@/components/ui/button";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";
import {
  ORGANIZER_EVENT_LIST_FILTER_TABS,
  matchesOrganizerEventListFilter,
  organizerEventListFilterBarClass,
  type OrganizerEventListFilter,
} from "@/lib/ui/event-list-ui";
import {
  matchonFilterPillActiveClass,
  matchonFilterPillBaseClass,
  matchonFilterPillInactiveClass,
} from "@/lib/ui/matchon-shell-ui";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function OrganizerEventListClient({
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
  eventScheduleLinks: Record<string, { scheduleId: string; dateKey: string }>;
  scheduleFormOptions: Array<{ id: string; title: string; status: string }>;
  scheduleNoticeOptions: Array<{ id: string; title: string }>;
}) {
  const [filter, setFilter] = useState<OrganizerEventListFilter>("all");

  const filtered = useMemo(
    () => rows.filter((row) => matchesOrganizerEventListFilter(row.status, filter)),
    [rows, filter],
  );

  if (rows.length === 0) {
    return (
      <EventListEmptyState
        title="아직 등록된 대회가 없습니다"
        description="새 대회를 만들면 목록에 표시됩니다. 생성 직후 상태는 작성 중(draft)이며 공개 목록에는 나타나지 않습니다."
        action={
          <Link
            href="/organizer/events/new"
            className={cn(buttonVariants({ size: "field" }))}
          >
            대회 만들기
          </Link>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={organizerEventListFilterBarClass}>
        {ORGANIZER_EVENT_LIST_FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={cn(
              matchonFilterPillBaseClass,
              filter === tab.id
                ? matchonFilterPillActiveClass
                : matchonFilterPillInactiveClass,
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EventListEmptyState
          title="해당 상태의 대회가 없습니다"
          description="다른 필터를 선택하거나 새 대회를 만들어 보세요."
        />
      ) : (
        <>
          <OrganizerEventListTable
            rows={filtered}
            showOrganizerColumn={showOrganizerColumn}
            showScheduleActions={showScheduleActions}
            eventScheduleLinks={eventScheduleLinks}
            scheduleFormOptions={scheduleFormOptions}
            scheduleNoticeOptions={scheduleNoticeOptions}
          />
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map((row) => (
              <OrganizerEventCompactCard
                key={row.id}
                row={row}
                showOrganizer={showOrganizerColumn}
                showScheduleActions={showScheduleActions}
                linkedScheduleId={eventScheduleLinks[row.id]?.scheduleId}
                linkedScheduleDateKey={eventScheduleLinks[row.id]?.dateKey}
                scheduleFormOptions={scheduleFormOptions}
                scheduleNoticeOptions={scheduleNoticeOptions}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
