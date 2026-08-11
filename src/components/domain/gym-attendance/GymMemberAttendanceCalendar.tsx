"use client";

import { useMemo, useState, useTransition } from "react";
import { cancelGymAttendanceAction } from "@/features/gym-attendance/actions";
import { useAppConfirmDialog } from "@/components/shared/app-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  formatSeoulTimeAria,
  formatSeoulTimeHm,
  getSeoulYmdParts,
  toSeoulDateOnlyString,
} from "@/lib/gym-attendance/seoul-date";
import { cn } from "@/lib/utils";

type CalendarDay = {
  id: string;
  day: number;
  attendedAt: Date | string;
  source: string;
  note: string | null;
  membershipStatusLabel: string | null;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

export function GymMemberAttendanceCalendar({
  memberId,
  memberName,
  year,
  month,
  days,
  summary,
}: {
  memberId: string;
  memberName: string;
  year: number;
  month: number;
  days: CalendarDay[];
  summary: {
    monthCount: number;
    last30Count: number;
    totalCount: number;
    latestAttendedAt: Date | string | null;
  };
}) {
  const { confirm } = useAppConfirmDialog();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarDay>();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  const today = getSeoulYmdParts();
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<number | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selected = selectedDay != null ? byDay.get(selectedDay) : undefined;

  function prevMonthHref() {
    const m = month === 1 ? 12 : month - 1;
    const y = month === 1 ? year - 1 : year;
    return `?attendanceYear=${y}&attendanceMonth=${m}#attendance`;
  }

  function nextMonthHref() {
    const m = month === 12 ? 1 : month + 1;
    const y = month === 12 ? year + 1 : year;
    return `?attendanceYear=${y}&attendanceMonth=${m}#attendance`;
  }

  async function cancelSelected() {
    if (!selected) return;
    const dateLabel = `${year}-${String(month).padStart(2, "0")}-${String(selected.day).padStart(2, "0")}`;
    const ok = await confirm({
      title: "출석 기록을 취소할까요?",
      description: `${memberName} 회원의 ${dateLabel} 출석 기록이 취소됩니다.`,
      variant: "danger",
    });
    if (!ok) return;
    setError(null);
    const fd = new FormData();
    fd.set("attendanceId", selected.id);
    fd.set("memberId", memberId);
    startTransition(async () => {
      const result = await cancelGymAttendanceAction(fd);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <section
      id="attendance"
      className="rounded-xl border border-matchon-border bg-white p-4"
    >
      <h2 className="mb-3 text-sm font-bold text-matchon-text-primary">출석</h2>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat label="이번 달" value={`${summary.monthCount}회`} />
        <MiniStat label="최근 30일" value={`${summary.last30Count}회`} />
        <MiniStat label="총 출석" value={`${summary.totalCount}회`} />
        <MiniStat
          label="최근 출석"
          value={
            summary.latestAttendedAt
              ? toSeoulDateOnlyString(new Date(summary.latestAttendedAt))
              : "—"
          }
        />
      </div>

      <div className="mb-3 flex items-center justify-between gap-2">
        <a
          href={prevMonthHref()}
          className="rounded-md border border-matchon-border px-2 py-1 text-xs"
        >
          이전
        </a>
        <p className="text-sm font-semibold">
          {year}년 {month}월
        </p>
        <div className="flex gap-1">
          <a
            href={`?attendanceYear=${today.year}&attendanceMonth=${today.month}#attendance`}
            className="rounded-md border border-matchon-border px-2 py-1 text-xs"
          >
            오늘
          </a>
          <a
            href={nextMonthHref()}
            className="rounded-md border border-matchon-border px-2 py-1 text-xs"
          >
            다음
          </a>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-matchon-text-secondary">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1 font-medium">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          if (day == null) {
            return (
              <div key={`e-${idx}`} className="min-h-[52px] sm:min-h-[60px]" />
            );
          }
          const attendance = byDay.get(day);
          const isToday =
            today.year === year &&
            today.month === month &&
            today.day === day;
          const isSelected = selectedDay === day;
          const timeHm = attendance
            ? formatSeoulTimeHm(new Date(attendance.attendedAt))
            : null;
          const ariaLabel = attendance
            ? `${year}년 ${month}월 ${day}일 출석, ${formatSeoulTimeAria(new Date(attendance.attendedAt))}`
            : `${year}년 ${month}월 ${day}일`;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "attendance-calendar-cell flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-md border px-0.5 py-1 text-sm sm:min-h-[60px]",
                isSelected
                  ? "border-matchon-primary bg-matchon-primary text-white"
                  : "border-transparent",
                !isSelected && isToday ? "ring-1 ring-matchon-primary/40" : "",
                !isSelected && attendance
                  ? "bg-matchon-primary/10"
                  : !isSelected
                    ? "hover:bg-slate-50"
                    : "",
              )}
              aria-label={ariaLabel}
              aria-pressed={isSelected}
            >
              <span className="attendance-calendar-date leading-none">
                {day}
              </span>
              {attendance ? (
                <>
                  <span
                    className={cn(
                      "attendance-calendar-status text-[10px] leading-none",
                      isSelected ? "text-white" : "text-matchon-primary",
                    )}
                    aria-hidden
                  >
                    ✓
                  </span>
                  <span
                    className={cn(
                      "attendance-calendar-time whitespace-nowrap text-[10px] leading-none tabular-nums sm:text-[11px]",
                      isSelected
                        ? "text-white/95"
                        : "text-matchon-text-secondary",
                    )}
                  >
                    {timeHm}
                  </span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-matchon-border bg-slate-50 p-3">
        {selected ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {year}.{String(month).padStart(2, "0")}.
              {String(selected.day).padStart(2, "0")} 출석
            </p>
            <p className="text-matchon-text-secondary">
              시각 {formatSeoulTimeHm(new Date(selected.attendedAt))} ·{" "}
              {selected.source === "admin_manual" ? "수동" : "키오스크"}
            </p>
            {selected.membershipStatusLabel ? (
              <p className="text-matchon-text-secondary">
                이용권 {selected.membershipStatusLabel}
              </p>
            ) : null}
            {selected.note ? (
              <p className="text-matchon-text-secondary">메모 {selected.note}</p>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-2"
              disabled={pending}
              onClick={() => void cancelSelected()}
            >
              출석 취소
            </Button>
          </div>
        ) : (
          <p className="text-sm text-matchon-text-secondary">
            출석일을 선택하면 상세가 표시됩니다.
          </p>
        )}
        {error ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-matchon-border px-2 py-2">
      <p className="text-[11px] text-matchon-text-secondary">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
