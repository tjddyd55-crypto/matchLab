"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MemberPortalClassDetailDialog,
  MemberPortalClassListCard,
} from "@/components/domain/gym-member-portal/MemberPortalClassDetailDialog";
import { Button } from "@/components/ui/button";
import {
  resolvePortalClassMarkerTone,
  type PortalClassMarkerTone,
} from "@/lib/gym-member-portal/class-display";
import {
  buildPortalMonthCells,
  formatPortalMonthTitle,
  formatPortalSelectedDayLabel,
  getPortalWeekdayLabels,
  shiftPortalMonth,
} from "@/lib/gym-member-portal/portal-month-calendar";
import type { PortalGroupClassItem } from "@/lib/gym-member-portal/portal-class-types";
import { cn } from "@/lib/utils";

const MARKER_DOT: Record<PortalClassMarkerTone, string> = {
  available: "bg-[#0A47FF]",
  attending: "bg-[#001C7A]",
  waitlisted: "bg-amber-500",
  completed: "bg-[#94A3B8]",
  cancelled: "bg-red-400",
  closed: "bg-[#CBD5E1]",
};

function pushCalendarQuery(
  token: string,
  year: number,
  month: number,
  dateKey: string,
) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("month", String(month));
  params.set("date", dateKey);
  return `/member-portal/${token}/classes?${params.toString()}`;
}

