"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MemberPortalClassCard } from "@/components/domain/gym-member-portal/MemberPortalClassCard";
import { MemberPortalClassDetailSheet } from "@/components/domain/gym-member-portal/MemberPortalClassDetailSheet";
import { Button } from "@/components/ui/button";
import {
  MONTH_GRID_LABELS_SUN,
  WEEK_STRIP_LABELS_MON,
  addSeoulDateKeyDays,
  buildSeoulMonthCalendarCells,
  formatSeoulDateKeyLongKo,
  formatSeoulMonthLabel,
  formatSeoulWeekRangeLabel,
  getWeekRangeForDateKey,
  seoulDateKeyParts,
  shiftSeoulMonth,
  type MemberPortalClassView,
} from "@/lib/gym-member-portal/class-calendar";
import type { MemberPortalGroupClassItem } from "@/lib/gym-member-portal/class-types";
import { cn } from "@/lib/utils";

type MyPart = {
  classId: string;
  title: string;
  dateKey: string;
  timeRangeLabel: string;
  instructorName: string | null;
  location: string | null;
  status: string;
  waitlistOrder: number | null;
  bucket: string;
};

function buildHref(args: {
  token: string;
  view: MemberPortalClassView;
  date: string;
  classId?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("view", args.view);
  params.set("date", args.date);
  if (args.classId) params.set("classId", args.classId);
  return `/member-portal/${args.token}/classes?${params.toString()}`;
}

export function MemberPortalClassesSchedule({
  token,
  view,
  selectedDateKey,
  todayKey,
  initialClassId,
  classes,
  myParts,
}: {
  token: string;
  view: MemberPortalClassView;
  selectedDateKey: string;
  todayKey: string;
  initialClassId: string | null;
  classes: MemberPortalGroupClassItem[];
  myParts: MyPart[];
}) {
  const router = useRouter();
  const [detailId, setDetailId] = useState<string | null>(initialClassId);

  useEffect(() => {
    setDetailId(initialClassId);
  }, [initialClassId]);

  const byDay = useMemo(() => {
    const map = new Map<string, MemberPortalGroupClassItem[]>();
    for (const cls of classes) {
      const list = map.get(cls.dateKey) ?? [];
      list.push(cls);
      map.set(cls.dateKey, list);
    }
    return map;
  }, [classes]);

  const dayCounts = useMemo(() => {
    const map = new Map<string, { total: number; mine: number }>();
    for (const cls of classes) {
      if (cls.classStatus === "cancelled") continue;
      const prev = map.get(cls.dateKey) ?? { total: 0, mine: 0 };
      prev.total += 1;
      if (cls.isMine) prev.mine += 1;
      map.set(cls.dateKey, prev);
    }
    return map;
  }, [classes]);

  const selectedClasses = byDay.get(selectedDateKey) ?? [];
  const detailItem =
    classes.find((c) => c.id === detailId) ??
    null;

  const weekKeys = useMemo(
    () => {
      const week = getWeekRangeForDateKey(selectedDateKey);
      return Array.from({ length: 7 }, (_, i) =>
        addSeoulDateKeyDays(week.startKey, i),
      );
    },
    [selectedDateKey],
  );
  const weekMeta = getWeekRangeForDateKey(selectedDateKey);
  const { year, month } = seoulDateKeyParts(selectedDateKey);
  const monthCells = useMemo(
    () => buildSeoulMonthCalendarCells(year, month),
    [year, month],
  );

  const weekHasAny = weekKeys.some((k) => (byDay.get(k)?.length ?? 0) > 0);
  const monthHasAny = classes.some(
    (c) => seoulDateKeyParts(c.dateKey).month === month,
  );

  function navigate(next: {
    view?: MemberPortalClassView;
    date?: string;
    classId?: string | null;
  }) {
    router.push(
      buildHref({
        token,
        view: next.view ?? view,
        date: next.date ?? selectedDateKey,
        classId: next.classId === undefined ? null : next.classId,
      }),
    );
  }

  function openDetail(id: string) {
    setDetailId(id);
    router.replace(
      buildHref({
        token,
        view,
        date: selectedDateKey,
        classId: id,
      }),
      { scroll: false },
    );
  }

  function closeDetail(open: boolean) {
    if (open) return;
    setDetailId(null);
    router.replace(
      buildHref({
        token,
        view,
        date: selectedDateKey,
        classId: null,
      }),
      { scroll: false },
    );
  }

  const activeParts = myParts.filter(
    (p) => p.bucket === "attending" || p.bucket === "waitlisted",
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#001C7A]">그룹수업</h2>
        <div
          className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5"
          role="tablist"
          aria-label="보기 전환"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "week"}
            className={cn(
              "min-h-9 rounded-md px-3 text-sm font-medium",
              view === "week"
                ? "bg-white text-[#001C7A] shadow-sm"
                : "text-[#64748B]",
            )}
            onClick={() => navigate({ view: "week" })}
          >
            주간
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "month"}
            className={cn(
              "min-h-9 rounded-md px-3 text-sm font-medium",
              view === "month"
                ? "bg-white text-[#001C7A] shadow-sm"
                : "text-[#64748B]",
            )}
            onClick={() => navigate({ view: "month" })}
          >
            월간
          </button>
        </div>
      </div>

      {view === "week" ? (
        <section className="mt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 w-9 shrink-0 px-0"
              aria-label="이전 주"
              onClick={() =>
                navigate({ date: addSeoulDateKeyDays(weekMeta.startKey, -7) })
              }
            >
              ‹
            </Button>
            <p className="min-w-0 flex-1 text-center text-sm font-semibold text-[#0F172A]">
              {formatSeoulWeekRangeLabel(
                weekMeta.startKey,
                weekMeta.endInclusiveKey,
              )}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-9 shrink-0 px-0"
              aria-label="다음 주"
              onClick={() =>
                navigate({ date: addSeoulDateKeyDays(weekMeta.startKey, 7) })
              }
            >
              ›
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 px-3 text-sm"
              onClick={() => navigate({ date: todayKey })}
            >
              오늘
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {weekKeys.map((dateKey, idx) => {
              const day = seoulDateKeyParts(dateKey).day;
              const selected = dateKey === selectedDateKey;
              const isToday = dateKey === todayKey;
              const count = dayCounts.get(dateKey)?.total ?? 0;
              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => navigate({ date: dateKey })}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center rounded-lg px-0.5 text-center",
                    selected
                      ? "bg-[#0A47FF] text-white"
                      : "bg-[#F8FAFC] text-[#0F172A]",
                    isToday && !selected ? "ring-1 ring-[#0A47FF]" : "",
                  )}
                >
                  <span className="text-[10px] font-medium opacity-80">
                    {WEEK_STRIP_LABELS_MON[idx]}
                  </span>
                  <span className="text-sm font-semibold">{day}</span>
                  {count > 0 ? (
                    <span
                      className={cn(
                        "mt-0.5 h-1 w-1 rounded-full",
                        selected ? "bg-white" : "bg-[#0A47FF]",
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span className="mt-0.5 h-1 w-1" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>

          {!weekHasAny ? (
            <p className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
              이번 주 예정된 그룹수업이 없습니다.
            </p>
          ) : (
            <DayClassList
              token={token}
              dateKey={selectedDateKey}
              items={selectedClasses}
              onOpenDetail={openDetail}
            />
          )}
        </section>
      ) : (
        <section className="mt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 w-9 shrink-0 px-0"
              aria-label="이전 달"
              onClick={() => {
                const prev = shiftSeoulMonth(year, month, -1);
                navigate({ date: prev.dateKey });
              }}
            >
              ‹
            </Button>
            <p className="min-w-0 flex-1 text-center text-sm font-semibold text-[#0F172A]">
              {formatSeoulMonthLabel(year, month)}
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-9 w-9 shrink-0 px-0"
              aria-label="다음 달"
              onClick={() => {
                const next = shiftSeoulMonth(year, month, 1);
                navigate({ date: next.dateKey });
              }}
            >
              ›
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 px-3 text-sm"
              onClick={() => navigate({ date: todayKey })}
            >
              오늘
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1">
            {MONTH_GRID_LABELS_SUN.map((label) => (
              <div
                key={label}
                className="py-1 text-center text-[11px] font-medium text-[#64748B]"
              >
                {label}
              </div>
            ))}
            {monthCells.map((cell) => {
              const selected = cell.dateKey === selectedDateKey;
              const isToday = cell.dateKey === todayKey;
              const stats = dayCounts.get(cell.dateKey);
              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => navigate({ date: cell.dateKey })}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-start rounded-lg px-0.5 pt-1",
                    selected
                      ? "bg-[#0A47FF] text-white"
                      : cell.inMonth
                        ? "bg-[#F8FAFC] text-[#0F172A]"
                        : "bg-transparent text-[#94A3B8]",
                    isToday && !selected ? "ring-1 ring-[#0A47FF]" : "",
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      !cell.inMonth && !selected ? "opacity-60" : "",
                    )}
                  >
                    {cell.day}
                  </span>
                  {stats && stats.total > 0 ? (
                    <span
                      className={cn(
                        "mt-0.5 text-[10px] font-medium",
                        selected ? "text-white/90" : "text-[#0A47FF]",
                      )}
                    >
                      {stats.mine > 0 ? `● ${stats.total}` : `${stats.total}`}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {!monthHasAny ? (
            <p className="mt-4 rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
              이번 달 예정된 그룹수업이 없습니다.
            </p>
          ) : (
            <DayClassList
              token={token}
              dateKey={selectedDateKey}
              items={selectedClasses}
              onOpenDetail={openDetail}
            />
          )}
        </section>
      )}

      <section className="mt-8 space-y-3">
        <h3 className="text-sm font-semibold text-[#001C7A]">내 신청</h3>
        {activeParts.length === 0 ? (
          <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
            진행 중인 신청이 없습니다.
          </p>
        ) : (
          activeParts.map((p) => (
            <button
              key={`${p.classId}-${p.status}`}
              type="button"
              className="w-full rounded-xl border border-[#E2E8F0] bg-white p-4 text-left"
              onClick={() => {
                navigate({
                  view: "week",
                  date: p.dateKey,
                  classId: p.classId,
                });
              }}
            >
              <p className="text-xs text-[#64748B]">
                {p.dateKey} · {p.timeRangeLabel}
              </p>
              <p className="mt-1 font-semibold text-[#0F172A] break-keep">
                {p.title}
              </p>
              <p className="mt-1 text-sm text-[#64748B]">
                {p.instructorName ? `${p.instructorName} 선생님` : ""}
                {p.location ? ` · ${p.location}` : ""}
              </p>
              <p className="mt-1 text-sm font-medium text-[#001C7A]">
                {p.status === "attending"
                  ? "신청 완료"
                  : p.waitlistOrder != null
                    ? `대기 신청 (${p.waitlistOrder}번째)`
                    : "대기 신청"}
              </p>
            </button>
          ))
        )}
      </section>

      <MemberPortalClassDetailSheet
        token={token}
        item={detailItem}
        open={detailId != null && detailItem != null}
        onOpenChange={closeDetail}
      />
    </div>
  );
}

function DayClassList({
  token,
  dateKey,
  items,
  onOpenDetail,
}: {
  token: string;
  dateKey: string;
  items: MemberPortalGroupClassItem[];
  onOpenDetail: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      <h3 className="text-sm font-semibold text-[#0F172A]">
        {formatSeoulDateKeyLongKo(dateKey)}
      </h3>
      {items.length === 0 ? (
        <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">
          이 날짜에는 예정된 그룹수업이 없습니다.
        </p>
      ) : (
        items.map((item) => (
          <MemberPortalClassCard
            key={item.id}
            token={token}
            item={item}
            showDate={false}
            onOpenDetail={() => onOpenDetail(item.id)}
          />
        ))
      )}
    </div>
  );
}
