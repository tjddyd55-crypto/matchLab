import Link from "next/link";
import { EventStatusPill } from "@/components/domain/events/EventStatusPill";
import { RegistrationStatusPill } from "@/components/domain/events/RegistrationStatusPill";
import { AddEventToAssociationScheduleButton } from "@/components/domain/association-schedules/AddEventToAssociationScheduleButton";
import { buttonVariants } from "@/components/ui/button";
import type { OrganizerEventListItemVM } from "@/lib/services/event.service";
import { EventStatus } from "@/lib/enums";
import {
  listTableHeaderCellCenterClass,
  listTableHeaderCellStartClass,
  listTableHeaderRowClass,
} from "@/lib/ui/list-table-styles";
import {
  organizerEventListTableWrapClass,
  formatOrganizerEventListDate,
} from "@/lib/ui/event-list-ui";
import { nowrapTruncateClass } from "@/lib/ui/match-grid-layout";
import { cn } from "@/lib/utils";

export function OrganizerEventListTable({
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
  return (
    <div className={organizerEventListTableWrapClass}>
      <table className="w-full table-fixed text-sm">
        <colgroup>
          <col className="w-[22%]" />
          {showOrganizerColumn ? <col className="w-[10%]" /> : null}
          <col className="w-[12%]" />
          <col className="w-[16%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead className={listTableHeaderRowClass}>
          <tr>
            <th className={listTableHeaderCellStartClass}>대회명</th>
            {showOrganizerColumn ? (
              <th className={listTableHeaderCellStartClass}>주최</th>
            ) : null}
            <th className={listTableHeaderCellStartClass}>대회일</th>
            <th className={listTableHeaderCellStartClass}>장소</th>
            <th className={listTableHeaderCellCenterClass}>신청</th>
            <th className={listTableHeaderCellCenterClass}>대회 상태</th>
            <th className={listTableHeaderCellCenterClass}>접수 상태</th>
            <th className={listTableHeaderCellCenterClass}>관리</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-matchon-border align-middle hover:bg-matchon-primary-light/15"
            >
              <td className="min-w-0 px-2 py-2.5 align-middle">
                <Link
                  href={`/organizer/events/${row.id}`}
                  className="flex min-w-0 items-center gap-2.5"
                >
                  <div className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md bg-matchon-primary-light/50 ring-1 ring-matchon-border/60">
                    <span className="text-[9px] font-bold text-matchon-primary/70">
                      대회
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className="line-clamp-2 text-sm font-semibold leading-snug text-matchon-text-primary"
                      title={row.title}
                    >
                      {row.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                      {row.publicSlug}
                    </p>
                  </div>
                </Link>
              </td>
              {showOrganizerColumn ? (
                <td className="min-w-0 px-2 py-2.5 align-middle text-xs">
                  <span
                    className={nowrapTruncateClass}
                    title={row.organizerName ?? undefined}
                  >
                    {row.organizerName ?? "—"}
                  </span>
                </td>
              ) : null}
              <td className="px-2 py-2.5 align-middle text-xs tabular-nums whitespace-nowrap">
                {formatOrganizerEventListDate(row.eventDate)}
              </td>
              <td className="min-w-0 px-2 py-2.5 align-middle text-xs">
                <span
                  className="line-clamp-2 leading-snug"
                  title={row.location ?? undefined}
                >
                  {row.location ?? "—"}
                </span>
              </td>
              <td className="px-2 py-2.5 align-middle text-center">
                <span className="text-sm font-semibold tabular-nums">
                  {row.applicationCount}
                </span>
                <span className="text-muted-foreground text-xs">건</span>
              </td>
              <td className="px-2 py-2.5 align-middle text-center">
                <EventStatusPill status={row.status} />
              </td>
              <td className="px-2 py-2.5 align-middle text-center">
                <RegistrationStatusPill
                  status={row.status}
                  registrationStartDate={row.registrationStartDate}
                  registrationEndDate={row.registrationEndDate}
                />
              </td>
              <td className="px-2 py-2.5 align-middle text-center">
                <div className="flex flex-col items-center gap-1">
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {showScheduleActions ? (
                      <AddEventToAssociationScheduleButton
                        eventId={row.id}
                        eventTitle={row.title}
                        linkedScheduleId={eventScheduleLinks[row.id]?.scheduleId}
                        linkedScheduleDateKey={
                          eventScheduleLinks[row.id]?.dateKey
                        }
                        formOptions={scheduleFormOptions}
                        noticeOptions={scheduleNoticeOptions}
                        compact
                      />
                    ) : null}
                    <Link
                      href={`/organizer/events/${row.id}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "h-8 min-w-[3.5rem] px-2.5 text-xs",
                      )}
                    >
                      관리
                    </Link>
                  </div>
                  {row.status === EventStatus.finished && row.hasActiveArchive ? (
                    <Link
                      href={`/organizer/events/${row.id}/archive`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "ghost" }),
                        "h-7 px-2 text-[11px]",
                      )}
                    >
                      기록 보기
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