export function MemberPortalClassesCalendarApp({
  token,
  year,
  month,
  selectedDateKey,
  todayKey,
  classes,
  myActiveCount,
}: {
  token: string;
  year: number;
  month: number;
  selectedDateKey: string;
  todayKey: string;
  classes: PortalGroupClassItem[];
  myActiveCount: number;
}) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, PortalGroupClassItem[]>();
    for (const cls of classes) {
      const list = map.get(cls.dateKey) ?? [];
      list.push(cls);
      map.set(cls.dateKey, list);
    }
    return map;
  }, [classes]);

  const cells = useMemo(
    () => buildPortalMonthCells(year, month),
    [year, month],
  );
  const weekdays = getPortalWeekdayLabels();
  const selectedClasses = byDay.get(selectedDateKey) ?? [];
  const detailItem = classes.find((c) => c.id === detailId) ?? null;
  const monthEmpty = classes.length === 0;

  function goTo(dateKey: string) {
    const [y, m] = dateKey.split("-").map(Number);
    router.push(pushCalendarQuery(token, y, m, dateKey));
  }

  function goMonth(delta: number) {
    const anchor = `${year}-${String(month).padStart(2, "0")}-15`;
    const next = shiftPortalMonth(anchor, delta);
    const [y, m] = next.split("-").map(Number);
    const nextDate =
      todayKey.startsWith(`${y}-${String(m).padStart(2, "0")}`)
        ? todayKey
        : `${y}-${String(m).padStart(2, "0")}-01`;
    router.push(pushCalendarQuery(token, y, m, nextDate));
  }

  return (
    <div className="space-y-4" data-testid="member-portal-classes-calendar">
      <div>
        <h2 className="text-lg font-bold text-[#001C7A]">그룹수업</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          달력에서 날짜를 선택해 수업을 확인하세요
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0"
          onClick={() => goMonth(-1)}
          data-testid="portal-cal-prev-month"
        >
          이전 달
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0"
          onClick={() => goTo(todayKey)}
          data-testid="portal-cal-today"
        >
          오늘
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-10 shrink-0"
          onClick={() => goMonth(1)}
          data-testid="portal-cal-next-month"
        >
          다음 달
        </Button>
        <p
          className="w-full text-center text-sm font-semibold text-[#0F172A] sm:w-auto sm:flex-1"
          data-testid="portal-cal-month-title"
        >
          {formatPortalMonthTitle(year, month)}
        </p>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
        data-testid="portal-cal-grid"
      >
        <div className="grid grid-cols-7 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          {weekdays.map((label) => (
            <div
              key={label}
              className="px-0.5 py-2 text-center text-[11px] font-medium text-[#64748B]"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayClasses = byDay.get(cell.dateKey) ?? [];
            const selected = cell.dateKey === selectedDateKey;
            const isToday = cell.dateKey === todayKey;
            const visible = dayClasses.slice(0, 2);
            const extra = Math.max(0, dayClasses.length - 2);
            const primaryTone =
              dayClasses.length > 0
                ? resolvePortalClassMarkerTone({
                    classStatus: dayClasses[0]!.classStatus,
                    myStatus: dayClasses[0]!.myParticipationStatus,
                    started: dayClasses[0]!.started,
                  })
                : null;

            return (
              <button
                key={cell.dateKey}
                type="button"
                onClick={() => goTo(cell.dateKey)}
                className={cn(
                  "min-h-[4.25rem] border-b border-r border-[#F1F5F9] px-0.5 py-1 text-left align-top",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0A47FF]",
                  !cell.inMonth && "bg-[#F8FAFC] text-[#94A3B8]",
                  selected && "bg-[#EFF4FF] ring-2 ring-inset ring-[#0A47FF]",
                )}
                aria-pressed={selected}
                data-testid={`portal-cal-day-${cell.dateKey}`}
                data-selected={selected ? "true" : "false"}
              >
                <span
                  className={cn(
                    "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                    isToday && "bg-[#0A47FF] text-white",
                    !isToday && cell.inMonth && "text-[#0F172A]",
                  )}
                >
                  {cell.day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {visible.map((cls) => {
                    const tone = resolvePortalClassMarkerTone({
                      classStatus: cls.classStatus,
                      myStatus: cls.myParticipationStatus,
                      started: cls.started,
                    });
                    return (
                      <p
                        key={cls.id}
                        className={cn(
                          "flex items-center gap-0.5 truncate text-[10px] leading-tight",
                          tone === "cancelled" && "line-through text-red-500",
                          tone === "attending" && "font-semibold text-[#001C7A]",
                          tone === "waitlisted" && "font-medium text-amber-700",
                          tone === "available" && "text-[#0A47FF]",
                          (tone === "completed" || tone === "closed") &&
                            "text-[#64748B]",
                        )}
                        title={`${cls.title} · ${cls.statusLabel}`}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            MARKER_DOT[tone],
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{cls.title}</span>
                      </p>
                    );
                  })}
                  {extra > 0 ? (
                    <p className="text-[10px] font-medium text-[#64748B]">
                      +{extra}개
                    </p>
                  ) : null}
                  {dayClasses.length === 0 && primaryTone == null ? null : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {monthEmpty ? (
        <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
          이번 달에 등록된 그룹수업이 없습니다.
        </p>
      ) : null}

      <section className="space-y-3" data-testid="portal-cal-day-list">
        <h3 className="text-sm font-semibold text-[#0F172A]">
          {formatPortalSelectedDayLabel(selectedDateKey)}
        </h3>
        {selectedClasses.length === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            선택한 날짜에 예정된 그룹수업이 없습니다.
          </p>
        ) : (
          selectedClasses.map((item) => (
            <MemberPortalClassListCard
              key={item.id}
              item={item}
              onOpen={() => setDetailId(item.id)}
            />
          ))
        )}
      </section>

      <section className="space-y-2" data-testid="portal-cal-my-summary">
        <h3 className="text-sm font-semibold text-[#001C7A]">내 신청</h3>
        {myActiveCount === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            신청한 그룹수업이 없습니다.
          </p>
        ) : (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#0F172A]">
            진행 중 {myActiveCount}건 · 달력에서 참석/대기 상태를 확인할 수
            있습니다.
          </p>
        )}
      </section>

      <MemberPortalClassDetailDialog
        token={token}
        item={detailItem}
        open={detailId != null}
        onOpenChange={(next) => {
          if (!next) setDetailId(null);
        }}
      />
    </div>
  );
}
