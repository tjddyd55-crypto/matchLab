"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { AssociationScheduleCalendarItem } from "@/lib/association-schedule/calendar";
import type { SeoulCalendarCell } from "@/lib/gym-member-portal/class-calendar";
import {
  ASSOCIATION_SCHEDULE_TYPE_LABEL,
  ASSOCIATION_SCHEDULE_VISIBILITY_LABEL,
} from "@/lib/intake-form/ui-labels";
import { buildIntakeFormPublicPath } from "@/lib/intake-form/public-url";
import {
  formatAssociationScheduleRange,
  formatAssociationScheduleWhen,
} from "@/lib/association-schedule/event-prefill";
import { AssociationScheduleFormDialog } from "@/components/domain/association-schedules/AssociationScheduleFormDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  deleteAssociationScheduleAction,
} from "@/features/association-schedules/actions";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

type FormOption = { id: string; title: string; status: string };
type NoticeOption = { id: string; title: string };

export function AssociationScheduleCalendarApp({
  view,
  year,
  month,
  monthLabel,
  cells,
  schedulesByDate,
  weekDateKeys,
  anchorDateKey,
  formOptions,
  noticeOptions,
}: {
  view: "month" | "week";
  year: number;
  month: number;
  monthLabel: string;
  cells?: SeoulCalendarCell[];
  schedulesByDate: Record<string, AssociationScheduleCalendarItem[]>;
  weekDateKeys?: string[];
  anchorDateKey?: string;
  formOptions: FormOption[];
  noticeOptions: NoticeOption[];
}) {
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editSchedule, setEditSchedule] =
    useState<AssociationScheduleCalendarItem | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedSchedules = selectedDateKey
    ? schedulesByDate[selectedDateKey] ?? []
    : [];
  const selectedSchedule = selectedScheduleId
    ? selectedSchedules.find((s) => s.id === selectedScheduleId) ??
      Object.values(schedulesByDate)
        .flat()
        .find((s) => s.id === selectedScheduleId)
    : null;

  const monthQuery = `${year}-${String(month).padStart(2, "0")}`;
  const prevMonth =
    month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  function openCreate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedScheduleId(null);
    setEditSchedule(null);
    setFormOpen(true);
  }

  function openEdit(schedule: AssociationScheduleCalendarItem) {
    setEditSchedule(schedule);
    setFormOpen(true);
  }

  function deleteSchedule(id: string) {
    startTransition(async () => {
      await deleteAssociationScheduleAction(id);
      setSelectedScheduleId(null);
      window.location.reload();
    });
  }

  const gridCells = useMemo(() => {
    if (view === "week" && weekDateKeys) {
      return weekDateKeys.map((dateKey) => ({
        dateKey,
        day: Number(dateKey.slice(8, 10)),
        inMonth: true,
      }));
    }
    return cells ?? [];
  }, [view, cells, weekDateKeys]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {view === "month" ? (
            <>
              <Link
                href={`/organizer/schedules?month=${prevMonth}`}
                className={cn("rounded-md border px-2 py-1 text-sm")}
              >
                &lt;
              </Link>
              <span className="text-sm font-semibold">{monthLabel}</span>
              <Link
                href={`/organizer/schedules?month=${nextMonth}`}
                className={cn("rounded-md border px-2 py-1 text-sm")}
              >
                &gt;
              </Link>
            </>
          ) : (
            <span className="text-sm font-semibold">주간 일정</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={
              view === "month"
                ? `/organizer/schedules?view=week&date=${anchorDateKey ?? monthQuery}-01`
                : `/organizer/schedules?month=${monthQuery}`
            }
            className="rounded-md border px-3 py-1.5 text-sm"
          >
            {view === "month" ? "주간" : "월간"}
          </Link>
          <Button
            type="button"
            size="sm"
            onClick={() => openCreate(anchorDateKey ?? `${monthQuery}-01`)}
          >
            + 일정 추가
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-matchon-border bg-white">
        <div className="grid grid-cols-7 border-b border-matchon-border bg-matchon-surface text-center text-xs font-semibold text-matchon-text-secondary">
          {WEEKDAY_KO.map((d) => (
            <div key={d} className="py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {gridCells.map((cell) => {
            const items = schedulesByDate[cell.dateKey] ?? [];
            const preview = items.slice(0, 2);
            const more = items.length - preview.length;
            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => {
                  setSelectedDateKey(cell.dateKey);
                  setSelectedScheduleId(null);
                }}
                className={cn(
                  "min-h-[88px] border-b border-r border-matchon-border p-1.5 text-left align-top last:border-r-0",
                  !cell.inMonth && "bg-matchon-surface/40",
                  selectedDateKey === cell.dateKey && "ring-2 ring-inset ring-matchon-primary/40",
                )}
              >
                <div className="text-xs font-semibold text-matchon-text-primary">
                  {cell.day}
                </div>
                <div className="mt-1 space-y-0.5">
                  {preview.map((s) => (
                    <div
                      key={s.id}
                      className="truncate rounded bg-matchon-primary/10 px-1 py-0.5 text-[10px] font-medium text-matchon-primary"
                    >
                      {s.title}
                    </div>
                  ))}
                  {more > 0 ? (
                    <div className="text-[10px] text-matchon-text-secondary">
                      +{more}개
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey && !selectedSchedule ? (
        <div className="rounded-xl border border-matchon-border bg-white p-4">
          <h2 className="text-sm font-bold">
            {selectedDateKey.replace(/-/g, ".")} 일정
          </h2>
          {selectedSchedules.length === 0 ? (
            <p className="mt-3 text-sm text-matchon-text-secondary">
              등록된 일정이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedSchedules.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full rounded-lg border border-matchon-border px-3 py-2 text-left text-sm hover:bg-matchon-surface"
                    onClick={() => setSelectedScheduleId(s.id)}
                  >
                    <span className="font-semibold">{s.title}</span>
                    <span className="text-matchon-text-secondary ml-2 text-xs">
                      {formatAssociationScheduleWhen(s)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={() => openCreate(selectedDateKey)}
          >
            + 일정 추가
          </Button>
        </div>
      ) : null}

      {selectedSchedule ? (
        <div className="rounded-xl border border-matchon-border bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">{selectedSchedule.title}</h2>
              <p className="text-sm text-matchon-text-secondary">
                {ASSOCIATION_SCHEDULE_TYPE_LABEL[selectedSchedule.type]} ·{" "}
                {ASSOCIATION_SCHEDULE_VISIBILITY_LABEL[
                  selectedSchedule.visibility as "PRIVATE" | "MEMBER_GYMS"
                ]}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openEdit(selectedSchedule)}
              >
                수정
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => deleteSchedule(selectedSchedule.id)}
              >
                삭제
              </Button>
            </div>
          </div>
          <p className="text-sm">
            {formatAssociationScheduleRange(selectedSchedule)}
          </p>
          {selectedSchedule.location ? (
            <p className="text-sm">장소: {selectedSchedule.location}</p>
          ) : null}
          {selectedSchedule.relatedEvent ? (
            <p className="text-sm">
              관련 대회:{" "}
              <Link
                href={`/organizer/events/${selectedSchedule.relatedEvent.id}`}
                className="text-matchon-primary underline"
              >
                {selectedSchedule.relatedEvent.title}
              </Link>
            </p>
          ) : null}
          {selectedSchedule.relatedNotice ? (
            <p className="text-sm">
              관련 공지:{" "}
              <Link
                href={`/organizer/notices/${selectedSchedule.relatedNotice.id}`}
                className="text-matchon-primary underline"
              >
                {selectedSchedule.relatedNotice.title}
              </Link>
            </p>
          ) : null}
          {selectedSchedule.relatedForm ? (
            <p className="text-sm">
              참가신청:{" "}
              <Link
                href={buildIntakeFormPublicPath(
                  selectedSchedule.relatedForm.publicToken,
                )}
                className="text-matchon-primary underline"
                target="_blank"
              >
                {selectedSchedule.relatedForm.title}
              </Link>
            </p>
          ) : null}
          {selectedSchedule.relatedUrl ? (
            <p className="text-sm">
              <a
                href={selectedSchedule.relatedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-matchon-primary underline"
              >
                외부 링크
              </a>
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedScheduleId(null)}
          >
            목록으로
          </Button>
        </div>
      ) : null}

      <AssociationScheduleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        defaultDateKey={selectedDateKey ?? anchorDateKey ?? `${monthQuery}-01`}
        schedule={editSchedule}
        formOptions={formOptions}
        noticeOptions={noticeOptions}
        onSaved={() => window.location.reload()}
      />
    </div>
  );
}
